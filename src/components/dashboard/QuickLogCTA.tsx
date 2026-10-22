import { PlusCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface QuickLogCTAProps {
  onPress?: () => void;
  style?: ViewStyle;
  label?: string;
}

export function QuickLogCTA({ onPress, style, label }: QuickLogCTAProps) {
  const { t } = useLanguage();
  const resolvedLabel = label ?? t.home.quickLogCTA;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        shadows.fab,
        pressed && styles.pressed,
        style,
      ]}>
      <PlusCircle size={20} color={colors.onPrimaryContainer} strokeWidth={2.5} />
      <Typography variant="labelMd" color={colors.onPrimaryContainer} style={styles.text}>
        {resolvedLabel}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
