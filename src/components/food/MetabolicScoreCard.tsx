import { ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface MetabolicScoreCardProps {
  score?: number;
  isPt?: boolean;
}

export function MetabolicScoreCard({ score = 94, isPt = false }: MetabolicScoreCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <View style={styles.iconBox}>
          <ShieldCheck size={22} color={colors.primary} />
        </View>
        <View style={styles.textGroup}>
          <Typography variant="labelMd" style={styles.title}>
            {isPt ? 'Índice de Equilíbrio Metabólico' : 'Metabolic Balance Score'}
          </Typography>
          <Typography variant="labelSm" color={colors.onSurfaceVariant} style={styles.subtitle}>
            {isPt
              ? 'Perfil de alta absorção proteica • Baixo índice glicêmico'
              : 'High-protein recovery profile • Low glycemic'}
          </Typography>
        </View>
      </View>

      <View style={styles.scoreGroup}>
        <Typography variant="metricNumeralSm" color={colors.primary} style={styles.scoreNumber}>
          {score}
        </Typography>
        <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.indexLabel}>
          INDEX
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
    paddingRight: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.onPrimaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    lineHeight: 15,
  },
  scoreGroup: {
    alignItems: 'flex-end',
  },
  scoreNumber: {
    fontWeight: '900',
    lineHeight: 22,
  },
  indexLabel: {
    letterSpacing: 0.6,
  },
});
