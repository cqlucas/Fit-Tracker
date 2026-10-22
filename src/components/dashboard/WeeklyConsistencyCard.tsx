import { Check, Minus } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface WeeklyDayStatus {
  dayLabel: string; // "M", "T", "W", etc.
  dateKey: string;
  isHit: boolean;
  isToday?: boolean;
  percent?: number;
}

export interface WeeklyConsistencyCardProps {
  title: string;
  subtitle: string;
  hitCount: number;
  totalDays?: number;
  averageText: string;
  icon: React.ReactNode;
  accentColor?: string;
  containerColor?: string;
  days: WeeklyDayStatus[];
}

export function WeeklyConsistencyCard({
  title,
  subtitle,
  hitCount,
  totalDays = 7,
  averageText,
  icon,
  accentColor = colors.primary,
  containerColor = colors.primaryContainer,
  days,
}: WeeklyConsistencyCardProps) {
  return (
    <Card variant="low" style={styles.card}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.iconAndTitle}>
          <View style={[styles.iconBadge, { backgroundColor: `${accentColor}18` }]}>
            {icon}
          </View>
          <View>
            <View style={styles.titleRow}>
              <Typography variant="labelMd" style={styles.title}>
                {title}
              </Typography>
              <View style={[styles.hitBadge, { backgroundColor: `${accentColor}25` }]}>
                <Typography variant="unitCaption" color={accentColor} style={styles.hitText}>
                  {hitCount}/{totalDays} Hit
                </Typography>
              </View>
            </View>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.subtitle}>
              {subtitle}
            </Typography>
          </View>
        </View>

        <Typography variant="labelMd" style={styles.average}>
          {averageText}
        </Typography>
      </View>

      {/* 7-Day Tracker Row */}
      <View style={styles.trackerRow}>
        {days.map((item, idx) => {
          return (
            <View key={item.dateKey || idx} style={styles.dayCol}>
              <Typography
                variant="unitCaption"
                color={item.isToday ? accentColor : colors.onSurfaceVariant}
                style={[styles.dayLabel, item.isToday && styles.bold]}>
                {item.dayLabel}
              </Typography>

              {item.isHit ? (
                // Dia Concluído
                <View
                  style={[
                    styles.dayBox,
                    { backgroundColor: containerColor },
                    styles.hitShadow,
                  ]}>
                  <Check size={16} color={colors.surfaceLowest} strokeWidth={3} />
                </View>
              ) : item.isToday ? (
                // Dia de Hoje (pendente/em progresso)
                <View style={[styles.dayBox, styles.todayBox]}>
                  <Typography variant="unitCaption" color={accentColor} style={styles.todayPercent}>
                    {item.percent ?? 0}%
                  </Typography>
                </View>
              ) : (
                // Dia Anterior Não Batido
                <View style={[styles.dayBox, styles.missedBox]}>
                  <Minus size={14} color={`${colors.onSurfaceVariant}60`} strokeWidth={2.5} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconAndTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontWeight: '700',
  },
  hitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.sm,
  },
  hitText: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 1,
  },
  average: {
    fontWeight: '700',
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontWeight: '600',
  },
  bold: {
    fontWeight: '800',
  },
  dayBox: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  todayBox: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: `${colors.strokeCrisp}80`,
  },
  todayPercent: {
    fontSize: 10,
    fontWeight: '800',
  },
  missedBox: {
    backgroundColor: colors.surfaceContainer,
  },
});
