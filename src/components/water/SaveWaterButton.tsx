import { CheckCircle2, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

export interface SaveWaterButtonProps {
  onPress: () => void;
  amount: number;
  isLoading?: boolean;
  isSaved?: boolean;
  isPt?: boolean;
}

export function SaveWaterButton({
  onPress,
  amount,
  isLoading = false,
  isSaved = false,
  isPt = false,
}: SaveWaterButtonProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        disabled={isLoading || isSaved}
        accessibilityRole="button"
        accessibilityLabel={isPt ? 'Registrar Água' : 'Save Water'}
        style={({ pressed }) => [
          styles.button,
          isSaved ? styles.buttonSaved : styles.buttonNormal,
          shadows.glowSecondary,
          pressed && styles.pressed,
        ]}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.onSecondary} />
        ) : isSaved ? (
          <>
            <CheckCircle2 size={24} color={colors.onPrimary} strokeWidth={2.8} />
            <Typography variant="headlineSm" style={styles.textSaved}>
              {isPt ? `+${amount}ml Registrado!` : `Logged +${amount}ml!`}
            </Typography>
          </>
        ) : (
          <>
            <CheckCircle2 size={24} color={colors.onSecondary} strokeWidth={2.6} />
            <Typography variant="headlineSm" style={styles.textNormal}>
              {isPt ? 'Registrar Água' : 'Save Water'}
            </Typography>
          </>
        )}
      </Pressable>

      <View style={styles.reassuranceRow}>
        <ShieldCheck size={14} color={colors.primary} />
        <Typography variant="labelSm" color={colors.onSurfaceVariant} center>
          {isPt
            ? 'Sincronizado instantaneamente ao seu registro metabólico'
            : 'Synced instantly to your Metabolic Log'}
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
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
    backgroundColor: colors.secondaryContainer,
  },
  buttonSaved: {
    backgroundColor: colors.primary,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  textNormal: {
    color: colors.onSecondary,
    fontSize: 16,
    fontWeight: '800',
  },
  textSaved: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
