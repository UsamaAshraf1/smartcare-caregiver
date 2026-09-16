/**
 * Purely presentational — shown only while `RootNavigator` (App.tsx) has
 * `useSession().checking === true`. It doesn't navigate itself: once the
 * persisted-session check finishes, RootNavigator swaps this screen out
 * for SignIn or Tabs automatically.
 */
import React from 'react';
import { Text, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { nightGradient, t } from '../../theme';

export default function SplashScreen() {
  return (
    <LinearGradient colors={[...nightGradient]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <Image source={require('../../../assets/logo-mark.png')} style={{ width: 64, height: 64 }} resizeMode="contain" />
      <Text style={t(16, 800, '#FFFFFF')}>SmartCare Caregiver</Text>
      <ActivityIndicator color="#FFFFFF" />
    </LinearGradient>
  );
}
