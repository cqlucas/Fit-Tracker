import { Flame, Info } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface CalorieGoalCardProps {
  value: string;
  onChangeValue: (val: string) => void;
  isPt?: boolean;
}

export function CalorieGoalCard({
  value,
  onChangeValue,
  isPt = false,
}: CalorieGoalCardProps) {
  const numericValue = parseInt(value, 10) || 0;

  // Classificação dinâmica do modo metabólico com base no valor inserido
  const modeLabel = useMemo(() => {
    if (numericValue === 0) return isPt ? 'Indefinido' : 'Undefined';
    if (numericValue < 2000) return isPt ? 'Déficit' : 'Deficit';
    if (numericValue <= 2400) return isPt ? 'Manutenção' : 'Maintenance';
    return isPt ? 'Superávit' : 'Surplus';
  }, [numericValue, isPt]);

  // Presets rápidos para seleção imediata
  const quickPresets = [1800, 2000, 2200, 2500];

  return (
    <Card variant="low" glow="tertiary" style={styles.card}>
      {/* Glow de fundo */}
      <View style={styles.ambientGlow} />

      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconBox}>
            <Flame size={20} color={colors.tertiaryContainer} strokeWidth={2.4} />
          </View>
          <View>
            <Typography variant="unitCaption" color={colors.tertiary} style={styles.tagline}>
              {isPt ? 'ORÇAMENTO ENERGÉTICO' : 'METABOLIC BUDGET'}
            </Typography>
            <Typography variant="headlineSm" style={styles.cardTitle}>
              {isPt ? 'Meta Calórica Diária' : 'Daily Calorie Target'}
            </Typography>
          </View>
        </View>
        <Flame size={18} color={colors.tertiaryContainer} style={styles.headerRightIcon} />
      </View>

      {/* Value Readout Box - Campo de input numérico livre */}
      <View style={styles.readoutBox}>
        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '');
              onChangeValue(cleaned);
            }}
            keyboardType="numeric"
            maxLength={5}
            placeholder="2200"
            placeholderTextColor={`${colors.tertiaryContainer}50`}
            style={styles.numericInput}
          />
          <Typography variant="labelMd" color={colors.onSurfaceVariant} style={styles.unitText}>
            {isPt ? 'KCAL / DIA' : 'KCAL / DAY'}
          </Typography>
        </View>

        <View style={styles.statusColumn}>
          <Typography variant="unitCaption" color={colors.outline} style={styles.statusLabel}>
            {isPt ? 'MODO ESTIMADO' : 'CALCULATED MODE'}
          </Typography>
          <Typography variant="metricNumeralSm" color={colors.tertiary} style={styles.statusValue}>
            {modeLabel}
          </Typography>
        </View>
      </View>

      {/* Quick Preset Chips */}
      <View style={styles.presetsRow}>
        {quickPresets.map((preset) => {
          const isSelected = numericValue === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => onChangeValue(String(preset))}
              accessibilityRole="button"
              accessibilityLabel={`${preset} kcal`}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipActive,
                pressed && styles.chipPressed,
              ]}>
              <Typography
                variant="labelSm"
                color={isSelected ? colors.onTertiary : colors.onSurfaceVariant}
                style={isSelected ? styles.chipTextActive : undefined}>
                {preset} kcal
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {/* Micro-Copy Informativo */}
      <View style={styles.tipRow}>
        <Info size={15} color={colors.tertiaryContainer} style={styles.tipIcon} />
        <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.tipText}>
          {isPt
            ? 'Calcula automaticamente o balanço e déficit calórico diário no painel de controle e na evolução semanal.'
            : 'Automatically calculates daily energy balance and calorie deficits across the dashboard and analytics.'}
        </Typography>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md + 2,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 140,
    borderRadius: radii.full,
    backgroundColor: `${colors.tertiaryContainer}08`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    backgroundColor: `${colors.tertiaryContainer}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontWeight: '700',
  },
  headerRightIcon: {
    opacity: 0.8,
  },
  readoutBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs + 2,
    flex: 1,
  },
  numericInput: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.tertiary,
    padding: 0,
    margin: 0,
    minWidth: 100,
  },
  unitText: {
    letterSpacing: 0.6,
  },
  statusColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statusLabel: {
    letterSpacing: 0.6,
  },
  statusValue: {
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.tertiaryContainer,
    borderColor: colors.tertiary,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipTextActive: {
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: `${colors.surfaceContainer}70`,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
  },
  tipIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
