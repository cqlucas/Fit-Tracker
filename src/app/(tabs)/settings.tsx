import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalorieGoalCard } from '@/components/settings/CalorieGoalCard';
import { IntroBanner } from '@/components/settings/IntroBanner';
import { LanguageSelectorCard } from '@/components/settings/LanguageSelectorCard';
import { ProteinGoalCard } from '@/components/settings/ProteinGoalCard';
import { SaveGoalsButton } from '@/components/settings/SaveGoalsButton';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { StatusSyncCard } from '@/components/settings/StatusSyncCard';
import { WaterGoalCard } from '@/components/settings/WaterGoalCard';
import { useLanguage } from '@/context/LanguageContext';
import { DEFAULT_GOALS, goalsRepository } from '@/repositories/goals.repository';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setLanguage: setGlobalLanguage, language: currentGlobalLang, t } = useLanguage();

  // Estados locais do formulário de metas
  const [proteinInput, setProteinInput] = useState('160');
  const [waterInput, setWaterInput] = useState('3000');
  const [caloriesInput, setCaloriesInput] = useState('2200');
  const [language, setLanguage] = useState<'pt' | 'en'>(currentGlobalLang);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isPt = language === 'pt';

  // Carrega as metas do banco local SQLite ao focar na tela
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      goalsRepository
        .get()
        .then((current) => {
          if (isMounted) {
            setProteinInput(String(current.proteinGoal));
            setWaterInput(String(current.waterGoal));
            setCaloriesInput(String(current.caloriesGoal));
            const lang = current.language ?? 'pt';
            setLanguage(lang);
            void setGlobalLanguage(lang);
          }
        })
        .catch((err) => {
          if (__DEV__) console.warn('[SettingsScreen] Erro ao carregar metas:', err);
        });

      return () => {
        isMounted = false;
      };
    }, [setGlobalLanguage]),
  );

  // Troca de idioma imediata
  const handleSelectLanguage = (newLang: 'pt' | 'en') => {
    setLanguage(newLang);
    void setGlobalLanguage(newLang);
  };

  // Reseta para os valores padrões de fábrica
  const handleReset = () => {
    setProteinInput(String(DEFAULT_GOALS.proteinGoal));
    setWaterInput(String(DEFAULT_GOALS.waterGoal));
    setCaloriesInput(String(DEFAULT_GOALS.caloriesGoal));
    setLanguage(DEFAULT_GOALS.language);
    void setGlobalLanguage(DEFAULT_GOALS.language);
  };

  // Salva no SQLite com validações estritas
  const handleSave = async () => {
    const proteinNum = parseInt(proteinInput, 10);
    const waterNum = parseInt(waterInput, 10);
    const caloriesNum = parseInt(caloriesInput, 10);

    if (isNaN(proteinNum) || proteinNum <= 0) {
      Alert.alert(t.settings.invalidTitle, t.settings.invalidProtein);
      return;
    }

    if (isNaN(waterNum) || waterNum <= 0) {
      Alert.alert(t.settings.invalidTitle, t.settings.invalidWater);
      return;
    }

    if (isNaN(caloriesNum) || caloriesNum <= 0) {
      Alert.alert(t.settings.invalidTitle, t.settings.invalidCalories);
      return;
    }

    setIsSaving(true);
    try {
      await goalsRepository.update({
        proteinGoal: proteinNum,
        waterGoal: waterNum,
        caloriesGoal: caloriesNum,
        language,
      });

      setIsSaved(true);

      // Feedback visual por 2 segundos antes de liberar
      setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch (err) {
      Alert.alert(t.settings.errorTitle, t.settings.errorMessage);
      if (__DEV__) console.warn('[SettingsScreen] Erro ao salvar:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 96 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Cabeçalho com botão voltar e resetar */}
          <SettingsHeader onBack={handleBack} onReset={handleReset} isPt={isPt} />

          {/* Banner explicativo com glow sutil */}
          <IntroBanner isPt={isPt} />

          {/* 1. Meta de Proteína: input numérico livre */}
          <ProteinGoalCard
            value={proteinInput}
            onChangeValue={setProteinInput}
            isPt={isPt}
          />

          {/* 2. Meta de Água: 100% customizável em ml, sem presets limitados */}
          <WaterGoalCard
            value={waterInput}
            onChangeValue={setWaterInput}
            isPt={isPt}
          />

          {/* 3. Meta Calórica: 100% customizável em kcal */}
          <CalorieGoalCard
            value={caloriesInput}
            onChangeValue={setCaloriesInput}
            isPt={isPt}
          />

          {/* 4. Seletor de Idioma: Alternar entre PT-BR e EN */}
          <LanguageSelectorCard
            language={language}
            onSelectLanguage={handleSelectLanguage}
          />

          {/* Status de Sincronização Telemetry */}
          <StatusSyncCard isPt={isPt} />

          {/* Botão de Ação Salvar com feedback reativo */}
          <SaveGoalsButton
            onPress={handleSave}
            isLoading={isSaving}
            isSaved={isSaved}
            isPt={isPt}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 110, // Espaço extra para a TabBar flutuante não sobrepor o botão de salvar
    gap: spacing.md,
  },
});
