import { Image } from 'expo-image';
import { Camera, RefreshCw, Sparkles, Trash2 } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface FoodImagePickerCardProps {
  imageUri?: string | null;
  isAnalyzing?: boolean;
  onPickImage?: () => void;
  onRemoveImage?: () => void;
  isPt?: boolean;
}

export function FoodImagePickerCard({
  imageUri,
  isAnalyzing = false,
  onPickImage,
  onRemoveImage,
  isPt = false,
}: FoodImagePickerCardProps) {
  return (
    <View style={styles.container}>
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

      {/* Laser Scan Line Decorator (somente se não estiver analisando) */}
      {!isAnalyzing && <View style={styles.laserLine} />}

      {/* Top Floating Badge Row */}
      <View style={styles.topBadgeRow}>
        <View style={styles.aiBadge}>
          <View style={[styles.aiDot, isAnalyzing && styles.aiDotPulsing]} />
          <Typography variant="unitCaption" color={colors.primary} style={styles.aiBadgeText}>
            {isAnalyzing
              ? isPt
                ? 'IA PROCESSANDO'
                : 'AI PROCESSING'
              : imageUri
              ? isPt
                ? 'FOTO SELECIONADA'
                : 'PHOTO SELECTED'
              : isPt
              ? 'VISÃO IA PRONTA'
              : 'AI VISION READY'}
          </Typography>
        </View>

        {imageUri && !isAnalyzing && onRemoveImage ? (
          <Pressable
            onPress={onRemoveImage}
            accessibilityRole="button"
            accessibilityLabel={isPt ? 'Remover foto' : 'Remove photo'}
            style={({ pressed }) => [styles.topActionBtn, pressed && styles.pressed]}>
            <Trash2 size={14} color={colors.error || '#ffb4ab'} />
          </Pressable>
        ) : null}
      </View>

      {/* Estado 1: Analisando com IA (Loading Spinner + Text) */}
      {isAnalyzing ? (
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Typography variant="labelMd" color={colors.primary} style={styles.analyzingText}>
            {isPt ? 'Analisando prato com IA...' : 'Analyzing meal with AI...'}
          </Typography>
          <Typography variant="unitCaption" color={colors.onSurfaceVariant} center>
            {isPt
              ? 'Identificando alimentos e estimando proteínas/calorias'
              : 'Identifying ingredients and estimating protein/calories'}
          </Typography>
        </View>
      ) : imageUri ? (
        /* Estado 2: Foto Selecionada (Preview com botão de Retake) */
        <View style={styles.selectedContent}>
          <Pressable
            onPress={onPickImage}
            accessibilityRole="button"
            accessibilityLabel={isPt ? 'Alterar foto' : 'Change photo'}
            style={({ pressed }) => [
              styles.retakeButton,
              shadows.glowPrimary,
              pressed && styles.pressed,
            ]}>
            <RefreshCw size={18} color={colors.onPrimary} />
            <Typography variant="labelSm" color={colors.onPrimary} style={styles.retakeText}>
              {isPt ? 'Trocar Foto' : 'Retake'}
            </Typography>
          </Pressable>
        </View>
      ) : (
        /* Estado 3: Vazio (HUD inicial de captura) */
        <Pressable
          onPress={onPickImage}
          accessibilityRole="button"
          accessibilityLabel={isPt ? 'Tirar foto ou escanear prato' : 'Take photo or scan dish'}
          style={({ pressed }) => [styles.triggerContainer, pressed && styles.pressed]}>
          <View style={[styles.cameraButton, shadows.glowPrimary]}>
            <Camera size={26} color={colors.primary} />
          </View>

          <View style={styles.textGroup}>
            <View style={styles.sparkleRow}>
              <Sparkles size={13} color={colors.primary} />
              <Typography variant="labelSm" color={colors.onSurface} style={styles.label}>
                {isPt ? 'Escanear com IA (Opcional)' : 'Scan with AI (Optional)'}
              </Typography>
            </View>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant} center style={styles.subtext}>
              {isPt
                ? 'Tire uma foto para preencher os dados ou digite diretamente abaixo'
                : 'Capture a photo to auto-fill macros or enter details directly below'}
            </Typography>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 195,
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
    backgroundColor: 'rgba(16, 20, 26, 0.65)',
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: colors.primary,
    zIndex: 5,
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: radii.sm,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: radii.sm,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: radii.sm,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: radii.sm,
  },
  laserLine: {
    position: 'absolute',
    top: '46%',
    left: 20,
    right: 20,
    height: 1.5,
    backgroundColor: `${colors.primary}60`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    zIndex: 2,
  },
  topBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${colors.surfaceLowest}cc`,
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
    backgroundColor: colors.primary,
  },
  aiBadgeText: {
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  topActionBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: `${colors.surfaceHigh}dd`,
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
    width: 58,
    height: 58,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    marginBottom: spacing.xs,
  },
  analyzingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  analyzingText: {
    fontWeight: '700',
    marginTop: 4,
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
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  retakeText: {
    fontWeight: '800',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  textGroup: {
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
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
});
