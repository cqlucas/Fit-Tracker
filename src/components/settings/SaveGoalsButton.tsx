import { CheckCircle2, Save } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface SaveGoalsButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  isSaved?: boolean;
  isPt?: boolean;
}

export function SaveGoalsButton({
  onPress,
  isLoading = false,
  isSaved = false,
  isPt = false,
}: SaveGoalsButtonProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        disabled={isLoading || isSaved}
        accessibilityRole="button"
        accessibilityLabel={isPt ? 'Salvar Metas Diárias' : 'Save Daily Goals'}
        style={({ pressed }) => [
          styles.button,
          isSaved ? styles.buttonSaved : styles.buttonNormal,
          shadows.glowPrimary,
          pressed && styles.pressed,
        ]}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
        ) : isSaved ? (
          <>
            <CheckCircle2 size={22} color={colors.onPrimary} strokeWidth={2.5} />
            <Typography variant="headlineSm" style={styles.textSaved}>
              {isPt ? 'Metas Sincronizadas!' : 'Goals Synchronized!'}
            </Typography>
          </>
        ) : (
          <>
            <Save size={22} color={colors.onPrimaryContainer} strokeWidth={2.4} />
            <Typography variant="headlineSm" style={styles.textNormal}>
              {isPt ? 'Salvar Metas Diárias' : 'Save Daily Goals'}
            </Typography>
          </>
        )}
      </Pressable>

      <Typography variant="labelSm" color={colors.outline} center style={styles.helperText}>
        {isPt
          ? 'As alterações recalculam instantaneamente os gráficos de rosca e o progresso.'
          : 'Changes reflect instantly across widgets, companions, and ring charts.'}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
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
    color: colors.onPrimaryContainer,
    fontSize: 16,
    fontWeight: '800',
  },
  textSaved: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  helperText: {
    lineHeight: 16,
  },
});
