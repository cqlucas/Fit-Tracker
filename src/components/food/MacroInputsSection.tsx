import { X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface MacroInputsSectionProps {
  name: string;
  onChangeName: (val: string) => void;
  proteinG: number;
  onChangeProtein: (val: number) => void;
  caloriesKcal: number;
  onChangeCalories: (val: number) => void;
  isPt?: boolean;
}

export function MacroInputsSection({
  name,
  onChangeName,
  proteinG,
  onChangeProtein,
  caloriesKcal,
  onChangeCalories,
  isPt = false,
}: MacroInputsSectionProps) {
  const adjustProtein = (delta: number) => {
    onChangeProtein(Math.max(0, proteinG + delta));
  };

  const adjustCalories = (delta: number) => {
    onChangeCalories(Math.max(0, caloriesKcal + delta));
  };

  return (
    <View style={styles.container}>
      {/* 1. Nome da Refeição / Prato */}
      <View style={styles.fieldCard}>
        <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
          {isPt ? 'IDENTIFICAÇÃO DA REFEIÇÃO / PRATO' : 'MEAL / DISH IDENTIFICATION'}
        </Typography>

        <View style={styles.inputWrapper}>
          <TextInput
            value={name}
            onChangeText={onChangeName}
            placeholder={
              isPt ? 'ex: Salmão Grelhado com Quinoa' : 'e.g. Avocado Toast with Poached Egg'
            }
            placeholderTextColor={colors.outline}
            style={styles.nameTextInput}
          />

          {name.length > 0 ? (
            <Pressable
              onPress={() => onChangeName('')}
              accessibilityRole="button"
              accessibilityLabel="Limpar"
              style={styles.clearButton}>
              <X size={16} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 2. Cards Duplos de Métricas: Proteína & Energia */}
      <View style={styles.dualCardsRow}>
        {/* Card de Proteína */}
        <View style={[styles.macroCard, shadows.card]}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: colors.primaryContainer }]} />
              <Typography variant="labelMd" style={styles.macroTitle}>
                {isPt ? 'Proteína' : 'Protein'}
              </Typography>
            </View>
            <View style={[styles.badge, { backgroundColor: `${colors.primary}20` }]}>
              <Typography variant="unitCaption" color={colors.primary}>
                {isPt ? 'ALVO' : 'GOAL'}
              </Typography>
            </View>
          </View>

          <View style={styles.valueRow}>
            <Typography
              variant="metricNumeralLg"
              color={colors.onSurface}
              style={styles.number}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {proteinG}
            </Typography>
            <Typography variant="headlineSm" color={colors.onSurfaceVariant} style={styles.unit}>
              g
            </Typography>
          </View>

          {/* Stepper Controller */}
          <View style={styles.stepperContainer}>
            <Pressable
              onPress={() => adjustProtein(-5)}
              accessibilityRole="button"
              accessibilityLabel="-5g"
              style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}>
              <Typography variant="labelSm" color={colors.onSurface} style={styles.stepBtnText}>
                -5
              </Typography>
            </Pressable>
            <Typography variant="unitCaption" color={colors.outline} style={styles.stepLabel}>
              STEP
            </Typography>
            <Pressable
              onPress={() => adjustProtein(5)}
              accessibilityRole="button"
              accessibilityLabel="+5g"
              style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}>
              <Typography variant="labelSm" color={colors.primary} style={styles.stepBtnTextActive}>
                +5
              </Typography>
            </Pressable>
          </View>
        </View>

        {/* Card de Calorias */}
        <View style={[styles.macroCard, shadows.card]}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: colors.tertiaryContainer }]} />
              <Typography variant="labelMd" style={styles.macroTitle}>
                {isPt ? 'Energia' : 'Energy'}
              </Typography>
            </View>
            <View style={[styles.badge, { backgroundColor: `${colors.tertiaryContainer}20` }]}>
              <Typography variant="unitCaption" color={colors.tertiary}>
                KCAL
              </Typography>
            </View>
          </View>

          <View style={styles.valueRow}>
            <Typography
              variant="metricNumeralLg"
              color={colors.onSurface}
              style={styles.number}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {caloriesKcal}
            </Typography>
            <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.unitKcal}>
              kcal
            </Typography>
          </View>

          {/* Stepper Controller */}
          <View style={styles.stepperContainer}>
            <Pressable
              onPress={() => adjustCalories(-50)}
              accessibilityRole="button"
              accessibilityLabel="-50 kcal"
              style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}>
              <Typography variant="labelSm" color={colors.onSurface} style={styles.stepBtnText}>
                -50
              </Typography>
            </Pressable>
            <Typography variant="unitCaption" color={colors.outline} style={styles.stepLabel}>
              STEP
            </Typography>
            <Pressable
              onPress={() => adjustCalories(50)}
              accessibilityRole="button"
              accessibilityLabel="+50 kcal"
              style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}>
              <Typography variant="labelSm" color={colors.tertiary} style={styles.stepBtnTextTertiary}>
                +50
              </Typography>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.sm + 2,
  },
  fieldCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    ...shadows.card,
  },
  fieldLabel: {
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm + 2,
  },
  nameTextInput: {
    flex: 1,
    height: 48,
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
  },
  clearButton: {
    padding: 6,
  },
  dualCardsRow: {
    flexDirection: 'row',
    gap: spacing.gutterMobile,
    width: '100%',
  },
  macroCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.md,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  macroTitle: {
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    gap: 2,
  },
  number: {
    fontWeight: '800',
    lineHeight: 32,
  },
  unit: {
    fontWeight: '600',
  },
  unitKcal: {
    fontWeight: '600',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLow,
    padding: 3,
    borderRadius: radii.md,
  },
  stepBtn: {
    width: 34,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  stepBtnText: {
    fontWeight: '700',
  },
  stepBtnTextActive: {
    fontWeight: '800',
  },
  stepBtnTextTertiary: {
    fontWeight: '800',
  },
  stepLabel: {
    fontWeight: '700',
  },
});
