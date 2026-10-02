/**
 * One recorded vitals reading, read-only. Shared by the Vitals screen (the
 * history under the entry form, while a visit is in progress) and the visit
 * screen of a completed visit — readings are a permanent record, so they
 * stay visible after the visit ends rather than disappearing with the
 * "Record vitals" button.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Card } from './ui';
import { FadeInUp } from './motion';
import type { VisitVitals } from '../state/vitals';
import { colors, t } from '../theme';

function VitalRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value === null || value === undefined) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={t(12.5, 400, colors.textMuted)}>{label}</Text>
      <Text style={t(12.5, 700)}>{`${value} ${unit}`}</Text>
    </View>
  );
}

export function VitalsEntryCard({ entry, delay = 0 }: { entry: VisitVitals; delay?: number }) {
  // `!= null` rather than truthiness: a 0 reading would otherwise render a
  // bare `0` outside <Text>, which crashes on device.
  const hasBp = entry.blood_pressure_systolic != null || entry.blood_pressure_diastolic != null;
  return (
    <FadeInUp delay={delay}>
      <Card style={{ gap: 8 }}>
        <Text style={t(11.5, 700, colors.textFaint)}>
          {new Date(entry.recorded_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
        </Text>
        <View style={{ gap: 4 }}>
          {hasBp && (
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
