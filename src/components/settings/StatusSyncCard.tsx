import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface StatusSyncCardProps {
  isPt?: boolean;
}

export function StatusSyncCard({ isPt = false }: StatusSyncCardProps) {
  const [pulseAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
        <Typography variant="labelSm" color={colors.onSurface} style={styles.label}>
          {isPt ? 'Status do SQLite Local' : 'Telemetry Sync Status'}
        </Typography>
      </View>

      <Typography variant="unitCaption" color={colors.primary} style={styles.statusBadge}>
        {isPt ? 'PRONTO PARA SALVAR' : 'READY TO COMMIT'}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  label: {
    fontWeight: '600',
  },
  statusBadge: {
    letterSpacing: 1,
    fontWeight: '800',
  },
});
