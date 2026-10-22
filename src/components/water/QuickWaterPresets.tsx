import { CupSoda, GlassWater, Milk, Waves } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface QuickWaterPresetsProps {
  currentAmount: number;
  onSelectAmount: (amount: number) => void;
  isPt?: boolean;
}

export function QuickWaterPresets({
  currentAmount,
  onSelectAmount,
  isPt = false,
}: QuickWaterPresetsProps) {
  const presets = [
    {
      amount: 250,
      label: isPt ? 'Copo' : 'Glass',
      icon: (color: string) => <GlassWater size={18} color={color} />,
    },
    {
      amount: 500,
      label: isPt ? 'Garrafa' : 'Bottle',
      icon: (color: string) => <Milk size={18} color={color} />,
    },
    {
      amount: 750,
      label: isPt ? 'Caramanhola' : 'Flask',
      icon: (color: string) => <CupSoda size={18} color={color} />,
    },
    {
      amount: 1000,
      label: isPt ? 'Jarra' : 'Pitcher',
      icon: (color: string) => <Waves size={18} color={color} />,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.headerLabel}>
          {isPt ? 'ATALHOS TÁTEIS' : 'TACTILE PRESETS'}
        </Typography>
        <Typography variant="labelSm" color={colors.onSurfaceVariant}>
          {isPt ? 'Toque para selecionar' : 'Tap to snap'}
        </Typography>
      </View>

      <View style={styles.grid}>
        {presets.map((preset) => {
          const isSelected = currentAmount === preset.amount;
          const accentColor = isSelected ? colors.secondary : colors.onSurfaceVariant;

          return (
            <Pressable
              key={preset.amount}
              onPress={() => onSelectAmount(preset.amount)}
              accessibilityRole="button"
              accessibilityLabel={`+${preset.amount}ml ${preset.label}`}
              style={({ pressed }) => [
                styles.presetPill,
                isSelected ? styles.presetPillActive : styles.presetPillInactive,
                pressed && styles.pressed,
              ]}>
              {preset.icon(accentColor)}
              <Typography
                variant="metricNumeralSm"
                color={isSelected ? colors.secondary : colors.onSurface}
                style={isSelected ? styles.numeralActive : styles.numeralInactive}>
                +{preset.amount.toLocaleString()}
              </Typography>
              <Typography
                variant="unitCaption"
                color={isSelected ? colors.secondary : colors.onSurfaceVariant}
                style={styles.labelCaption}>
                {preset.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.xs + 2,
    marginVertical: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  headerLabel: {
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    width: '100%',
  },
  presetPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
  },
  presetPillInactive: {
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.strokeSubtle,
  },
  presetPillActive: {
    backgroundColor: `${colors.secondaryContainer}25`,
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  numeralActive: {
    fontWeight: '800',
    lineHeight: 20,
  },
  numeralInactive: {
    fontWeight: '700',
    lineHeight: 20,
  },
  labelCaption: {
    fontWeight: '600',
  },
});
