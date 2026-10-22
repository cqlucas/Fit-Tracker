import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface SettingsHeaderProps {
  onBack?: () => void;
  onReset?: () => void;
  isPt?: boolean;
}

export function SettingsHeader({ onBack, onReset, isPt = false }: SettingsHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={isPt ? 'Voltar' : 'Go back'}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ArrowLeft size={20} color={colors.onSurface} />
          </Pressable>
        ) : null}

        <View style={styles.titleColumn}>
          <Typography variant="headlineSm" style={styles.title}>
            {isPt ? 'Metas & Alvos Diários' : 'Daily Goals & Targets'}
          </Typography>
        </View>
      </View>

      {onReset ? (
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel={isPt ? 'Restaurar padrões' : 'Reset defaults'}
          style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
          <RotateCcw size={14} color={colors.tertiary} />
          <Typography variant="labelMd" color={colors.tertiary}>
            {isPt ? 'Padrão' : 'Reset'}
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '700',
    lineHeight: 24,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: `${colors.tertiaryContainer}15`,
  },
});
