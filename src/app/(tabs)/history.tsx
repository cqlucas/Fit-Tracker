import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryEmptyState } from '@/components/history/HistoryEmptyState';
import { HistoryFiltersBar } from '@/components/history/HistoryFiltersBar';
import { HistoryLogItemCard } from '@/components/history/HistoryLogItemCard';
import { HistorySectionHeader } from '@/components/history/HistorySectionHeader';
import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { useLogsHistory } from '@/hooks/useLogsHistory';
import { UnifiedLogItem } from '@/repositories/logs.repository';
import { colors, radii, spacing } from '@/theme/tokens';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const {
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
    refresh,
  } = useLogsHistory();

  const handleEdit = (item: UnifiedLogItem) => {
    if (item.type === 'water') {
      router.push({ pathname: '/add-water', params: { id: item.id } });
    } else {
      router.push({ pathname: '/add-food', params: { id: item.id } });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Fixo Superior */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Typography variant="unitCaption" color={colors.primary} style={styles.tagline}>
            {t.history.headerSubtitle}
          </Typography>
          <Typography variant="headlineSm" style={styles.title}>
            {t.history.headerTitle}
          </Typography>
        </View>

        {items.length > 0 && (
          <View style={styles.countBadge}>
            <Typography variant="unitCaption" color={colors.primary} style={styles.countText}>
              {t.history.totalEntries(items.length)}
            </Typography>
          </View>
        )}
      </View>

      {/* 2. Barra de Filtros (Busca, Tipo, Datas) */}
      <HistoryFiltersBar
        type={type}
        onSelectType={setType}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        dateKey={dateKey}
        onSelectDateKey={setDateKey}
      />

      {/* 3. Lista Agrupada por Data com SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryLogItemCard
            item={item}
            onDelete={deleteItem}
            onEdit={handleEdit}
          />
        )}
        renderSectionHeader={({ section }) => (
          <HistorySectionHeader
            title={section.title}
            totalProteinG={section.totalProteinG}
            totalCaloriesKcal={section.totalCaloriesKcal}
            totalWaterMl={section.totalWaterMl}
          />
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <HistoryEmptyState
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitles: {
    gap: 2,
  },
  tagline: {
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  title: {
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
  },
  countText: {
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120, // Espaço para a floating TabBar inferior
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
