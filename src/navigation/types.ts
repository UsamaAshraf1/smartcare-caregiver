import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeCareVisit } from '../state/homecare';

export type RootStackParamList = {
  // Auth
  Splash: undefined;
  SignIn: undefined;
  // Main tabs
  Tabs: { screen?: keyof TabParamList } | undefined;
  // Queue → visit detail. The full visit object, not just its id — see
  // VisitDetailScreen's comment on why it never re-fetches by id itself.
  VisitDetail: { visit: HomeCareVisit };
  // Profile → edit
  EditProfile: undefined;
};

export type TabParamList = {
  Queue: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
