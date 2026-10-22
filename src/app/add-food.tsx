import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodHeader } from '@/components/food/FoodHeader';
import { FoodImagePickerCard } from '@/components/food/FoodImagePickerCard';
import { MacroInputsSection } from '@/components/food/MacroInputsSection';
import { MealWindowSelector } from '@/components/food/MealWindowSelector';
import { MetabolicScoreCard } from '@/components/food/MetabolicScoreCard';
import { SaveFoodButton } from '@/components/food/SaveFoodButton';
import { useLanguage } from '@/context/LanguageContext';
import { MealWindow } from '@/db/schema';
import { colors, spacing } from '@/theme/tokens';

export default function AddFoodScreen() {
  const { isPt } = useLanguage();

  // Estados locais do formulário de comida
  const [mealName, setMealName] = useState(
    isPt ? 'Salmão Grelhado com Quinoa' : 'Grilled Salmon Bowl & Quinoa',
  );
  const [proteinG, setProteinG] = useState(46);
  const [caloriesKcal, setCaloriesKcal] = useState(620);
  const [mealWindow, setMealWindow] = useState<MealWindow>('lunch');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handlePickImage = () => {
    // Espaço reservado para a futura integração com câmera e IA do Gemini
    if (__DEV__) console.log('[AddFoodScreen] Abrir câmera / galeria para IA Vision');
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
    }, 550);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Cabeçalho superior com botão voltar */}
          <FoodHeader title={isPt ? 'Registrar Refeição' : 'Quick Log'} />

          {/* Área Superior: Câmera / Escanear com IA Opcional (sem abas bloqueantes) */}
          <FoodImagePickerCard
            onPickImage={handlePickImage}
            isPt={isPt}
          />

          {/* Seção Principal de Entradas Manuais: Nome, Proteína, Calorias e Macros Secundários */}
          <MacroInputsSection
            name={mealName}
            onChangeName={setMealName}
            proteinG={proteinG}
            onChangeProtein={setProteinG}
            caloriesKcal={caloriesKcal}
            onChangeCalories={setCaloriesKcal}
            carbsG={38}
            fatsG={22}
            fiberG={7.5}
            isPt={isPt}
          />

          {/* Seletor do Momento da Refeição (Assigned Meal Window) */}
          <MealWindowSelector
            selected={mealWindow}
            onSelect={setMealWindow}
            isPt={isPt}
          />

          {/* Card de Índice de Equilíbrio Metabólico */}
          <MetabolicScoreCard score={94} isPt={isPt} />

          {/* Botão de Ação: Registrar Refeição nas Metas */}
          <SaveFoodButton
            onPress={handleSave}
            isLoading={isLoading}
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
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});
