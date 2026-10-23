import { SlidersHorizontal } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, spacing } from '@/theme/tokens';

export interface HomeHeaderProps {
  dateTitle: string; // e.g. "Today, Oct 24"
  dayOfWeek: string; // e.g. "Thu"
  streakDays?: number;
  onPressTune?: () => void;
}

export function HomeHeader({
  dateTitle,
  dayOfWeek,
  streakDays = 0,
  onPressTune,
}: HomeHeaderProps) {
  const { t } = useLanguage();
  const hasStreak = streakDays > 0;

  return (
    <View style={styles.container}>
      {/* Date Meta & Streak Sub-Header */}
      <View style={styles.dateRow}>
        <View style={styles.dateMeta}>
          <View style={styles.dateTitleRow}>
            <Typography variant="headlineSm" style={styles.dateTitle}>
              {dateTitle}
            </Typography>
            <View style={styles.dayBadge}>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.dayBadgeText}>
                {dayOfWeek}
              </Typography>
            </View>
          </View>

          <View style={styles.streakRow}>
            <View style={[styles.pulseDot, !hasStreak && styles.pulseDotInactive]} />
            <Typography
              variant="labelSm"
              color={hasStreak ? colors.primary : colors.onSurfaceVariant}>
              {t.home.streakActive(streakDays)}
            </Typography>
          </View>
        </View>

        {onPressTune ? (
          <IconButton
            size={38}
            backgroundColor={colors.surfaceContainer}
            icon={<SlidersHorizontal size={18} color={colors.onSurfaceVariant} />}
            onPress={onPressTune}
            accessibilityLabel={t.home.adjustTarget}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateMeta: {
    gap: 2,
  },
  dateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateTitle: {
    fontWeight: '700',
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
  },
  dayBadgeText: {
    fontWeight: '700',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  pulseDotInactive: {
    backgroundColor: colors.outline,
    opacity: 0.6,
  },
});
