import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface HistorySectionHeaderProps {
  title: string;
  totalProteinG: number;
  totalCaloriesKcal: number;
  totalWaterMl: number;
}

export function HistorySectionHeader({
  title,
  totalProteinG,
  totalCaloriesKcal,
  totalWaterMl,
}: HistorySectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Typography variant="labelMd" style={styles.title}>
        {title}
      </Typography>

      <View style={styles.summaryRow}>
        {totalProteinG > 0 && (
          <View style={styles.chip}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Typography variant="unitCaption" color={colors.primary} style={styles.chipText}>
              {totalProteinG}g
            </Typography>
          </View>
        )}

        {totalCaloriesKcal > 0 && (
          <View style={styles.chip}>
            <View style={[styles.dot, { backgroundColor: colors.tertiary }]} />
            <Typography variant="unitCaption" color={colors.tertiary} style={styles.chipText}>
              {totalCaloriesKcal} kcal
            </Typography>
          </View>
        )}

        {totalWaterMl > 0 && (
          <View style={styles.chip}>
            <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
            <Typography variant="unitCaption" color={colors.secondary} style={styles.chipText}>
              {totalWaterMl} ml
            </Typography>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontWeight: '800',
    color: colors.onSurface,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radii.full,
  },
  chipText: {
    fontWeight: '700',
  },
});
