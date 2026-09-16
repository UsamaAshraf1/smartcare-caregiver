/**
 * Spec §2 "Sign in": Supabase Auth SDK signInWithPassword(email, password),
 * same GoTrue instance the patient app uses. There is no self-service
 * sign-up — accounts are created one at a time by an org admin — so this
 * screen only ever calls signInWithEmail.
 */
import React, { useState } from 'react';
import { View, Text, Image, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen, PrimaryButton, Note } from '../../components/ui';
import { FadeInUp } from '../../components/motion';
import { Field } from '../../components/forms';
import { colors, t } from '../../theme';
import { useSession } from '../../state/session';
import { warningHaptic } from '../../lib/haptics';

/**
 * No navigation call on success on purpose: a successful signInWithEmail
 * flips useSession().signedIn to true, and RootNavigator (App.tsx) reacts
 * to that by swapping this screen out for Tabs itself — see the comment
 * on RootNavigator for why that's the right place for this to happen.
 */
export default function SignInScreen() {
  const { signInWithEmail } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      warningHaptic();
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: signInError } = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (signInError) {
      warningHaptic();
      setError(signInError);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 90, gap: 28 }}>
          <View style={{ alignItems: 'center', gap: 14 }}>
            <Image source={require('../../../assets/logo-mark.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={t(21, 800)}>Caregiver sign in</Text>
              <Text style={[t(13, 400, colors.textMuted), { textAlign: 'center' }]}>
                Use the email and password your coordinator set up for you
              </Text>
            </View>
          </View>

          <View style={{ gap: 16 }}>
            <Field label="Email" icon="mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@smartcare.ae" />
            <Field
              label="Password"
              icon="lock"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              trailing={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={t(12, 700, colors.primary)}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />
            {!!error && (
              <FadeInUp distance={4}>
                <Note tone="danger" icon="alertTriangle">{error}</Note>
              </FadeInUp>
            )}
            <PrimaryButton label="Sign in" onPress={onSubmit} loading={busy} />
          </View>

          <Note tone="neutral" icon="infoCircle">
            No self-signup — caregiver accounts are provisioned by an admin. If you don't have login details yet, contact your coordinator.
          </Note>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
