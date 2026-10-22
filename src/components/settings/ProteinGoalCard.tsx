import { Dumbbell, Info, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface ProteinGoalCardProps {
  value: string;
  onChangeValue: (val: string) => void;
  isPt?: boolean;
}

export function ProteinGoalCard({ value, onChangeValue, isPt = false }: ProteinGoalCardProps) {
  const numericValue = parseInt(value, 10) || 0;
  const calPreview = numericValue * 4;

  const quickSteps = [140, 160, 180, 200];

  return (
    <Card variant="low" glow="primary" style={styles.card}>
      {/* Glow de fundo */}
      <View style={styles.ambientGlow} />

      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconBox}>
            <Dumbbell size={20} color={colors.primary} strokeWidth={2.4} />
          </View>
          <View>
            <Typography variant="unitCaption" color={colors.primary} style={styles.tagline}>
              {isPt ? 'SÍNTESE & ANABOLISMO' : 'ANABOLIC THRESHOLD'}
            </Typography>
            <Typography variant="headlineSm" style={styles.cardTitle}>
              {isPt ? 'Meta Diária de Proteína' : 'Daily Protein Target'}
            </Typography>
          </View>
        </View>
        <Zap size={18} color={colors.primary} style={styles.headerRightIcon} />
      </View>

      {/* Value Readout Box */}
      <View style={styles.readoutBox}>
        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={(text) => {
              // Apenas dígitos numéricos
              const cleaned = text.replace(/[^0-9]/g, '');
              onChangeValue(cleaned);
            }}
            keyboardType="numeric"
            maxLength={3}
            placeholder="160"
            placeholderTextColor={`${colors.primary}50`}
            style={styles.numericInput}
          />
          <Typography variant="labelMd" color={colors.onSurfaceVariant} style={styles.unitText}>
            {isPt ? 'GRAMAS / DIA' : 'GRAMS / DAY'}
          </Typography>
        </View>

        <View style={styles.calPreviewColumn}>
          <Typography variant="unitCaption" color={colors.outline} style={styles.calLabel}>
            {isPt ? 'CALORIAS EQUIV.' : 'RATIO CAL'}
          </Typography>
          <Typography variant="metricNumeralSm" color={colors.onSurface} style={styles.calNumber}>
            {calPreview} kcal
          </Typography>
        </View>
      </View>

      {/* Quick Preset Chips */}
      <View style={styles.presetsRow}>
        {quickSteps.map((preset) => {
          const isSelected = numericValue === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => onChangeValue(String(preset))}
              accessibilityRole="button"
              accessibilityLabel={`${preset}g`}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipActive,
                pressed && styles.chipPressed,
              ]}>
              <Typography
                variant="labelSm"
                color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
                style={isSelected ? styles.chipTextActive : undefined}>
                {preset}g
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {/* Micro-Copy Tip */}
      <View style={styles.tipRow}>
        <Info size={15} color={colors.primary} style={styles.tipIcon} />
        <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.tipText}>
          {isPt
            ? 'Recomendado: 1.6g a 2.2g por kg de peso corporal para máxima eficiência de síntese muscular.'
            : 'Recommended: 1.6g – 2.2g per kg body weight for high-efficiency muscle protein synthesis.'}
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
    backgroundColor: `${colors.primary}08`,
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
    backgroundColor: `${colors.primary}18`,
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
    color: colors.primary,
    minWidth: 70,
    padding: 0,
    margin: 0,
  },
  unitText: {
    letterSpacing: 0.8,
  },
  calPreviewColumn: {
    alignItems: 'flex-end',
  },
  calLabel: {
    letterSpacing: 0.6,
  },
  calNumber: {
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
