import { useFocusEffect } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  logsRepository,
  type AnalyticsData,
  type AnalyticsPeriod,
} from '@/repositories/logs.repository';

export interface UseAnalyticsDataResult {
  period: AnalyticsPeriod;
  setPeriod: (period: AnalyticsPeriod) => void;
  data: AnalyticsData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

export function useAnalyticsData(initialPeriod: AnalyticsPeriod = '7d'): UseAnalyticsDataResult {
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isMountedRef = useRef(true);

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
    [period],
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
