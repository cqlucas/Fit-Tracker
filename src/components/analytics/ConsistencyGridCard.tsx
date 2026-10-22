import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { type DailySeriesPoint } from '@/repositories/logs.repository';
import { colors, radii, spacing } from '@/theme/tokens';

export interface ConsistencyGridCardProps {
  series: DailySeriesPoint[];
}

export function ConsistencyGridCard({ series }: ConsistencyGridCardProps) {
  const { t } = useLanguage();
  const [selectedDay, setSelectedDay] = useState<DailySeriesPoint | null>(null);

  const getDayStatus = (point: DailySeriesPoint) => {
    if (point.hitBothGoals) {
      return {
        bg: colors.primary,
        border: colors.primary,
        textColor: colors.surfaceLowest,
        label: t.analytics.bothGoals,
      };
    }
    if (point.hitProteinGoal || point.hitWaterGoal) {
      return {
        bg: `${colors.primary}65`,
        border: `${colors.primary}80`,
        textColor: colors.surfaceLowest,
        label: t.analytics.oneGoal,
      };
    }
    return {
      bg: colors.surfaceContainer,
      border: colors.strokeCrisp,
      textColor: colors.onSurfaceVariant,
      label: t.analytics.noGoal,
    };
  };

  return (
    <Card variant="low" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <Typography variant="labelMd" style={styles.title}>
            {t.analytics.consistencyMap}
          </Typography>
          <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
            {t.analytics.consistencyMapSub}
          </Typography>
        </View>
      </View>

      {/* Grid de Quadrados */}
      <View style={styles.gridContainer}>
        {series.map((point) => {
          const status = getDayStatus(point);
          const isSelected = selectedDay?.dateKey === point.dateKey;
          const dayNum = point.dateKey.split('-')[2];

          return (
            <Pressable
              key={point.dateKey}
              onPress={() => setSelectedDay(isSelected ? null : point)}
              style={({ pressed }) => [
                styles.daySquare,
                {
                  backgroundColor: status.bg,
                  borderColor: isSelected ? colors.onSurface : status.border,
                },
                isSelected && styles.daySquareSelected,
                pressed && styles.daySquarePressed,
              ]}>
              <Typography
                variant="unitCaption"
                style={[
                  styles.dayText,
                  { color: status.textColor },
                  isSelected && styles.dayTextSelected,
                ]}>
                {dayNum}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {/* Destaque do dia tocado (se houver) */}
      {selectedDay && (
        <View style={styles.dayDetailBox}>
          <View style={styles.detailHeader}>
            <Typography variant="labelSm" color={colors.onSurface} style={styles.bold}>
              {selectedDay.dateKey} ({selectedDay.label})
            </Typography>
            <Typography
              variant="unitCaption"
              color={selectedDay.hitBothGoals ? colors.primary : colors.onSurfaceVariant}
              style={styles.bold}>
              {getDayStatus(selectedDay).label}
            </Typography>
          </View>
          <View style={styles.detailMetrics}>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
              Proteína:{' '}
              <Typography
                variant="unitCaption"
                color={selectedDay.hitProteinGoal ? colors.primary : colors.onSurface}
                style={styles.bold}>
                {selectedDay.proteinG}g {selectedDay.hitProteinGoal ? '✓' : ''}
              </Typography>
            </Typography>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
              Água:{' '}
              <Typography
                variant="unitCaption"
                color={selectedDay.hitWaterGoal ? colors.secondary : colors.onSurface}
                style={styles.bold}>
                {selectedDay.waterMl}ml {selectedDay.hitWaterGoal ? '✓' : ''}
              </Typography>
            </Typography>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
              Calorias:{' '}
              <Typography variant="unitCaption" color={colors.tertiaryContainer} style={styles.bold}>
                {selectedDay.caloriesKcal} kcal
              </Typography>
            </Typography>
          </View>
        </View>
      )}

      {/* Legenda do Mapa */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.primary }]} />
          <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
            {t.analytics.bothGoals}
          </Typography>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: `${colors.primary}65` }]} />
          <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
            {t.analytics.oneGoal}
          </Typography>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendBox,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.strokeCrisp,
                borderWidth: 1,
              },
            ]}
          />
          <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
            {t.analytics.noGoal}
          </Typography>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleArea: {
    gap: 2,
  },
  title: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  daySquare: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySquareSelected: {
    borderWidth: 2,
    transform: [{ scale: 1.08 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  daySquarePressed: {
    opacity: 0.75,
  },
  dayText: {
    fontWeight: '700',
  },
  dayTextSelected: {
    fontWeight: '900',
  },
  dayDetailBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailMetrics: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  bold: {
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.strokeSubtle,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
