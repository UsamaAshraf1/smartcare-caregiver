/**
 * Design tokens — extracted verbatim from the HTML design references in
 * ../design_reference/ (Modules 1–8). Values are the same numbers the designs
 * use: the mockups are 390 × 844 iOS frames, so design px map 1:1 to RN units.
 */
import { TextStyle } from 'react-native';

export const colors = {
  // brand / gradients
  navy: '#0B1230', navyDeep: '#040A24', navyMid: '#1D2160', navyInk: '#10164B',
  violet: '#3B2FB8', violetDeep: '#4B2BBF', indigo: '#2B2394',
  primary: '#4F46E5', primaryDark: '#4338CA', primaryLight: '#5B54F0',
  primarySoft: '#EEF0FE', primarySofter: '#FBFBFF', primaryTint: '#E0E4FC',
  accentCyan: '#35C2FF', accentPurple: '#8B5CF6', accentSky: '#0BA5EC',

  // surfaces
  bg: '#F7F8FC', card: '#FFFFFF', fill: '#F4F5FA', canvas: '#E9EDF5',
  border: '#EEF0F6', borderStrong: '#E4E7F2', borderCool: '#E9EBF5',
  borderDashed: '#B9BEE0', borderMuted: '#D0D5DD',

  // text
  text: '#0B1230', textStrong: '#101828', textBody: '#344054',
  textMuted: '#667085', textFaint: '#98A2B3',
  onDark: 'rgba(255,255,255,.75)', onDarkMuted: 'rgba(255,255,255,.6)', onDarkStrong: '#FFFFFF',

  // status
  success: '#12B76A', successDark: '#15803D', successSoft: '#F0FDF4', successBorder: '#BBF7D0',
  warning: '#F79009', warningDark: '#B54708', warningSoft: '#FFFAEB', warningBorder: '#FEDF89',
  warningTint: '#FEF6EE',
  danger: '#F04438', dangerDark: '#B42318', dangerDeep: '#D92D20',
  dangerSoft: '#FEF3F2', dangerBorder: '#FECDCA',
  info: '#0BA5EC', infoSoft: '#E7F6FD', pink: '#DD2590', pinkSoft: '#FDF2FA',
  chartBar: '#C7CCF4', chartBarMid: '#8A84EE',
} as const;

/** linear-gradient(168deg,#0B1230 0%,#1D2160 60%,#3B2FB8 130%) — home / menu header */
export const headerGradient = [colors.navy, colors.navyMid, colors.violet] as const;
/** linear-gradient(172deg,#040A24 0%,#10164B 45%,#3B2FB8 105%) — splash / success screens */
export const nightGradient = [colors.navyDeep, colors.navyInk, colors.violet] as const;
/** linear-gradient(172deg,#040A24 0%,#10164B 55%,#2B2394 120%) — assistant / analysing */
export const assistantGradient = [colors.navyDeep, colors.navyInk, colors.indigo] as const;
/** linear-gradient(168deg,#040A24 0%,#141B54 48%,#4B2BBF 115%) — welcome screen */
export const welcomeGradient = [colors.navyDeep, '#141B54', colors.violetDeep] as const;
/** linear-gradient(135deg,#35C2FF,#8B5CF6) — the AI orb */
export const aiGradient = [colors.accentCyan, colors.accentPurple] as const;
/** linear-gradient(135deg,#10164B,#3B2FB8) — insight cards */
export const inkGradient = [colors.navyInk, colors.violet] as const;
/** linear-gradient(135deg,#10164B,#4B2BBF) — insurance card */
export const cardGradient = [colors.navyInk, colors.violetDeep] as const;

export const radius = { xs: 8, sm: 11, md: 14, lg: 16, xl: 18, xxl: 22, sheet: 30, pill: 999 };
export const spacing = { xs: 6, sm: 10, md: 14, lg: 18, xl: 22, xxl: 28 };

/** Plus Jakarta Sans — loaded in App.tsx via @expo-google-fonts/plus-jakarta-sans. */
export type Weight = 400 | 500 | 600 | 700 | 800;
export const fontFamilies: Record<Weight, string> = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
};

/**
 * Text style helper mirroring the designs' `font-size / font-weight / color`.
 * `t(15, 800)` → 15px ExtraBold in the default ink colour.
 */
export const t = (size: number, weight: Weight = 400, color: string = colors.text, extra?: TextStyle): TextStyle => ({
  fontSize: size,
  fontFamily: fontFamilies[weight],
  color,
  ...extra,
});

/** Shadows the designs use verbatim (box-shadow → RN elevation-friendly props). */
export const shadow = {
  primaryButton: { shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  primarySmall: { shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  aiOrb: { shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  successOrb: { shadowColor: colors.success, shadowOpacity: 0.4, shadowRadius: 40, shadowOffset: { width: 0, height: 16 }, elevation: 10 },
  dangerButton: { shadowColor: colors.dangerDeep, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  floatingCard: { shadowColor: '#020820', shadowOpacity: 0.5, shadowRadius: 60, shadowOffset: { width: 0, height: 24 }, elevation: 14 },
  softCard: { shadowColor: '#101840', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  mapPill: { shadowColor: '#101840', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  sheet: { shadowColor: '#0B1230', shadowOpacity: 0.15, shadowRadius: 40, shadowOffset: { width: 0, height: -14 }, elevation: 16 },
  insuranceCard: { shadowColor: colors.navyInk, shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
} as const;

/**
 * The mockups draw their own iOS status bar, so their top paddings (58–62px)
 * include it. On device we add the real safe-area inset instead: 47pt is the
 * inset on the 390 × 844 frame the designs were drawn at.
 */
export const DESIGN_STATUS_BAR = 47;
export const topPad = (inset: number, designPadding: number) =>
  inset + Math.max(designPadding - DESIGN_STATUS_BAR, 0);
