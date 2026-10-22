import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, spacing } from '@/theme/tokens';

export interface DonutChartCardProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color?: string;
  glow?: 'primary' | 'secondary';
  formatValue?: (val: number) => string;
  leftLabel?: string;
  goalLabel?: string;
}

export function DonutChartCard({
  label,
  current,
  goal,
  unit,
  color = colors.primary,
  glow = 'primary',
  formatValue,
  leftLabel,
  goalLabel,
}: DonutChartCardProps) {
  const { t } = useLanguage();
  const percent = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
  const rawRemaining = Math.max(goal - current, 0);

  const resolvedLeftLabel = leftLabel ?? t.home.left;
  const resolvedGoalLabel = goalLabel ?? t.home.goal;

  const displayRemaining = formatValue ? formatValue(rawRemaining) : String(rawRemaining);
  const displayCurrent = formatValue ? formatValue(current) : String(current);
  const displayGoal = formatValue ? formatValue(goal) : String(goal);

  // SVG Donut geometry
  const size = 112; // 28 * 4
  const strokeWidth = 9;
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.327
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <Card variant="low" glow={glow} style={styles.card}>
      {/* Header com indicador luminoso e percentual */}
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Typography variant="labelMd" style={styles.title}>
            {label}
          </Typography>
        </View>
        <View style={[styles.percentBadge, { backgroundColor: `${color}20` }]}>
          <Typography variant="unitCaption" color={color}>
            {percent}%
          </Typography>
        </View>
      </View>

      {/* Gráfico Circular de Rosca */}
      <View style={styles.donutContainer}>
        <Svg width={size} height={size} viewBox="0 0 100 100" style={styles.svg}>
          {/* Trilha de fundo */}
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke={colors.surfaceContainer}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Barra de progresso */}
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        {/* Readout Central */}
        <View style={styles.donutCenter}>
          <Typography variant="metricNumeralLg" style={styles.remainingValue}>
            {displayRemaining}
            <Typography variant="labelSm" color={colors.onSurfaceVariant}>
              {unit}
            </Typography>
          </Typography>
          <Typography variant="unitCaption" color={color} style={styles.leftLabel}>
            {resolvedLeftLabel}
          </Typography>
        </View>
      </View>

      {/* Meta e Consumo Atual */}
      <View style={styles.footerPill}>
        <Typography variant="labelSm" color={colors.onSurfaceVariant} center>
          <Typography variant="labelSm" color={colors.onSurface} style={styles.bold}>
            {displayCurrent}{unit}
          </Typography>
          {' '}/ {displayGoal}{unit} {resolvedGoalLabel}
        </Typography>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  title: {
    fontWeight: '700',
  },
  percentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  donutContainer: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingValue: {
    lineHeight: 30,
  },
  leftLabel: {
    letterSpacing: 1,
    marginTop: 1,
  },
  footerPill: {
    width: '100%',
    backgroundColor: `${colors.surfaceContainer}99`,
    borderRadius: radii.md,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  bold: {
    fontWeight: '700',
  },
});
