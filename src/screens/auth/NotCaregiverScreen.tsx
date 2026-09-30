/**
 * Shown instead of the app when someone signs in with an account whose
 * `profiles.role` isn't 'caregiver' — the mirror of the patient app's block
 * screen for caregiver accounts. Both apps share one GoTrue instance, so a
 * patient's credentials sign in here fine; without this they'd land on an
 * empty queue that looks broken rather than wrong-app. Like SplashScreen,
 * it never navigates itself: signing out flips `useSession().signedIn` and
 * RootNavigator swaps back to SignIn.
 */
import React from 'react';
import { View, Text, Image } from 'react-native';
import { Screen, OutlineButton, Note } from '../../components/ui';
import { useSession } from '../../state/session';
import { tapHaptic } from '../../lib/haptics';
import { colors, t } from '../../theme';

export default function NotCaregiverScreen() {
  const { signOut } = useSession();
  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 90, gap: 28 }}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Image source={require('../../../assets/logo-mark.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={t(21, 800)}>This app is for caregivers</Text>
            <Text style={[t(13, 400, colors.textMuted), { textAlign: 'center' }]}>
              The account you signed in with isn't set up as a SmartCare caregiver. To book or manage care, use the SmartCare patient app instead.
            </Text>
          </View>
        </View>

        <Note tone="neutral" icon="infoCircle">
          If you're a caregiver and expected to have access, contact your coordinator — caregiver accounts are provisioned by an admin.
        </Note>

        <OutlineButton
          label="Sign out"
          onPress={() => {
            tapHaptic();
            signOut();
          }}
          color={colors.dangerDark}
          borderColor={colors.dangerBorder}
          height={50}
          fontSize={14}
        />
      </View>
    </Screen>
  );
}
