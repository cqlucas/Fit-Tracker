import { router } from 'expo-router';
import { CalendarX2, FilterX, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface HistoryEmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function HistoryEmptyState({
  hasActiveFilters,
  onClearFilters,
}: HistoryEmptyStateProps) {
  const { t, isPt } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, shadows.glowPrimary]}>
        {hasActiveFilters ? (
          <FilterX size={36} color={colors.primary} />
        ) : (
          <CalendarX2 size={36} color={colors.primary} />
        )}
      </View>

      <Typography variant="headlineSm" style={styles.title}>
        {t.history.emptyTitle}
      </Typography>

      <Typography variant="bodyMd" color={colors.onSurfaceVariant} center style={styles.subtitle}>
        {hasActiveFilters
          ? t.history.emptySubtitle
          : isPt
          ? 'Você ainda não registrou refeições ou água. Use o botão + para começar!'
          : 'You have not logged any meals or water yet. Tap the + button to get started!'}
      </Typography>

      {hasActiveFilters ? (
        <Pressable
          onPress={onClearFilters}
          accessibilityRole="button"
          accessibilityLabel={t.history.clearFilters}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <FilterX size={16} color={colors.primary} />
          <Typography variant="labelMd" color={colors.primary} style={styles.btnText}>
            {t.history.clearFilters}
          </Typography>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/add-log-modal')}
          accessibilityRole="button"
          accessibilityLabel="Adicionar registro"
          style={({ pressed }) => [
            styles.actionButtonPrimary,
            shadows.glowPrimary,
            pressed && styles.pressed,
          ]}>
          <Plus size={18} color={colors.onPrimaryFixed} />
          <Typography variant="labelMd" color={colors.onPrimaryFixed} style={styles.btnTextPrimary}>
            {isPt ? 'Adicionar Primeiro Registro' : 'Add First Log'}
          </Typography>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    marginBottom: spacing.xs,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  btnText: {
    fontWeight: '700',
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  btnTextPrimary: {
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});
