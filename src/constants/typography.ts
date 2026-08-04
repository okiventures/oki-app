import { TextStyle } from 'react-native';

/**
 * Font faces actually loaded in `app/_layout.tsx` (via expo-font).
 *
 * IMPORTANT: these are separate single-weight faces. On React Native a plain
 * `fontWeight` / Tailwind `font-semibold` does NOT select `InterSemiBold` — it
 * applies faux-bold to the base `Inter` face (and falls back to the system font
 * on Android). Always drive weight through `fontFamily` using these names.
 */
export const FONT_FAMILY = {
  regular: 'Inter',
  medium: 'InterMedium',
  semibold: 'InterSemiBold',
  bold: 'InterBold',
  heading: 'NunitoBold',
  headingExtra: 'NunitoExtraBold',
} as const;

export type TypeVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLg'
  | 'body'
  | 'bodyMedium'
  | 'bodySemibold'
  | 'label'
  | 'caption'
  | 'overline';

/** The single source of truth for text sizing. */
export const TYPE_SCALE: Record<TypeVariant, TextStyle> = {
  display: { fontFamily: FONT_FAMILY.headingExtra, fontSize: 30, lineHeight: 36 },
  h1: { fontFamily: FONT_FAMILY.heading, fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: FONT_FAMILY.heading, fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: FONT_FAMILY.heading, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: FONT_FAMILY.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: FONT_FAMILY.regular, fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: FONT_FAMILY.medium, fontSize: 14, lineHeight: 20 },
  bodySemibold: { fontFamily: FONT_FAMILY.semibold, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: FONT_FAMILY.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  caption: { fontFamily: FONT_FAMILY.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};
