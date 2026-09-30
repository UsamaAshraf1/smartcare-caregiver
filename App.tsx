import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { colors } from './src/theme';
import { SessionProvider, useSession } from './src/state/session';
import { ProfileProvider, useProfile } from './src/state/profile';
import { NotificationsProvider } from './src/state/notifications';
import { AppAlertHost } from './src/components/AppAlert';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { TabBar } from './src/components/TabBar';
import { configureForegroundNotifications } from './src/lib/pushNotifications';
import { navigationRef, openNotificationTarget } from './src/lib/notificationRouting';
import type { RootStackParamList, TabParamList } from './src/navigation/types';

import SplashScreen from './src/screens/auth/SplashScreen';
import SignInScreen from './src/screens/auth/SignInScreen';
import NotCaregiverScreen from './src/screens/auth/NotCaregiverScreen';
import QueueScreen from './src/screens/queue/QueueScreen';
import VisitDetailScreen from './src/screens/queue/VisitDetailScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';
import VitalsScreen from './src/screens/queue/VitalsScreen';
import ScheduleScreen from './src/screens/schedule/ScheduleScreen';

configureForegroundNotifications();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Queue" component={QueueScreen as React.ComponentType<{}>} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * Session-gated root navigator — the standard React Navigation auth
 * pattern: which screens exist is driven directly by `useSession()`, so
 * the navigator swaps automatically the instant sign-in or sign-out
 * changes `signedIn`, in either direction. This is what makes
 * ProfileScreen's "Sign out" button actually land back on SignIn — it
 * only ever calls `supabase.auth.signOut()`; it never navigates itself.
 *
 * The role check works the same way: patients sign in against the same
 * GoTrue instance, so a signed-in session alone doesn't mean "caregiver".
 * Splash holds while the profile is still loading so a patient never sees
 * a flash of the caregiver tabs before being blocked.
 */
function RootNavigator() {
  const { checking, signedIn } = useSession();
  const { profile, loading: profileLoading } = useProfile();
  const waitingForProfile = signedIn && !profile && profileLoading;
  const notCaregiver = signedIn && !!profile && profile.role !== 'caregiver';
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {checking || waitingForProfile ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !signedIn ? (
        <Stack.Screen name="SignIn" component={SignInScreen} />
      ) : notCaregiver ? (
        <Stack.Screen name="NotCaregiver" component={NotCaregiverScreen} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="VisitDetail" component={VisitDetailScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Vitals" component={VitalsScreen} />
          <Stack.Screen name="Schedule" component={ScheduleScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

/**
 * Opens whatever a tapped push points at (see lib/notificationRouting.ts).
 * `useLastNotificationResponse` covers both a tap that cold-starts the app
 * and one that brings it back from the background. The tap is held until
 * navigation is mounted and a caregiver is signed in — a cold start taps
 * before either is true — and each tap is only ever handled once.
 * Native only: the hook throws on web, where there are no pushes to tap.
 */
function NotificationTapRouterNative({ navigationReady }: { navigationReady: boolean }) {
  const { signedIn } = useSession();
  const { profile } = useProfile();
  const response = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);
  const canRoute = navigationReady && signedIn && profile?.role === 'caregiver';

  useEffect(() => {
    if (!response || !canRoute) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handledId.current === id) return;
    handledId.current = id;
    openNotificationTarget(response.notification.request.content.data);
  }, [response, canRoute]);

  return null;
}

const NotificationTapRouter = Platform.OS === 'web' ? () => null : NotificationTapRouterNative;

export default function App() {
  const [navigationReady, setNavigationReady] = useState(false);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.navyDeep }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SessionProvider>
          <ProfileProvider>
            <NotificationsProvider>
              <StatusBar style="dark" />
              <NavigationContainer ref={navigationRef} onReady={() => setNavigationReady(true)}>
                <RootNavigator />
              </NavigationContainer>
              <NotificationTapRouter navigationReady={navigationReady} />
              <AppAlertHost />
            </NotificationsProvider>
          </ProfileProvider>
        </SessionProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
