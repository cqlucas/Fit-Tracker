import React from 'react';
import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type Typography as TypographyTokens } from '@/theme/tokens';

export type TypographyVariant = keyof TypographyTokens;

export interface TypographyProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  center?: boolean;
}

export function Typography({
  variant = 'bodyMd',
  color = colors.onSurface,
  center = false,
  style,
  children,
  ...props
}: TypographyProps) {
  const tokenStyle = typography[variant];

  return (
    <RNText
      style={[
        styles.base,
        tokenStyle,
        { color },
        center && styles.center,
        style,
      ]}
      {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.onSurface,
  },
  center: {
    textAlign: 'center',
  },
});
