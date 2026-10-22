import { useRouter } from 'expo-router';
import { Award, Dumbbell, Droplets } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CaloriesProgressCard } from '@/components/dashboard/CaloriesProgressCard';
import { DonutChartCard } from '@/components/dashboard/DonutChartCard';
import { HomeHeader } from '@/components/dashboard/HomeHeader';
import { QuickLogCTA } from '@/components/dashboard/QuickLogCTA';
import { RecentMealCard } from '@/components/dashboard/RecentMealCard';
import { WeeklyConsistencyCard } from '@/components/dashboard/WeeklyConsistencyCard';
import { Badge } from '@/components/ui/Badge';
import {
  SkeletonCaloriesCard,
  SkeletonDonutRow,
  SkeletonWeeklyCard,
} from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const { t, isPt } = useLanguage();
  const {
    isLoading,
    goals,
    todayTotals,
    weeklyStats,
    recentMeal,
    weeklyAverage,
    formatDaysForMacro,
    refresh,
  } = useDashboardData();

  // Data formatada para o cabeçalho baseada no idioma selecionado
  const { dateTitle, dayOfWeek } = useMemo(() => {
    const now = new Date();
    const locale = isPt ? 'pt-BR' : 'en-US';
    const month = now.toLocaleDateString(locale, { month: 'short' });
    const day = now.getDate();
    const weekday = now.toLocaleDateString(locale, { weekday: 'short' });

    return {
      dateTitle: `${t.home.todayPrefix}, ${month} ${day}`,
      dayOfWeek: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    };
  }, [isPt, t]);

  const proteinDays = formatDaysForMacro('protein');
  const waterDays = formatDaysForMacro('water');

  const handleQuickLog = () => {
    router.push('/add-log-modal');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        {/* Cabeçalho da Home com data e atalhos */}
        <HomeHeader
          dateTitle={dateTitle}
          dayOfWeek={dayOfWeek}
          streakDays={weeklyStats.proteinDaysHit + weeklyStats.waterDaysHit > 0 ? 7 : 1}
          onPressNotifications={() => {}}
        />

        {/* Hero Section: Dual Macro Donut Rings (Proteína & Água) */}
        {isLoading ? (
          <SkeletonDonutRow />
        ) : (
          <View style={styles.dualDonutRow}>
            <DonutChartCard
              label={t.home.protein}
              current={todayTotals.proteinConsumed}
              goal={goals.proteinGoal}
              unit="g"
              color={colors.primary}
              glow="primary"
            />
            <DonutChartCard
              label={t.home.hydration}
              current={todayTotals.waterConsumed}
              goal={goals.waterGoal}
              unit="ml"
              color={colors.secondary}
              glow="secondary"
              formatValue={(val) => {
                if (val >= 1000) {
                  return `${(val / 1000).toFixed(1)}L`;
                }
                return `${val}ml`;
              }}
            />
          </View>
        )}

        {/* Progresso de Calorias e Déficit Energético */}
        {isLoading ? (
          <SkeletonCaloriesCard />
        ) : (
          <CaloriesProgressCard
            consumed={todayTotals.caloriesConsumed}
            goal={goals.caloriesGoal}
          />
        )}

        {/* Botão de Ação Rápida de Registro */}
        <QuickLogCTA onPress={handleQuickLog} />

        {/* Seção Inferior: Consistência Semanal */}
        <View style={styles.weeklySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Award size={18} color={colors.primary} />
              <Typography variant="labelMd" style={styles.sectionTitle}>
                {t.home.weeklyTitle}
              </Typography>
            </View>
            <Badge label={t.home.last7Days} variant="subtle" />
          </View>

          {isLoading ? (
            <>
              <SkeletonWeeklyCard />
              <SkeletonWeeklyCard />
            </>
          ) : (
            <>
              {/* Consistência de Proteína */}
              <WeeklyConsistencyCard
                title={t.home.proteinGoalTitle}
                subtitle={t.home.proteinGoalSubtitle(goals.proteinGoal)}
                hitCount={weeklyStats.proteinDaysHit}
                totalDays={weeklyStats.totalDays}
                averageText={t.home.avgProtein(weeklyAverage.protein || 0)}
                icon={<Dumbbell size={16} color={colors.primary} strokeWidth={2.5} />}
                accentColor={colors.primary}
                containerColor={colors.primaryContainer}
                days={proteinDays}
              />

              {/* Consistência de Hidratação */}
              <WeeklyConsistencyCard
                title={t.home.hydrationTitle}
                subtitle={t.home.hydrationSubtitle}
                hitCount={weeklyStats.waterDaysHit}
                totalDays={weeklyStats.totalDays}
                averageText={t.home.avgWater(weeklyAverage.water !== '0.0' ? weeklyAverage.water : '0.0')}
                icon={<Droplets size={16} color={colors.secondary} strokeWidth={2.5} />}
                accentColor={colors.secondary}
                containerColor={colors.secondaryContainer}
                days={waterDays}
              />
            </>
          )}
        </View>

        {/* Snapshot da Última Refeição Registrada */}
        {!isLoading && recentMeal ? (
          <View style={styles.recentMealSection}>
            <RecentMealCard
              name={recentMeal.name}
              proteinG={recentMeal.proteinG}
              caloriesKcal={recentMeal.caloriesKcal}
              timeString={t.home.recentLog}
              onPress={handleQuickLog}
            />
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 110, // Espaço extra para não sobrepor a TabBar flutuante
    gap: spacing.md,
  },
  dualDonutRow: {
    flexDirection: 'row',
    gap: spacing.gutterMobile,
    width: '100%',
  },
  weeklySection: {
    gap: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  recentMealSection: {
    marginTop: spacing.xs,
  },
});
