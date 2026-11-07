import { useFocusEffect } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { expoDb, getDatabaseScope } from '@/db/client';
import { toDateKey } from '@/utils/date';
const TABLES = [
  'food_logs',
  'water_logs',
  'goal_plans',
  'daily_checkins',
  'weight_logs',
  'supplement_logs',
  'training_days',
  'food_templates',
  'user_goals',
  'local_preferences',
];
export function useTodayKey() {
  const [day, setDay] = useState(toDateKey);
  useEffect(() => {
    const update = () => setDay(toDateKey());
    const interval = setInterval(update, 15000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') update();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);
  return day;
}
export function useLocalData<T>(
  load: () => Promise<T>,
  tables: readonly string[] = TABLES,
) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const generation = useRef(0),
    mounted = useRef(true);
  const loadRef = useRef(load);
  useLayoutEffect(() => {
    loadRef.current = load;
  });
  const refresh = useCallback(async () => {
    const request = ++generation.current,
      scope = getDatabaseScope();
    try {
      const next = await loadRef.current();
      if (
        mounted.current &&
        request === generation.current &&
        scope === getDatabaseScope()
      ) {
        setData(next);
        setError(null);
      }
    } catch (e) {
      if (mounted.current && request === generation.current)
        setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      if (mounted.current && request === generation.current) setLoading(false);
    }
  }, []);
  const tableKey = tables.join(',');
  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = addDatabaseChangeListener(({ tableName, databaseFilePath }) => {
      if (
        databaseFilePath === expoDb.databasePath &&
        tableKey.split(',').includes(tableName)
      ) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void refresh();
        }, 80);
      }
    });
    return () => {
      mounted.current = false;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [refresh, tableKey]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        generation.current++;
      };
    }, [refresh]),
  );
  return { data, loading, error, refresh };
}
