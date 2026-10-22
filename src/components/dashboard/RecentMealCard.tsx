import { ChevronRight, Utensils } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, spacing } from '@/theme/tokens';

export interface RecentMealCardProps {
  name: string;
  proteinG: number;
  caloriesKcal: number;
  timeString?: string;
  onPress?: () => void;
}

export function RecentMealCard({
  name,
  proteinG,
  caloriesKcal,
  timeString,
  onPress,
}: RecentMealCardProps) {
  const { t, isPt } = useLanguage();
  const resolvedTimeString = timeString ?? t.home.todayPrefix;
  const proteinUnit = isPt ? 'Proteína' : 'Protein';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card variant="low" style={styles.card}>
        <View style={styles.content}>
          <View style={styles.avatar}>
            <Utensils size={20} color={colors.primary} />
          </View>
          <View style={styles.info}>
            <Typography variant="labelMd" style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Typography>
            <Typography
              variant="unitCaption"
              color={colors.onSurfaceVariant}
              style={styles.details}
              numberOfLines={1}
              ellipsizeMode="tail">
              {resolvedTimeString} • {proteinG}g {proteinUnit} • {caloriesKcal} kcal
            </Typography>
          </View>
        </View>

        <ChevronRight size={20} color={colors.onSurfaceVariant} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '700',
  },
  details: {
    letterSpacing: 0.2,
  },
});
