/**
 * Home-care visit data for the caregiver — real data backed by Supabase's
 * `public.home_care_visits` (RLS restricts open-request reads to the
 * caller's own caregiver_type per spec §3). Status only ever moves forward
 * through the RPCs below — there's no generic UPDATE grant on
 * home_care_visits, so this module never issues a raw `.update()` on it.
 * See ../../home_care_provider_app_spec.docx sections 3–6.
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
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

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
