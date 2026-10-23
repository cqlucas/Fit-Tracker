import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HydrationImpactBar } from '@/components/water/HydrationImpactBar';
import { QuickWaterPresets } from '@/components/water/QuickWaterPresets';
import { SaveWaterButton } from '@/components/water/SaveWaterButton';
import { WaterAmountCounter } from '@/components/water/WaterAmountCounter';
import { WaterHeader } from '@/components/water/WaterHeader';
import { WaterVesselVisual } from '@/components/water/WaterVesselVisual';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { goalsRepository } from '@/repositories/goals.repository';
import { logsRepository } from '@/repositories/logs.repository';
import { colors, radii, shadows, spacing } from '@/theme/tokens';
import { toDateKey } from '@/utils/date';

export default function AddWaterScreen() {
  const insets = useSafeAreaInsets();
  const { isPt } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  // Estados locais do formulário de água
  const [intakeVolume, setIntakeVolume] = useState(500);
  const [existingDateKey, setExistingDateKey] = useState<string | undefined>(undefined);
  const [originalLogAmount, setOriginalLogAmount] = useState<number | null>(null);
  const [baseTodayConsumed, setBaseTodayConsumed] = useState(0);
  const [dailyWaterGoal, setDailyWaterGoal] = useState(3000);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Carrega registro existente se for modo de edição
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    async function loadWaterLog() {
      try {
        const log = await logsRepository.getWaterLogById(id!);
        if (log && isMounted) {
          setIntakeVolume(log.amountMl);
          setExistingDateKey(log.dateKey);
          setOriginalLogAmount(log.amountMl);
        }
      } catch (err) {
        console.warn('[AddWater] Erro ao carregar registro para edição:', err);
      }
    }
    loadWaterLog();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Carrega consumo real do dia e meta para o cálculo de telemetria
  useEffect(() => {
    let isMounted = true;
    async function loadHydrationTelemetry() {
      try {
        const today = toDateKey();
        const [summary, goals] = await Promise.all([
          logsRepository.getDailySummary(today),
          goalsRepository.getGoals(),
        ]);
        if (isMounted) {
          setBaseTodayConsumed(summary.water.consumed);
          setDailyWaterGoal(goals.waterGoal);
        }
      } catch (err) {
        console.warn('[AddWater] Erro ao carregar dados de telemetria:', err);
      }
    }
    loadHydrationTelemetry();
    return () => {
      isMounted = false;
    };
  }, []);

  // Em modo de edição de um registro do dia de hoje, subtrai o valor original para evitar dupla contagem
  const effectiveBaseConsumed = React.useMemo(() => {
    const isLogFromToday = !existingDateKey || existingDateKey === toDateKey();
    if (isEditMode && isLogFromToday && originalLogAmount !== null) {
      return Math.max(0, baseTodayConsumed - originalLogAmount);
    }
    return baseTodayConsumed;
  }, [isEditMode, existingDateKey, originalLogAmount, baseTodayConsumed]);

  const handleIncrement = () => {
    setIntakeVolume((prev) => Math.min(prev + 50, 2500));
  };

  const handleDecrement = () => {
    setIntakeVolume((prev) => Math.max(prev - 50, 50));
  };

  const handleSave = async () => {
    if (isLoading || isSaved) return;

    if (!intakeVolume || intakeVolume <= 0 || !Number.isInteger(intakeVolume)) {
      Alert.alert(
        isPt ? 'Quantidade Inválida' : 'Invalid Amount',
        isPt
          ? 'Por favor, selecione uma quantidade de água maior que zero.'
          : 'Please select an amount of water greater than zero.'
      );
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode && id) {
        await logsRepository.updateWaterLog(id, {
          amountMl: intakeVolume,
          dateKey: existingDateKey,
        });
      } else {
        await logsRepository.addWater({
          amountMl: intakeVolume,
          dateKey: toDateKey(),
        });
      }

      setIsSaved(true);

      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }, 700);
    } catch (err: any) {
      console.error('[AddWater] Falha ao salvar registro de água:', err);
      Alert.alert(
        isPt ? 'Erro ao Salvar' : 'Failed to Save',
        isPt
          ? 'Ocorreu um erro ao salvar a água no banco de dados local.'
          : 'An error occurred while saving the water intake to local database.'
      );
      setIsLoading(false);
    }
  };

  const screenTitle = isEditMode
    ? isPt
      ? 'Editar Registro de Água'
      : 'Edit Water Log'
    : isPt
    ? 'Registrar Água'
    : 'Quick Log';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom + 24, spacing.xl) },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Cabeçalho superior com botão voltar */}
        <WaterHeader title={screenTitle} />

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
              {isEditMode
                ? isPt
                  ? 'MODO DE EDIÇÃO'
                  : 'EDIT MODE'
                : isPt
                ? 'RASTREAMENTO RÁPIDO'
                : 'FAST TRACKING'}
            </Typography>
            <Typography variant="headlineSm" style={styles.consoleTitle}>
              {isPt ? 'Consumo de Água Pura' : 'Pure Water Intake'}
            </Typography>
          </View>

          {/* Garrafa / Vaso com nível de líquido animado em SVG */}
          <WaterVesselVisual
            volume={intakeVolume}
            consumedToday={effectiveBaseConsumed}
            waterGoal={dailyWaterGoal}
            isPt={isPt}
          />

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
            baseConsumed={effectiveBaseConsumed}
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
          isEditMode={isEditMode}
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
    backgroundColor: colors.surfaceLow,
    borderRadius: radii['2xl'],
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    ...shadows.card,
  },
  ambientGlow: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 192,
    height: 192,
    borderRadius: radii.full,
    backgroundColor: 'rgba(76, 215, 246, 0.08)',
  },
  handleRow: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    paddingTop: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHighest,
  },
  subHeader: {
    width: '100%',
    marginBottom: spacing.md,
  },
  tagline: {
    letterSpacing: 1.2,
    fontWeight: '800',
    marginBottom: 2,
  },
  consoleTitle: {
    fontWeight: '800',
  },
});
