import { useFocusEffect } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import {
  goalsRepository,
  type Goals,
  DEFAULT_GOALS,
} from '@/repositories/goals.repository';
import {
  logsRepository,
  type DailySummary,
  type FoodLog,
  type WeeklyConsistency,
} from '@/repositories/logs.repository';
import { fromDateKey, toDateKey } from '@/utils/date';

const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday to Saturday
const DAY_LABELS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Domingo a Sábado

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
  const { isPt: contextIsPt } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [weeklyConsistency, setWeeklyConsistency] = useState<WeeklyConsistency | null>(null);
  const [recentMeal, setRecentMeal] = useState<FoodLog | null>(null);
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);

  const isMountedRef = useRef(true);
  const todayKey = toDateKey();

  const fetchData = useCallback(async () => {
    try {
      const [summary, weekly, currentGoals, latestFoodList] = await Promise.all([
        logsRepository.getDailySummary(todayKey),
        logsRepository.getWeeklyConsistency(todayKey, 7),
        goalsRepository.get(),
        logsRepository.foodLogsByDateQuery(todayKey),
      ]);

      if (isMountedRef.current) {
        setDailySummary(summary);
        setWeeklyConsistency(weekly);
        setGoals(currentGoals);
        setRecentMeal(latestFoodList[0] ?? null);
      }
    } catch (err) {
      if (__DEV__) console.warn('[useDashboardData] Erro ao carregar dados:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [todayKey]);

  // Escuta mutações no SQLite local (inserções, atualizações de metas, sync)
  useEffect(() => {
    isMountedRef.current = true;

    const sub = addDatabaseChangeListener(() => {
      void fetchData();
    });

    return () => {
      isMountedRef.current = false;
      sub.remove();
    };
  }, [fetchData]);

  // Atualização reativa imediata sempre que a tela ganha foco (ex: voltando de Settings)
  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData]),
  );

  // Totais de hoje com limites seguros
  const proteinConsumed = dailySummary?.protein.consumed ?? 0;
  const waterConsumed = dailySummary?.water.consumed ?? 0;
  const caloriesConsumed = dailySummary?.calories.consumed ?? 0;

  const proteinGoal = goals.proteinGoal;
  const waterGoal = goals.waterGoal;
  const caloriesGoal = goals.caloriesGoal;

  const todayTotals: TodayTotals = {
    proteinConsumed,
    waterConsumed,
    caloriesConsumed,
    proteinRemaining: Math.max(0, proteinGoal - proteinConsumed),
    waterRemaining: Math.max(0, waterGoal - waterConsumed),
    caloriesRemaining: Math.max(0, caloriesGoal - caloriesConsumed),
  };

  // Estatísticas semanais estruturadas
  const isPt = contextIsPt;
  const dayLabels = isPt ? DAY_LABELS_PT : DAY_LABELS_EN;

  const weeklyStats: WeeklyStats = {
    proteinDaysHit: weeklyConsistency?.proteinDaysMet ?? 0,
    waterDaysHit: weeklyConsistency?.waterDaysMet ?? 0,
    totalDays: weeklyConsistency?.totalDays ?? 7,
    days: (weeklyConsistency?.days ?? []).map((d) => {
      const date = fromDateKey(d.dateKey);
      const dayLabel = dayLabels[date.getDay()];
      const isToday = d.dateKey === todayKey;

      const proteinPercent = proteinGoal > 0
        ? Math.min(Math.round((d.proteinG / proteinGoal) * 100), 100)
        : 0;
      const waterPercent = waterGoal > 0
        ? Math.min(Math.round((d.waterMl / waterGoal) * 100), 100)
        : 0;

      return {
        dateKey: d.dateKey,
        dayLabel,
        proteinHit: d.proteinGoalMet,
        waterHit: d.waterGoalMet,
        proteinPercent,
        waterPercent,
        isToday,
        proteinG: d.proteinG,
        waterMl: d.waterMl,
        caloriesKcal: d.caloriesKcal,
      };
    }),
  };

  // Helper para os cards de consistência da UI existente
  const formatDaysForMacro = (macro: 'protein' | 'water'): FormattedWeeklyDay[] => {
    if (!weeklyConsistency) return [];

    return weeklyConsistency.days.map((d) => {
      const date = fromDateKey(d.dateKey);
      const dayLabel = dayLabels[date.getDay()];
      const isToday = d.dateKey === todayKey;

      if (macro === 'protein') {
        const goal = proteinGoal;
        const percent = goal > 0 ? Math.min(Math.round((d.proteinG / goal) * 100), 100) : 0;
        return {
          dayLabel,
          dateKey: d.dateKey,
          isHit: d.proteinGoalMet,
          isToday,
          percent,
        };
      } else {
        const goal = waterGoal;
        const percent = goal > 0 ? Math.min(Math.round((d.waterMl / goal) * 100), 100) : 0;
        return {
          dayLabel,
          dateKey: d.dateKey,
          isHit: d.waterGoalMet,
          isToday,
          percent,
        };
      }
    });
  };

  // Média semanal
  const weeklyAverage = {
    protein: weeklyConsistency && weeklyConsistency.days.length > 0
      ? Math.round(
          weeklyConsistency.days.reduce((acc, curr) => acc + curr.proteinG, 0) /
            weeklyConsistency.days.length,
        )
      : 0,
    water: weeklyConsistency && weeklyConsistency.days.length > 0
      ? (
          weeklyConsistency.days.reduce((acc, curr) => acc + curr.waterMl, 0) /
          weeklyConsistency.days.length /
          1000
        ).toFixed(1)
      : '0.0',
  };

  return {
    isLoading,
    loading: isLoading, // alias retrocompatível
    goals,
    todayTotals,
    weeklyStats,
    dailySummary,
    weeklyConsistency,
    recentMeal,
    todayKey,
    weeklyAverage,
    formatDaysForMacro,
    refresh: fetchData,
  };
}
