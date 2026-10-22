import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { radii, spacing } from '@/theme/tokens';

export function AnalyticsSkeleton() {
  return (
    <View style={styles.container}>
      {/* Seletor de Período Skeleton */}
      <Skeleton height={42} borderRadius={radii.full} />

      {/* Grid 2x2 KPIs Skeleton */}
      <View style={styles.grid}>
        <View style={styles.row}>
          <Skeleton style={styles.kpiCard} height={128} borderRadius={radii.xl} />
          <Skeleton style={styles.kpiCard} height={128} borderRadius={radii.xl} />
        </View>
        <View style={styles.row}>
          <Skeleton style={styles.kpiCard} height={128} borderRadius={radii.xl} />
          <Skeleton style={styles.kpiCard} height={128} borderRadius={radii.xl} />
        </View>
      </View>

      {/* Gráfico Principal Skeleton */}
      <Skeleton height={240} borderRadius={radii.xl} />

      {/* Distribuição por Refeição Skeleton */}
      <Skeleton height={200} borderRadius={radii.xl} />

      {/* Mapa de Consistência Skeleton */}
      <Skeleton height={140} borderRadius={radii.xl} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  grid: {
    gap: spacing.gutterMobile,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.gutterMobile,
  },
  kpiCard: {
    flex: 1,
  },
});
