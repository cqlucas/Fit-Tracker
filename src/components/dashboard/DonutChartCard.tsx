import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
  const { width: windowWidth } = useWindowDimensions();

  const percent = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
  const rawRemaining = Math.max(goal - current, 0);

  const resolvedLeftLabel = leftLabel ?? t.home.left;
  const resolvedGoalLabel = goalLabel ?? t.home.goal;

  const displayRemaining = formatValue ? formatValue(rawRemaining) : String(rawRemaining);
  const displayCurrent = formatValue ? formatValue(current) : String(current);
  const displayGoal = formatValue ? formatValue(goal) : String(goal);

  // Cálculo dinâmico do diâmetro do Donut com base na largura da tela
  // Layout da Home: 2 cards lado a lado com padding lateral de 16 cada lado (32) e gap de 12
  // Padding interno de cada card: 16 de cada lado (32)
  const availableCardWidth = (windowWidth - 44) / 2 - 32;
  const size = Math.min(Math.max(Math.floor(availableCardWidth * 0.88), 108), 130);

  // SVG Donut geometry (base 100x100 no viewBox)
  const strokeWidthBase = 9;
  const strokeWidthInPx = (strokeWidthBase / 100) * size;
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.327
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Área segura interna do círculo para o texto (largura máxima inscrita para não tocar no anel)
  const innerDiameter = size - strokeWidthInPx * 2;
  const innerMaxWidth = Math.floor(innerDiameter * 0.72);

  return (
    <Card variant="low" glow={glow} style={styles.card}>
      {/* Header com indicador luminoso e percentual */}
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Typography variant="labelMd" style={styles.title} numberOfLines={1}>
            {label}
          </Typography>
        </View>
        <View style={[styles.percentBadge, { backgroundColor: `${color}20` }]}>
          <Typography variant="unitCaption" color={color} style={styles.percentText}>
            {percent}%
          </Typography>
        </View>
      </View>

      {/* Gráfico Circular de Rosca */}
      <View style={[styles.donutContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100" style={styles.svg}>
          {/* Trilha de fundo */}
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke={colors.surfaceContainer}
            strokeWidth={strokeWidthBase}
            fill="none"
          />
          {/* Barra de progresso */}
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidthBase}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        {/* Readout Central com área segura anti-colisão e auto-escala */}
        <View style={styles.donutCenterWrapper} pointerEvents="none">
          <View style={[styles.donutCenter, { width: innerMaxWidth }]}>
            {/* Linha 1: Numeral principal com auto-escala */}
            <Typography
              variant="metricNumeralLg"
              center
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              style={styles.remainingNumber}>
              {displayRemaining}
            </Typography>

            {/* Linha 2: Unidade e indicador 'RESTANTE' empilhados para não alargar a linha */}
            <Typography
              variant="unitCaption"
              color={color}
              center
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.unitAndLeftLabel}>
              {unit} {resolvedLeftLabel}
            </Typography>
          </View>
        </View>
      </View>

      {/* Meta e Consumo Atual */}
      <View style={styles.footerPill}>
        <Typography variant="labelSm" color={colors.onSurfaceVariant} center numberOfLines={1}>
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
    minWidth: 0, // Garante que o flex: 1 não transborde em flex row
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
    flex: 1,
    marginRight: 4,
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
  percentText: {
    fontWeight: '800',
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  donutCenterWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  remainingNumber: {
    fontWeight: '800',
    lineHeight: 28,
  },
  unitAndLeftLabel: {
    letterSpacing: 0.8,
    fontWeight: '800',
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
