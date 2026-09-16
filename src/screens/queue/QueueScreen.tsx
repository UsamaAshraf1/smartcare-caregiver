/**
 * The caregiver's home screen. Spec §3 originally speced this as an open
 * self-claim pool plus "my active queue", but this org's patients book a
 * specific staff member's slot directly (see state/homecare.tsx's module
 * comment on staff_slot_id) — visits arrive already `matched`, so the
 * open-request pool is always empty here and was removed from this screen
 * rather than shown permanently blank. It's still implemented in
 * state/homecare.tsx (fetchOpenHomeCareRequests / claimHomeCareVisit) for
 * an org — or a future flow on this one — that actually uses it.
 *
 * Polls every 8s since a push alert for a newly-matched visit isn't wired
 * up yet (spec §7 gap). New cards fade/rise in as they appear (keyed by
 * visit.id, so only genuinely new visits animate — existing ones don't
 * re-trigger on every poll).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, InlineButton, Screen, ScreenHeader, Tag, Toggle } from '../../components/ui';
import { FadeInUp, Pulse } from '../../components/motion';
import { useProfile, CAREGIVER_TYPE_LABEL } from '../../state/profile';
import { fetchMyCaregiverQueue, HomeCareVisit, PAYMENT_STATUS_LABEL } from '../../state/homecare';
import { showAlert } from '../../components/AppAlert';
import { tapHaptic, warningHaptic } from '../../lib/haptics';
import { colors, t } from '../../theme';
import type { RootStackParamList, TabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Queue'>, NativeStackScreenProps<RootStackParamList>>;

const STATUS_LABEL: Record<string, string> = {
  matched: 'Matched — head out when ready',
  en_route: 'En route',
  in_progress: 'In progress',
};

function VisitCard({ visit, delay, onPress }: { visit: HomeCareVisit; delay: number; onPress: () => void }) {
  return (
    <FadeInUp delay={delay}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={t(14.5, 800)}>{visit.address}</Text>
            <Text style={t(12, 400, colors.textMuted)}>
              {new Date(visit.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
          <Tag label={`AED ${visit.fee_aed ?? '—'}`} bg={colors.primarySoft} color={colors.primary} height={26} fontSize={11.5} />
        </View>
        {!!visit.address_note && <Text style={t(11.5, 400, colors.textFaint)}>{visit.address_note}</Text>}
        {visit.payment_status !== 'paid' && (
          <Text style={t(11, 700, visit.payment_status === 'failed' ? colors.dangerDark : colors.textFaint)}>
            {PAYMENT_STATUS_LABEL[visit.payment_status]}
          </Text>
        )}
        <InlineButton label={STATUS_LABEL[visit.status] ?? 'Open'} onPress={onPress} variant="outline" height={42} fontSize={13} />
      </Card>
    </FadeInUp>
  );
}

export default function QueueScreen({ navigation }: Props) {
  const { profile, setOnDuty } = useProfile();
  const [mine, setMine] = useState<HomeCareVisit[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);

  const load = useCallback(async () => {
    setMine(await fetchMyCaregiverQueue());
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const onRefresh = async () => {
    tapHaptic();
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onToggleDuty = async () => {
    if (!profile) return;
    tapHaptic();
    setTogglingDuty(true);
    const { error } = await setOnDuty(!profile.caregiver_active);
    setTogglingDuty(false);
    if (error) {
      warningHaptic();
      showAlert('Could not update your status', error);
    }
  };

  const typeLabel = profile?.caregiver_type ? CAREGIVER_TYPE_LABEL[profile.caregiver_type] : null;
  const onDuty = !!profile?.caregiver_active;

  return (
    <Screen>
      <ScreenHeader
        title="Job queue"
        subtitle={typeLabel ?? undefined}
        titleSize={22}
        right={
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Toggle value={onDuty} onPress={togglingDuty ? undefined : onToggleDuty} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {onDuty && <Pulse size={6} color={colors.success} />}
              <Text style={t(10, 700, onDuty ? colors.success : colors.textFaint)}>{onDuty ? 'On duty' : 'Off duty'}</Text>
            </View>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 22, paddingBottom: 30, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={t(13, 700, colors.textBody)}>My visits</Text>
        {mine.length === 0 ? (
          <Text style={t(12.5, 400, colors.textFaint)}>No visits assigned yet. New ones you're matched to will show up here.</Text>
        ) : (
          mine.map((visit, i) => (
            <VisitCard key={visit.id} visit={visit} delay={i * 40} onPress={() => navigation.navigate('VisitDetail', { visit })} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
