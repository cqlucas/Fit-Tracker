import { Check, Globe } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface LanguageSelectorCardProps {
  language: 'pt' | 'en';
  onSelectLanguage: (lang: 'pt' | 'en') => void;
}

export function LanguageSelectorCard({ language, onSelectLanguage }: LanguageSelectorCardProps) {
  const isPt = language === 'pt';

  return (
    <Card variant="low" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Globe size={20} color={colors.primary} />
        </View>
        <View style={styles.titleColumn}>
          <Typography variant="labelMd" style={styles.title}>
            {isPt ? 'Idioma do Aplicativo' : 'App Language'}
          </Typography>
          <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.subtitle}>
            {isPt ? 'Interface local e unidades de telemetria' : 'Local interface & telemetry units'}
          </Typography>
        </View>
      </View>

      <View style={styles.optionsRow}>
        {/* Opção Português */}
        <Pressable
          onPress={() => onSelectLanguage('pt')}
          accessibilityRole="button"
          accessibilityLabel="Português do Brasil"
          style={({ pressed }) => [
            styles.optionButton,
            isPt && styles.optionSelected,
            pressed && styles.pressed,
          ]}>
          <View style={styles.optionContent}>
            <Typography variant="labelMd" style={isPt ? styles.textSelected : styles.textUnselected}>
              🇧🇷 Português (BR)
            </Typography>
            {isPt ? <Check size={16} color={colors.onPrimary} strokeWidth={2.8} /> : null}
          </View>
        </Pressable>

        {/* Opção Inglês */}
        <Pressable
          onPress={() => onSelectLanguage('en')}
          accessibilityRole="button"
          accessibilityLabel="English"
          style={({ pressed }) => [
            styles.optionButton,
            !isPt && styles.optionSelected,
            pressed && styles.pressed,
          ]}>
          <View style={styles.optionContent}>
            <Typography
              variant="labelMd"
              style={!isPt ? styles.textSelected : styles.textUnselected}>
              🇺🇸 English (US)
            </Typography>
            {!isPt ? <Check size={16} color={colors.onPrimary} strokeWidth={2.8} /> : null}
          </View>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  textUnselected: {
    color: colors.onSurface,
  },
});
