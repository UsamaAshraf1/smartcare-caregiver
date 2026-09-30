import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeCareVisit } from '../state/homecare';

export type RootStackParamList = {
  // Auth
  Splash: undefined;
  SignIn: undefined;
  // Signed in with an account whose profiles.role isn't 'caregiver'
  NotCaregiver: undefined;
  // Main tabs
  Tabs: { screen?: keyof TabParamList } | undefined;
  // Queue → visit detail. The full visit object, not just its id — see
  // VisitDetailScreen's comment on why it never re-fetches by id itself.
  VisitDetail: { visit: HomeCareVisit };
  // Visit detail → record/view vitals (spec §9) — only reachable while a
  // visit is in_progress, so the visit id alone is enough context.
  Vitals: { visitId: string };
  // Profile → edit
  EditProfile: undefined;
  // Profile → self-service weekly availability + slot generation (spec §10)
  Schedule: undefined;
};

export type TabParamList = {
  Queue: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
