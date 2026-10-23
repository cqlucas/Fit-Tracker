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

import { AiProviderSelectorCard } from '@/components/settings/AiProviderSelectorCard';
import { ApiKeysSection } from '@/components/settings/ApiKeysSection';
import { CalorieGoalCard } from '@/components/settings/CalorieGoalCard';
import { IntroBanner } from '@/components/settings/IntroBanner';
import { LanguageSelectorCard } from '@/components/settings/LanguageSelectorCard';
import { ProteinGoalCard } from '@/components/settings/ProteinGoalCard';
import { SaveGoalsButton } from '@/components/settings/SaveGoalsButton';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SupabaseSyncSection } from '@/components/settings/SupabaseSyncSection';
import { WaterGoalCard } from '@/components/settings/WaterGoalCard';
import { useLanguage } from '@/context/LanguageContext';
import { type PreferredAiProvider } from '@/db/schema';
import { DEFAULT_GOALS, goalsRepository } from '@/repositories/goals.repository';
import { apiKeysService, type ApiKeysStatus } from '@/services/api-keys.service';
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
  const [aiProvider, setAiProvider] = useState<PreferredAiProvider>('gemini');
  const [apiKeysStatus, setApiKeysStatus] = useState<ApiKeysStatus>({
    hasGeminiKey: false,
    hasGroqKey: false,
    hasSupabaseLinked: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isPt = language === 'pt';

  // Carrega as metas do banco local SQLite e status das chaves ao focar na tela
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
            setAiProvider(current.preferredAiProvider ?? 'gemini');
            void setGlobalLanguage(lang);
          }
        })
        .catch((err) => {
          if (__DEV__) console.warn('[SettingsScreen] Erro ao carregar metas:', err);
        });

      apiKeysService
        .getApiKeysStatus()
        .then((keys) => {
          if (isMounted) {
            setApiKeysStatus(keys);
          }
        })
        .catch((err) => {
          if (__DEV__) console.warn('[SettingsScreen] Erro ao carregar chaves:', err);
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

  // Troca de provedor de IA imediata
  const handleSelectAiProvider = (newProvider: PreferredAiProvider) => {
    setAiProvider(newProvider);
    void goalsRepository.update({ preferredAiProvider: newProvider });
  };

  // Reseta para os valores padrões de fábrica
  const handleReset = () => {
    setProteinInput(String(DEFAULT_GOALS.proteinGoal));
    setWaterInput(String(DEFAULT_GOALS.waterGoal));
    setCaloriesInput(String(DEFAULT_GOALS.caloriesGoal));
    setLanguage(DEFAULT_GOALS.language);
    setAiProvider(DEFAULT_GOALS.preferredAiProvider ?? 'gemini');
    void setGlobalLanguage(DEFAULT_GOALS.language);
    void goalsRepository.update({ preferredAiProvider: DEFAULT_GOALS.preferredAiProvider ?? 'gemini' });
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
        preferredAiProvider: aiProvider,
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

          {/* 5. Chaves de IA (BYOK): Gerenciamento Seguro com SecureStore */}
          <ApiKeysSection
            isPt={isPt}
            onKeysChanged={setApiKeysStatus}
          />

          {/* 6. Seletor de Provedor de IA: SÓ APARECE SE AMBAS AS CHAVES ESTIVEREM VINCULADAS */}
          {apiKeysStatus.hasGeminiKey && apiKeysStatus.hasGroqKey && (
            <AiProviderSelectorCard
              provider={aiProvider}
              onSelectProvider={handleSelectAiProvider}
              isPt={isPt}
            />
          )}

          {/* 7. Nuvem & Sincronização (BYOK Supabase) */}
          <SupabaseSyncSection
            isPt={isPt}
            onSyncCompleted={() => {
              // Recarrega as metas caso o sync tenha trazido novas metas da nuvem
              goalsRepository.get().then((current) => {
                setProteinInput(String(current.proteinGoal));
                setWaterInput(String(current.waterGoal));
                setCaloriesInput(String(current.caloriesGoal));
                const lang = current.language ?? 'pt';
                setLanguage(lang);
                setAiProvider(current.preferredAiProvider ?? 'gemini');
                void setGlobalLanguage(lang);
              });
            }}
          />

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
