/**
 * Home-care visit data for the caregiver — real data backed by Supabase's
 * `public.home_care_visits` (RLS restricts open-request reads to the
 * caller's own caregiver_type per spec §3). Status only ever moves forward
 * through the RPCs below — there's no generic UPDATE grant on
 * home_care_visits, so this module never issues a raw `.update()` on it.
 * See ../../home_care_provider_app_spec_2.docx sections 3–6, 11 (revised
 * 2026-09-16 — patient-info and rating RPCs below are new in that revision).
 *
 * Two booking paths feed this table (see infra migration 011's comment on
 * `staff_slot_id`): the open self-claim queue (`status='requested'` until
 * claimed) and slot-booking, where a patient books a specific staff
 * member's slot directly — that visit arrives already `matched`, with
 * `caregiver_user_id` and `staff_slot_id` set, and never passes through
 * `requested` at all. A caregiver whose org only uses slot-booking will
 * always see an empty open-request pool — that's expected, not a bug.
 */
import { supabase } from '../lib/supabase';

export type HomeCareVisitStatus = 'requested' | 'matched' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type HomeCareVisit = {
  id: string;
  patient_user_id: string;
  family_member_id: string | null;
  service_id: string;
  provider_organization_id: string;
  caregiver_user_id: string | null;
  address: string;
  address_note: string | null;
  scheduled_at: string;
  status: HomeCareVisitStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  fee_aed: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  /** Set only for slot-booked visits (see module note above) — null for open-queue claims. */
  staff_slot_id: string | null;
  payment_status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  /**
   * Where the visit is going — infra migration 036. The patient's own pin,
   * dropped on the address form and copied onto the visit at booking. Null
   * for visits booked before that shipped. `dest_approx` marks a server
   * geocode of the text address rather than a pin (none are written yet).
   * PostgREST sends `numeric` as a JSON number; `toCoord` below also takes
   * a string, in case that ever changes.
   */
  dest_lat?: number | string | null;
  dest_lng?: number | string | null;
  dest_approx?: boolean;
  /**
   * Routed ETA + road shape (Google encoded polyline) — infra migration 037.
   * Written by the *patient's* tracking screen via care-api, about once a
   * minute, only while that screen is open and the visit is en_route — so
   * it's often absent or stale here. Treat as a bonus over this app's own
   * rough ETA, never as the source of truth.
   */
  route_eta_minutes?: number | null;
  route_polyline?: string | null;
  route_updated_at?: string | null;
};

/** The visit's destination as a map coordinate, or null when it has no pin. */
export function visitDestination(visit: HomeCareVisit): { latitude: number; longitude: number } | null {
  const lat = visit.dest_lat == null ? NaN : Number(visit.dest_lat);
  const lng = visit.dest_lng == null ? NaN : Number(visit.dest_lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

/** The job-type catalog a visit's `service_id` points at — `public.home_care_services`, readable by any signed-in user. */
export type HomeCareService = {
  id: string;
  name: string;
  detail: string | null;
  fee_aed: number;
  duration_minutes: number;
  caregiver_type: string | null;
};

// The catalog is small and changes rarely (admin-edited), so it's fetched
// once per app session and shared by every screen that labels a visit —
// the queue polls every 8s and shouldn't re-fetch this on each poll.
let servicesPromise: Promise<Record<string, HomeCareService>> | null = null;

/** Every service by id, including inactive ones — an old visit can still point at a service that's since been retired. */
export function fetchHomeCareServices(): Promise<Record<string, HomeCareService>> {
  if (!servicesPromise) {
    servicesPromise = (async () => {
      const { data, error } = await supabase.from('home_care_services').select('id, name, detail, fee_aed, duration_minutes, caregiver_type');
      if (error) {
        console.warn('[homecare] failed to load services:', error.message);
        servicesPromise = null; // don't cache a failure — let the next caller retry
        return {};
      }
      return Object.fromEntries(((data ?? []) as HomeCareService[]).map((s) => [s.id, s]));
    })();
  }
  return servicesPromise;
}

/** Dependent/family member a visit is for, when it isn't for the account holder — spec §6. */
export type FamilyMember = {
  id: string;
  first_name: string;
  last_name: string;
  relation: string;
  dob: string | null;
  gender: 'female' | 'male' | 'other' | null;
};

/**
 * Open (unclaimed) requests matching the caller's caregiver_type — spec §3
 * "Browse open jobs". RLS does the type filtering. Not currently called
 * from any screen: this org's visits all arrive slot-booked (see module
 * note), so this pool is always empty for it today. Left in place for
 * whichever org — or whichever future flow for this one — actually uses
 * the open-claim queue.
 */
export async function fetchOpenHomeCareRequests(): Promise<HomeCareVisit[]> {
  const { data, error } = await supabase.from('home_care_visits').select('*').eq('status', 'requested').order('scheduled_at', { ascending: true });
  if (error) {
    console.warn('[homecare] failed to load open requests:', error.message);
    return [];
  }
  return (data ?? []) as HomeCareVisit[];
}

/** This caregiver's own active queue — spec §3 "My active queue" via my_caregiver_queue() RPC. */
export async function fetchMyCaregiverQueue(): Promise<HomeCareVisit[]> {
  const { data, error } = await supabase.rpc('my_caregiver_queue');
  if (error) {
    console.warn('[homecare] failed to load caregiver queue:', error.message);
    return [];
  }
  return (data ?? []) as HomeCareVisit[];
}

/**
 * This caregiver's finished visits (completed or cancelled), newest first —
 * the Past visits screen. There's no RPC for this: `my_caregiver_queue()`
 * deliberately stops at active visits, so this reads the table directly,
 * which `home_care_visits_select` (infra migration 013) allows for the
 * visit's own caregiver. That direct-read path is the one the
 * profiles↔home_care_visits RLS recursion used to 500 (fixed server-side
 * by migration 033), so the error is returned rather than swallowed — the
 * screen says "couldn't load" instead of an empty list that reads as
 * "you've never done a visit".
 */
export async function fetchMyPastVisits(limit = 50): Promise<{ visits: HomeCareVisit[]; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { visits: [] };
  const { data, error } = await supabase
    .from('home_care_visits')
    .select('*')
    .eq('caregiver_user_id', session.user.id)
    .in('status', ['completed', 'cancelled'])
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[homecare] failed to load past visits:', error.message);
    return { visits: [], error: error.message };
  }
  return { visits: (data ?? []) as HomeCareVisit[] };
}

/**
 * One visit by id, straight from the table. Not currently called from any
 * screen — VisitDetailScreen is handed the visit object it already has
 * from the queue list instead (see its comment), because this exact query
 * was coming back as a PostgREST 500 against the shared dev sandbox.
 * Kept here as a documented, available fallback for the day something
 * needs to look up a visit it doesn't already have in memory (a deep
 * link, say) — fix whatever's throwing server-side before wiring this
 * back in.
 */
export async function fetchHomeCareVisit(visitId: string): Promise<HomeCareVisit | null> {
  const { data, error } = await supabase.from('home_care_visits').select('*').eq('id', visitId).maybeSingle();
  if (error) {
    console.warn('[homecare] failed to load visit:', error.message);
    return null;
  }
  return data as HomeCareVisit | null;
}

/** Spec §6 — GET /family_members?id=eq.<family_member_id>, only when the visit isn't for the account holder. */
export async function fetchFamilyMember(familyMemberId: string): Promise<FamilyMember | null> {
  const { data, error } = await supabase.from('family_members').select('id, first_name, last_name, relation, dob, gender').eq('id', familyMemberId).maybeSingle();
  if (error) {
    console.warn('[homecare] failed to load family member:', error.message);
    return null;
  }
  return data as FamilyMember | null;
}

/**
 * Spec §6 (2026-09-16 revision) — everything a caregiver is allowed to see
 * about who they're visiting, in one call: `get_home_care_patient_info(p_visit_id)`.
 * Access is scoped to the visit's active lifecycle server-side (matched /
 * en_route / in_progress) — it lapses once the visit is completed or
 * cancelled, so this is only ever called while a visit is still active
 * (see VisitDetailScreen). Supersedes the old two-call pattern of fetching
 * the visit, then separately calling fetchFamilyMember above for dependent
 * details — this one RPC now returns both in a single response.
 *
 * Per the spec's own request/response example, this RPC returns a row
 * *set* — PostgREST/supabase-js hands back an array (one row when
 * entitled, `[]` when not, not an error) — not a single object. `conditions`
 * and `allergies` are each an array of strings, not one combined string.
 */
export type PatientInfo = {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  dob: string | null;
  gender: 'female' | 'male' | 'other' | null;
  blood_type: string | null;
  conditions: string[] | null;
  allergies: string[] | null;
  /** Set only when the visit is for a dependent rather than the account holder — same intent as FamilyMember above, inlined here instead of a separate call. */
  dependent_first_name: string | null;
  dependent_last_name: string | null;
  dependent_relation: string | null;
};

export async function fetchPatientInfo(visitId: string): Promise<PatientInfo | null> {
  const { data, error } = await supabase.rpc('get_home_care_patient_info', { p_visit_id: visitId });
  if (error) {
    // Expected once the visit is completed/cancelled — access lapses by
    // design (see comment above), not a bug. Anything else still just
    // logs and falls back to showing what the visit row itself has.
    console.warn('[homecare] failed to load patient info:', error.message);
    return null;
  }
  // `[]` (not entitled) and a genuinely empty result both land here as null.
  const rows = (data ?? []) as PatientInfo[];
  return rows[0] ?? null;
}

/** Spec §11 — the caregiver's own aggregate rating, across every visit that's been rated. Also returns a row set — see PatientInfo's comment above; unwrapped the same way. */
export type CaregiverRating = { average_rating: number | null; rating_count: number };

export async function fetchMyCaregiverRating(): Promise<CaregiverRating | null> {
  const { data, error } = await supabase.rpc('get_my_caregiver_rating');
  if (error) {
    console.warn('[homecare] failed to load caregiver rating:', error.message);
    return null;
  }
  const rows = (data ?? []) as CaregiverRating[];
  return rows[0] ?? null;
}

/** Spec §3 "Claim an open job" — POST /rpc/claim_home_care_visit. */
export async function claimHomeCareVisit(visitId: string): Promise<{ visit?: HomeCareVisit; error?: string }> {
  const { data, error } = await supabase.rpc('claim_home_care_visit', { p_visit_id: visitId });
  if (error) return { error: error.message };
  return { visit: data as HomeCareVisit };
}

/** Spec §4 — the one-step-at-a-time status machine: en_route → in_progress → completed. */
export async function updateHomeCareVisitStatus(
  visitId: string,
  status: 'en_route' | 'in_progress' | 'completed',
  notes?: string | null,
): Promise<{ visit?: HomeCareVisit; error?: string }> {
  const { data, error } = await supabase.rpc('update_home_care_visit_status', {
    p_visit_id: visitId,
    p_status: status,
    p_notes: notes ?? null,
  });
  if (error) return { error: error.message };
  return { visit: data as HomeCareVisit };
}

/** Spec §4 "Cancel a visit (caregiver-initiated)" — also frees the booked time slot, if one was used. */
export async function cancelHomeCareVisit(visitId: string, reason?: string): Promise<{ visit?: HomeCareVisit; error?: string }> {
  const { data, error } = await supabase.rpc('cancel_home_care_visit', { p_visit_id: visitId, p_reason: reason ?? null });
  if (error) return { error: error.message };
  return { visit: data as HomeCareVisit };
}
