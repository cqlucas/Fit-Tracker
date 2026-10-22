import { addDatabaseChangeListener } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import {
  goalsRepository,
  type Goals,
} from '@/repositories/goals.repository';
import {
  logsRepository,
  type DailySummary,
  type FoodLog,
  type WeeklyConsistency,
} from '@/repositories/logs.repository';
import { fromDateKey, toDateKey } from '@/utils/date';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday to Saturday

export interface FormattedWeeklyDay {
  dayLabel: string;
  dateKey: string;
  isHit: boolean;
  isToday: boolean;
  percent: number;
}

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [weeklyConsistency, setWeeklyConsistency] = useState<WeeklyConsistency | null>(null);
  const [recentMeal, setRecentMeal] = useState<FoodLog | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);

  const todayKey = toDateKey();

  const loadData = useCallback(async () => {
    try {
      const [summary, weekly, currentGoals, latestFoodList] = await Promise.all([
        logsRepository.getDailySummary(todayKey),
        logsRepository.getWeeklyConsistency(todayKey, 7),
        goalsRepository.get(),
        logsRepository.foodLogsByDateQuery(todayKey),
      ]);

      setDailySummary(summary);
      setWeeklyConsistency(weekly);
      setGoals(currentGoals);
      setRecentMeal(latestFoodList[0] ?? null);
    } catch (err) {
      if (__DEV__) console.warn('[useDashboardData] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [todayKey]);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [summary, weekly, currentGoals, latestFoodList] = await Promise.all([
          logsRepository.getDailySummary(todayKey),
          logsRepository.getWeeklyConsistency(todayKey, 7),
          goalsRepository.get(),
          logsRepository.foodLogsByDateQuery(todayKey),
        ]);

        if (isMounted) {
          setDailySummary(summary);
          setWeeklyConsistency(weekly);
          setGoals(currentGoals);
          setRecentMeal(latestFoodList[0] ?? null);
          setLoading(false);
        }
      } catch (err) {
        if (__DEV__) console.warn('[useDashboardData] Erro ao carregar dados:', err);
        if (isMounted) setLoading(false);
      }
    }

    void fetchData();

    // Reatividade automática: quando qualquer tabela for alterada localmente ou pelo sync
    const sub = addDatabaseChangeListener(() => {
      void fetchData();
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [todayKey]);

  // Formata os 7 dias da semana para os cards de consistência
  const formatDaysForMacro = (macro: 'protein' | 'water'): FormattedWeeklyDay[] => {
    if (!weeklyConsistency) return [];

    return weeklyConsistency.days.map((d) => {
      const date = fromDateKey(d.dateKey);
      const dayLabel = DAY_LABELS[date.getDay()];
      const isToday = d.dateKey === todayKey;

      if (macro === 'protein') {
        const goal = weeklyConsistency.goals.proteinGoal;
        const percent = goal > 0 ? Math.min(Math.round((d.proteinG / goal) * 100), 100) : 0;
        return {
          dayLabel,
          dateKey: d.dateKey,
          isHit: d.proteinGoalMet,
          isToday,
          percent,
        };
      } else {
        const goal = weeklyConsistency.goals.waterGoal;
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

  // Cálculo da média diária dos últimos 7 dias
  const weeklyAverage = {
    protein: weeklyConsistency
      ? Math.round(
          weeklyConsistency.days.reduce((acc, curr) => acc + curr.proteinG, 0) /
            (weeklyConsistency.days.length || 1),
        )
      : 0,
    water: weeklyConsistency
      ? (
          weeklyConsistency.days.reduce((acc, curr) => acc + curr.waterMl, 0) /
          (weeklyConsistency.days.length || 1) /
          1000
        ).toFixed(1)
      : '0.0',
  };

  return {
    loading,
    dailySummary,
    weeklyConsistency,
    recentMeal,
    goals,
    todayKey,
    weeklyAverage,
    formatDaysForMacro,
    refresh: loadData,
  };
}
