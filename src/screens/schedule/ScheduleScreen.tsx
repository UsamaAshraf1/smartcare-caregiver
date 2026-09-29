/**
 * Self-service scheduling — spec §10 (2026-09-16 revision). Three parts:
 * a recurring weekly template the caregiver now owns directly (RLS was
 * relaxed from admin-write-only), a "generate slots" action that
 * materializes concrete bookable slots from that template
 * (`generate_home_care_slots`, also newly caregiver-callable for their
 * own id), and a read-only list of the slots that produced.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Screen, ScreenHeader, Card, Chip, Tag, PrimaryButton, Note } from '../../components/ui';
import { Field } from '../../components/forms';
import { Icon } from '../../components/Icon';
import { FadeInUp, usePressScale } from '../../components/motion';
import { useProfile } from '../../state/profile';
import {
  fetchScheduleTemplates,
  addScheduleTemplate,
  setScheduleTemplateActive,
  deleteScheduleTemplate,
  generateHomeCareSlots,
  fetchUpcomingSlots,
  ScheduleTemplate,
  StaffSlot,
} from '../../state/schedule';
import { showAlert } from '../../components/AppAlert';
import { tapHaptic, successHaptic, warningHaptic } from '../../lib/haptics';
import { colors, t } from '../../theme';
import type { ScreenProps } from '../../navigation/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SLOT_STATUS_STYLE: Record<StaffSlot['status'], { label: string; bg: string; color: string }> = {
  open: { label: 'Open', bg: colors.successSoft, color: colors.successDark },
  booked: { label: 'Booked', bg: colors.primarySoft, color: colors.primary },
  blocked: { label: 'Blocked', bg: colors.fill, color: colors.textMuted },
};

function TemplateRow({ template, onToggleActive, onDelete }: { template: ScheduleTemplate; onToggleActive: () => void; onDelete: () => void }) {
  const press = usePressScale(0.9);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg }}>
      <View style={{ width: 40, height: 28, borderRadius: 8, backgroundColor: template.active ? colors.primarySoft : colors.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={t(11.5, 800, template.active ? colors.primary : colors.textFaint)}>{DAY_LABELS[template.day_of_week] ?? '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={t(13, 700, template.active ? colors.textBody : colors.textFaint)}>
          {template.start_time.slice(0, 5)} – {template.end_time.slice(0, 5)}
        </Text>
        <Text style={t(11, 400, colors.textFaint)}>{template.slot_minutes}-min slots</Text>
      </View>
      <Pressable onPress={onToggleActive} hitSlop={8}>
        <Text style={t(11.5, 700, template.active ? colors.textMuted : colors.primary)}>{template.active ? 'Pause' : 'Resume'}</Text>
      </Pressable>
      <Pressable onPress={onDelete} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={8}>
        <View style={press.style}>
          <Icon name="trash" size={16} color={colors.dangerDark} strokeWidth={2} />
        </View>
      </Pressable>
    </View>
  );
}

export default function ScheduleScreen({ navigation }: ScreenProps<'Schedule'>) {
  const { profile } = useProfile();
  const staffUserId = profile?.user_id;

  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [slots, setSlots] = useState<StaffSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [day, setDay] = useState(1); // Monday by default
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotMinutes, setSlotMinutes] = useState('60');
  const [addingRow, setAddingRow] = useState(false);

  const load = useCallback(async () => {
    if (!staffUserId) return;
    const [tpl, upcoming] = await Promise.all([fetchScheduleTemplates(staffUserId), fetchUpcomingSlots(staffUserId)]);
    setTemplates(tpl);
    setSlots(upcoming);
    setLoading(false);
  }, [staffUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const onAddTemplate = async () => {
    if (!staffUserId) return;
    const minutes = Number(slotMinutes.trim());
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      warningHaptic();
      showAlert('Check the times', 'Enter start and end time as HH:MM, e.g. 09:00.');
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) {
      warningHaptic();
      showAlert('Check the slot length', 'Slot length must be a number of minutes, e.g. 60.');
      return;
    }
    tapHaptic();
    const { template, error } = await addScheduleTemplate(staffUserId, {
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      slot_minutes: minutes,
    });
    if (error || !template) {
      warningHaptic();
      showAlert('Could not add availability', error ?? 'Please try again.');
      return;
    }
    successHaptic();
    setTemplates((list) => [...list, template].sort((a, b) => a.day_of_week - b.day_of_week));
    setAddingRow(false);
  };

  const onToggleActive = async (template: ScheduleTemplate) => {
    tapHaptic();
    const { error } = await setScheduleTemplateActive(template.id, !template.active);
    if (error) {
      warningHaptic();
      showAlert('Could not update', error);
      return;
    }
    setTemplates((list) => list.map((it) => (it.id === template.id ? { ...it, active: !it.active } : it)));
  };

  const onDeleteTemplate = (template: ScheduleTemplate) => {
    showAlert('Remove this availability?', `${DAY_LABELS[template.day_of_week]} ${template.start_time.slice(0, 5)}–${template.end_time.slice(0, 5)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteScheduleTemplate(template.id);
          if (error) {
            warningHaptic();
            showAlert('Could not remove it', error);
            return;
          }
          successHaptic();
          setTemplates((list) => list.filter((it) => it.id !== template.id));
        },
      },
    ]);
  };

  const onGenerateSlots = async () => {
    if (!staffUserId) return;
    tapHaptic();
    setGenerating(true);
    const { count, error } = await generateHomeCareSlots(staffUserId, 14);
    setGenerating(false);
    if (error) {
      warningHaptic();
      showAlert('Could not generate slots', error);
      return;
    }
    successHaptic();
    setSlots(await fetchUpcomingSlots(staffUserId));
    showAlert('Slots generated', `${count ?? 0} new bookable slot${count === 1 ? '' : 's'} created for the next 14 days.`);
  };

  return (
    <Screen>
      <ScreenHeader title="My schedule" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Card style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={t(13.5, 800)}>Weekly availability</Text>
            <Pressable onPress={() => setAddingRow((v) => !v)}>
              <Text style={t(12.5, 800, colors.primary)}>{addingRow ? 'Cancel' : '+ Add'}</Text>
            </Pressable>
          </View>

          {addingRow && (
            <View style={{ gap: 12, marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {DAY_LABELS.map((label, i) => (
                  <Chip key={label} label={label} active={day === i} onPress={() => setDay(i)} />
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Field label="Start" value={startTime} onChangeText={setStartTime} placeholder="09:00" style={{ flex: 1 }} />
                <Field label="End" value={endTime} onChangeText={setEndTime} placeholder="17:00" style={{ flex: 1 }} />
                <Field label="Slot (min)" value={slotMinutes} onChangeText={setSlotMinutes} placeholder="60" keyboardType="numeric" style={{ flex: 1 }} />
              </View>
              <PrimaryButton label="Add availability" onPress={onAddTemplate} height={46} fontSize={13} />
            </View>
          )}

          {!loading && templates.length === 0 && !addingRow && (
            <Text style={[t(12.5, 400, colors.textFaint), { marginTop: 8 }]}>No recurring availability set yet.</Text>
          )}
          <View style={{ marginTop: templates.length ? 6 : 0 }}>
            {templates.map((template) => (
              <TemplateRow key={template.id} template={template} onToggleActive={() => onToggleActive(template)} onDelete={() => onDeleteTemplate(template)} />
            ))}
          </View>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={t(13.5, 800)}>Generate bookable slots</Text>
          <Text style={t(12, 400, colors.textMuted)}>Turns the weekly availability above into concrete slots patients can book, for the next 14 days.</Text>
          <PrimaryButton label="Generate slots" onPress={onGenerateSlots} loading={generating} height={46} fontSize={13} />
        </Card>

        <View style={{ gap: 10 }}>
          <Text style={t(13, 700, colors.textBody)}>Upcoming slots</Text>
          {!loading && slots.length === 0 && <Text style={t(12.5, 400, colors.textFaint)}>No upcoming slots yet — generate some above.</Text>}
          {slots.map((slot, i) => {
            const style = SLOT_STATUS_STYLE[slot.status];
            return (
              <FadeInUp key={slot.id} delay={Math.min(i, 8) * 30}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={t(13, 700)}>
                    {new Date(slot.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <Tag label={style.label} bg={style.bg} color={style.color} height={24} fontSize={11} />
                </Card>
              </FadeInUp>
            );
          })}
        </View>

        <Note tone="neutral" icon="infoCircle">
          Slots already booked by a patient stay as "Booked" here — removing or pausing your weekly availability doesn't cancel a visit that's already been scheduled against a slot.
        </Note>
      </ScrollView>
    </Screen>
  );
}
