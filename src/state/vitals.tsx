/**
 * Structured vitals/visit-notes — spec §9 (2026-09-16 revision), a new
 * table (`public.home_care_visit_vitals`) separate from the single
 * free-text `notes` field on `home_care_visits` itself. RLS: a caregiver
 * may insert only while the visit is `in_progress` and they're the
 * assigned caregiver; caregiver and patient may both read every entry for
 * a visit they're party to. This module never tries to update or delete a
 * row — the spec describes GET/POST only, so an entry is a permanent,
 * timestamped record once saved.
 */
import { supabase } from '../lib/supabase';

export type VisitVitals = {
  id: string;
  visit_id: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature_c: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  notes: string | null;
  recorded_at: string;
  recorded_by: string;
};

/** Every vitals entry recorded for a visit, newest first — visible to both the assigned caregiver and the patient. */
export async function fetchVisitVitals(visitId: string): Promise<VisitVitals[]> {
  const { data, error } = await supabase
    .from('home_care_visit_vitals')
    .select('*')
    .eq('visit_id', visitId)
    .order('recorded_at', { ascending: false });
  if (error) {
    console.warn('[vitals] failed to load entries:', error.message);
    return [];
  }
  return (data ?? []) as VisitVitals[];
}

export type NewVisitVitals = {
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  heart_rate?: number | null;
  temperature_c?: number | null;
  spo2?: number | null;
  respiratory_rate?: number | null;
  notes?: string | null;
};

/**
 * Records one vitals entry. `recorded_by` is sent explicitly as the
 * signed-in caregiver's own id rather than left to a default, since the
 * RLS insert check (caregiver must be both the recorder and the visit's
 * assigned caregiver) reads more safely when the client states its
 * identity than when it relies on an unstated server default lining up.
 */
export async function recordVisitVitals(visitId: string, fields: NewVisitVitals): Promise<{ entry?: VisitVitals; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'Not signed in.' };
  const { data, error } = await supabase
    .from('home_care_visit_vitals')
    .insert({ visit_id: visitId, recorded_by: session.user.id, ...fields })
    .select('*')
    .single();
  if (error) return { error: error.message };
  return { entry: data as VisitVitals };
}
