import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
import { ProfileProvider } from './src/state/profile';
import { NotificationsProvider } from './src/state/notifications';
import { AppAlertHost } from './src/components/AppAlert';
import { TabBar } from './src/components/TabBar';
import type { RootStackParamList, TabParamList } from './src/navigation/types';

import SplashScreen from './src/screens/auth/SplashScreen';
import SignInScreen from './src/screens/auth/SignInScreen';
import QueueScreen from './src/screens/queue/QueueScreen';
import VisitDetailScreen from './src/screens/queue/VisitDetailScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';

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
 */
function RootNavigator() {
  const { checking, signedIn } = useSession();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {checking ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !signedIn ? (
        <Stack.Screen name="SignIn" component={SignInScreen} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="VisitDetail" component={VisitDetailScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
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
      <SessionProvider>
        <ProfileProvider>
          <NotificationsProvider>
            <StatusBar style="dark" />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
            <AppAlertHost />
          </NotificationsProvider>
        </ProfileProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
