import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoodHeader } from '@/components/food/FoodHeader';
import { FoodImagePickerCard } from '@/components/food/FoodImagePickerCard';
import { MacroInputsSection } from '@/components/food/MacroInputsSection';
import { MealWindowSelector } from '@/components/food/MealWindowSelector';
import { MetabolicScoreCard } from '@/components/food/MetabolicScoreCard';
import { SaveFoodButton } from '@/components/food/SaveFoodButton';
import { useLanguage } from '@/context/LanguageContext';
import { MealWindow } from '@/db/schema';
import { logsRepository } from '@/repositories/logs.repository';
import { analyzeFoodWithAI } from '@/services/gemini.service';
import { colors, spacing } from '@/theme/tokens';
import { toDateKey } from '@/utils/date';

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const { isPt } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  // Estados locais do formulário de comida
  const [mealName, setMealName] = useState('');
  const [proteinG, setProteinG] = useState(0);
  const [caloriesKcal, setCaloriesKcal] = useState(0);
  const [mealWindow, setMealWindow] = useState<MealWindow>('lunch');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [aiContextText, setAiContextText] = useState('');
  const [existingDateKey, setExistingDateKey] = useState<string | undefined>(undefined);

  // Estados de carregamento e feedback
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Carrega registro existente se for modo de edição
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    async function loadFoodLog() {
      try {
        const log = await logsRepository.getFoodLogById(id!);
        if (log && isMounted) {
          setMealName(log.name);
          setProteinG(log.proteinG);
          setCaloriesKcal(log.caloriesKcal);
          setMealWindow(log.mealWindow);
          setExistingDateKey(log.dateKey);
        }
      } catch (err) {
        console.warn('[AddFoodScreen] Erro ao carregar refeição para edição:', err);
      }
    }
    loadFoodLog();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Apenas salva a imagem e o Base64 no estado local (SEM trigger automático de IA)
  const handleSelectAsset = (asset: ImagePicker.ImagePickerAsset) => {
    const sizeKb = asset.base64 ? (asset.base64.length / 1024).toFixed(1) : 'desconhecido';
    console.log(
      `[AddFoodScreen] 📸 Imagem carregada no formulário: URI=${asset.uri} (${asset.width}x${asset.height}, base64: ~${sizeKb} KB)`
    );
    setImageUri(asset.uri);
    setImageBase64(asset.base64 || null);
    setImageMimeType(asset.mimeType || 'image/jpeg');
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isPt ? 'Permissão Necessária' : 'Permission Required',
          isPt
            ? 'É necessário autorizar o acesso à câmera para fotografar seus pratos.'
            : 'Camera permission is required to photograph your meals.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        handleSelectAsset(result.assets[0]);
      }
    } catch (err) {
      console.error('[AddFoodScreen] Erro ao abrir câmera:', err);
    }
  };

  const pickFromLibrary = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isPt ? 'Permissão Necessária' : 'Permission Required',
          isPt
            ? 'É necessário autorizar o acesso à galeria para selecionar imagens dos pratos.'
            : 'Photo library permission is required to choose meal images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        handleSelectAsset(result.assets[0]);
      }
    } catch (err) {
      console.error('[AddFoodScreen] Erro ao abrir galeria:', err);
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      isPt ? 'Foto da Refeição' : 'Meal Photo',
      isPt
        ? 'Escolha como deseja registrar a imagem do seu prato:'
        : 'Choose how to capture your meal image:',
      [
        {
          text: isPt ? 'Tirar Foto' : 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: isPt ? 'Escolher da Galeria' : 'Choose from Library',
          onPress: pickFromLibrary,
        },
        {
          text: isPt ? 'Cancelar' : 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleRemoveImage = () => {
    console.log('[AddFoodScreen] 🗑️ Foto removida do formulário.');
    setImageUri(null);
    setImageBase64(null);
  };

  // Disparo Explícito da IA (Foto + Contexto, Apenas Foto ou Apenas Texto)
  const handleAnalyzeWithAI = async () => {
    if (isAnalyzingImage) {
      console.log('[AddFoodScreen] ⏳ Análise já em andamento, ignorando clique duplicado.');
      return;
    }

    const trimmedContext = aiContextText.trim();
    console.log('[AddFoodScreen] 🟢 Botão "Analisar com IA" acionado pelo usuário.');
    console.log(
      `[AddFoodScreen] 📊 Entrada: Imagem=${imageBase64 ? 'SIM' : 'NÃO'} | Contexto="${trimmedContext}"`
    );

    if (!imageBase64 && !trimmedContext) {
      Alert.alert(
        isPt ? 'IA Nutricional' : 'AI Nutrition',
        isPt
          ? 'Tire uma foto ou descreva sua refeição no campo de texto para a IA analisar.'
          : 'Please take a photo or describe your meal in the text field for AI analysis.'
      );
      return;
    }

    setIsAnalyzingImage(true);

    try {
      const result = await analyzeFoodWithAI({
        base64Image: imageBase64,
        mimeType: imageMimeType,
        userContext: trimmedContext || undefined,
        language: isPt ? 'pt' : 'en',
      });

      console.log(
        `[AddFoodScreen] 📥 Preenchendo formulário: "${result.name}" (${result.protein_g}g proteína, ${result.calories_kcal} kcal)`
      );

      setMealName(result.name);
      setProteinG(result.protein_g);
      setCaloriesKcal(result.calories_kcal);
    } catch (err: any) {
      console.error('[AddFoodScreen] ❌ Falha na análise IA:', err?.message || err);
      Alert.alert(
        isPt ? 'Análise com IA' : 'AI Analysis',
        err?.message ||
          (isPt
            ? 'Não foi possível estimar os nutrientes. Preencha os campos abaixo manualmente.'
            : 'Failed to estimate meal nutrition. Please enter details below manually.')
      );
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleSave = async () => {
    if (isSaving || isSaved) return;

    const trimmedName = mealName.trim();
    if (!trimmedName) {
      Alert.alert(
        isPt ? 'Identificação Obrigatória' : 'Meal Name Required',
        isPt
          ? 'Por favor, informe o nome ou descrição da refeição.'
          : 'Please enter a name or description for your meal.'
      );
      return;
    }

    if (proteinG < 0 || isNaN(proteinG)) {
      Alert.alert(
        isPt ? 'Proteína Inválida' : 'Invalid Protein',
        isPt
          ? 'A quantidade de proteínas deve ser um número maior ou igual a zero.'
          : 'Protein amount must be a number greater than or equal to zero.'
      );
      return;
    }

    if (caloriesKcal < 0 || isNaN(caloriesKcal)) {
      Alert.alert(
        isPt ? 'Calorias Inválidas' : 'Invalid Calories',
        isPt
          ? 'A quantidade de calorias deve ser um número maior ou igual a zero.'
          : 'Calories amount must be a number greater than or equal to zero.'
      );
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode && id) {
        await logsRepository.updateFoodLog(id, {
          name: trimmedName,
          proteinG,
          caloriesKcal,
          mealWindow,
          entryMethod: imageUri ? 'image' : undefined,
          dateKey: existingDateKey,
        });
      } else {
        await logsRepository.addFood({
          name: trimmedName,
          proteinG,
          caloriesKcal,
          entryMethod: imageUri ? 'image' : 'manual',
          mealWindow,
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
      console.error('[AddFoodScreen] Falha ao salvar refeição:', err);
      Alert.alert(
        isPt ? 'Erro ao Salvar' : 'Error Saving',
        isPt
          ? 'Ocorreu um erro ao salvar a refeição no banco de dados local.'
          : 'An error occurred while saving the meal to the local database.'
      );
      setIsSaving(false);
    }
  };

  const screenTitle = isEditMode
    ? isPt
      ? 'Editar Refeição'
      : 'Edit Meal'
    : isPt
    ? 'Registrar Refeição'
    : 'Quick Log';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom + 24, spacing.xl) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Cabeçalho superior com botão voltar */}
          <FoodHeader title={screenTitle} />

          {/* Área de IA: Captura/Preview de Imagem + Contexto Adicional + Botão Analisar */}
          <FoodImagePickerCard
            imageUri={imageUri}
            isAnalyzing={isAnalyzingImage}
            onPickImage={handlePickImage}
            onRemoveImage={handleRemoveImage}
            aiContextText={aiContextText}
            onChangeAiContextText={setAiContextText}
            onAnalyze={handleAnalyzeWithAI}
            isPt={isPt}
          />

          {/* Seção Principal de Entradas Manuais: Nome, Proteína e Calorias */}
          <MacroInputsSection
            name={mealName}
            onChangeName={setMealName}
            proteinG={proteinG}
            onChangeProtein={setProteinG}
            caloriesKcal={caloriesKcal}
            onChangeCalories={setCaloriesKcal}
            isPt={isPt}
          />

          {/* Seletor do Momento da Refeição (Assigned Meal Window) */}
          <MealWindowSelector
            selected={mealWindow}
            onSelect={setMealWindow}
            isPt={isPt}
          />

          {/* Card de Índice de Equilíbrio Metabólico */}
          <MetabolicScoreCard score={proteinG > 30 ? 94 : 82} isPt={isPt} />

          {/* Botão de Ação: Registrar / Salvar Alterações */}
          <SaveFoodButton
            onPress={handleSave}
            isLoading={isSaving}
            isSaved={isSaved}
            isPt={isPt}
            isEditMode={isEditMode}
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
