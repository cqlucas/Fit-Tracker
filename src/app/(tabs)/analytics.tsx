import { Activity, Sparkles } from 'lucide-react-native';
import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalyticsPeriodSelector } from '@/components/analytics/AnalyticsPeriodSelector';
import { AnalyticsSkeleton } from '@/components/analytics/AnalyticsSkeleton';
import { ConsistencyGridCard } from '@/components/analytics/ConsistencyGridCard';
import { DailyTrendBarChart } from '@/components/analytics/DailyTrendBarChart';
import { MealWindowDistributionCard } from '@/components/analytics/MealWindowDistributionCard';
import { SummaryMetricsGrid } from '@/components/analytics/SummaryMetricsGrid';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { colors, radii, spacing } from '@/theme/tokens';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { period, setPeriod, data, isLoading, isRefreshing, refresh } =
    useAnalyticsData('7d');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        {/* Header da Tela de Analytics */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.badgeRow}>
              <View style={styles.telemetryBadge}>
                <Activity size={12} color={colors.primary} />
                <Typography
                  variant="unitCaption"
                  color={colors.primary}
                  style={styles.badgeText}>
                  {t.analytics.headerSubtitle}
                </Typography>
              </View>
            </View>
            <Typography variant="headlineLg" style={styles.mainTitle}>
              {t.analytics.headerTitle}
            </Typography>
          </View>
        </View>

        {/* Estado de Carregamento ou Conteúdo Principal */}
        {isLoading && !data ? (
          <AnalyticsSkeleton />
        ) : data ? (
          <View style={styles.sections}>
            {/* 1. Seletor de Período (7d, 14d, 30d) */}
            <AnalyticsPeriodSelector
              period={period}
              onChangePeriod={setPeriod}
            />

            {/* Aviso sutil quando não há dados no período */}
            {data.kpis.daysWithLogs === 0 && (
              <View style={styles.emptyHintCard}>
                <Sparkles size={18} color={colors.secondary} />
                <View style={styles.emptyHintTextWrap}>
                  <Typography variant="labelSm" color={colors.onSurface} style={styles.bold}>
                    {t.analytics.emptyTitle}
                  </Typography>
                  <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                    {t.analytics.emptySubtitle}
                  </Typography>
                </View>
              </View>
            )}

            {/* 2. Grid de KPIs (Resumo Geral) */}
            <SummaryMetricsGrid kpis={data.kpis} goals={data.goals} />

            {/* 3. Gráfico Principal de Evolução Diária */}
            <DailyTrendBarChart series={data.dailySeries} goals={data.goals} />

            {/* 4. Distribuição por Janela de Refeição */}
            <MealWindowDistributionCard breakdown={data.mealWindowBreakdown} />

            {/* 5. Mapa de Consistência / Heatmap de Hábitos */}
            <ConsistencyGridCard series={data.dailySeries} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 64, // Espaço para a TabBar flutuante
    gap: spacing.lg,
  },
  header: {
    marginBottom: spacing.xs,
  },
  headerTitleWrap: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  telemetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontWeight: '800',
    color: colors.onSurface,
  },
  sections: {
    gap: spacing.lg,
  },
  emptyHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  emptyHintTextWrap: {
    flex: 1,
    gap: 2,
  },
  bold: {
    fontWeight: '700',
  },
});
