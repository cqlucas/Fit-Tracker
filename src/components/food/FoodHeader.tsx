import { router } from 'expo-router';
import { ArrowLeft, Utensils, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface FoodHeaderProps {
  title?: string;
  onClose?: () => void;
}

export function FoodHeader({ title = 'Quick Log', onClose }: FoodHeaderProps) {
  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <ArrowLeft size={20} color={colors.onSurface} />
        </Pressable>

        <View style={styles.badgeBox}>
          <Utensils size={16} color={colors.primary} strokeWidth={2.5} />
        </View>

        <Typography variant="headlineSm" style={styles.title}>
          {title}
        </Typography>
      </View>

      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <X size={18} color={colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  badgeBox: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    lineHeight: 22,
  },
});
