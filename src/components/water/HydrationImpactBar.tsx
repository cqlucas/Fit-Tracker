import { CheckCircle2, TrendingUp } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  const clampedProjectedPercent = Math.min(projectedPercent, 100);
  const isGoalReached = projectedTotal >= goal && goal > 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Animação suave da barra projetada ao mudar o incremento
  // ───────────────────────────────────────────────────────────────────────────
  const animatedProjectedWidth = useSharedValue(clampedProjectedPercent);
  const animatedBaseWidth = useSharedValue(basePercent);

  useEffect(() => {
    animatedProjectedWidth.value = withTiming(clampedProjectedPercent, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
    animatedBaseWidth.value = withTiming(basePercent, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProjectedPercent, basePercent, animatedProjectedWidth, animatedBaseWidth]);

  const projectedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedProjectedWidth.value}%`,
    };
  });

  const baseStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedBaseWidth.value}%`,
    };
  });

  const locale = isPt ? 'pt-BR' : 'en-US';
  const formatVal = (num: number) => num.toLocaleString(locale);

  return (
    <View style={styles.container}>
      {/* Top Readout Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <TrendingUp size={16} color={colors.secondary} />
          <Typography variant="labelMd" style={styles.title} numberOfLines={1}>
            {isPt ? 'Impacto na Hidratação Diária' : 'Daily Hydration Impact'}
          </Typography>
        </View>

        <View style={styles.percentageRow}>
          {isGoalReached && (
            <View style={styles.goalPill}>
              <CheckCircle2 size={12} color={colors.primary} />
              <Typography variant="unitCaption" color={colors.primary} style={styles.goalPillText}>
                {isPt ? 'META' : 'GOAL'}
              </Typography>
            </View>
          )}
          <Typography variant="metricNumeralSm" color={colors.secondary} style={styles.percentage}>
            {projectedPercent}%
          </Typography>
        </View>
      </View>

      {/* Dual Fill Progress Track */}
      <View style={styles.progressTrack}>
        {/* Camada 1: Preenchimento Projetado (Glowing Cyan) */}
        <Animated.View style={[styles.projectedFill, projectedStyle]} />

        {/* Camada 2: Preenchimento Base já consumido hoje (Darker Marine Cyan) */}
        <Animated.View style={[styles.baseFill, baseStyle]} />
      </View>

      {/* Footer Breakdown com Dados Reais */}
      <View style={styles.footerRow}>
        <Typography variant="labelSm" color={colors.onSurfaceVariant} numberOfLines={1}>
          {isPt ? 'Hoje' : 'Today'}
        </Typography>

        <View style={styles.valuesRow}>
          <Typography variant="labelSm" color={colors.onSurfaceVariant} numberOfLines={1}>
            {formatVal(baseConsumed)} ml
          </Typography>
          <Typography variant="labelSm" color={colors.secondary}>
            →
          </Typography>
          <Typography variant="labelSm" color={colors.secondary} style={styles.projectedNumber} numberOfLines={1}>
            {formatVal(projectedTotal)} ml
          </Typography>
          <Typography variant="unitCaption" color={colors.outline} numberOfLines={1}>
            / {formatVal(goal)} ml
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
    flex: 1,
    marginRight: spacing.xs,
  },
  title: {
    fontWeight: '700',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
  },
  goalPillText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  percentage: {
    fontWeight: '800',
  },
  progressTrack: {
    width: '100%',
    height: 11,
    backgroundColor: colors.surfaceHighest,
    borderRadius: radii.full,
    overflow: 'hidden',
    position: 'relative',
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
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  baseFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#00839c',
    borderRadius: radii.full,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 1,
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexShrink: 0,
  },
  projectedNumber: {
    fontWeight: '800',
  },
});
