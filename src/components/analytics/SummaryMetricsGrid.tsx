import {
  Award,
  Droplets,
  Dumbbell,
  Flame,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { type Goals } from '@/repositories/goals.repository';
import { type AnalyticsKPIs } from '@/repositories/logs.repository';
import { colors, radii, spacing } from '@/theme/tokens';

export interface SummaryMetricsGridProps {
  kpis: AnalyticsKPIs;
  goals: Goals;
}

export function SummaryMetricsGrid({ kpis, goals }: SummaryMetricsGridProps) {
  const { t } = useLanguage();

  const proteinDiff = Math.round(kpis.avgProteinG - goals.proteinGoal);
  const isProteinAbove = proteinDiff >= 0;

  const waterFormatted =
    kpis.avgWaterMl >= 1000
      ? `${(kpis.avgWaterMl / 1000).toFixed(1)}L`
      : `${kpis.avgWaterMl}ml`;
  const waterGoalFormatted =
    goals.waterGoal >= 1000
      ? `${(goals.waterGoal / 1000).toFixed(1)}L`
      : `${goals.waterGoal}ml`;

  const calorieDiff = kpis.avgCaloriesKcal - goals.caloriesGoal;

  return (
    <View style={styles.container}>
      {/* Linha 1 */}
      <View style={styles.row}>
        {/* Card 1: Proteína */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}18` }]}>
              <Dumbbell size={16} color={colors.primary} />
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isProteinAbove
                    ? `${colors.primary}20`
                    : `${colors.surfaceHigh}`,
                },
              ]}>
              {isProteinAbove ? (
                <TrendingUp size={12} color={colors.primary} />
              ) : (
                <TrendingDown size={12} color={colors.onSurfaceVariant} />
              )}
              <Typography
                variant="unitCaption"
                color={isProteinAbove ? colors.primary : colors.onSurfaceVariant}
                style={styles.statusPillText}>
                {isProteinAbove ? `+${proteinDiff}g` : `${proteinDiff}g`}
              </Typography>
            </View>
          </View>

          <View style={styles.metricArea}>
            <View style={styles.valueRow}>
              <Typography variant="metricNumeralLg" style={styles.mainValue}>
                {kpis.avgProteinG}
              </Typography>
              <Typography variant="labelSm" color={colors.primary} style={styles.unitText}>
                g/dia
              </Typography>
            </View>
            <Typography variant="labelSm" color={colors.onSurfaceVariant}>
              {t.analytics.avgProtein}
            </Typography>
          </View>

          <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.metaHint}>
            Meta: {goals.proteinGoal}g/dia
          </Typography>
        </View>

        {/* Card 2: Água / Hidratação */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.secondary}18` }]}>
              <Droplets size={16} color={colors.secondary} />
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    kpis.avgWaterMl >= goals.waterGoal
                      ? `${colors.secondary}20`
                      : `${colors.surfaceHigh}`,
                },
              ]}>
              <Typography
                variant="unitCaption"
                color={
                  kpis.avgWaterMl >= goals.waterGoal
                    ? colors.secondary
                    : colors.onSurfaceVariant
                }
                style={styles.statusPillText}>
                {kpis.waterSuccessRate}% batido
              </Typography>
            </View>
          </View>

          <View style={styles.metricArea}>
            <View style={styles.valueRow}>
              <Typography variant="metricNumeralLg" style={styles.mainValue}>
                {waterFormatted}
              </Typography>
              <Typography variant="labelSm" color={colors.secondary} style={styles.unitText}>
                /dia
              </Typography>
            </View>
            <Typography variant="labelSm" color={colors.onSurfaceVariant}>
              {t.analytics.avgWater}
            </Typography>
          </View>

          <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.metaHint}>
            Meta: {waterGoalFormatted}/dia
          </Typography>
        </View>
      </View>

      {/* Linha 2 */}
      <View style={styles.row}>
        {/* Card 3: Taxa de Sucesso / Streak */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}18` }]}>
              <Award size={16} color={colors.primary} />
            </View>
            {kpis.currentStreak > 0 && (
              <View style={[styles.statusPill, { backgroundColor: `${colors.tertiaryContainer}25` }]}>
                <Flame size={12} color={colors.tertiaryContainer} />
                <Typography
                  variant="unitCaption"
                  color={colors.tertiaryContainer}
                  style={styles.statusPillText}>
                  {kpis.currentStreak}d streak
                </Typography>
              </View>
            )}
          </View>

          <View style={styles.metricArea}>
            <View style={styles.valueRow}>
              <Typography variant="metricNumeralLg" style={styles.mainValue}>
                {kpis.bothSuccessRate}%
              </Typography>
            </View>
            <Typography variant="labelSm" color={colors.onSurfaceVariant}>
              {t.analytics.successRate}
            </Typography>
          </View>

          <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.metaHint}>
            Prot: {kpis.proteinSuccessRate}% • Água: {kpis.waterSuccessRate}%
          </Typography>
        </View>

        {/* Card 4: Calorias Diárias */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.tertiaryContainer}18` }]}>
              <Flame size={16} color={colors.tertiaryContainer} />
            </View>
            <View style={[styles.statusPill, { backgroundColor: colors.surfaceHigh }]}>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.statusPillText}>
                {calorieDiff > 0 ? `+${calorieDiff}` : `${calorieDiff}`} kcal
              </Typography>
            </View>
          </View>

          <View style={styles.metricArea}>
            <View style={styles.valueRow}>
              <Typography variant="metricNumeralLg" style={styles.mainValue}>
                {kpis.avgCaloriesKcal}
              </Typography>
              <Typography variant="labelSm" color={colors.tertiaryContainer} style={styles.unitText}>
                kcal
              </Typography>
            </View>
            <Typography variant="labelSm" color={colors.onSurfaceVariant}>
              {t.analytics.avgCalories}
            </Typography>
          </View>

          <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.metaHint}>
            Meta: {goals.caloriesGoal} kcal/dia
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.gutterMobile,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.gutterMobile,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    justifyContent: 'space-between',
    minHeight: 128,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  statusPillText: {
    fontWeight: '700',
  },
  metricArea: {
    marginVertical: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  mainValue: {
    fontWeight: '800',
    color: colors.onSurface,
  },
  unitText: {
    fontWeight: '700',
  },
  metaHint: {
    marginTop: 2,
    opacity: 0.8,
  },
});
