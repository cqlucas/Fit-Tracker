import { Dumbbell, Sparkles, Waves } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export type BeverageType = 'water' | 'electrolytes' | 'shake';

export interface BeverageTypeSelectorProps {
  selected: BeverageType;
  onSelect: (type: BeverageType) => void;
  isPt?: boolean;
}

export function BeverageTypeSelector({
  selected,
  onSelect,
  isPt = false,
}: BeverageTypeSelectorProps) {
  const options: { id: BeverageType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'water',
      label: isPt ? 'Água Pura' : 'Pure Water',
      icon: <Waves size={14} color={selected === 'water' ? colors.secondary : colors.onSurfaceVariant} />,
    },
    {
      id: 'electrolytes',
      label: isPt ? 'Eletrólitos' : 'Electrolytes',
      icon: <Sparkles size={14} color={selected === 'electrolytes' ? colors.secondary : colors.onSurfaceVariant} />,
    },
    {
      id: 'shake',
      label: 'Protein Shake',
      icon: <Dumbbell size={14} color={selected === 'shake' ? colors.secondary : colors.onSurfaceVariant} />,
    },
  ];

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isActive = selected === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            style={({ pressed }) => [
              styles.pill,
              isActive && styles.pillActive,
              pressed && styles.pressed,
            ]}>
            {opt.icon}
            <Typography
              variant="labelSm"
              color={isActive ? colors.secondary : colors.onSurfaceVariant}
              style={isActive ? styles.textActive : styles.textInactive}>
              {opt.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.surfaceLowest,
    padding: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.full,
  },
  pillActive: {
    backgroundColor: colors.surfaceContainer,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  textActive: {
    fontWeight: '700',
  },
  textInactive: {
    fontWeight: '500',
  },
});
