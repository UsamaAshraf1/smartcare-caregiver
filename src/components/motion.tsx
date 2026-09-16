/**
 * Small, dependency-free motion helpers — core `Animated` API only, no
 * Reanimated install/babel-plugin needed. Used to make the shared UI
 * primitives (ui.tsx) and a few screen-level bits feel tactile:
 *  - usePressScale: spring the whole control down on press, back on release
 *  - FadeInUp: a list item fades + rises once, when it first mounts
 *  - Pulse: a looping "breathing" dot for live states (on duty, en route)
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

export function usePressScale(scaleTo = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return { style: { transform: [{ scale }] } as ViewStyle, onPressIn, onPressOut };
}

/** Fades + rises once on mount. Keying a list by a stable id (visit.id, notification.id) means only genuinely new items animate in — existing ones don't re-trigger on re-render. */
export function FadeInUp({
  children,
  style,
  delay = 0,
  distance = 10,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  distance?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 280, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, delay]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Looping soft pulse ring behind a solid dot — reads as "live" (on duty, sharing location, unread). */
export function Pulse({ size = 8, color }: { size?: number; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 2.4, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, transform: [{ scale }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}
