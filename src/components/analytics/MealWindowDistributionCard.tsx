import { Apple, Coffee, Moon, Sun } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { type MealWindow } from '@/db/schema';
import { type MealWindowBreakdownItem } from '@/repositories/logs.repository';
import { colors, radii, spacing } from '@/theme/tokens';

export interface MealWindowDistributionCardProps {
  breakdown: MealWindowBreakdownItem[];
}

export function MealWindowDistributionCard({
  breakdown,
}: MealWindowDistributionCardProps) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'protein' | 'calories'>('protein');

  const getWindowInfo = (win: MealWindow) => {
    switch (win) {
      case 'breakfast':
        return {
          title: t.analytics.breakfast,
          icon: <Coffee size={16} color={colors.tertiaryContainer} />,
          badgeColor: `${colors.tertiaryContainer}18`,
        };
      case 'lunch':
        return {
          title: t.analytics.lunch,
          icon: <Sun size={16} color={colors.primary} />,
          badgeColor: `${colors.primary}18`,
        };
      case 'dinner':
        return {
          title: t.analytics.dinner,
          icon: <Moon size={16} color={colors.secondary} />,
          badgeColor: `${colors.secondary}18`,
        };
      case 'snack':
        return {
          title: t.analytics.snack,
          icon: <Apple size={16} color="#eab308" />,
          badgeColor: 'rgba(234, 179, 8, 0.18)',
        };
    }
  };

  const isProtein = viewMode === 'protein';
  const barColor = isProtein ? colors.primary : colors.tertiaryContainer;

  return (
    <Card variant="low" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <Typography variant="labelMd" style={styles.title}>
            {t.analytics.mealDistribution}
          </Typography>
          <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
            {t.analytics.mealDistributionSub}
          </Typography>
        </View>

        {/* Toggle Mode */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setViewMode('protein')}
            style={[styles.toggleBtn, isProtein && styles.toggleBtnActiveProtein]}>
            <Typography
              variant="unitCaption"
              color={isProtein ? colors.primary : colors.onSurfaceVariant}
              style={styles.toggleBtnText}>
              {t.analytics.protein}
            </Typography>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('calories')}
            style={[styles.toggleBtn, !isProtein && styles.toggleBtnActiveCalories]}>
            <Typography
              variant="unitCaption"
              color={!isProtein ? colors.tertiaryContainer : colors.onSurfaceVariant}
              style={styles.toggleBtnText}>
              {t.analytics.calories}
            </Typography>
          </Pressable>
        </View>
      </View>

      {/* Lista de Janelas de Refeição */}
      <View style={styles.list}>
        {breakdown.map((item) => {
          const info = getWindowInfo(item.window);
          const percent = isProtein ? item.proteinPercent : item.caloriesPercent;
          const mainAmount = isProtein
            ? `${item.proteinG}g`
            : `${item.caloriesKcal} kcal`;
          const secondaryAmount = isProtein
            ? `${item.caloriesKcal} kcal`
            : `${item.proteinG}g`;

          return (
            <View key={item.window} style={styles.rowItem}>
              {/* Cabeçalho do item com Ícone, Título e Valores */}
              <View style={styles.itemHeader}>
                <View style={styles.leftInfo}>
                  <View style={[styles.iconWrap, { backgroundColor: info.badgeColor }]}>
                    {info.icon}
                  </View>
                  <Typography variant="labelSm" style={styles.windowLabel}>
                    {info.title}
                  </Typography>
                  {item.entriesCount > 0 && (
                    <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                      • {item.entriesCount}x
                    </Typography>
                  )}
                </View>

                <View style={styles.rightValues}>
                  <Typography variant="labelSm" style={styles.mainValue}>
                    {mainAmount}
                  </Typography>
                  <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                    ({percent}%)
                  </Typography>
                </View>
              </View>

              {/* Barra de Progresso Horizontal */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(Math.max(percent, 0), 100)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>

              {/* Subdetalhe da métrica secundária */}
              <View style={styles.subDetail}>
                <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                  {isProtein ? `Energia: ${secondaryAmount}` : `Proteína: ${secondaryAmount}`}
                </Typography>
              </View>
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
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleArea: {
    gap: 2,
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  toggleBtnActiveProtein: {
    backgroundColor: `${colors.primary}25`,
  },
  toggleBtnActiveCalories: {
    backgroundColor: `${colors.tertiaryContainer}25`,
  },
  toggleBtnText: {
    fontWeight: '700',
  },
  list: {
    gap: spacing.md,
  },
  rowItem: {
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowLabel: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  rightValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  mainValue: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.surfaceHighest,
    borderRadius: radii.full,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  subDetail: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
