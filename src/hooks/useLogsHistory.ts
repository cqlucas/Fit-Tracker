import { useFocusEffect } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import {
  logsRepository,
  type HistoryFilters,
  type UnifiedLogItem,
} from '@/repositories/logs.repository';
import { addDays, fromDateKey, toDateKey } from '@/utils/date';

export interface HistorySection {
  dateKey: string;
  title: string;
  data: UnifiedLogItem[];
  totalProteinG: number;
  totalCaloriesKcal: number;
  totalWaterMl: number;
}

export function useLogsHistory() {
  const { isPt } = useLanguage();

  const [type, setType] = useState<'all' | 'water' | 'food'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dateKey, setDateKey] = useState<string | null>(null);

  const [items, setItems] = useState<UnifiedLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isMountedRef = useRef(true);

  // Debounce de 300ms na busca textual
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLogs = useCallback(
    async (isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const filters: HistoryFilters = {
          type,
          searchQuery: debouncedQuery,
          dateKey,
        };

        const result = await logsRepository.getLogsHistory(filters);
        if (isMountedRef.current) {
          setItems(result);
        }
      } catch (err) {
        console.error('[useLogsHistory] Erro ao buscar histórico:', err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [type, debouncedQuery, dateKey]
  );

  // Listener para mudanças no SQLite local
  useEffect(() => {
    isMountedRef.current = true;

    const sub = addDatabaseChangeListener(({ tableName }) => {
      if (tableName === 'food_logs' || tableName === 'water_logs') {
        void fetchLogs();
      }
    });

    return () => {
      isMountedRef.current = false;
      sub.remove();
    };
  }, [fetchLogs]);

  // Recarrega sempre que a tela ganha foco (ao trocar de aba ou voltar de modals)
  useFocusEffect(
    useCallback(() => {
      void fetchLogs();
    }, [fetchLogs])
  );

  const clearFilters = useCallback(() => {
    setType('all');
    setSearchQuery('');
    setDateKey(null);
  }, []);

  const deleteItem = useCallback(
    async (id: string, itemType: 'water' | 'food') => {
      try {
        await logsRepository.deleteLog(id, itemType);
        // Atualização otimista imediata na UI enquanto o listener do sqlite processa
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error('[useLogsHistory] Erro ao excluir log:', err);
        throw err;
      }
    },
    []
  );

  // Formata o título amigável da seção de acordo com a data
  const formatSectionTitle = useCallback(
    (key: string): string => {
      const today = toDateKey();
      const yesterday = addDays(today, -1);

      if (key === today) {
        return isPt ? 'Hoje' : 'Today';
      }
      if (key === yesterday) {
        return isPt ? 'Ontem' : 'Yesterday';
      }

      try {
        const date = fromDateKey(key);
        if (isPt) {
          const day = date.getDate();
          const months = [
            'Jan',
            'Fev',
            'Mar',
            'Abr',
            'Mai',
            'Jun',
            'Jul',
            'Ago',
            'Set',
            'Out',
            'Nov',
            'Dez',
          ];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day} de ${month}, ${year}`;
        } else {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
      } catch {
        return key;
      }
    },
    [isPt]
  );

  // Agrupa os itens em seções por data com totais calculados
  const sections: HistorySection[] = [];
  const map = new Map<string, UnifiedLogItem[]>();

  for (const item of items) {
    const list = map.get(item.dateKey) ?? [];
    list.push(item);
    map.set(item.dateKey, list);
  }

  for (const [key, groupItems] of map.entries()) {
    let totalProteinG = 0;
    let totalCaloriesKcal = 0;
    let totalWaterMl = 0;

    for (const item of groupItems) {
      if (item.type === 'food') {
        totalProteinG += item.proteinG;
        totalCaloriesKcal += item.caloriesKcal;
      } else {
        totalWaterMl += item.amountMl;
      }
    }

    sections.push({
      dateKey: key,
      title: formatSectionTitle(key),
      data: groupItems,
      totalProteinG: Math.round(totalProteinG * 10) / 10,
      totalCaloriesKcal: Math.round(totalCaloriesKcal),
      totalWaterMl,
    });
  }

  const hasActiveFilters =
    type !== 'all' || searchQuery.trim().length > 0 || dateKey !== null;

  return {
    items,
    sections,
    isLoading,
    isRefreshing,
    type,
    setType,
    searchQuery,
    setSearchQuery,
    dateKey,
    setDateKey,
    hasActiveFilters,
    clearFilters,
    deleteItem,
    refresh: () => fetchLogs(true),
  };
}
