import React, { useEffect, useState } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
  color?: string;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = radii.md,
  style,
  color = colors.surfaceContainer,
}: SkeletonProps) {
  const [pulseAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton que espelha o tamanho exato dos cards de Donut (Proteína & Água)
 * para evitar qualquer layout shift durante o boot do SQLite.
 */
export function SkeletonDonutRow() {
  return (
    <View style={styles.donutRow}>
      <View style={styles.donutCard}>
        <View style={styles.donutHeader}>
          <Skeleton width={70} height={16} borderRadius={radii.sm} />
          <Skeleton width={36} height={16} borderRadius={radii.full} />
        </View>
        <Skeleton width={110} height={110} borderRadius={radii.full} style={styles.donutCircle} />
        <Skeleton width="100%" height={26} borderRadius={radii.md} style={styles.donutFooter} />
      </View>
      <View style={styles.donutCard}>
        <View style={styles.donutHeader}>
          <Skeleton width={70} height={16} borderRadius={radii.sm} />
          <Skeleton width={36} height={16} borderRadius={radii.full} />
        </View>
        <Skeleton width={110} height={110} borderRadius={radii.full} style={styles.donutCircle} />
        <Skeleton width="100%" height={26} borderRadius={radii.md} style={styles.donutFooter} />
      </View>
    </View>
  );
}

/**
 * Skeleton que espelha o card de calorias/energia
 */
export function SkeletonCaloriesCard() {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Skeleton width={140} height={20} borderRadius={radii.sm} />
        <Skeleton width={80} height={24} borderRadius={radii.sm} />
      </View>
      <Skeleton width="100%" height={10} borderRadius={radii.full} style={styles.progressBar} />
      <View style={styles.cardFooter}>
        <Skeleton width={120} height={16} borderRadius={radii.sm} />
        <Skeleton width={100} height={16} borderRadius={radii.sm} />
      </View>
    </View>
  );
}

/**
 * Skeleton que espelha o card de consistência semanal
 */
export function SkeletonWeeklyCard() {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <Skeleton width={130} height={18} borderRadius={radii.sm} />
        <Skeleton width={60} height={18} borderRadius={radii.full} />
      </View>
      <View style={styles.daysRow}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={38} height={48} borderRadius={radii.md} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  donutRow: {
    flexDirection: 'row',
    gap: spacing.gutterMobile,
    width: '100%',
  },
  donutCard: {
    flex: 1,
    height: 220,
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.xl,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  donutHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  donutCircle: {
    marginVertical: spacing.sm,
  },
  donutFooter: {
    marginTop: spacing.xs,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    gap: spacing.sm + 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBar: {
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
