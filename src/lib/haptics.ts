/**
 * Thin wrapper over expo-haptics. Haptics throw on web and on some
 * simulators, and a missed tap-feedback buzz is never worth surfacing as
 * an error, so every call here is fire-and-forget.
 */
import * as Haptics from 'expo-haptics';

export const tapHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const successHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export const warningHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
