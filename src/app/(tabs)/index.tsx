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
import { Typography } from '@/components/ui/Typography';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const {
    loading,
    dailySummary,
    weeklyConsistency,
    recentMeal,
    goals,
    weeklyAverage,
    formatDaysForMacro,
    refresh,
  } = useDashboardData();

  // Data formatada para o cabeçalho (ex: "Today, Oct 24" e "Thu")
  const { dateTitle, dayOfWeek } = useMemo(() => {
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const day = now.getDate();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
    return {
      dateTitle: `Today, ${month} ${day}`,
      dayOfWeek: weekday,
    };
  }, []);

  // Valores padrão / do banco para fallback imediato
  const proteinConsumed = dailySummary?.protein.consumed ?? 118;
  const proteinGoal = goals?.proteinGoal ?? dailySummary?.protein.goal ?? 160;

  const waterConsumed = dailySummary?.water.consumed ?? 2250;
  const waterGoal = goals?.waterGoal ?? dailySummary?.water.goal ?? 3000;

  const caloriesConsumed = dailySummary?.calories.consumed ?? 1820;
  const caloriesGoal = goals?.caloriesGoal ?? dailySummary?.calories.goal ?? 2200;

  const proteinDays = formatDaysForMacro('protein');
  const waterDays = formatDaysForMacro('water');

  const proteinHitCount = weeklyConsistency?.proteinDaysMet ?? 5;
  const waterHitCount = weeklyConsistency?.waterDaysMet ?? 6;

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
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        {/* Cabeçalho da Home com data e atalhos */}
        <HomeHeader
          dateTitle={dateTitle}
          dayOfWeek={dayOfWeek}
          streakDays={18}
          onPressTune={handleSettings}
          onPressSettings={handleSettings}
          onPressNotifications={() => {}}
        />

        {/* Hero Section: Dual Macro Donut Rings (Proteína & Água) */}
        <View style={styles.dualDonutRow}>
          <DonutChartCard
            label="Protein"
            current={proteinConsumed}
            goal={proteinGoal}
            unit="g"
            color={colors.primary}
            glow="primary"
          />
          <DonutChartCard
            label="Hydration"
            current={waterConsumed}
            goal={waterGoal}
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

        {/* Progresso de Calorias e Déficit Energético */}
        <CaloriesProgressCard
          consumed={caloriesConsumed}
          goal={caloriesGoal}
        />

        {/* Botão de Ação Rápida de Registro */}
        <QuickLogCTA onPress={handleQuickLog} />

        {/* Seção Inferior: Consistência Semanal */}
        <View style={styles.weeklySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Award size={18} color={colors.primary} />
              <Typography variant="labelMd" style={styles.sectionTitle}>
                Weekly Consistency
              </Typography>
            </View>
            <Badge label="Last 7 Days" variant="subtle" />
          </View>

          {/* Consistência de Proteína */}
          <WeeklyConsistencyCard
            title="Protein Target"
            subtitle={`Min daily threshold ${proteinGoal}g`}
            hitCount={proteinHitCount}
            totalDays={7}
            averageText={`Avg. ${weeklyAverage.protein || 152}g/d`}
            icon={<Dumbbell size={16} color={colors.primary} strokeWidth={2.5} />}
            accentColor={colors.primary}
            containerColor={colors.primaryContainer}
            days={proteinDays.length > 0 ? proteinDays : defaultMockDays('protein')}
          />

          {/* Consistência de Hidratação */}
          <WeeklyConsistencyCard
            title="Hydration Streak"
            subtitle="Active streak"
            hitCount={waterHitCount}
            totalDays={7}
            averageText={`Avg. ${weeklyAverage.water !== '0.0' ? weeklyAverage.water : '3.1'}L/d`}
            icon={<Droplets size={16} color={colors.secondary} strokeWidth={2.5} />}
            accentColor={colors.secondary}
            containerColor={colors.secondaryContainer}
            days={waterDays.length > 0 ? waterDays : defaultMockDays('water')}
          />
        </View>

        {/* Snapshot da Última Refeição Registrada */}
        <View style={styles.recentMealSection}>
          <RecentMealCard
            name={recentMeal ? recentMeal.name : 'Lunch • Post-Workout Bowl'}
            proteinG={recentMeal ? recentMeal.proteinG : 48}
            caloriesKcal={recentMeal ? recentMeal.caloriesKcal : 620}
            timeString={recentMeal ? 'Recent Log' : 'Logged 1:15 PM'}
            onPress={handleQuickLog}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Mock fallback caso ainda não haja dados de 7 dias no banco
function defaultMockDays(type: 'protein' | 'water') {
  return [
    { dayLabel: 'M', dateKey: '1', isHit: true, isToday: false, percent: 100 },
    { dayLabel: 'T', dateKey: '2', isHit: true, isToday: false, percent: 100 },
    { dayLabel: 'W', dateKey: '3', isHit: true, isToday: false, percent: 100 },
    {
      dayLabel: 'T',
      dateKey: '4',
      isHit: type === 'water',
      isToday: true,
      percent: type === 'protein' ? 74 : 100,
    },
    { dayLabel: 'F', dateKey: '5', isHit: true, isToday: false, percent: 100 },
    { dayLabel: 'S', dateKey: '6', isHit: true, isToday: false, percent: 100 },
    { dayLabel: 'S', dateKey: '7', isHit: false, isToday: false, percent: 0 },
  ];
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
