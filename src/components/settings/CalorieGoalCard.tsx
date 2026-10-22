import { Flame, Lock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { colors, radii, spacing } from '@/theme/tokens';

export interface CalorieGoalCardProps {
  currentGoal?: number;
  isPt?: boolean;
}

export function CalorieGoalCard({ currentGoal = 2200, isPt = false }: CalorieGoalCardProps) {
  return (
    <Card variant="low" style={styles.card}>
      {/* Glow sutil */}
      <View style={styles.ambientGlow} />

      {/* Header Row com Badge "Em Breve" */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconBox}>
            <Flame size={20} color={colors.tertiaryContainer} strokeWidth={2.4} />
          </View>
          <View>
            <Typography variant="unitCaption" color={colors.tertiary} style={styles.tagline}>
              {isPt ? 'ORÇAMENTO ENERGÉTICO' : 'METABOLIC BUDGET'}
            </Typography>
            <Typography variant="headlineSm" style={styles.cardTitle}>
              {isPt ? 'Meta Calórica Diária' : 'Daily Calorie Target'}
            </Typography>
          </View>
        </View>

        <Badge
          label={isPt ? 'Em breve' : 'Coming soon'}
          variant="subtle"
          style={styles.comingSoonBadge}
        />
      </View>

      {/* Readout Box (Desabilitado) */}
      <View style={styles.readoutBox}>
        <View style={styles.inputRow}>
          <Typography variant="displayHeroMobile" color={colors.tertiary} style={styles.valueText}>
            {currentGoal.toLocaleString()}
          </Typography>
          <Typography variant="labelMd" color={colors.onSurfaceVariant} style={styles.unitText}>
            {isPt ? 'KCAL / DIA' : 'KCAL / DAY'}
          </Typography>
        </View>

        <View style={styles.statusColumn}>
          <Typography variant="unitCaption" color={colors.outline} style={styles.statusLabel}>
            {isPt ? 'MODO BASE' : 'CURRENT MODE'}
          </Typography>
          <Typography variant="metricNumeralSm" color={colors.tertiary} style={styles.statusValue}>
            {isPt ? 'Manutenção' : 'Maintenance'}
          </Typography>
        </View>
      </View>

      {/* Segmented Badges Desabilitados */}
      <View style={styles.segmentedContainer}>
        <View style={styles.segment}>
          <Typography variant="labelSm" color={colors.outline}>
            {isPt ? 'Déficit (-400)' : 'Deficit'}
          </Typography>
        </View>
        <View style={[styles.segment, styles.segmentActive]}>
          <Typography variant="labelSm" color={colors.onTertiary} style={styles.segmentTextActive}>
            {isPt ? 'Manutenção' : 'Maintenance'}
          </Typography>
        </View>
        <View style={styles.segment}>
          <Typography variant="labelSm" color={colors.outline}>
            {isPt ? 'Superávit (+400)' : 'Surplus'}
          </Typography>
        </View>
      </View>

      {/* Micro-Copy Explicativo de Planejamento Futuro */}
      <View style={styles.tipRow}>
        <Lock size={14} color={colors.outline} style={styles.tipIcon} />
        <Typography variant="bodyMd" color={colors.outline} style={styles.tipText}>
          {isPt
            ? 'O motor de periodização calórica inteligente está em desenvolvimento e será liberado na próxima versão.'
            : 'Dynamic caloric budget and smart periodization will be enabled in the upcoming release.'}
        </Typography>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md + 2,
    position: 'relative',
    overflow: 'hidden',
    opacity: 0.62, // Opacidade reduzida para indicar recurso bloqueado / futuro
    borderWidth: 1,
    borderColor: `${colors.strokeSubtle}90`,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 140,
    height: 140,
    borderRadius: radii.full,
    backgroundColor: `${colors.tertiaryContainer}06`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    backgroundColor: `${colors.tertiaryContainer}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontWeight: '700',
  },
  comingSoonBadge: {
    borderColor: `${colors.tertiaryContainer}60`,
    backgroundColor: `${colors.tertiaryContainer}15`,
  },
  readoutBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs + 2,
  },
  valueText: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
  },
  unitText: {
    letterSpacing: 0.8,
  },
  statusColumn: {
    alignItems: 'flex-end',
  },
  statusLabel: {
    letterSpacing: 0.6,
  },
  statusValue: {
    fontWeight: '700',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    padding: 3,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.tertiaryContainer,
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 3,
    paddingTop: 4,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
});
