import { TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface HydrationImpactBarProps {
  baseConsumed: number;
  addedAmount: number;
  goal: number;
  isPt?: boolean;
}

export function HydrationImpactBar({
  baseConsumed,
  addedAmount,
  goal,
  isPt = false,
}: HydrationImpactBarProps) {
  const projectedTotal = baseConsumed + addedAmount;
  const projectedPercent = goal > 0 ? Math.round((projectedTotal / goal) * 100) : 0;
  const basePercent = goal > 0 ? Math.min(Math.round((baseConsumed / goal) * 100), 100) : 0;
  const barWidth = Math.min(projectedPercent, 100);

  return (
    <View style={styles.container}>
      {/* Top Readout */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <TrendingUp size={16} color={colors.secondary} />
          <Typography variant="labelMd" style={styles.title}>
            {isPt ? 'Impacto na Hidratação Diária' : 'Daily Hydration Impact'}
          </Typography>
        </View>
        <Typography variant="metricNumeralSm" color={colors.secondary} style={styles.percentage}>
          {projectedPercent}%
        </Typography>
      </View>

      {/* Dual Fill Progress Bar */}
      <View style={styles.progressTrack}>
        {/* Fill já existente (fundo) */}
        <View style={[styles.baseFill, { width: `${basePercent}%` }]} />
        {/* Fill projetado somado */}
        <View style={[styles.projectedFill, { width: `${barWidth}%` }]} />
      </View>

      {/* Footer Breakdown */}
      <View style={styles.footerRow}>
        <Typography variant="labelSm" color={colors.onSurfaceVariant}>
          {isPt ? 'Total de hoje' : "Today's total"}
        </Typography>

        <View style={styles.valuesRow}>
          <Typography variant="labelSm" color={colors.onSurfaceVariant}>
            {baseConsumed.toLocaleString()} ml
          </Typography>
          <Typography variant="labelSm" color={colors.secondary}>
            →
          </Typography>
          <Typography variant="labelSm" color={colors.secondary} style={styles.projectedNumber}>
            {projectedTotal.toLocaleString()} ml
          </Typography>
          <Typography variant="unitCaption" color={colors.outline}>
            / {goal.toLocaleString()} ml
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontWeight: '700',
  },
  percentage: {
    fontWeight: '800',
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: colors.surfaceHighest,
    borderRadius: radii.full,
    overflow: 'hidden',
    position: 'relative',
  },
  baseFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: `${colors.secondaryContainer}60`,
    borderRadius: radii.full,
  },
  projectedFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.secondary,
    borderRadius: radii.full,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectedNumber: {
    fontWeight: '800',
  },
});
