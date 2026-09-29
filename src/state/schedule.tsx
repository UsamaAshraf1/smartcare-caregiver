/**
 * Caregiver self-service scheduling — spec §10 (2026-09-16 revision).
 * `home_care_schedule_templates` got a new owner-scoped RLS policy letting
 * a caregiver read/write their own rows directly (previously admin-write
 * for every operation, including read); `generate_home_care_slots` was
 * relaxed to let a caregiver call it for their own `p_staff_user_id`
 * (previously admin-only). `home_care_staff_slots` already had public
 * SELECT, so viewing upcoming slots needed no RLS change — just the
 * client-side `starts_at=gt.now()` filter used below.
 */
import { supabase } from '../lib/supabase';

/** 0 = Sunday … 6 = Saturday, matching Postgres's own day_of_week/EXTRACT(DOW) convention. */
export type ScheduleTemplate = {
  id: string;
  staff_user_id: string;
  day_of_week: number;
  start_time: string; // 'HH:MM' or 'HH:MM:SS'
  end_time: string;
  slot_minutes: number;
  active: boolean;
  created_at: string;
};

export type NewScheduleTemplate = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
};

/** This caregiver's own recurring weekly availability rows. */
export async function fetchScheduleTemplates(staffUserId: string): Promise<ScheduleTemplate[]> {
  const { data, error } = await supabase
    .from('home_care_schedule_templates')
    .select('*')
    .eq('staff_user_id', staffUserId)
    .order('day_of_week', { ascending: true });
  if (error) {
    console.warn('[schedule] failed to load templates:', error.message);
    return [];
  }
  return (data ?? []) as ScheduleTemplate[];
}

export async function addScheduleTemplate(staffUserId: string, fields: NewScheduleTemplate): Promise<{ template?: ScheduleTemplate; error?: string }> {
  const { data, error } = await supabase
    .from('home_care_schedule_templates')
    .insert({ staff_user_id: staffUserId, active: true, ...fields })
    .select('*')
    .single();
  if (error) return { error: error.message };
  return { template: data as ScheduleTemplate };
}

export async function setScheduleTemplateActive(templateId: string, active: boolean): Promise<{ error?: string }> {
  const { error } = await supabase.from('home_care_schedule_templates').update({ active }).eq('id', templateId);
  if (error) return { error: error.message };
  return {};
}

export async function deleteScheduleTemplate(templateId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('home_care_schedule_templates').delete().eq('id', templateId);
  if (error) return { error: error.message };
  return {};
}

/** POST /rpc/generate_home_care_slots { p_staff_user_id, p_days_ahead } — materializes concrete bookable slots from the templates above. Returns how many were created. */
export async function generateHomeCareSlots(staffUserId: string, daysAhead = 14): Promise<{ count?: number; error?: string }> {
  const { data, error } = await supabase.rpc('generate_home_care_slots', { p_staff_user_id: staffUserId, p_days_ahead: daysAhead });
  if (error) return { error: error.message };
  return { count: data as number };
}

export type StaffSlot = {
  id: string;
  staff_user_id: string;
  provider_organization_id: string;
  starts_at: string;
  ends_at: string;
  status: 'open' | 'booked' | 'blocked';
  created_at: string;
};

/** This caregiver's own upcoming bookable slots (generated from the templates above). */
export async function fetchUpcomingSlots(staffUserId: string): Promise<StaffSlot[]> {
  const { data, error } = await supabase
    .from('home_care_staff_slots')
    .select('*')
    .eq('staff_user_id', staffUserId)
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });
  if (error) {
    console.warn('[schedule] failed to load upcoming slots:', error.message);
    return [];
  }
  return (data ?? []) as StaffSlot[];
}
