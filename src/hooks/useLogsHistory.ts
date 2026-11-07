import { useFocusEffect } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { expoDb, getDatabaseScope } from '@/db/client';
import {
  logsRepository,
  type UnifiedLogItem,
} from '@/repositories/logs.repository';
import { addDays, toDateKey } from '@/utils/date';
export interface HistorySection {
  dateKey: string;
  title: string;
  data: UnifiedLogItem[];
  totalProteinG: number;
  totalCaloriesKcal: number;
  totalWaterMl: number;
  partial: boolean;
}
export function useLogsHistory() {
  const { isPt } = useLanguage();
  const [type, setType] = useState<'all' | 'water' | 'food'>('all'),
    [searchQuery, setSearchQuery] = useState(''),
    [q, setQ] = useState(''),
    [dateKey, setDateKey] = useState<string | null>(null),
    [items, setItems] = useState<UnifiedLogItem[]>([]),
    [more, setMore] = useState(false),
    [hasMore, setHasMore] = useState(false),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const loadingMore = useRef(false),
    mounted = useRef(true),
    generation = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => setQ(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const fetchLogs = useCallback(async () => {
    const current = ++generation.current,
      scope = getDatabaseScope();
    try {
      const data = await logsRepository.getLogsHistory({
        type,
        searchQuery: q,
        dateKey,
      });
      if (
        mounted.current &&
        current === generation.current &&
        scope === getDatabaseScope()
      ) {
        setItems(data);
        setHasMore(data.length === 50);
        setError('');
      }
    } catch (e) {
      if (mounted.current && current === generation.current)
        setError(e instanceof Error ? e.message : 'Error');
    } finally {
      if (mounted.current && current === generation.current) setLoading(false);
    }
  }, [type, q, dateKey]);
  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = addDatabaseChangeListener(({ tableName, databaseFilePath }) => {
      if (
        databaseFilePath === expoDb.databasePath &&
        ['food_logs', 'water_logs'].includes(tableName)
      ) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void fetchLogs();
        }, 80);
      }
    });
    return () => {
      mounted.current = false;
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [fetchLogs]);
  useFocusEffect(
    useCallback(() => {
      void fetchLogs();
      return () => {
        generation.current++;
      };
    }, [fetchLogs]),
  );
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore.current || !items.length) return;
    loadingMore.current = true;
    setMore(true);
    const request = generation.current;
    const last = items[items.length - 1];
    try {
      const page = await logsRepository.getLogsHistory({
        type,
        searchQuery: q,
        dateKey,
        cursor: { occurredAt: last.occurredAt, id: last.id, type: last.type },
      });
      if (mounted.current && request === generation.current) {
        setItems((current) => [
          ...current,
          ...page.filter(
            (p) => !current.some((c) => c.id === p.id && c.type === p.type),
          ),
        ]);
        setHasMore(page.length === 50);
        setError('');
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Error');
    } finally {
      loadingMore.current = false;
      if (mounted.current) setMore(false);
    }
  }, [hasMore, items, type, q, dateKey]);
  const deleteItem = async (id: string, itemType: 'food' | 'water') => {
    await logsRepository.deleteLog(id, itemType);
    setItems((current) => current.filter((i) => i.id !== id));
  };
  const groups = new Map<string, UnifiedLogItem[]>();
  for (const item of items) {
    const list = groups.get(item.dateKey) ?? [];
    list.push(item);
    groups.set(item.dateKey, list);
  }
  const sections: HistorySection[] = [...groups].map(([day, list]) => ({
    dateKey: day,
    title:
      day === toDateKey()
        ? isPt
          ? 'Hoje'
          : 'Today'
        : day === addDays(toDateKey(), -1)
          ? isPt
            ? 'Ontem'
            : 'Yesterday'
          : day,
    data: list,
    totalProteinG: list.reduce(
      (n, i) => n + (i.type === 'food' ? (i.proteinG ?? 0) : 0),
      0,
    ),
    totalCaloriesKcal: list.reduce(
      (n, i) => n + (i.type === 'food' ? (i.caloriesKcal ?? 0) : 0),
      0,
    ),
    totalWaterMl: list.reduce(
      (n, i) => n + (i.type === 'water' ? i.amountMl : 0),
      0,
    ),
    partial: list.some(
      (i) =>
        i.type === 'food' && (i.proteinG === null || i.caloriesKcal === null),
    ),
  }));
  return {
    items,
    sections,
    isLoading: loading,
    isRefreshing: loading,
    type,
    setType,
    searchQuery,
    setSearchQuery,
    dateKey,
    setDateKey,
    hasActiveFilters:
      type !== 'all' || !!searchQuery.trim() || dateKey !== null,
    clearFilters: () => {
      setType('all');
      setSearchQuery('');
      setDateKey(null);
    },
    deleteItem,
    refresh: fetchLogs,
    loadMore,
    loadingMore: more,
    hasMore,
    error,
  };
}
