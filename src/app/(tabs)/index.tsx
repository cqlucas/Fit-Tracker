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
import { useDashboardData } from '@/hooks/useDashboardData';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
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

  const isPt = goals.language === 'pt';

  // Data formatada para o cabeçalho baseada no idioma selecionado
  const { dateTitle, dayOfWeek } = useMemo(() => {
    const now = new Date();
    const locale = isPt ? 'pt-BR' : 'en-US';
    const month = now.toLocaleDateString(locale, { month: 'short' });
    const day = now.getDate();
    const weekday = now.toLocaleDateString(locale, { weekday: 'short' });
    const prefix = isPt ? 'Hoje' : 'Today';

    return {
      dateTitle: `${prefix}, ${month} ${day}`,
      dayOfWeek: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    };
  }, [isPt]);

  const proteinDays = formatDaysForMacro('protein');
  const waterDays = formatDaysForMacro('water');

  const handleQuickLog = () => {
    router.push('/(tabs)/quick-log');
  };

  const handleSettings = () => {
    router.push('/(tabs)/settings');
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
          onPressTune={handleSettings}
          onPressSettings={handleSettings}
          onPressNotifications={() => {}}
        />

        {/* Hero Section: Dual Macro Donut Rings (Proteína & Água) */}
        {isLoading ? (
          <SkeletonDonutRow />
        ) : (
          <View style={styles.dualDonutRow}>
            <DonutChartCard
              label={isPt ? 'Proteína' : 'Protein'}
              current={todayTotals.proteinConsumed}
              goal={goals.proteinGoal}
              unit="g"
              color={colors.primary}
              glow="primary"
            />
            <DonutChartCard
              label={isPt ? 'Hidratação' : 'Hydration'}
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
                {isPt ? 'Consistência Semanal' : 'Weekly Consistency'}
              </Typography>
            </View>
            <Badge label={isPt ? 'Últimos 7 Dias' : 'Last 7 Days'} variant="subtle" />
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
                title={isPt ? 'Meta de Proteína' : 'Protein Target'}
                subtitle={
                  isPt
                    ? `Mínimo diário de ${goals.proteinGoal}g`
                    : `Min daily threshold ${goals.proteinGoal}g`
                }
                hitCount={weeklyStats.proteinDaysHit}
                totalDays={weeklyStats.totalDays}
                averageText={
                  isPt
                    ? `Média: ${weeklyAverage.protein || 0}g/d`
                    : `Avg. ${weeklyAverage.protein || 0}g/d`
                }
                icon={<Dumbbell size={16} color={colors.primary} strokeWidth={2.5} />}
                accentColor={colors.primary}
                containerColor={colors.primaryContainer}
                days={proteinDays}
              />

              {/* Consistência de Hidratação */}
              <WeeklyConsistencyCard
                title={isPt ? 'Sequência de Água' : 'Hydration Streak'}
                subtitle={isPt ? 'Consistência diária' : 'Active streak'}
                hitCount={weeklyStats.waterDaysHit}
                totalDays={weeklyStats.totalDays}
                averageText={
                  isPt
                    ? `Média: ${weeklyAverage.water !== '0.0' ? weeklyAverage.water : '0.0'}L/d`
                    : `Avg. ${weeklyAverage.water !== '0.0' ? weeklyAverage.water : '0.0'}L/d`
                }
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
              timeString={isPt ? 'Registro recente' : 'Recent Log'}
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
