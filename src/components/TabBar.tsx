/**
 * Bottom navigation — same visual language as the patient app's TabBar
 * (white bar, hairline top border) but three slots instead of five: a
 * caregiver's world is the job queue, notifications and their own profile.
 * Each tab springs down slightly on press and the active icon animates
 * in with a small pop rather than snapping straight to full size.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { usePressScale } from './motion';
import { colors, radius, t } from '../theme';
import { useNotifications } from '../state/notifications';
import { tapHaptic } from '../lib/haptics';

const TABS: { route: string; label: string; icon: IconName }[] = [
  { route: 'Queue', label: 'Queue', icon: 'home' },
  { route: 'Notifications', label: 'Alerts', icon: 'bell' },
  { route: 'Profile', label: 'Profile', icon: 'user' },
];

function TabButton({ tab, focused, badge, onPress }: { tab: (typeof TABS)[number]; focused: boolean; badge?: number; onPress: () => void }) {
  const press = usePressScale(0.9);
  const pop = useRef(new Animated.Value(focused ? 1.08 : 1)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: focused ? 1.08 : 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  }, [focused, pop]);

  return (
    <Pressable
      onPress={() => {
        if (!focused) tapHaptic();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={{ flex: 1, alignItems: 'center', gap: 4 }}
    >
      <Animated.View style={[{ transform: [{ scale: pop }] }, press.style]}>
        <Icon name={tab.icon} size={21} color={focused ? colors.primary : colors.textFaint} strokeWidth={2} />
        {!!badge && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -8,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 3,
              borderRadius: radius.pill,
              backgroundColor: colors.danger,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={t(9.5, 800, '#FFFFFF')}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </Animated.View>
      <Text style={t(10.5, focused ? 700 : 600, focused ? colors.primary : colors.textFaint)}>{tab.label}</Text>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const activeRoute = state.routes[state.index]?.name;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 10,
        paddingHorizontal: 10,
        paddingBottom: Math.max(insets.bottom, 10) + 16,
      }}
    >
      {TABS.map((tab) => (
        <TabButton
          key={tab.route}
          tab={tab}
          focused={activeRoute === tab.route}
          badge={tab.route === 'Notifications' ? unreadCount : undefined}
          onPress={() => navigation.navigate(tab.route as never)}
        />
      ))}
    </View>
  );
}
