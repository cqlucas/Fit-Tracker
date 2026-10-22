import { Dumbbell, Droplets, Flame, Target } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { type Goals } from '@/repositories/goals.repository';
import { type DailySeriesPoint } from '@/repositories/logs.repository';
import { colors, radii, spacing } from '@/theme/tokens';

export type MetricType = 'protein' | 'water' | 'calories';

export interface DailyTrendBarChartProps {
  series: DailySeriesPoint[];
  goals: Goals;
}

export function DailyTrendBarChart({ series, goals }: DailyTrendBarChartProps) {
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const [metric, setMetric] = useState<MetricType>('protein');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Largura inicial calculada para evitar layout shift antes do onLayout
  const initialWidth = Math.max(windowWidth - (spacing.lg * 2 + spacing.md * 2), 260);
  const [containerWidth, setContainerWidth] = useState<number>(initialWidth);

  // Seleciona o ponto atual (ou o último ponto se nada estiver tocado)
  const activeIndex = selectedIndex !== null ? selectedIndex : series.length - 1;
  const activePoint = series[activeIndex] ?? series[series.length - 1];

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && Math.abs(w - containerWidth) > 1) {
      setContainerWidth(w);
    }
  };

  // Configuração por macro
  const metricConfig = useMemo(() => {
    switch (metric) {
      case 'protein':
        return {
          title: t.analytics.protein,
          goal: goals.proteinGoal,
          unit: 'g',
          color: colors.primary,
          colorDim: `${colors.primary}50`,
          getValue: (p: DailySeriesPoint) => p.proteinG,
          formatVal: (val: number) => `${val}g`,
        };
      case 'water':
        return {
          title: t.analytics.water,
          goal: goals.waterGoal,
          unit: 'ml',
          color: colors.secondary,
          colorDim: `${colors.secondary}50`,
          getValue: (p: DailySeriesPoint) => p.waterMl,
          formatVal: (val: number) => (val >= 1000 ? `${(val / 1000).toFixed(1)}L` : `${val}ml`),
        };
      case 'calories':
        return {
          title: t.analytics.calories,
          goal: goals.caloriesGoal,
          unit: 'kcal',
          color: colors.tertiaryContainer,
          colorDim: `${colors.tertiaryContainer}50`,
          getValue: (p: DailySeriesPoint) => p.caloriesKcal,
          formatVal: (val: number) => `${val} kcal`,
        };
    }
  }, [metric, goals, t]);

  const { title, goal, color, colorDim, getValue, formatVal } = metricConfig;

  // Cálculos de dimensões e escalas para o SVG
  const chartHeight = 170;
  const baselineY = 140;
  const topPadding = 18;
  const availableHeight = baselineY - topPadding;

  const { goalY, barSlots } = useMemo(() => {
    const vals = series.map(getValue);
    const maxDataVal = Math.max(...vals, 0);
    const maxScale = Math.max(goal * 1.25, maxDataVal * 1.15, 10);
    const calculatedGoalY = baselineY - (goal / maxScale) * availableHeight;

    const count = series.length || 1;
    const paddingX = 12;
    const usableWidth = containerWidth - paddingX * 2;
    const slotWidth = usableWidth / count;
    const barWidth = Math.max(
      3,
      Math.min(slotWidth * 0.58, count > 20 ? 7 : count > 10 ? 14 : 24),
    );

    const slots = series.map((pt, idx) => {
      const val = getValue(pt);
      const barHeight = val > 0 ? Math.max((val / maxScale) * availableHeight, 4) : 0;
      const barY = baselineY - barHeight;
      const slotCenterX = paddingX + idx * slotWidth + slotWidth / 2;
      const barX = slotCenterX - barWidth / 2;

      // Decide quando mostrar label de data no eixo X
      let showLabel = false;
      if (count <= 7) {
        showLabel = true;
      } else if (count <= 14) {
        showLabel = idx % 2 === 0 || idx === count - 1;
      } else {
        showLabel = idx % 5 === 0 || idx === count - 1;
      }

      return {
        point: pt,
        val,
        barX,
        barY,
        barWidth,
        barHeight,
        slotX: paddingX + idx * slotWidth,
        slotWidth,
        slotCenterX,
        showLabel,
        isGoalMet: val >= goal,
      };
    });

    return {
      maxVal: maxScale,
      goalY: calculatedGoalY,
      barSlots: slots,
    };
  }, [series, getValue, goal, containerWidth, baselineY, availableHeight]);

  const activeVal = activePoint ? getValue(activePoint) : 0;
  const activeDiff = activeVal - goal;
  const isActiveMet = activeVal >= goal;

  return (
    <Card variant="low" style={styles.card}>
      {/* Header com Título e Switcher de Métricas */}
      <View style={styles.header}>
        <View>
          <Typography variant="labelMd" style={styles.title}>
            {t.analytics.dailyEvolution}
          </Typography>
          <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
            {title} • Meta: {formatVal(goal)}
          </Typography>
        </View>

        {/* Macro Selector Pills */}
        <View style={styles.metricTabs}>
          <Pressable
            onPress={() => setMetric('protein')}
            style={[styles.tab, metric === 'protein' && styles.tabActiveProtein]}>
            <Dumbbell
              size={14}
              color={metric === 'protein' ? colors.primary : colors.onSurfaceVariant}
            />
          </Pressable>
          <Pressable
            onPress={() => setMetric('water')}
            style={[styles.tab, metric === 'water' && styles.tabActiveWater]}>
            <Droplets
              size={14}
              color={metric === 'water' ? colors.secondary : colors.onSurfaceVariant}
            />
          </Pressable>
          <Pressable
            onPress={() => setMetric('calories')}
            style={[styles.tab, metric === 'calories' && styles.tabActiveCalories]}>
            <Flame
              size={14}
              color={metric === 'calories' ? colors.tertiaryContainer : colors.onSurfaceVariant}
            />
          </Pressable>
        </View>
      </View>

      {/* Destaque / Tooltip do dia selecionado */}
      <View style={styles.tooltipContainer}>
        <View style={styles.tooltipLeft}>
          <Typography variant="labelSm" color={colors.onSurfaceVariant}>
            {activePoint?.dateKey ? `${activePoint.label} (${activePoint.dateKey})` : '-'}
          </Typography>
          <View style={styles.valueRow}>
            <Typography variant="metricNumeralLg" color={colors.onSurface} style={styles.activeValue}>
              {formatVal(activeVal)}
            </Typography>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
              / dia
            </Typography>
          </View>
        </View>

        <View
          style={[
            styles.goalBadge,
            { backgroundColor: isActiveMet ? `${color}20` : colors.surfaceHigh },
          ]}>
          <Target size={12} color={isActiveMet ? color : colors.onSurfaceVariant} />
          <Typography
            variant="unitCaption"
            color={isActiveMet ? color : colors.onSurfaceVariant}
            style={styles.goalBadgeText}>
            {isActiveMet ? t.analytics.aboveGoal : t.analytics.belowGoal} ({isActiveDiff(activeDiff)})
          </Typography>
        </View>
      </View>

      {/* SVG Canvas do Gráfico de Barras */}
      <View style={styles.chartWrapper} onLayout={handleLayout}>
        <Svg width={containerWidth} height={chartHeight}>
          {/* Linha de Base (Baseline) */}
          <Line
            x1={12}
            y1={baselineY}
            x2={containerWidth - 12}
            y2={baselineY}
            stroke={colors.strokeCrisp}
            strokeWidth={1}
          />

          {/* Linha de Meta Tracejada (Goal Line) */}
          <Line
            x1={12}
            y1={goalY}
            x2={containerWidth - 12}
            y2={goalY}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.65}
          />

          {/* Tag de Meta ao Lado da Linha */}
          <SvgText
            x={containerWidth - 14}
            y={goalY - 4}
            textAnchor="end"
            fontSize={9}
            fontWeight="bold"
            fill={color}
            opacity={0.85}>
            {t.analytics.goalLine}: {formatVal(goal)}
          </SvgText>

          {/* Colunas e Barras */}
          {barSlots.map((slot, idx) => {
            const isSelected = idx === activeIndex;

            return (
              <G key={slot.point.dateKey}>
                {/* Destaque de coluna selecionada */}
                {isSelected && (
                  <Rect
                    x={slot.slotX + 2}
                    y={topPadding - 4}
                    width={slot.slotWidth - 4}
                    height={baselineY - topPadding + 6}
                    fill={`${color}12`}
                    rx={radii.sm}
                  />
                )}

                {/* Barra do dia */}
                {slot.barHeight > 0 && (
                  <Rect
                    x={slot.barX}
                    y={slot.barY}
                    width={slot.barWidth}
                    height={slot.barHeight}
                    rx={slot.barWidth / 2}
                    fill={slot.isGoalMet ? color : isSelected ? colorDim : colors.surfaceHigh}
                  />
                )}

                {/* Ponto indicador caso o valor seja 0 */}
                {slot.barHeight === 0 && (
                  <Rect
                    x={slot.barX}
                    y={baselineY - 3}
                    width={slot.barWidth}
                    height={3}
                    rx={1.5}
                    fill={colors.surfaceHigh}
                  />
                )}

                {/* Rótulo de Data no Eixo X */}
                {slot.showLabel && (
                  <SvgText
                    x={slot.slotCenterX}
                    y={baselineY + 18}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    fill={isSelected ? colors.onSurface : colors.onSurfaceVariant}>
                    {slot.point.label}
                  </SvgText>
                )}

                {/* Área de Toque Invisível Cobrindo Toda a Coluna */}
                <Rect
                  x={slot.slotX}
                  y={0}
                  width={slot.slotWidth}
                  height={chartHeight}
                  fill="transparent"
                  onPress={() => setSelectedIndex(idx)}
                />
              </G>
            );
          })}
        </Svg>
      </View>
    </Card>
  );
}

function isActiveDiff(diff: number): string {
  if (diff > 0) return `+${Math.round(diff)}`;
  return `${Math.round(diff)}`;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.full,
    padding: 3,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  tab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActiveProtein: {
    backgroundColor: `${colors.primary}25`,
  },
  tabActiveWater: {
    backgroundColor: `${colors.secondary}25`,
  },
  tabActiveCalories: {
    backgroundColor: `${colors.tertiaryContainer}25`,
  },
  tooltipContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  tooltipLeft: {
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  activeValue: {
    fontWeight: '800',
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  goalBadgeText: {
    fontWeight: '700',
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
