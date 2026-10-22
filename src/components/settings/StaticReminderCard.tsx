import { BellRing } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface StaticReminderCardProps {
  isPt?: boolean;
}

export function StaticReminderCard({ isPt = false }: StaticReminderCardProps) {
  const [isActive, setIsActive] = useState(true);

  return (
    <Card variant="low" style={styles.card}>
      <View style={styles.leftGroup}>
        <View style={styles.iconBox}>
          <BellRing size={20} color={colors.secondary} />
        </View>
        <View style={styles.textGroup}>
          <Typography variant="labelMd" style={styles.title}>
            {isPt ? 'Lembretes Inteligentes de Hidratação' : 'Smart Hydration Reminders'}
          </Typography>
          <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.subtitle}>
            {isPt
              ? 'Intervalos dinâmicos sincronizados com o dia'
              : 'Dynamic intervals synced with activity & climate'}
          </Typography>
        </View>
      </View>

      {/* Switch Toggle Estático/Visual */}
      <Pressable
        onPress={() => setIsActive((prev) => !prev)}
        accessibilityRole="switch"
        accessibilityState={{ checked: isActive }}
        accessibilityLabel={isPt ? 'Alternar lembretes' : 'Toggle reminders'}
        style={[styles.switchTrack, isActive ? styles.trackActive : styles.trackInactive]}>
        <View style={[styles.switchThumb, isActive ? styles.thumbActive : styles.thumbInactive]} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
    paddingRight: spacing.sm,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: `${colors.secondary}18`,
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
    fontSize: 12,
    lineHeight: 16,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: radii.full,
    padding: 3,
    justifyContent: 'center',
  },
  trackActive: {
    backgroundColor: colors.secondary,
  },
  trackInactive: {
    backgroundColor: colors.surfaceHighest,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceLowest,
  },
  thumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: colors.onSecondary,
  },
  thumbInactive: {
    alignSelf: 'flex-start',
    backgroundColor: colors.outline,
  },
});
