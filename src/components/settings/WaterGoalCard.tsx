import { Droplets, Info, Waves } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface WaterGoalCardProps {
  value: string;
  onChangeValue: (val: string) => void;
  isPt?: boolean;
}

export function WaterGoalCard({ value, onChangeValue, isPt = false }: WaterGoalCardProps) {
  const numericValue = parseInt(value, 10) || 0;
  const bottlesPreview = numericValue > 0 ? (numericValue / 750).toFixed(1) : '0.0';
  const glassesPreview = numericValue > 0 ? Math.round(numericValue / 250) : 0;

  // Presets rápidos opcionais apenas como atalhos convenientes, sem bloquear a digitação livre
  const quickPresets = [2000, 2500, 3000, 3500];

  return (
    <Card variant="low" glow="secondary" style={styles.card}>
      {/* Glow de fundo */}
      <View style={styles.ambientGlow} />

      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconBox}>
            <Droplets size={20} color={colors.secondary} strokeWidth={2.4} />
          </View>
          <View>
            <Typography variant="unitCaption" color={colors.secondary} style={styles.tagline}>
              {isPt ? 'FLUIDEZ & HIDRATAÇÃO' : 'CELLULAR FLUIDITY'}
            </Typography>
            <Typography variant="headlineSm" style={styles.cardTitle}>
              {isPt ? 'Meta Diária de Água' : 'Daily Hydration Target'}
            </Typography>
          </View>
        </View>
        <Waves size={18} color={colors.secondary} style={styles.headerRightIcon} />
      </View>

      {/* Value Readout Box - Campo de input numérico livre */}
      <View style={styles.readoutBox}>
        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={(text) => {
              // Apenas dígitos numéricos, sem limites engessados
              const cleaned = text.replace(/[^0-9]/g, '');
              onChangeValue(cleaned);
            }}
            keyboardType="numeric"
            maxLength={5}
            placeholder="3000"
            placeholderTextColor={`${colors.secondary}50`}
            style={styles.numericInput}
          />
          <Typography variant="labelMd" color={colors.onSurfaceVariant} style={styles.unitText}>
            {isPt ? 'ML / DIA' : 'ML / DAY'}
          </Typography>
        </View>

        <View style={styles.previewColumn}>
          <Typography variant="unitCaption" color={colors.outline} style={styles.previewLabel}>
            {isPt ? 'GARRAFAS (750ML)' : 'SPORTS BOTTLES'}
          </Typography>
          <Typography variant="metricNumeralSm" color={colors.onSurface} style={styles.previewNumber}>
            ~{bottlesPreview}
          </Typography>
        </View>
      </View>

      {/* Quick Shortcut Badges */}
      <View style={styles.presetsRow}>
        {quickPresets.map((preset) => {
          const isSelected = numericValue === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => onChangeValue(String(preset))}
              accessibilityRole="button"
              accessibilityLabel={`${preset} ml`}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipActive,
                pressed && styles.chipPressed,
              ]}>
              <Typography
                variant="labelSm"
                color={isSelected ? colors.onSecondary : colors.onSurfaceVariant}
                style={isSelected ? styles.chipTextActive : undefined}>
                {preset}ml
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {/* Micro-Copy Tip */}
      <View style={styles.tipRow}>
        <Info size={15} color={colors.secondary} style={styles.tipIcon} />
        <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.tipText}>
          {isPt
            ? `Equivalente a aproximadamente ${glassesPreview} copos de 250ml ou ${bottlesPreview} caramanholas esportivas.`
            : `Equivalent to ~${glassesPreview} standard 250ml glasses or ~${bottlesPreview} pro cycling bottles.`}
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
    backgroundColor: `${colors.secondary}08`,
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
    backgroundColor: `${colors.secondary}18`,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs + 2,
  },
  numericInput: {
    fontFamily: 'System',
    fontSize: 34,
    fontWeight: '800',
    color: colors.secondary,
    minWidth: 95,
    padding: 0,
    margin: 0,
  },
  unitText: {
    letterSpacing: 0.8,
  },
  previewColumn: {
    alignItems: 'flex-end',
  },
  previewLabel: {
    letterSpacing: 0.6,
  },
  previewNumber: {
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  chipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  chipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  chipTextActive: {
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 3,
    paddingTop: 4,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
});
