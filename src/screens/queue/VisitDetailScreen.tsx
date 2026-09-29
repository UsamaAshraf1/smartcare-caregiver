/**
 * One visit's detail + status actions. Seeds its state directly from
 * `route.params.visit` — the exact object QueueScreen already had from
 * `my_caregiver_queue()` — rather than re-fetching the visit by id from
 * `home_care_visits` itself. That re-fetch (a plain `select('*').eq('id',
 * ...)`) was coming back as a PostgREST 500 against the shared dev
 * sandbox, which is exactly why this screen used to render blank: the
 * fetch failed, `visit` stayed null forever, and there was nothing to
 * show. Since the caller already has the full row, there was never a
 * reason to ask the network for it again. If a future entry point (a
 * deep link, say) only has a visit id, `fetchHomeCareVisit` in
 * state/homecare.tsx is still there as a documented fallback — fix
 * whatever's throwing server-side first.
 *
 * While the visit is en_route this screen watches the device's foreground
 * location (no background tracking for v1 — spec §5 flags that as "needs
 * backend work") and broadcasts it over Supabase Realtime for the
 * patient's tracking screen to pick up.
 *
 * Patient/dependent identity and medical basics come from
 * `get_home_care_patient_info` (spec §6, 2026-09-16 revision) — one call,
 * fetched only while the visit is in an active lifecycle state
 * (matched/en_route/in_progress), matching the RPC's own server-side
 * scoping: access lapses once a visit is completed or cancelled, by
 * design, not a bug to work around.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Card, PrimaryButton, OutlineButton, InlineButton, Screen, ScreenHeader, Note, Avatar, Tag } from '../../components/ui';
import { Pulse } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { updateHomeCareVisitStatus, cancelHomeCareVisit, fetchPatientInfo, HomeCareVisit, PatientInfo, PAYMENT_STATUS_LABEL } from '../../state/homecare';
import { openVisitLocationBroadcaster } from '../../lib/visitLocation';
import { showAlert } from '../../components/AppAlert';
import { tapHaptic, successHaptic, warningHaptic } from '../../lib/haptics';
import { colors, radius, t } from '../../theme';
import type { ScreenProps } from '../../navigation/types';

const NEXT_STATUS: Partial<Record<HomeCareVisit['status'], { next: 'en_route' | 'in_progress' | 'completed'; label: string }>> = {
  matched: { next: 'en_route', label: 'Start heading out' },
  en_route: { next: 'in_progress', label: "I've arrived" },
  in_progress: { next: 'completed', label: 'Complete visit' },
};

/** The visit lifecycle, drawn as a connected row of steps that fill in as the caregiver advances — a quick visual read on where things stand. */
const STEPS: { key: HomeCareVisit['status']; label: string }[] = [
  { key: 'matched', label: 'Matched' },
  { key: 'en_route', label: 'En route' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Done' },
];

function StatusStepper({ status }: { status: HomeCareVisit['status'] }) {
  const activeIndex = STEPS.findIndex((s) => s.key === status);
  if (activeIndex === -1) return null; // cancelled — no stepper to show
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {STEPS.map((step, i) => {
        const done = i < activeIndex || (status === 'completed' && i <= activeIndex);
        const current = i === activeIndex && status !== 'completed';
        const filled = done || current;
        return (
          <React.Fragment key={step.key}>
            <View style={{ alignItems: 'center', width: 56 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: filled ? colors.primary : colors.fill,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? (
                  <Icon name="check" size={11} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Text style={t(10, 800, current ? '#FFFFFF' : colors.textFaint)}>{i + 1}</Text>
                )}
              </View>
              <Text style={[t(9.5, 700, filled ? colors.textBody : colors.textFaint), { marginTop: 4, textAlign: 'center' }]}>{step.label}</Text>
            </View>
            {i < STEPS.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: i < activeIndex ? colors.primary : colors.border, marginTop: 10 }} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function initialsOf(first: string | null, last: string | null) {
  return [first?.[0], last?.[0]].filter(Boolean).join('').toUpperCase() || '?';
}

export default function VisitDetailScreen({ navigation, route }: ScreenProps<'VisitDetail'>) {
  const [visit, setVisit] = useState<HomeCareVisit>(route.params.visit);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [locationOn, setLocationOn] = useState(false);
  const broadcasterRef = useRef<ReturnType<typeof openVisitLocationBroadcaster> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  /**
   * Stops the location watcher and closes the broadcast channel. Wrapped in
   * try/catch because both are calls into native/socket objects — the exact
   * crash this once caused: tapping "I've arrived" tears these down from a
   * useEffect with no error boundary anywhere in the app, so a native throw
   * here (e.g. `.remove()` on a subscription the OS already tore down) had
   * nowhere to go but a hard crash instead of a caught, logged no-op.
   */
  const stopLocationTracking = () => {
    try {
      watchRef.current?.remove();
    } catch (e) {
      console.warn('[visit-detail] failed to stop location watch:', e);
    }
    watchRef.current = null;
    broadcasterRef.current?.close(); // already try/catch-wrapped internally, see visitLocation.ts
    broadcasterRef.current = null;
  };

  const activeLifecycle = visit.status === 'matched' || visit.status === 'en_route' || visit.status === 'in_progress';

  useEffect(() => {
    if (!activeLifecycle) {
      setPatientInfo(null);
      return;
    }
    fetchPatientInfo(visit.id).then(setPatientInfo);
    // Re-fetches on every status change within the active lifecycle too —
    // harmless (same RPC, same visit id) and means this doesn't need its
    // own separate "did I already load this" tracking.
  }, [visit.id, activeLifecycle]);

  useEffect(() => {
    return () => stopLocationTracking();
  }, []);

  useEffect(() => {
    if (visit.status !== 'en_route') {
      stopLocationTracking();
      setLocationOn(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        broadcasterRef.current = openVisitLocationBroadcaster(visit.id);
        const subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 25 },
          (position) => {
            broadcasterRef.current?.send({ lat: position.coords.latitude, lng: position.coords.longitude, ts: position.timestamp });
          },
        );
        // The status could have flipped away from en_route while the
        // awaits above were in flight — stopLocationTracking() would then
        // already have run once (against null refs, harmlessly) before
        // this subscription even existed. Don't resurrect it: tear it down
        // immediately instead of stashing it in the ref.
        if (cancelled) {
          subscription.remove();
          return;
        }
        watchRef.current = subscription;
        setLocationOn(true);
      } catch (e) {
        console.warn('[visit-detail] failed to start location tracking:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visit.status, visit.id]);

  const step = NEXT_STATUS[visit.status];

  const onAdvance = async () => {
    if (!step) return;
    tapHaptic();
    setBusy(true);
    const { visit: updated, error } = await updateHomeCareVisitStatus(visit.id, step.next, visit.notes);
    setBusy(false);
    if (error || !updated) {
      warningHaptic();
      showAlert('Could not update visit', error ?? 'Please try again.');
      return;
    }
    successHaptic();
    setVisit(updated);
    if (updated.status === 'completed') navigation.goBack();
  };

  const onCancel = () => {
    tapHaptic();
    showAlert('Cancel this visit?', 'The patient will be notified.', [
      { text: 'Keep visit', style: 'cancel' },
      {
        text: 'Cancel visit',
        style: 'destructive',
        onPress: async () => {
          const { error } = await cancelHomeCareVisit(visit.id);
          if (error) {
            warningHaptic();
            showAlert('Could not cancel', error);
          } else {
            successHaptic();
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const onCall = () => {
    if (patientInfo?.phone) Linking.openURL(`tel:${patientInfo.phone}`).catch(() => showAlert('Could not open phone app', undefined));
  };
  const onEmail = () => {
    if (patientInfo?.email) Linking.openURL(`mailto:${patientInfo.email}`).catch(() => showAlert('Could not open email app', undefined));
  };

  const hasDependent = !!patientInfo?.dependent_first_name;
  const visiteeName = hasDependent
    ? `${patientInfo?.dependent_first_name} ${patientInfo?.dependent_last_name ?? ''}`.trim()
    : patientInfo
    ? `${patientInfo.first_name} ${patientInfo.last_name}`
    : null;

  return (
    <Screen>
      <ScreenHeader title="Visit" subtitle={visit.status.replace('_', ' ')} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <Card style={{ gap: 12 }}>
          <StatusStepper status={visit.status} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Text style={t(15, 800)}>{visit.address}</Text>
          {!!visit.address_note && <Text style={t(12.5, 400, colors.textMuted)}>{visit.address_note}</Text>}
          <Text style={t(12.5, 400, colors.textMuted)}>
            {new Date(visit.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={t(13, 700, colors.primary)}>{`AED ${visit.fee_aed ?? '—'}`}</Text>
            {visit.payment_status !== 'paid' && (
              <Tag
                label={PAYMENT_STATUS_LABEL[visit.payment_status]}
                bg={visit.payment_status === 'failed' ? colors.dangerSoft : colors.fill}
                color={visit.payment_status === 'failed' ? colors.dangerDark : colors.textMuted}
                height={22}
                fontSize={10.5}
              />
            )}
          </View>
        </Card>

        {!!visiteeName && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar initials={initialsOf(hasDependent ? patientInfo?.dependent_first_name ?? null : patientInfo?.first_name ?? null, hasDependent ? patientInfo?.dependent_last_name ?? null : patientInfo?.last_name ?? null)} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={t(14, 800)}>{visiteeName}</Text>
              <Text style={t(12, 400, colors.textMuted)}>
                {hasDependent ? patientInfo?.dependent_relation ?? 'Dependent' : 'Account holder'}
                {patientInfo?.dob ? ` · DOB ${patientInfo.dob}` : ''}
              </Text>
              {hasDependent && (
                <Text style={t(11, 400, colors.textFaint)}>{`Booked by ${patientInfo?.first_name} ${patientInfo?.last_name}`}</Text>
              )}
            </View>
          </Card>
        )}

        {!!patientInfo && (patientInfo.phone || patientInfo.email) && (
          <Card style={{ gap: 10 }}>
            <Text style={t(13, 700, colors.textBody)}>Contact</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!!patientInfo.phone && <InlineButton label="Call" onPress={onCall} variant="solid" height={42} fontSize={13} />}
              {!!patientInfo.email && <InlineButton label="Email" onPress={onEmail} variant="outline" height={42} fontSize={13} />}
            </View>
          </Card>
        )}

        {!!patientInfo && (patientInfo.blood_type || patientInfo.conditions?.length || patientInfo.allergies?.length) && (
          <Card style={{ gap: 10 }}>
            <Text style={t(13, 700, colors.textBody)}>Medical basics</Text>
            {!!patientInfo.blood_type && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={t(12.5, 400, colors.textMuted)}>Blood type</Text>
                <Text style={t(12.5, 700)}>{patientInfo.blood_type}</Text>
              </View>
            )}
            {!!patientInfo.conditions?.length && (
              <View style={{ gap: 2 }}>
                <Text style={t(12.5, 400, colors.textMuted)}>Conditions</Text>
                <Text style={t(12.5, 600, colors.textBody)}>{patientInfo.conditions.join(', ')}</Text>
              </View>
            )}
            {!!patientInfo.allergies?.length && (
              <View style={{ gap: 2, backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 10 }}>
                <Text style={t(11.5, 700, colors.dangerDark)}>⚠ Allergies</Text>
                <Text style={t(12.5, 700, colors.dangerDark)}>{patientInfo.allergies.join(', ')}</Text>
              </View>
            )}
          </Card>
        )}

        {visit.status === 'en_route' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.successSoft, borderRadius: radius.sm, padding: 12 }}>
            <Pulse size={8} color={locationOn ? colors.success : colors.borderStrong} />
            <Text style={t(12, 700, colors.successDark)}>{locationOn ? 'Sharing your location with the patient' : 'Waiting for location permission'}</Text>
          </View>
        )}

        {visit.status === 'in_progress' && (
          <Card style={{ gap: 8 }}>
            <Text style={t(13.5, 800)}>Visit notes</Text>
            <TextInput
              value={visit.notes ?? ''}
              onChangeText={(text) => setVisit({ ...visit, notes: text })}
              placeholder="What did you do during this visit?"
              placeholderTextColor={colors.textFaint}
              multiline
              style={[t(13, 500, colors.textBody), { minHeight: 70, textAlignVertical: 'top' }]}
            />
          </Card>
        )}

        {visit.status === 'in_progress' && (
          <OutlineButton label="Record vitals" onPress={() => navigation.navigate('Vitals', { visitId: visit.id })} height={48} fontSize={14} />
        )}

        {!activeLifecycle && (
          <Note tone="neutral" icon="infoCircle">
            Patient details are no longer available for a completed or cancelled visit — access is scoped to the active visit only.
          </Note>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: 24, gap: 10 }}>
        {!!step && <PrimaryButton label={step.label} onPress={onAdvance} loading={busy} height={52} fontSize={15} />}
        {(visit.status === 'matched' || visit.status === 'en_route') && (
          <OutlineButton label="Cancel visit" onPress={onCancel} height={46} fontSize={13} color={colors.dangerDark} borderColor={colors.dangerBorder} />
        )}
      </View>
    </Screen>
  );
}
