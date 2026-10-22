import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface WaterAmountCounterProps {
  amount: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isPt?: boolean;
}

export function WaterAmountCounter({
  amount,
  onIncrement,
  onDecrement,
}: WaterAmountCounterProps) {
  return (
    <View style={styles.container}>
      {/* Botão Diminuir 50ml */}
      <Pressable
        onPress={onDecrement}
        accessibilityRole="button"
        accessibilityLabel="Diminuir 50ml"
        style={({ pressed }) => [
          styles.stepButton,
          shadows.card,
          pressed && styles.stepButtonPressed,
        ]}>
        <Minus size={22} color={colors.secondary} strokeWidth={2.6} />
      </Pressable>

      {/* Leitura Numérica Gigante */}
      <View style={styles.readoutGroup}>
        <Typography variant="displayHero" color={colors.secondary} style={styles.number}>
          {amount.toLocaleString()}
        </Typography>
        <Typography variant="headlineSm" color={colors.secondaryFixedDim} style={styles.unit}>
          ml
        </Typography>
      </View>

      {/* Botão Aumentar 50ml */}
      <Pressable
        onPress={onIncrement}
        accessibilityRole="button"
        accessibilityLabel="Aumentar 50ml"
        style={({ pressed }) => [
          styles.stepButton,
          shadows.card,
          pressed && styles.stepButtonPressed,
        ]}>
        <Plus size={22} color={colors.secondary} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  stepButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.8,
  },
  readoutGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  number: {
    fontWeight: '800',
    lineHeight: 52,
    textShadowColor: `${colors.secondary}40`,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  unit: {
    fontWeight: '700',
  },
});
