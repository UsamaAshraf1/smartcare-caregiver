import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, ScrollView } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, ScreenHeader, Card, Avatar, Tag, Toggle, OutlineButton, ListRow } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { FadeInUp, Pulse, usePressScale } from '../../components/motion';
import { useProfile, fullName, initials, CAREGIVER_TYPE_LABEL } from '../../state/profile';
import { useSession } from '../../state/session';
import { fetchMyCaregiverRating, CaregiverRating } from '../../state/homecare';
import { showAlert } from '../../components/AppAlert';
import { tapHaptic, warningHaptic } from '../../lib/haptics';
import { colors, t } from '../../theme';
import type { RootStackParamList, TabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Profile'>, NativeStackScreenProps<RootStackParamList>>;

/** Small circular icon button — same press-spring language as the rest of the app. */
function EditButton({ onPress }: { onPress: () => void }) {
  const press = usePressScale(0.9);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} hitSlop={8}>
      <Animated.View
        style={[
          { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
          press.style,
        ]}
      >
        <Icon name="edit" size={16} color={colors.textBody} strokeWidth={2} />
      </Animated.View>
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const { profile, setOnDuty } = useProfile();
  const { signOut } = useSession();
  const [togglingDuty, setTogglingDuty] = useState(false);
  const [rating, setRating] = useState<CaregiverRating | null>(null);
  const onDuty = !!profile?.caregiver_active;

  useEffect(() => {
    fetchMyCaregiverRating().then(setRating);
  }, []);

  const onToggleDuty = async () => {
    if (!profile) return;
    tapHaptic();
    setTogglingDuty(true);
    const { error } = await setOnDuty(!profile.caregiver_active);
    setTogglingDuty(false);
    if (error) {
      warningHaptic();
      showAlert('Could not update your status', error);
    }
  };

  const onSignOut = () => {
    tapHaptic();
    showAlert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }]);
  };

  return (
    <Screen>
      <ScreenHeader title="Profile" titleSize={22} right={<EditButton onPress={() => navigation.navigate('EditProfile')} />} />
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 22, paddingBottom: 30, gap: 16 }} showsVerticalScrollIndicator={false}>
        <FadeInUp>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Avatar initials={initials(profile)} size={56} fontSize={18} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={t(16, 800)}>{fullName(profile)}</Text>
              {!!profile?.caregiver_type && <Tag label={CAREGIVER_TYPE_LABEL[profile.caregiver_type] ?? profile.caregiver_type} />}
            </View>
            {!!rating && rating.rating_count > 0 && (
              <View style={{ alignItems: 'center', gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Icon name="star" size={13} color={colors.warning} strokeWidth={2} />
                  <Text style={t(14, 800)}>{rating.average_rating?.toFixed(1) ?? '—'}</Text>
                </View>
                <Text style={t(10.5, 400, colors.textFaint)}>{`${rating.rating_count} rated`}</Text>
              </View>
            )}
          </Card>
        </FadeInUp>

        <FadeInUp delay={40}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {onDuty && <Pulse size={6} color={colors.success} />}
                <Text style={t(14, 800)}>On duty</Text>
              </View>
              <Text style={t(12, 400, colors.textMuted)}>Visible to new job requests when on</Text>
            </View>
            <Toggle value={onDuty} onPress={togglingDuty ? undefined : onToggleDuty} />
          </Card>
        </FadeInUp>

        <FadeInUp delay={80}>
          <Card style={{ gap: 12 }} onPress={() => navigation.navigate('EditProfile')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={t(13, 700, colors.textBody)}>Details</Text>
              <Text style={t(12, 800, colors.primary)}>Edit</Text>
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={t(12.5, 400, colors.textMuted)}>Email</Text>
                <Text style={t(12.5, 700)}>{profile?.email ?? '—'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={t(12.5, 400, colors.textMuted)}>Phone</Text>
                <Text style={t(12.5, 700)}>{profile?.phone ?? '—'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={t(12.5, 400, colors.textMuted)}>Credentials</Text>
                <Text style={t(12.5, 700)}>{profile?.caregiver_credentials ?? '—'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={t(12.5, 400, colors.textMuted)}>Vehicle</Text>
                <Text style={t(12.5, 700)}>{profile?.caregiver_vehicle ?? '—'}</Text>
              </View>
            </View>
          </Card>
        </FadeInUp>

        <FadeInUp delay={120}>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <ListRow icon="calendar" label="My schedule" meta="Availability & slots" onPress={() => navigation.navigate('Schedule')} />
            <ListRow icon="clock" label="Past visits" meta="Completed & cancelled" divider={false} onPress={() => navigation.navigate('PastVisits')} />
          </Card>
        </FadeInUp>

        <OutlineButton label="Sign out" onPress={onSignOut} color={colors.dangerDark} borderColor={colors.dangerBorder} height={50} fontSize={14} />
      </ScrollView>
    </Screen>
  );
}
