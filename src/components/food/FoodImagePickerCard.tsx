import { Camera, FlipHorizontal, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface FoodImagePickerCardProps {
  onPickImage?: () => void;
  isPt?: boolean;
}

export function FoodImagePickerCard({ onPickImage, isPt = false }: FoodImagePickerCardProps) {
  return (
    <View style={styles.container}>
      {/* HUD Corner Accents */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* Laser Scan Line Decorator */}
      <View style={styles.laserLine} />

      {/* Top Floating Badge */}
      <View style={styles.topBadgeRow}>
        <View style={styles.aiBadge}>
          <View style={styles.aiDot} />
          <Typography variant="unitCaption" color={colors.primary} style={styles.aiBadgeText}>
            {isPt ? 'VISÃO IA PRONTA' : 'AI VISION READY'}
          </Typography>
        </View>

        <View style={styles.flipButton}>
          <FlipHorizontal size={14} color={colors.onSurfaceVariant} />
        </View>
      </View>

      {/* Center Camera Trigger */}
      <Pressable
        onPress={onPickImage}
        accessibilityRole="button"
        accessibilityLabel={isPt ? 'Tirar foto ou escanear prato' : 'Take photo or scan dish'}
        style={({ pressed }) => [
          styles.cameraButton,
          shadows.glowPrimary,
          pressed && styles.pressed,
        ]}>
        <Camera size={26} color={colors.primary} />
      </Pressable>

      {/* Helper Subtitles */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 190,
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
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: colors.primary,
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
  aiBadgeText: {
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  flipButton: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: `${colors.surfaceHigh}cc`,
    alignItems: 'center',
    justifyContent: 'center',
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
    zIndex: 10,
    marginBottom: spacing.xs,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  textGroup: {
    alignItems: 'center',
    gap: 3,
    zIndex: 10,
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
  },
});
