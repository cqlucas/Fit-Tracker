import { useFocusEffect } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  logsRepository,
  type AnalyticsData,
  type AnalyticsPeriodInput,
} from '@/repositories/logs.repository';

export interface UseAnalyticsDataResult {
  period: AnalyticsPeriodInput;
  setPeriod: (period: AnalyticsPeriodInput) => void;
  data: AnalyticsData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

export function useAnalyticsData(initialPeriod: AnalyticsPeriodInput = '7d'): UseAnalyticsDataResult {
  const [period, setPeriod] = useState<AnalyticsPeriodInput>(initialPeriod);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isMountedRef = useRef(true);

  const periodKey =
    typeof period === 'string'
      ? period
      : `${period.startDateKey}_${period.endDateKey}`;

  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      }
      try {
        const result = await logsRepository.getAnalyticsData(period);
        if (isMountedRef.current) {
          setData(result);
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[useAnalyticsData] Erro ao carregar métricas:', err);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodKey],
  );

  // Escuta mutações no SQLite local (novos logs, updates, exclusões ou metas alteradas)
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

  // Recarrega sempre que o período muda ou a aba ganha foco
  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData]),
  );

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    period,
    setPeriod,
    data,
    isLoading,
    isRefreshing,
    refresh,
  };
}
