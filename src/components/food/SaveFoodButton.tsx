import { CheckCircle2, Utensils } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface SaveFoodButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  isSaved?: boolean;
  isPt?: boolean;
}

export function SaveFoodButton({
  onPress,
  isLoading = false,
  isSaved = false,
  isPt = false,
}: SaveFoodButtonProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        disabled={isLoading || isSaved}
        accessibilityRole="button"
        accessibilityLabel={isPt ? 'Registrar Refeição' : 'Log Meal to Daily Rings'}
        style={({ pressed }) => [
          styles.button,
          isSaved ? styles.buttonSaved : styles.buttonNormal,
          shadows.glowPrimary,
          pressed && styles.pressed,
        ]}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
        ) : isSaved ? (
          <>
            <CheckCircle2 size={24} color={colors.onPrimary} strokeWidth={2.8} />
            <Typography variant="headlineSm" style={styles.textSaved}>
              {isPt ? 'Refeição Registrada!' : 'Meal Logged Successfully!'}
            </Typography>
          </>
        ) : (
          <>
            <Utensils size={22} color={colors.onPrimaryFixed} strokeWidth={2.4} />
            <Typography variant="headlineSm" style={styles.textNormal}>
              {isPt ? 'Registrar Refeição nas Metas' : 'Log Meal to Daily Rings'}
            </Typography>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
    width: '100%',
  },
  button: {
    height: 56,
    borderRadius: radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonNormal: {
    backgroundColor: colors.primaryContainer,
  },
  buttonSaved: {
    backgroundColor: colors.primary,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  textNormal: {
    color: colors.onPrimaryFixed,
    fontSize: 16,
    fontWeight: '800',
  },
  textSaved: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});
