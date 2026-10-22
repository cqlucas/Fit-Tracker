import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Search,
  Utensils,
  X,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radii, shadows, spacing } from '@/theme/tokens';
import { addDays, fromDateKey, toDateKey } from '@/utils/date';

export interface HistoryFiltersBarProps {
  type: 'all' | 'water' | 'food';
  onSelectType: (type: 'all' | 'water' | 'food') => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  dateKey: string | null;
  onSelectDateKey: (dateKey: string | null) => void;
}

export function HistoryFiltersBar({
  type,
  onSelectType,
  searchQuery,
  onChangeSearchQuery,
  dateKey,
  onSelectDateKey,
}: HistoryFiltersBarProps) {
  const { t, isPt } = useLanguage();

  const todayKey = toDateKey();
  const yesterdayKey = addDays(todayKey, -1);

  const handlePrevDay = () => {
    const current = dateKey ?? todayKey;
    onSelectDateKey(addDays(current, -1));
  };

  const handleNextDay = () => {
    const current = dateKey ?? todayKey;
    onSelectDateKey(addDays(current, 1));
  };

  const formatNavigatorLabel = (key: string): string => {
    if (key === todayKey) return isPt ? 'Hoje' : 'Today';
    if (key === yesterdayKey) return isPt ? 'Ontem' : 'Yesterday';
    try {
      const d = fromDateKey(key);
      if (isPt) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      return key;
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Barra de Busca com Ícone e Limpar */}
      <View style={styles.searchBox}>
        <Search size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          placeholder={t.history.searchPlaceholder}
          placeholderTextColor={colors.onSurfaceVariant + '99'}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 ? (
          <Pressable
            onPress={() => onChangeSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}>
            <X size={16} color={colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>

      {/* 2. Filtro de Tipo (Segmented Control Táteis) */}
      <View style={styles.typeSelectorRow}>
        {/* Todos */}
        <Pressable
          onPress={() => onSelectType('all')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.typePill,
            type === 'all' && styles.typePillActiveAll,
            pressed && styles.pressed,
          ]}>
          <Typography
            variant="labelSm"
            color={type === 'all' ? colors.onSurface : colors.onSurfaceVariant}
            style={type === 'all' ? styles.typeTextActive : styles.typeText}>
            {t.history.allTypes}
          </Typography>
        </Pressable>

        {/* Comida */}
        <Pressable
          onPress={() => onSelectType('food')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.typePill,
            type === 'food' && styles.typePillActiveFood,
            pressed && styles.pressed,
          ]}>
          <Utensils
            size={14}
            color={type === 'food' ? colors.primary : colors.onSurfaceVariant}
          />
          <Typography
            variant="labelSm"
            color={type === 'food' ? colors.primary : colors.onSurfaceVariant}
            style={type === 'food' ? styles.typeTextActive : styles.typeText}>
            {t.history.foodOnly}
          </Typography>
        </Pressable>

        {/* Água */}
        <Pressable
          onPress={() => onSelectType('water')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.typePill,
            type === 'water' && styles.typePillActiveWater,
            pressed && styles.pressed,
          ]}>
          <Droplets
            size={14}
            color={type === 'water' ? colors.secondary : colors.onSurfaceVariant}
          />
          <Typography
            variant="labelSm"
            color={type === 'water' ? colors.secondary : colors.onSurfaceVariant}
            style={type === 'water' ? styles.typeTextActive : styles.typeText}>
            {t.history.waterOnly}
          </Typography>
        </Pressable>
      </View>

      {/* 3. Atalhos de Datas Horizontais */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateShortcutsRow}>
        {/* Todas as Datas */}
        <Pressable
          onPress={() => onSelectDateKey(null)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.datePill,
            dateKey === null && styles.datePillActive,
            pressed && styles.pressed,
          ]}>
          <CalendarIcon
            size={13}
            color={dateKey === null ? colors.primary : colors.onSurfaceVariant}
          />
          <Typography
            variant="labelSm"
            color={dateKey === null ? colors.primary : colors.onSurfaceVariant}
            style={dateKey === null ? styles.typeTextActive : styles.typeText}>
            {t.history.allDates}
          </Typography>
        </Pressable>

        {/* Hoje */}
        <Pressable
          onPress={() => onSelectDateKey(todayKey)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.datePill,
            dateKey === todayKey && styles.datePillActive,
            pressed && styles.pressed,
          ]}>
          <Typography
            variant="labelSm"
            color={dateKey === todayKey ? colors.primary : colors.onSurfaceVariant}
            style={dateKey === todayKey ? styles.typeTextActive : styles.typeText}>
            {t.history.today}
          </Typography>
        </Pressable>

        {/* Ontem */}
        <Pressable
          onPress={() => onSelectDateKey(yesterdayKey)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.datePill,
            dateKey === yesterdayKey && styles.datePillActive,
            pressed && styles.pressed,
          ]}>
          <Typography
            variant="labelSm"
            color={dateKey === yesterdayKey ? colors.primary : colors.onSurfaceVariant}
            style={dateKey === yesterdayKey ? styles.typeTextActive : styles.typeText}>
            {t.history.yesterday}
          </Typography>
        </Pressable>
      </ScrollView>

      {/* 4. Navegador de Dia Específico (quando uma data específica está ativa) */}
      {dateKey !== null ? (
        <View style={styles.dateNavigatorBar}>
          <Pressable
            onPress={handlePrevDay}
            accessibilityRole="button"
            accessibilityLabel="Dia anterior"
            style={({ pressed }) => [styles.navArrowBtn, pressed && styles.pressed]}>
            <ChevronLeft size={18} color={colors.primary} />
          </Pressable>

          <View style={styles.navDateDisplay}>
            <Typography variant="labelMd" color={colors.onSurface} style={styles.navDateText}>
              {formatNavigatorLabel(dateKey)}
            </Typography>
            <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
              {dateKey}
            </Typography>
          </View>

          <Pressable
            onPress={handleNextDay}
            accessibilityRole="button"
            accessibilityLabel="Próximo dia"
            style={({ pressed }) => [styles.navArrowBtn, pressed && styles.pressed]}>
            <ChevronRight size={18} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.sm + 2,
    height: 46,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 6,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    padding: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    gap: 4,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radii.full,
    gap: 6,
  },
  typePillActiveAll: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
  },
  typePillActiveFood: {
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  typePillActiveWater: {
    backgroundColor: `${colors.secondary}18`,
    borderWidth: 1,
    borderColor: `${colors.secondary}40`,
  },
  typeText: {
    fontWeight: '600',
  },
  typeTextActive: {
    fontWeight: '700',
  },
  dateShortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  datePillActive: {
    backgroundColor: `${colors.primary}18`,
    borderColor: `${colors.primary}40`,
  },
  dateNavigatorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDateDisplay: {
    alignItems: 'center',
  },
  navDateText: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
