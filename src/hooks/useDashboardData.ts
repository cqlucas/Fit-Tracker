import { useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  DEFAULT_GOALS,
  goalsRepository,
} from '@/repositories/goals.repository';
import { logsRepository } from '@/repositories/logs.repository';
import { fromDateKey } from '@/utils/date';
import { useLocalData, useTodayKey } from './useLocalData';
export interface FormattedWeeklyDay {
  dayLabel: string;
  dateKey: string;
  isHit: boolean;
  isToday: boolean;
  percent: number;
}
export interface WeeklyDayStatus {
  dateKey: string;
  dayLabel: string;
  proteinHit: boolean;
  waterHit: boolean;
  proteinPercent: number;
  waterPercent: number;
  isToday: boolean;
  proteinG: number;
  waterMl: number;
  caloriesKcal: number;
}
export interface WeeklyStats {
  proteinDaysHit: number;
  waterDaysHit: number;
  totalDays: number;
  days: WeeklyDayStatus[];
}
export interface TodayTotals {
  proteinConsumed: number;
  waterConsumed: number;
  caloriesConsumed: number;
  proteinRemaining: number;
  waterRemaining: number;
  caloriesRemaining: number;
}
export function useDashboardData() {
  const { isPt } = useLanguage(),
    todayKey = useTodayKey();
  const { data, loading, refresh, error } = useLocalData(async () => {
    const [
      dailySummary,
      weeklyConsistency,
      goals,
      recentMeal,
      currentStreak,
      analytics,
    ] = await Promise.all([
      logsRepository.getDailySummary(todayKey),
      logsRepository.getWeeklyConsistency(todayKey),
      goalsRepository.get(),
      logsRepository.recentMeal(todayKey),
      logsRepository.calculateCurrentStreak(todayKey),
      logsRepository.getAnalyticsData('7d'),
    ]);
    return {
      dailySummary,
      weeklyConsistency,
      goals,
      recentMeal,
      currentStreak,
      analytics,
    };
  }, ['food_logs', 'water_logs', 'goal_plans', 'daily_checkins', 'user_goals']);
  useEffect(() => {
    void refresh();
  }, [todayKey, refresh]);
  const goals = data?.goals ?? DEFAULT_GOALS,
    summary = data?.dailySummary;
  const days = (data?.weeklyConsistency.days ?? []).map((d) => ({
    dateKey: d.dateKey,
    dayLabel: fromDateKey(d.dateKey).toLocaleDateString(
      isPt ? 'pt-BR' : 'en-US',
      { weekday: 'narrow' },
    ),
    proteinHit: d.proteinGoalMet,
    waterHit: d.waterGoalMet,
    proteinPercent: d.goals
      ? Math.min(100, (d.proteinG / d.goals.proteinGoal) * 100)
      : 0,
    waterPercent: d.goals
      ? Math.min(100, (d.waterMl / d.goals.waterGoal) * 100)
      : 0,
    isToday: d.dateKey === todayKey,
    proteinG: d.proteinG,
    waterMl: d.waterMl,
    caloriesKcal: d.caloriesKcal,
  }));
  const todayTotals: TodayTotals = {
    proteinConsumed: summary?.protein.consumed ?? 0,
    waterConsumed: summary?.water.consumed ?? 0,
    caloriesConsumed: summary?.calories.consumed ?? 0,
    proteinRemaining: summary?.protein.remaining ?? 0,
    waterRemaining: summary?.water.remaining ?? 0,
    caloriesRemaining: summary?.calories.remaining ?? 0,
  };
  const formatDaysForMacro = (
    macro: 'protein' | 'water',
  ): FormattedWeeklyDay[] =>
    days.map((d) => ({
      dayLabel: d.dayLabel,
      dateKey: d.dateKey,
      isHit: macro === 'protein' ? d.proteinHit : d.waterHit,
      isToday: d.isToday,
      percent: macro === 'protein' ? d.proteinPercent : d.waterPercent,
    }));
  return {
    isLoading: loading,
    loading,
    goals,
    todayTotals,
    weeklyStats: {
      proteinDaysHit: data?.weeklyConsistency.proteinDaysMet ?? 0,
      waterDaysHit: data?.weeklyConsistency.waterDaysMet ?? 0,
      totalDays: 7,
      days,
    },
    dailySummary: summary ?? null,
    weeklyConsistency: data?.weeklyConsistency ?? null,
    recentMeal: data?.recentMeal ?? null,
    todayKey,
    weeklyAverage: {
      protein: data?.analytics.kpis.avgProteinG ?? null,
      water:
        data?.analytics.kpis.avgWaterMl == null
          ? null
          : (data.analytics.kpis.avgWaterMl / 1000).toLocaleString(
              isPt ? 'pt-BR' : 'en-US',
              { maximumFractionDigits: 1 },
            ),
    },
    formatDaysForMacro,
    currentStreak: data?.currentStreak ?? 0,
    refresh,
    error,
  };
}
