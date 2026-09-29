/**
 * Structured vitals for one visit — spec §9 (2026-09-16 revision). Reached
 * only from VisitDetailScreen's "Record vitals" button, which itself only
 * shows while the visit is `in_progress` — matching the RLS insert rule
 * (caregiver may insert only while in_progress and assigned). Every past
 * entry for the visit is listed below the form; both the caregiver and
 * the patient can read all of them, per the same RLS.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { Screen, ScreenHeader, Card, PrimaryButton } from '../../components/ui';
import { Field } from '../../components/forms';
import { FadeInUp } from '../../components/motion';
import { fetchVisitVitals, recordVisitVitals, VisitVitals } from '../../state/vitals';
import { showAlert } from '../../components/AppAlert';
import { tapHaptic, successHaptic, warningHaptic } from '../../lib/haptics';
import { colors, t } from '../../theme';
import type { ScreenProps } from '../../navigation/types';

function VitalRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value === null || value === undefined) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={t(12.5, 400, colors.textMuted)}>{label}</Text>
      <Text style={t(12.5, 700)}>{`${value} ${unit}`}</Text>
    </View>
  );
}

function EntryCard({ entry, delay }: { entry: VisitVitals; delay: number }) {
  return (
    <FadeInUp delay={delay}>
      <Card style={{ gap: 8 }}>
        <Text style={t(11.5, 700, colors.textFaint)}>
          {new Date(entry.recorded_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
        </Text>
        <View style={{ gap: 4 }}>
          {(entry.blood_pressure_systolic || entry.blood_pressure_diastolic) && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={t(12.5, 400, colors.textMuted)}>Blood pressure</Text>
              <Text style={t(12.5, 700)}>{`${entry.blood_pressure_systolic ?? '—'}/${entry.blood_pressure_diastolic ?? '—'} mmHg`}</Text>
            </View>
          )}
          <VitalRow label="Heart rate" value={entry.heart_rate} unit="bpm" />
          <VitalRow label="Temperature" value={entry.temperature_c} unit="°C" />
          <VitalRow label="SpO2" value={entry.spo2} unit="%" />
          <VitalRow label="Respiratory rate" value={entry.respiratory_rate} unit="breaths/min" />
        </View>
        {!!entry.notes && <Text style={t(12.5, 400, colors.textBody)}>{entry.notes}</Text>}
      </Card>
    </FadeInUp>
  );
}

export default function VitalsScreen({ navigation, route }: ScreenProps<'Vitals'>) {
  const { visitId } = route.params;
  const [entries, setEntries] = useState<VisitVitals[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setEntries(await fetchVisitVitals(visitId));
    setLoading(false);
  }, [visitId]);

  useEffect(() => {
    load();
  }, [load]);

  const toNumber = (text: string): number | undefined => {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  };

  const onSave = async () => {
    const fields = {
      blood_pressure_systolic: toNumber(systolic) ?? null,
      blood_pressure_diastolic: toNumber(diastolic) ?? null,
      heart_rate: toNumber(heartRate) ?? null,
      temperature_c: toNumber(temperature) ?? null,
      spo2: toNumber(spo2) ?? null,
      respiratory_rate: toNumber(respiratoryRate) ?? null,
      notes: notes.trim() || null,
    };
    const hasAnyValue = Object.entries(fields).some(([key, value]) => key !== 'notes' && value !== null);
    if (!hasAnyValue) {
      warningHaptic();
      showAlert('Nothing to save', 'Enter at least one reading before saving.');
      return;
    }
    tapHaptic();
    setSaving(true);
    const { entry, error } = await recordVisitVitals(visitId, fields);
    setSaving(false);
    if (error || !entry) {
      warningHaptic();
      showAlert('Could not save vitals', error ?? 'Please try again.');
      return;
    }
    successHaptic();
    setEntries((list) => [entry, ...list]);
    setSystolic('');
    setDiastolic('');
    setHeartRate('');
    setTemperature('');
    setSpo2('');
    setRespiratoryRate('');
    setNotes('');
  };

  return (
    <Screen>
      <ScreenHeader title="Vitals" subtitle="Recorded during this visit" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <Card style={{ gap: 14 }}>
          <Text style={t(13.5, 800)}>New reading</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field label="Systolic" value={systolic} onChangeText={setSystolic} placeholder="120" keyboardType="numeric" style={{ flex: 1 }} />
            <Field label="Diastolic" value={diastolic} onChangeText={setDiastolic} placeholder="80" keyboardType="numeric" style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field label="Heart rate (bpm)" value={heartRate} onChangeText={setHeartRate} placeholder="72" keyboardType="numeric" style={{ flex: 1 }} />
            <Field label="Temp (°C)" value={temperature} onChangeText={setTemperature} placeholder="36.8" keyboardType="numeric" style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field label="SpO2 (%)" value={spo2} onChangeText={setSpo2} placeholder="98" keyboardType="numeric" style={{ flex: 1 }} />
            <Field label="Resp. rate" value={respiratoryRate} onChangeText={setRespiratoryRate} placeholder="16" keyboardType="numeric" style={{ flex: 1 }} />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={t(13.5, 700, colors.textBody)}>Notes</Text>
            <View style={{ backgroundColor: colors.fill, borderRadius: 14, padding: 14, minHeight: 60 }}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything else worth noting about this reading"
                placeholderTextColor={colors.textFaint}
                multiline
                style={[t(13, 500, colors.textBody), { minHeight: 46, textAlignVertical: 'top' }]}
              />
            </View>
          </View>
          <PrimaryButton label="Save reading" onPress={onSave} loading={saving} height={50} fontSize={14} />
        </Card>

        <View style={{ gap: 10 }}>
          <Text style={t(13, 700, colors.textBody)}>History</Text>
          {!loading && entries.length === 0 && <Text style={t(12.5, 400, colors.textFaint)}>No vitals recorded for this visit yet.</Text>}
          {entries.map((entry, i) => (
            <EntryCard key={entry.id} entry={entry} delay={i * 40} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
