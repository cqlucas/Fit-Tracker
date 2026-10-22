import { Flame } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface CaloriesProgressCardProps {
  consumed: number;
  goal: number;
}

export function CaloriesProgressCard({ consumed, goal }: CaloriesProgressCardProps) {
  const percent = goal > 0 ? Math.min(Math.round((consumed / goal) * 100), 100) : 0;
  const remaining = Math.max(goal - consumed, 0);

  const formatNumber = (num: number) => num.toLocaleString('en-US');

  return (
    <Card variant="low" glow="tertiary" style={styles.card}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <View style={styles.iconContainer}>
            <Flame size={18} color={colors.tertiaryContainer} />
          </View>
          <View>
            <Typography variant="labelMd" style={styles.title}>
              Active Energy & Calories
            </Typography>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.subtitle}>
              DYNAMIC DEFICIT TARGET
            </Typography>
          </View>
        </View>

        <View style={styles.remainingGroup}>
          <Typography variant="headlineSm" color={colors.tertiaryContainer} style={styles.remainingNumber}>
            {formatNumber(remaining)}
          </Typography>
          <Typography variant="labelSm" color={colors.onSurfaceVariant}>
            kcal left
          </Typography>
        </View>
      </View>

      {/* Progress Bar */}
      <ProgressBar
        progress={percent}
        color={colors.tertiaryContainer}
        trackColor={colors.surfaceHighest}
        height={10}
        style={styles.progressBar}
      />

      {/* Readout Metrics Grid */}
      <View style={styles.footerRow}>
        <View style={styles.consumedInfo}>
          <View style={styles.dot} />
          <Typography variant="labelMd" color={colors.onSurfaceVariant}>
            <Typography variant="labelMd" color={colors.onSurface} style={styles.bold}>
              {formatNumber(consumed)}
            </Typography>
            {' '}kcal consumed
          </Typography>
        </View>

        <Typography variant="labelSm" color={colors.onSurfaceVariant} style={styles.goalText}>
          Goal: {formatNumber(goal)} kcal
        </Typography>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 126, 45, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    letterSpacing: 0.6,
    marginTop: 1,
  },
  remainingGroup: {
    alignItems: 'flex-end',
  },
  remainingNumber: {
    fontWeight: '700',
    lineHeight: 24,
  },
  progressBar: {
    marginVertical: spacing.xs + 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  consumedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.tertiaryContainer,
  },
  bold: {
    fontWeight: '700',
  },
  goalText: {
    fontWeight: '600',
  },
});
