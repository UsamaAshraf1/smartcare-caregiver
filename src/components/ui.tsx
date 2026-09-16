/**
 * Shared UI primitives, styled to the HTML design references in
 * ../design_reference/. Sizes, radii, colours and shadows are the design's own
 * values — see src/theme.ts for the token table.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, ViewStyle, StyleProp, TextStyle, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Icon, IconName } from './Icon';
import { usePressScale } from './motion';
import { aiGradient, colors, headerGradient, radius, shadow, t, topPad } from '../theme';

type Press = { onPress?: () => void };

/* ─────────────── layout ─────────────── */

export function Screen({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>;
}

/** Navy → violet gradient header with the design's 30px bottom sheet corners. */
export function GradientHeader({
  children,
  gradient = headerGradient,
  paddingTop = 58,
  paddingBottom = 22,
  rounded = true,
  style,
}: {
  children: React.ReactNode;
  /** expo-linear-gradient needs at least two stops, hence the tuple type. */
  gradient?: readonly [string, string, ...string[]];
  paddingTop?: number;
  paddingBottom?: number;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[...gradient]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[
        {
          paddingTop: topPad(insets.top, paddingTop),
          paddingHorizontal: 22,
          paddingBottom,
          borderBottomLeftRadius: rounded ? radius.sheet : 0,
          borderBottomRightRadius: rounded ? radius.sheet : 0,
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

/** Light-background screen header: circular back button, title, optional right slot. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  titleSize = 20,
  paddingTop = 62,
  backFill = 'card',
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  titleSize?: number;
  paddingTop?: number;
  backFill?: 'card' | 'fill';
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: topPad(insets.top, paddingTop),
        paddingHorizontal: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {onBack !== undefined && <BackButton onPress={onBack} fill={backFill} />}
      <View style={{ flex: 1 }}>
        {!!title && <Text style={t(titleSize, 800)}>{title}</Text>}
        {!!subtitle && <Text style={t(12, 400, colors.textMuted)}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function BackButton({ onPress, fill = 'card', dark = false, size = 40 }: Press & { fill?: 'card' | 'fill'; dark?: boolean; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: dark ? 'rgba(255,255,255,.1)' : fill === 'fill' ? colors.fill : colors.card,
        borderWidth: dark || fill === 'fill' ? 0 : 1,
        borderColor: colors.borderCool,
      }}
    >
      <Icon name="chevronLeft" size={17} color={dark ? '#FFFFFF' : colors.text} strokeWidth={2.2} />
    </Pressable>
  );
}

/** White rounded surface: `background:#FFF; border:1px solid #EEF0F6; border-radius:18px`. Tappable cards spring down slightly on press. */
export function Card({
  children,
  style,
  padding = 16,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
} & Press) {
  const press = usePressScale(0.98);
  const body = (
    <View
      style={[
        { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={press.style}>{body}</Animated.View>
    </Pressable>
  );
}

/* ─────────────── buttons ─────────────── */

/** Full-width CTA — 56px tall, 16px radius, indigo with the design's glow. Springs down slightly on press. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  height = 56,
  fontSize = 17,
  style,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
} & Press) {
  const press = usePressScale(0.97);
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            height,
            borderRadius: radius.lg,
            backgroundColor: disabled ? '#C6C9E4' : colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
          },
          !disabled && shadow.primaryButton,
          press.style,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            {icon && <Icon name={icon} size={17} color="#FFFFFF" strokeWidth={2} />}
            <Text style={t(fontSize, 700, '#FFFFFF')}>{label}</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** White button with a hairline border — the design's secondary action. Springs down slightly on press. */
export function OutlineButton({
  label,
  onPress,
  height = 56,
  fontSize = 17,
  color = colors.textMuted,
  borderColor = colors.borderStrong,
  style,
}: {
  label: string;
  height?: number;
  fontSize?: number;
  color?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
} & Press) {
  const press = usePressScale(0.97);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            height,
            borderRadius: radius.lg,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor,
            alignItems: 'center',
            justifyContent: 'center',
          },
          press.style,
          style,
        ]}
      >
        <Text style={t(fontSize, 700, color)}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** 40px inline action used inside cards ("Get directions" / "Reschedule" / "Claim visit"). Springs down slightly on press. */
export function InlineButton({
  label,
  onPress,
  variant = 'solid',
  height = 40,
  fontSize = 13,
  loading,
  disabled,
  style,
}: {
  label: string;
  variant?: 'solid' | 'outline';
  height?: number;
  fontSize?: number;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
} & Press) {
  const solid = variant === 'solid';
  const press = usePressScale(0.96);
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={{ flex: 1 }}>
      <Animated.View
        style={[
          {
            height,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: solid ? colors.primary : 'transparent',
            borderWidth: solid ? 0 : 1,
            borderColor: colors.borderStrong,
            opacity: loading ? 0.6 : 1,
          },
          press.style,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={solid ? '#FFFFFF' : colors.textMuted} />
        ) : (
          <Text style={t(fontSize, 700, solid ? '#FFFFFF' : colors.textMuted)}>{label}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────── small parts ─────────────── */

/** Coloured status pill: `AI: NO ACUTE FINDINGS`, `LOW URGENCY`, `VIDEO`… */
export function Tag({
  label,
  bg = colors.primarySoft,
  color = colors.primary,
  borderColor,
  height = 24,
  fontSize = 11,
  style,
}: {
  label: string;
  bg?: string;
  color?: string;
  borderColor?: string;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          height,
          paddingHorizontal: 10,
          borderRadius: height / 2,
          backgroundColor: bg,
          borderWidth: borderColor ? 1 : 0,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={t(fontSize, 800, color)}>{label}</Text>
    </View>
  );
}

/** Filter chip row item — 36px tall, indigo when selected. Springs down slightly on press. */
export function Chip({ label, active, onPress, height = 36 }: { label: string; active?: boolean; height?: number } & Press) {
  const press = usePressScale(0.94);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            height,
            paddingHorizontal: 16,
            borderRadius: height / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? colors.primary : colors.card,
            borderWidth: active ? 0 : 1,
            borderColor: colors.borderCool,
          },
          press.style,
        ]}
      >
        <Text style={t(13, active ? 700 : 600, active ? '#FFFFFF' : colors.textMuted)}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Rounded-square selectable option (blood type, condition, time slot…). Springs down slightly on press. */
export function OptionChip({
  label,
  active,
  onPress,
  height = 42,
  dashed,
  icon,
}: {
  label: string;
  active?: boolean;
  height?: number;
  dashed?: boolean;
  icon?: IconName;
} & Press) {
  const press = usePressScale(0.95);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            height,
            paddingHorizontal: 16,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: active ? colors.primarySoft : colors.card,
            borderWidth: active ? 2 : dashed ? 1 : 1,
            borderStyle: dashed ? 'dashed' : 'solid',
            borderColor: active ? colors.primary : dashed ? colors.borderDashed : colors.borderStrong,
          },
          press.style,
        ]}
      >
        {icon && <Icon name={icon} size={13} color={colors.primary} strokeWidth={2.6} />}
        <Text style={t(14.5, active ? 700 : 600, active || dashed ? colors.primary : colors.textMuted)}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** iOS-style switch drawn to the design's 46 × 28 spec — the thumb slides and the track crossfades color instead of jumping. */
export function Toggle({ value, onPress }: { value: boolean } & Press) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value, progress]);
  const trackColor = progress.interpolate({ inputRange: [0, 1], outputRange: [colors.borderStrong, colors.primary] });
  const thumbX = progress.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: trackColor, justifyContent: 'center' }}>
        <Animated.View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', transform: [{ translateX: thumbX }] }} />
      </Animated.View>
    </Pressable>
  );
}

/** 22 × 22 rounded checkbox used by the consent flows. */
export function Checkbox({ checked, onPress }: { checked: boolean } & Press) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        marginTop: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: checked ? colors.primary : 'transparent',
        borderWidth: checked ? 0 : 1.5,
        borderColor: colors.borderMuted,
      }}
    >
      {checked && <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} />}
    </Pressable>
  );
}

/** Square avatar with initials — 14px radius by default, as in the designs. */
export function Avatar({
  initials,
  size = 48,
  radius: r = 14,
  bg = colors.primarySoft,
  color = colors.primary,
  fontSize = 14,
  style,
}: {
  initials: string;
  size?: number;
  radius?: number;
  bg?: string;
  color?: string;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Text style={t(fontSize, 800, color)}>{initials}</Text>
    </View>
  );
}

/** Rounded-square tinted icon tile (42–46px) used across list rows. */
export function IconTile({
  name,
  bg = colors.primarySoft,
  color = colors.primary,
  size = 42,
  iconSize = 19,
  radius: r = 12,
  strokeWidth = 1.9,
}: {
  name: IconName;
  bg?: string;
  color?: string;
  size?: number;
  iconSize?: number;
  radius?: number;
  strokeWidth?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={iconSize} color={color} strokeWidth={strokeWidth} />
    </View>
  );
}

/** The cyan→purple AI orb. */
export function AIOrb({ size = 32, iconSize, style }: { size?: number; iconSize?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[...aiGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Icon name="sparkle" size={iconSize ?? size * 0.44} color="#FFFFFF" />
    </LinearGradient>
  );
}

/** Uppercase micro-label (`TODAY`, `AUGUST 2026`, `IMPRESSION`). */
export function SectionLabel({ children, color = colors.textFaint, style }: { children: string; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[t(12, 800, color, { letterSpacing: 0.96 }), style]}>{children}</Text>;
}

/** Rounded progress bar (onboarding steps, insurance limits, AI agreement). */
export function ProgressBar({
  percent,
  height = 5,
  color = colors.primary,
  track = colors.primarySoft,
  style,
}: {
  percent: number;
  height?: number;
  color?: string;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/** Circular progress ring (home "Wellness today", verifying spinner). */
export function ProgressRing({
  size,
  stroke,
  percent,
  color = colors.success,
  track = colors.primarySoft,
  children,
}: {
  size: number;
  stroke: number;
  percent: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * percent) / 100} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Tinted note strip — success/warning/danger/info variants from the designs. */
export function Note({
  tone = 'info',
  icon = 'shieldCheck',
  children,
  align = 'center',
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'indigo';
  icon?: IconName | null;
  children: React.ReactNode;
  align?: 'center' | 'top';
}) {
  const map = {
    info: [colors.bg, colors.borderCool, colors.textMuted, colors.primary],
    indigo: [colors.primarySoft, 'transparent', colors.textBody, colors.primary],
    success: [colors.successSoft, colors.successBorder, colors.successDark, colors.successDark],
    warning: [colors.warningSoft, colors.warningBorder, colors.warningDark, colors.warningDark],
    danger: [colors.dangerSoft, colors.dangerBorder, colors.dangerDark, colors.dangerDark],
    neutral: [colors.bg, 'transparent', colors.textMuted, colors.primary],
  }[tone];
  const [bg, border, textColor, iconColor] = map;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        gap: 10,
        backgroundColor: bg,
        borderWidth: border === 'transparent' ? 0 : 1,
        borderColor: border,
        borderRadius: radius.md,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      {icon && (
        <View style={{ marginTop: align === 'top' ? 1 : 0 }}>
          <Icon name={icon} size={16} color={iconColor} strokeWidth={2} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        {typeof children === 'string' ? (
          <Text style={t(12.5, 400, textColor, { lineHeight: 19 })}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** Indigo "agent tip" strip with the AI orb. */
export function AgentTip({ children, action, onPress }: { children: React.ReactNode; action?: string } & Press) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.primarySoft,
        borderRadius: radius.lg,
        paddingVertical: 13,
        paddingHorizontal: 16,
      }}
    >
      <AIOrb size={32} />
      <View style={{ flex: 1 }}>
        {typeof children === 'string' ? <Text style={t(12.5, 400, colors.textBody, { lineHeight: 19 })}>{children}</Text> : children}
      </View>
      {!!action && (
        <Pressable onPress={onPress}>
          <Text style={t(12, 800, colors.primary)}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Menu list row: tinted icon tile, label, chevron. Springs down slightly on press. */
export function ListRow({
  icon,
  iconBg = colors.primarySoft,
  iconColor = colors.primary,
  label,
  meta,
  right,
  divider = true,
  onPress,
}: {
  icon: IconName;
  iconBg?: string;
  iconColor?: string;
  label: string;
  meta?: string;
  right?: React.ReactNode;
  divider?: boolean;
} & Press) {
  const press = usePressScale(0.98);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 13,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: divider ? 1 : 0,
            borderBottomColor: colors.bg,
          },
          press.style,
        ]}
      >
        <IconTile name={icon} bg={iconBg} color={iconColor} size={38} iconSize={17} radius={11} />
        <Text style={[t(14, 700), { flex: 1 }]}>
          {label}
          {!!meta && <Text style={t(14, 500, colors.textFaint)}>{` · ${meta}`}</Text>}
        </Text>
        {right ?? <Icon name="chevronRight" size={14} color={colors.textFaint} strokeWidth={2.4} />}
      </Animated.View>
    </Pressable>
  );
}

/** Bottom action bar: white, hairline top border, safe-area aware. */
export function BottomBar({ children, bordered = true }: { children: React.ReactNode; bordered?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: 14,
        paddingHorizontal: 22,
        paddingBottom: Math.max(insets.bottom, 16) + 14,
        backgroundColor: bordered ? colors.card : 'transparent',
        borderTopWidth: bordered ? 1 : 0,
        borderTopColor: colors.border,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}

/** Physician disclaimer required on every AI clinical output (DHA). */
export function AIDisclaimer({ children }: { children?: string }) {
  return (
    <Text style={[t(10.5, 400, colors.textFaint, { lineHeight: 16 }), { borderTopWidth: 1, borderTopColor: '#F2F4F7', paddingTop: 9 }]}>
      {children ??
        'This is an AI assessment, not a diagnosis. Always rely on your primary physician for medical decisions.'}
    </Text>
  );
}
