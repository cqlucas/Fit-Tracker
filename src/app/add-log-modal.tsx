import { router } from 'expo-router';
import { ChevronRight, Droplets, Utensils, X } from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export default function AddLogModal() {
  const { isPt } = useLanguage();

  const handleClose = () => {
    router.back();
  };

  const handleNavigate = (path: '/add-water' | '/add-food') => {
    router.replace(path);
  };

  return (
    <View style={styles.overlay}>
      {/* Backdrop com toque para fechar */}
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel={isPt ? 'Fechar modal' : 'Close modal'}
      />

      {/* Bottom Sheet Container */}
      <SafeAreaView edges={['bottom']} style={styles.sheetContainer}>
        {/* Grabber Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Modal Header */}
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Typography variant="unitCaption" color={colors.primary} style={styles.tagline}>
              {isPt ? 'REGISTRO RÁPIDO' : 'FAST TRACKING'}
            </Typography>
            <Typography variant="headlineSm" style={styles.title}>
              {isPt ? 'O que deseja registrar?' : 'What would you like to log?'}
            </Typography>
          </View>

          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={isPt ? 'Fechar' : 'Close'}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <X size={18} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Action Cards */}
        <View style={styles.cardsContainer}>
          {/* 1. Adicionar Água / Líquido */}
          <Pressable
            onPress={() => handleNavigate('/add-water')}
            accessibilityRole="button"
            accessibilityLabel={isPt ? 'Registrar Água' : 'Add Liquid / Water'}
            style={({ pressed }) => [
              styles.card,
              shadows.card,
              pressed && styles.cardPressed,
            ]}>
            {/* Glow de fundo sutil */}
            <View style={[styles.glowBackdrop, { backgroundColor: `${colors.secondary}10` }]} />

            <View style={styles.cardLeft}>
              <View style={[styles.iconBox, { backgroundColor: `${colors.secondary}18` }]}>
                <Droplets size={24} color={colors.secondary} strokeWidth={2.4} />
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.cardTitleRow}>
                  <Typography variant="headlineSm" style={styles.cardTitle}>
                    {isPt ? 'Registrar Água' : 'Add Liquid'}
                  </Typography>
                  <View style={[styles.badge, { backgroundColor: `${colors.secondary}20` }]}>
                    <Typography variant="unitCaption" color={colors.secondary}>
                      + ML
                    </Typography>
                  </View>
                </View>
                <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.cardSubtitle}>
                  {isPt ? 'Água pura, chá, eletrólitos ou shake' : 'Water, tea, electrolytes, shake'}
                </Typography>
              </View>
            </View>

            <ChevronRight size={20} color={colors.secondary} />
          </Pressable>

          {/* 2. Adicionar Comida / Refeição */}
          <Pressable
            onPress={() => handleNavigate('/add-food')}
            accessibilityRole="button"
            accessibilityLabel={isPt ? 'Registrar Comida' : 'Add Food / Meal'}
            style={({ pressed }) => [
              styles.card,
              shadows.card,
              pressed && styles.cardPressed,
            ]}>
            {/* Glow de fundo sutil */}
            <View style={[styles.glowBackdrop, { backgroundColor: `${colors.primary}10` }]} />

            <View style={styles.cardLeft}>
              <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
                <Utensils size={24} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.cardTitleRow}>
                  <Typography variant="headlineSm" style={styles.cardTitle}>
                    {isPt ? 'Registrar Comida' : 'Add Food'}
                  </Typography>
                  <View style={[styles.badge, { backgroundColor: `${colors.primary}20` }]}>
                    <Typography variant="unitCaption" color={colors.primary}>
                      + PROT & KCAL
                    </Typography>
                  </View>
                </View>
                <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.cardSubtitle}>
                  {isPt ? 'Refeições completas, foto com IA e lanches' : 'Full meals, AI photo scan & snacks'}
                </Typography>
              </View>
            </View>

            <ChevronRight size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Botão de Cancelar */}
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={isPt ? 'Cancelar' : 'Cancel'}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
          <Typography variant="labelMd" color={colors.outline} center>
            {isPt ? 'Cancelar' : 'Cancel'}
          </Typography>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 8, 12, 0.72)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceLow,
    borderTopLeftRadius: radii['3xl'],
    borderTopRightRadius: radii['3xl'],
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.md,
    ...shadows.tabBar,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHighest,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  headerTextGroup: {
    flex: 1,
    gap: 2,
  },
  tagline: {
    letterSpacing: 0.8,
  },
  title: {
    fontWeight: '800',
    lineHeight: 26,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  cardsContainer: {
    gap: spacing.sm + 4,
    paddingTop: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    position: 'relative',
    overflow: 'hidden',
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    borderColor: colors.strokeCrisp,
    opacity: 0.95,
  },
  glowBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 90,
    height: 90,
    borderRadius: radii.full,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontWeight: '700',
    lineHeight: 22,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  cancelButton: {
    paddingVertical: spacing.sm + 2,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
