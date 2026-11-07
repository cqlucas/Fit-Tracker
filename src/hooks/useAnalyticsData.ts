import { useEffect, useState } from 'react';
import {
  logsRepository,
  type AnalyticsPeriodInput,
} from '@/repositories/logs.repository';
import { useLocalData } from './useLocalData';
export function useAnalyticsData(initial: AnalyticsPeriodInput = '7d') {
  const [period, setPeriod] = useState<AnalyticsPeriodInput>(initial);
  const { data, loading, error, refresh } = useLocalData(() =>
    logsRepository.getAnalyticsData(period),
  );
  const key =
    typeof period === 'string'
      ? period
      : `${period.startDateKey}:${period.endDateKey}`;
  useEffect(() => {
    void refresh();
  }, [key, refresh]);
  return {
    period,
    setPeriod,
    data,
    isLoading: loading,
    isRefreshing: loading,
    error,
    refresh,
  };
}
