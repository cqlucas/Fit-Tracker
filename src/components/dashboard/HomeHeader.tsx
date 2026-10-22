import { Bell, SlidersHorizontal, Zap } from 'lucide-react-native';
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
  onPressSettings?: () => void;
  onPressNotifications?: () => void;
  onPressTune?: () => void;
}

export function HomeHeader({
  dateTitle,
  dayOfWeek,
  streakDays = 1,
  onPressSettings,
  onPressNotifications,
  onPressTune,
}: HomeHeaderProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      {/* Top Bar: Brand, Notifications, Profile */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Zap size={18} color={colors.primary} strokeWidth={2.5} />
          </View>
          <View>
            <Typography variant="headlineSm" style={styles.brandTitle}>
              NutriPulse
            </Typography>
            <Typography variant="unitCaption" color={colors.primary} style={styles.brandSubtitle}>
              {t.home.todayBadge}
            </Typography>
          </View>
        </View>

        <View style={styles.topActions}>
          <IconButton
            size={38}
            backgroundColor={colors.surfaceContainer}
            icon={<Bell size={18} color={colors.onSurfaceVariant} />}
            onPress={onPressNotifications}
            accessibilityLabel={t.home.notifications}
          />
          <IconButton
            size={38}
            backgroundColor={colors.surfaceContainer}
            borderColor={`${colors.primary}40`}
            icon={<SlidersHorizontal size={18} color={colors.primary} />}
            onPress={onPressSettings}
            accessibilityLabel={t.tabs.settings}
          />
        </View>
      </View>

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
            <View style={styles.pulseDot} />
            <Typography variant="labelSm" color={colors.primary}>
              {t.home.streakActive(streakDays)}
            </Typography>
          </View>
        </View>

        <IconButton
          size={38}
          backgroundColor={colors.surfaceContainer}
          icon={<SlidersHorizontal size={18} color={colors.onSurfaceVariant} />}
          onPress={onPressTune}
          accessibilityLabel={t.home.adjustTarget}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontWeight: '800',
    lineHeight: 22,
  },
  brandSubtitle: {
    letterSpacing: 0.8,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
});
