/**
 * Lets a caregiver update the fields this app treats as self-editable:
 * name, credentials, vehicle. `role` and `caregiver_type` stay off this
 * screen on purpose — those are admin-provisioned per spec §2, even though
 * `profiles_update_own` (RLS) would technically allow a caregiver to change
 * them too. Keeping them out of the UI is this app's own guardrail, not a
 * backend one.
 */
import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen, ScreenHeader, Card, PrimaryButton, Note } from '../../components/ui';
import { Field } from '../../components/forms';
import { useProfile } from '../../state/profile';
import { showAlert } from '../../components/AppAlert';
import { tapHaptic, successHaptic, warningHaptic } from '../../lib/haptics';
import type { ScreenProps } from '../../navigation/types';

export default function EditProfileScreen({ navigation }: ScreenProps<'EditProfile'>) {
  const { profile, updateProfile } = useProfile();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [credentials, setCredentials] = useState(profile?.caregiver_credentials ?? '');
  const [vehicle, setVehicle] = useState(profile?.caregiver_vehicle ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    firstName !== (profile?.first_name ?? '') ||
    lastName !== (profile?.last_name ?? '') ||
    credentials !== (profile?.caregiver_credentials ?? '') ||
    vehicle !== (profile?.caregiver_vehicle ?? '');

  const onSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      warningHaptic();
      setError('First and last name can\'t be empty.');
      return;
    }
    tapHaptic();
    setBusy(true);
    setError(null);
    const { error: updateError } = await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      caregiver_credentials: credentials.trim() || null,
      caregiver_vehicle: vehicle.trim() || null,
    });
    setBusy(false);
    if (updateError) {
      warningHaptic();
      setError(updateError);
      return;
    }
    successHaptic();
    navigation.goBack();
  };

  return (
    <Screen>
      <ScreenHeader title="Edit profile" onBack={navigation.goBack} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
          <Card style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" style={{ flex: 1 }} />
              <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" style={{ flex: 1 }} />
            </View>
            <Field label="Credentials" icon="idCard" value={credentials} onChangeText={setCredentials} placeholder="e.g. RN, DHA licensed" />
            <Field label="Vehicle" icon="truck" value={vehicle} onChangeText={setVehicle} placeholder="e.g. Toyota Camry · A12345" />
          </Card>

          {!!error && (
            <Note tone="danger" icon="alertTriangle">
              {error}
            </Note>
          )}

          <Note tone="neutral" icon="infoCircle">
            Your role and specialty are set by your coordinator and can't be changed here.
          </Note>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 22, paddingBottom: 24 }}>
        <PrimaryButton label="Save changes" onPress={onSave} loading={busy} disabled={!dirty} />
      </View>
    </Screen>
  );
}
