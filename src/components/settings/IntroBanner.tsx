import { Sliders } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface IntroBannerProps {
  isPt?: boolean;
}

export function IntroBanner({ isPt = false }: IntroBannerProps) {
  return (
    <View style={styles.container}>
      {/* Glow de fundo */}
      <View style={styles.ambientGlow} />

      <View style={styles.iconBox}>
        <Sliders size={18} color={colors.primary} />
      </View>

      <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.text}>
        {isPt
          ? 'Configure seus parâmetros diários. Os anéis de progresso e métricas recalibram instantaneamente em todo o app.'
          : 'Configure your daily nutritional baselines. Progress rings and telemetry re-calibrate automatically across the app.'}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  ambientGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: radii.full,
    backgroundColor: `${colors.primary}12`,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  text: {
    flex: 1,
    lineHeight: 20,
  },
});
