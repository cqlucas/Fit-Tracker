import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { type AnalyticsPeriod } from '@/repositories/logs.repository';
import { colors, radii, spacing } from '@/theme/tokens';

export interface AnalyticsPeriodSelectorProps {
  period: AnalyticsPeriod;
  onChangePeriod: (period: AnalyticsPeriod) => void;
}

export function AnalyticsPeriodSelector({
  period,
  onChangePeriod,
}: AnalyticsPeriodSelectorProps) {
  const { t } = useLanguage();

  const options: { id: AnalyticsPeriod; label: string }[] = [
    { id: '7d', label: t.analytics.period7d },
    { id: '14d', label: t.analytics.period14d },
    { id: '30d', label: t.analytics.period30d },
  ];

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isSelected = period === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChangePeriod(opt.id)}
            style={({ pressed }) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}>
            <Typography
              variant="labelSm"
              color={isSelected ? colors.onSurface : colors.onSurfaceVariant}
              style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
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
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.full,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  segmentSelected: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentPressed: {
    opacity: 0.8,
  },
  segmentText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  segmentTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
});
