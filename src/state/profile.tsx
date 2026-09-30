/**
 * Caregiver profile — backed by the same `public.profiles` table the
 * patient app uses. Spec §2 names the exact fields this app is allowed to
 * rely on today: role, caregiver_type, caregiver_active,
 * caregiver_credentials, caregiver_vehicle, phone, email (plus name for
 * display). What
 * makes a signed-in user a caregiver is the `role` column, not anything the
 * auth layer distinguishes.
 *
 * `profiles_update_own` (RLS) lets a signed-in user update any column on
 * their own row, so both the on-duty toggle and the profile-edit form below
 * go through the same `applyProfileUpdate` helper — the split isn't a
 * backend restriction, it's this app choosing not to expose `role` or
 * `caregiver_type` as editable, since those are admin-provisioned per spec §2.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CaregiverType = 'lab' | 'nurse' | 'care_giver' | 'doctor' | 'physio' | null;

export type CaregiverProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'patient' | 'caregiver';
  caregiver_type: CaregiverType;
  caregiver_active: boolean;
  caregiver_credentials: string | null;
  caregiver_vehicle: string | null;
  /** Read-only here — email is the sign-in identity, and both are set when the admin provisions the account. */
  phone: string | null;
  email: string | null;
};

/** The subset of the profile a caregiver can edit themselves in this app. */
export type ProfileEditableFields = Partial<Pick<CaregiverProfile, 'first_name' | 'last_name' | 'caregiver_credentials' | 'caregiver_vehicle'>>;

type ProfileContextValue = {
  profile: CaregiverProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** PATCH /profiles?id=eq.<uid> { caregiver_active } — spec §2 "Toggle on duty". */
  setOnDuty: (active: boolean) => Promise<{ error?: string }>;
  /** PATCH /profiles?id=eq.<uid> { first_name, last_name, caregiver_credentials, caregiver_vehicle } — the Edit Profile screen. */
  updateProfile: (fields: ProfileEditableFields) => Promise<{ error?: string }>;
};

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  loading: false,
  error: null,
  refresh: async () => {},
  setOnDuty: async () => ({}),
  updateProfile: async () => ({}),
});

const SELECT_FIELDS = 'user_id, first_name, last_name, role, caregiver_type, caregiver_active, caregiver_credentials, caregiver_vehicle, phone, email';

/**
 * `create_staff_member` (infra migration 029) creates the auth user with an
 * email but never copies it onto `profiles.email`, so an admin-provisioned
 * caregiver's row usually has it null — fall back to the sign-in email,
 * which is the same address.
 */
function withSignInEmail(row: CaregiverProfile, signInEmail: string | undefined): CaregiverProfile {
  return { ...row, email: row.email ?? signInEmail ?? null };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Set before the first await, so it lands in the same render as the
    // session flipping to signed-in — RootNavigator (App.tsx) holds on
    // Splash while this is true, rather than flashing the caregiver tabs
    // before the role check has anything to check.
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchError } = await supabase.from('profiles').select(SELECT_FIELDS).eq('user_id', session.user.id).maybeSingle();
    if (fetchError) {
      console.warn('[profile] failed to load:', fetchError.message);
      setError(fetchError.message);
    } else {
      setProfile(data ? withSignInEmail(data as CaregiverProfile, session.user.email) : null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => refresh());
    return () => subscription.unsubscribe();
  }, [refresh]);

  const applyProfileUpdate = useCallback(async (fields: Partial<CaregiverProfile>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { error: 'Not signed in.' };
    const { data, error: updateError } = await supabase.from('profiles').update(fields).eq('user_id', session.user.id).select(SELECT_FIELDS).single();
    if (updateError) {
      console.warn('[profile] failed to update:', updateError.message);
      return { error: updateError.message };
    }
    setProfile(withSignInEmail(data as CaregiverProfile, session.user.email));
    return {};
  }, []);

  const setOnDuty = useCallback((active: boolean) => applyProfileUpdate({ caregiver_active: active }), [applyProfileUpdate]);
  const updateProfile = useCallback((fields: ProfileEditableFields) => applyProfileUpdate(fields), [applyProfileUpdate]);

  const value = useMemo(
    () => ({ profile, loading, error, refresh, setOnDuty, updateProfile }),
    [profile, loading, error, refresh, setOnDuty, updateProfile],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);

export function fullName(profile: CaregiverProfile | null, fallback = 'there'): string {
  if (!profile) return fallback;
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || fallback;
}

export function initials(profile: CaregiverProfile | null, fallback = '?'): string {
  if (!profile) return fallback;
  const chars = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('');
  return chars.toUpperCase() || fallback;
}

export const CAREGIVER_TYPE_LABEL: Record<string, string> = {
  lab: 'Lab technician',
  nurse: 'Nurse',
  care_giver: 'Caregiver',
  doctor: 'Doctor at home',
  physio: 'Physiotherapist',
};
