import { Check, Cpu, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { type PreferredAiProvider } from '@/db/schema';
import { colors, radii, spacing } from '@/theme/tokens';

export interface AiProviderSelectorCardProps {
  provider: PreferredAiProvider;
  onSelectProvider: (provider: PreferredAiProvider) => void;
  isPt?: boolean;
}

export function AiProviderSelectorCard({
  provider,
  onSelectProvider,
  isPt: propIsPt,
}: AiProviderSelectorCardProps) {
  const { t, isPt: contextIsPt } = useLanguage();
  const isPt = propIsPt ?? contextIsPt;

  const isGemini = provider === 'gemini';
  const isGroq = provider === 'groq';

  return (
    <Card variant="low" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Cpu size={20} color={colors.primary} />
        </View>
        <View style={styles.titleColumn}>
          <Typography variant="labelMd" style={styles.title}>
            {t.settings.aiProviderTitle}
          </Typography>
          <Typography variant="bodyMd" color={colors.onSurfaceVariant} style={styles.subtitle}>
            {t.settings.aiProviderSubtitle}
          </Typography>
        </View>
      </View>

      <View style={styles.optionsRow}>
        {/* Opção Gemini */}
        <Pressable
          onPress={() => onSelectProvider('gemini')}
          accessibilityRole="button"
          accessibilityLabel="Google Gemini"
          style={({ pressed }) => [
            styles.optionButton,
            isGemini && styles.optionSelected,
            pressed && styles.pressed,
          ]}>
          <View style={styles.optionContent}>
            <View style={styles.labelCol}>
              <Typography
                variant="labelMd"
                style={isGemini ? styles.textSelected : styles.textUnselected}>
                {t.settings.aiProviderGemini}
              </Typography>
              <Typography
                variant="unitCaption"
                style={isGemini ? styles.subtextSelected : styles.subtextUnselected}>
                {isPt ? 'Multimodal Flash' : 'Multimodal Flash'}
              </Typography>
            </View>
            {isGemini ? <Check size={16} color={colors.onPrimary} strokeWidth={2.8} /> : null}
          </View>
        </Pressable>

        {/* Opção Groq */}
        <Pressable
          onPress={() => onSelectProvider('groq')}
          accessibilityRole="button"
          accessibilityLabel="Groq Cloud"
          style={({ pressed }) => [
            styles.optionButton,
            isGroq && styles.optionSelected,
            pressed && styles.pressed,
          ]}>
          <View style={styles.optionContent}>
            <View style={styles.labelCol}>
              <View style={styles.groqLabelRow}>
                <Typography
                  variant="labelMd"
                  style={isGroq ? styles.textSelected : styles.textUnselected}>
                  {t.settings.aiProviderGroq}
                </Typography>
                <Zap size={11} color={isGroq ? colors.onPrimary : colors.secondary} />
              </View>
              <Typography
                variant="unitCaption"
                style={isGroq ? styles.subtextSelected : styles.subtextUnselected}>
                {isPt ? 'Llama 4 Vision' : 'Llama 4 Vision'}
              </Typography>
            </View>
            {isGroq ? <Check size={16} color={colors.onPrimary} strokeWidth={2.8} /> : null}
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
    gap: 2,
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
  labelCol: {
    gap: 1,
  },
  groqLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  textSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  textUnselected: {
    color: colors.onSurface,
  },
  subtextSelected: {
    color: `${colors.onPrimary}dd`,
    fontSize: 10,
    fontWeight: '600',
  },
  subtextUnselected: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
});
