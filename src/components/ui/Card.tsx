import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface CardProps extends ViewProps {
  variant?: 'low' | 'container' | 'high' | 'lowest';
  glow?: 'primary' | 'secondary' | 'tertiary' | 'none';
  hasBorder?: boolean;
  padding?: keyof typeof spacing;
  radius?: keyof typeof radii;
  style?: ViewStyle;
}

export function Card({
  variant = 'low',
  glow = 'none',
  hasBorder = true,
  padding = 'md',
  radius = 'xl',
  style,
  children,
  ...props
}: CardProps) {
  const bgMap = {
    lowest: colors.surfaceLowest,
    low: colors.surfaceLow,
    container: colors.surfaceContainer,
    high: colors.surfaceHigh,
  };

  const glowMap = {
    none: undefined,
    primary: shadows.glowPrimary,
    secondary: shadows.glowSecondary,
    tertiary: shadows.glowTertiary,
  };

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bgMap[variant],
          padding: spacing[padding],
          borderRadius: radii[radius],
        },
        hasBorder && styles.border,
        glowMap[glow],
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
});
