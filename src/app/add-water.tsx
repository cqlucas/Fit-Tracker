import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeverageType, BeverageTypeSelector } from '@/components/water/BeverageTypeSelector';
import { HydrationImpactBar } from '@/components/water/HydrationImpactBar';
import { QuickWaterPresets } from '@/components/water/QuickWaterPresets';
import { SaveWaterButton } from '@/components/water/SaveWaterButton';
import { WaterAmountCounter } from '@/components/water/WaterAmountCounter';
import { WaterHeader } from '@/components/water/WaterHeader';
import { WaterVesselVisual } from '@/components/water/WaterVesselVisual';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export default function AddWaterScreen() {
  const { isPt } = useLanguage();

  // Estados locais do formulário de água
  const [beverage, setBeverage] = useState<BeverageType>('water');
  const [intakeVolume, setIntakeVolume] = useState(500);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Valores base de exemplo para a prévia de impacto (conectaremos ao SQLite na próxima etapa)
  const baseTodayConsumed = 2250;
  const dailyWaterGoal = 3000;

  const handleIncrement = () => {
    setIntakeVolume((prev) => Math.min(prev + 50, 2500));
  };

  const handleDecrement = () => {
    setIntakeVolume((prev) => Math.max(prev - 50, 50));
  };

  const handleSave = () => {
    setIsLoading(true);

    // Simulação visual de salvamento e feedback de celebração
    setTimeout(() => {
      setIsLoading(false);
      setIsSaved(true);

      setTimeout(() => {
        setIsSaved(false);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push('/(tabs)');
        }
      }, 1500);
    }, 450);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Cabeçalho superior com botão voltar */}
        <WaterHeader title={isPt ? 'Registrar Água' : 'Quick Log'} />

        {/* Console Card de Hidratação com Glow e Glass Visual */}
        <View style={styles.consoleCard}>
          {/* Ambient Photonic Glow */}
          <View style={styles.ambientGlow} />

          {/* Sheet Handle Decorator */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Sub Header */}
          <View style={styles.subHeader}>
            <Typography variant="unitCaption" color={colors.secondary} style={styles.tagline}>
              {isPt ? 'RASTREAMENTO RÁPIDO' : 'FAST TRACKING'}
            </Typography>
            <Typography variant="headlineSm" style={styles.consoleTitle}>
              {isPt ? 'Consumo de Líquidos' : 'Quick Intake Log'}
            </Typography>
          </View>

          {/* Seletor de Tipo de Bebida */}
          <BeverageTypeSelector
            selected={beverage}
            onSelect={setBeverage}
            isPt={isPt}
          />

          {/* Garrafa / Vaso com nível de líquido animado em SVG */}
          <WaterVesselVisual volume={intakeVolume} isPt={isPt} />

          {/* Contador Numérico Gigante com botões +/- 50ml */}
          <WaterAmountCounter
            amount={intakeVolume}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            isPt={isPt}
          />

          {/* Atalhos Táteis de Snapping (+250ml, +500ml, +750ml, +1000ml) */}
          <QuickWaterPresets
            currentAmount={intakeVolume}
            onSelectAmount={setIntakeVolume}
            isPt={isPt}
          />

          {/* Barra de Impacto Projetado na Hidratação Diária */}
          <HydrationImpactBar
            baseConsumed={baseTodayConsumed}
            addedAmount={intakeVolume}
            goal={dailyWaterGoal}
            isPt={isPt}
          />
        </View>

        {/* Botão de Ação: Salvar Água */}
        <SaveWaterButton
          onPress={handleSave}
          amount={intakeVolume}
          isLoading={isLoading}
          isSaved={isSaved}
          isPt={isPt}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  consoleCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii['2xl'],
    padding: spacing.md + 2,
    alignItems: 'center',
    gap: spacing.sm + 2,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    ...shadows.card,
  },
  ambientGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: radii.full,
    backgroundColor: `${colors.secondary}12`,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHighest,
  },
  subHeader: {
    alignItems: 'center',
    gap: 2,
  },
  tagline: {
    letterSpacing: 1,
    fontWeight: '800',
  },
  consoleTitle: {
    fontWeight: '800',
    lineHeight: 26,
  },
});
