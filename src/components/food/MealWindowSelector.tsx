import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { MealWindow } from '@/db/schema';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface MealWindowSelectorProps {
  selected: MealWindow;
  onSelect: (window: MealWindow) => void;
  isPt?: boolean;
}

export function MealWindowSelector({
  selected,
  onSelect,
  isPt = false,
}: MealWindowSelectorProps) {
  const windows: { id: MealWindow; label: string }[] = [
    { id: 'breakfast', label: isPt ? 'Café' : 'Breakfast' },
    { id: 'lunch', label: isPt ? 'Almoço' : 'Lunch' },
    { id: 'dinner', label: isPt ? 'Jantar' : 'Dinner' },
    { id: 'snack', label: isPt ? 'Lanche' : 'Snack' },
  ];

  return (
    <View style={styles.container}>
      <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.label}>
        {isPt ? 'MOMENTO DA REFEIÇÃO' : 'ASSIGNED MEAL WINDOW'}
      </Typography>

      <View style={styles.grid}>
        {windows.map((w) => {
          const isActive = selected === w.id;
          return (
            <Pressable
              key={w.id}
              onPress={() => onSelect(w.id)}
              accessibilityRole="button"
              accessibilityLabel={w.label}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : styles.pillInactive,
                isActive && shadows.glowPrimary,
                pressed && styles.pressed,
              ]}>
              <Typography
                variant="labelMd"
                color={isActive ? colors.primary : colors.onSurfaceVariant}
                style={isActive ? styles.textActive : styles.textInactive}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}>
                {w.label}
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
    gap: spacing.xs + 3,
  },
  label: {
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    width: '100%',
  },
  pill: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillInactive: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.strokeSubtle,
  },
  pillActive: {
    backgroundColor: colors.surfaceBright,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  textActive: {
    fontWeight: '800',
  },
  textInactive: {
    fontWeight: '600',
  },
});
