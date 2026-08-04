import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { TYPE_SCALE, TypeVariant } from '../../constants/typography';

export interface TypographyProps extends RNTextProps {
  /** Size + face preset from the type scale. Defaults to `body`. */
  variant?: TypeVariant;
  /** Override the resolved color (defaults to the theme's primary text color). */
  color?: string;
  /** Tailwind/NativeWind classes for layout (margins, alignment, etc.). */
  className?: string;
  children?: React.ReactNode;
}

/**
 * Themed, scale-driven text. Applies the correct loaded font face (see
 * `constants/typography.ts`) so weights actually render on Android, and pulls
 * its default color from the active theme.
 *
 * Use the named helpers below (`<Heading>`, `<Body>`, …) for readability;
 * they are thin wrappers over this component.
 */
export function Typography({ variant = 'body', color, style, children, ...rest }: TypographyProps) {
  const { colors } = useTheme();
  return (
    <RNText style={[TYPE_SCALE[variant], { color: color ?? colors.ui.text }, style]} {...rest}>
      {children}
    </RNText>
  );
}

type PresetProps = Omit<TypographyProps, 'variant'>;

export const Display = (p: PresetProps) => <Typography variant="display" {...p} />;
export const H1 = (p: PresetProps) => <Typography variant="h1" {...p} />;
export const H2 = (p: PresetProps) => <Typography variant="h2" {...p} />;
export const H3 = (p: PresetProps) => <Typography variant="h3" {...p} />;
export const Body = (p: PresetProps) => <Typography variant="body" {...p} />;
export const BodyLg = (p: PresetProps) => <Typography variant="bodyLg" {...p} />;
export const Label = (p: PresetProps) => <Typography variant="label" {...p} />;
export const Caption = (p: PresetProps) => <Typography variant="caption" {...p} />;
export const Overline = (p: PresetProps) => <Typography variant="overline" {...p} />;
