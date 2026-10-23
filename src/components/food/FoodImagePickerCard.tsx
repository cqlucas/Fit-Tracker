import { Image } from 'expo-image';
import { Camera, RefreshCw, Sparkles, Trash2, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface FoodImagePickerCardProps {
  imageUri?: string | null;
  isAnalyzing?: boolean;
  onPickImage?: () => void;
  onRemoveImage?: () => void;
  aiContextText: string;
  onChangeAiContextText: (text: string) => void;
  onAnalyze: () => void;
  isPt?: boolean;
}

export function FoodImagePickerCard({
  imageUri,
  isAnalyzing = false,
  onPickImage,
  onRemoveImage,
  aiContextText,
  onChangeAiContextText,
  onAnalyze,
  isPt = false,
}: FoodImagePickerCardProps) {
  const [isInputFocused, setIsInputFocused] = useState(false);

  const hasPhoto = Boolean(imageUri);
  const hasContext = Boolean(aiContextText.trim().length > 0);
  const canAnalyze = (hasPhoto || hasContext) && !isAnalyzing;

  return (
    <View style={styles.sectionContainer}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HUD de Captura / Preview da Imagem                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <View style={styles.hudCard}>
        {/* Background Image Preview se houver foto */}
        {imageUri ? (
          <View style={styles.previewWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              contentFit="cover"
              transition={300}
            />
            <View style={styles.previewScrim} />
          </View>
        ) : null}

        {/* HUD Corner Accents */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Laser Scan Line Decorator */}
        <View style={styles.laserLine} />

        {/* Top Floating Badge Row */}
        <View style={styles.topBadgeRow}>
          <View style={styles.aiBadge}>
            <View style={[styles.aiDot, isAnalyzing && styles.aiDotPulsing]} />
            <Typography variant="unitCaption" color={colors.primary} style={styles.aiBadgeText}>
              {isAnalyzing
                ? isPt
                  ? 'IA PROCESSANDO...'
                  : 'AI PROCESSING...'
                : imageUri
                ? isPt
                  ? 'FOTO PRONTA'
                  : 'PHOTO READY'
                : isPt
                ? 'VISÃO IA ATIVA'
                : 'AI VISION ACTIVE'}
            </Typography>
          </View>

          {imageUri && !isAnalyzing && onRemoveImage ? (
            <Pressable
              onPress={onRemoveImage}
              accessibilityRole="button"
              accessibilityLabel={isPt ? 'Remover foto' : 'Remove photo'}
              style={({ pressed }) => [styles.removePhotoBtn, pressed && styles.pressed]}>
              <Trash2 size={13} color={colors.error || '#ffb4ab'} />
            </Pressable>
          ) : null}
        </View>

        {/* Conteúdo Central do HUD: Foto selecionada vs Gatilho inicial */}
        {imageUri ? (
          <View style={styles.selectedContent}>
            <Pressable
              onPress={onPickImage}
              disabled={isAnalyzing}
              accessibilityRole="button"
              accessibilityLabel={isPt ? 'Trocar foto' : 'Change photo'}
              style={({ pressed }) => [
                styles.retakeButton,
                shadows.glowPrimary,
                pressed && !isAnalyzing && styles.pressed,
                isAnalyzing && styles.retakeButtonDisabled,
              ]}>
              <RefreshCw size={15} color={colors.onPrimary} />
              <Typography variant="labelSm" color={colors.onPrimary} style={styles.retakeText}>
                {isPt ? 'Trocar Foto' : 'Change Photo'}
              </Typography>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onPickImage}
            disabled={isAnalyzing}
            accessibilityRole="button"
            accessibilityLabel={isPt ? 'Tirar foto ou escanear prato' : 'Take photo or scan dish'}
            style={({ pressed }) => [styles.triggerContainer, pressed && styles.pressed]}>
            <View style={[styles.cameraButton, shadows.glowPrimary]}>
              <Camera size={24} color={colors.primary} />
            </View>

            <View style={styles.textGroup}>
              <View style={styles.sparkleRow}>
                <Sparkles size={12} color={colors.primary} />
                <Typography variant="labelSm" color={colors.onSurface} style={styles.label}>
                  {isPt ? 'Foto do Prato (Opcional)' : 'Meal Photo (Optional)'}
                </Typography>
              </View>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant} center style={styles.subtext}>
                {isPt
                  ? 'Fotografe para identificação visual ou descreva abaixo'
                  : 'Capture for visual detection or describe below'}
              </Typography>
            </View>
          </Pressable>
        )}
      </View>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. Campo de Contexto Adicional para a IA                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.contextCard,
          isInputFocused && styles.contextCardFocused,
        ]}>
        <View style={styles.contextHeaderRow}>
          <View style={styles.contextHeaderLeft}>
            <Sparkles size={13} color={colors.primary} />
            <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.contextHeaderTitle}>
              {isPt
                ? 'DETALHES EXTRAS PARA A IA (OPCIONAL)'
                : 'EXTRA DETAILS FOR AI (OPTIONAL)'}
            </Typography>
          </View>

          {aiContextText.length > 0 && (
            <Pressable
              onPress={() => onChangeAiContextText('')}
              accessibilityRole="button"
              accessibilityLabel={isPt ? 'Limpar contexto' : 'Clear context'}
              hitSlop={8}
              style={styles.clearContextBtn}>
              <X size={13} color={colors.outline} />
            </Pressable>
          )}
        </View>

        <TextInput
          value={aiContextText}
          onChangeText={onChangeAiContextText}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          editable={!isAnalyzing}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          placeholder={
            isPt
              ? 'Ex: 180g de frango, arroz integral, sem óleo, sanduíche de atum com maionese light, 1 scoop de whey...'
              : 'E.g., 180g chicken, brown rice, no oil, tuna sandwich with mayo, 1 scoop of whey...'
          }
          placeholderTextColor="#6c7772"
          style={styles.contextInput}
        />
      </View>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. Botão Explícito de Ação: "Analisar com IA"                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Pressable
        onPress={onAnalyze}
        disabled={!canAnalyze}
        accessibilityRole="button"
        accessibilityLabel={
          isAnalyzing
            ? isPt
              ? 'Calculando macros com IA'
              : 'Calculating macros with AI'
            : isPt
            ? 'Analisar com IA'
            : 'Analyze with AI'
        }
        style={({ pressed }) => [
          styles.analyzeBtn,
          canAnalyze ? styles.analyzeBtnActive : styles.analyzeBtnDisabled,
          canAnalyze && shadows.glowPrimary,
          pressed && canAnalyze && styles.pressed,
        ]}>
        {isAnalyzing ? (
          <View style={styles.analyzeBtnContent}>
            <ActivityIndicator size="small" color={colors.onPrimary} />
            <Typography variant="labelMd" color={colors.onPrimary} style={styles.analyzeBtnText}>
              {isPt ? 'Calculando macros com IA...' : 'Calculating macros with AI...'}
            </Typography>
          </View>
        ) : (
          <View style={styles.analyzeBtnContent}>
            <Sparkles
              size={17}
              color={canAnalyze ? colors.onPrimary : colors.outline}
            />
            <Typography
              variant="labelMd"
              color={canAnalyze ? colors.onPrimary : colors.outline}
              style={styles.analyzeBtnText}>
              {isPt ? 'Analisar com IA' : 'Analyze with AI'}
            </Typography>
          </View>
        )}
      </Pressable>

      {/* Dica explicativa quando o botão está desabilitado */}
      {!canAnalyze && !isAnalyzing && (
        <Typography variant="unitCaption" color={colors.outline} center style={styles.hintText}>
          {isPt
            ? 'Tire uma foto ou descreva sua refeição acima para acionar a IA'
            : 'Take a photo or describe your meal above to enable AI'}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    width: '100%',
    gap: spacing.sm + 2,
  },
  hudCard: {
    width: '100%',
    height: 165,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    ...shadows.card,
  },
  previewWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 20, 26, 0.58)',
  },
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: colors.primary,
    zIndex: 5,
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: radii.sm,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: radii.sm,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: radii.sm,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: radii.sm,
  },
  laserLine: {
    position: 'absolute',
    top: '48%',
    left: 16,
    right: 16,
    height: 1.5,
    backgroundColor: `${colors.primary}45`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    zIndex: 2,
  },
  topBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${colors.surfaceLowest}d0`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  aiDotPulsing: {
    backgroundColor: colors.secondary,
  },
  aiBadgeText: {
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  removePhotoBtn: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: `${colors.surfaceHigh}ee`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  triggerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 10,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    marginBottom: spacing.xs,
  },
  selectedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  retakeButtonDisabled: {
    opacity: 0.6,
  },
  retakeText: {
    fontWeight: '800',
  },
  textGroup: {
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontWeight: '700',
  },
  subtext: {
    lineHeight: 14,
    maxWidth: '85%',
  },
  contextCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: 6,
  },
  contextCardFocused: {
    borderColor: `${colors.primary}70`,
  },
  contextHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contextHeaderTitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clearContextBtn: {
    padding: 2,
  },
  contextInput: {
    color: colors.onSurface,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 48,
    maxHeight: 90,
    padding: 0,
  },
  analyzeBtn: {
    width: '100%',
    height: 48,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnActive: {
    backgroundColor: colors.primary,
  },
  analyzeBtnDisabled: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  analyzeBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnText: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  hintText: {
    marginTop: -2,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
});
