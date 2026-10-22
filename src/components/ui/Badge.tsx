import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

import { Typography } from './Typography';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'neutral' | 'subtle';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const variantStyles = {
    primary: {
      bg: 'rgba(78, 222, 163, 0.15)',
      text: colors.primary,
    },
    secondary: {
      bg: 'rgba(76, 215, 246, 0.15)',
      text: colors.secondary,
    },
    neutral: {
      bg: colors.surfaceHigh,
      text: colors.onSurfaceVariant,
    },
    subtle: {
      bg: colors.surfaceContainer,
      text: colors.onSurfaceVariant,
    },
  }[variant];

  return (
    <View style={[styles.badge, { backgroundColor: variantStyles.bg }, style]}>
      <Typography variant="unitCaption" color={variantStyles.text} style={styles.text}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textTransform: 'uppercase',
  },
});
