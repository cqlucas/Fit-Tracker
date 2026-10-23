import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useLanguage } from '@/context/LanguageContext';
import {
  type AnalyticsPeriod,
  type AnalyticsPeriodInput,
  type AnalyticsPeriodRange,
} from '@/repositories/logs.repository';
import { colors, radii, spacing } from '@/theme/tokens';
import { addDays, isValidDateKey, toDateKey } from '@/utils/date';

export interface AnalyticsPeriodSelectorProps {
  period: AnalyticsPeriodInput;
  onChangePeriod: (period: AnalyticsPeriodInput) => void;
}

function parseUserDate(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidDateKey(trimmed) ? trimmed : null;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    const dateKey = `${y}-${m}-${d}`;
    return isValidDateKey(dateKey) ? dateKey : null;
  }
  return null;
}

function toDisplayFormat(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

export function AnalyticsPeriodSelector({
  period,
  onChangePeriod,
}: AnalyticsPeriodSelectorProps) {
  const { t, isPt } = useLanguage();
  const todayKey = toDateKey();

  const isCustomMode = typeof period === 'object';

  // Controla se a gaveta de datas personalizadas está visível
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showCustomDrawer = isCustomMode || drawerOpen;

  // Overrides locais digitados ou alterados pelo usuário
  const [startOverride, setStartOverride] = useState<string | null>(null);
  const [endOverride, setEndOverride] = useState<string | null>(null);

  const startInput =
    startOverride !== null
      ? startOverride
      : isCustomMode
      ? toDisplayFormat(period.startDateKey)
      : toDisplayFormat(addDays(todayKey, -7));

  const endInput =
    endOverride !== null
      ? endOverride
      : isCustomMode
      ? toDisplayFormat(period.endDateKey)
      : toDisplayFormat(todayKey);

  const standardOptions: { id: AnalyticsPeriod; label: string }[] = [
    { id: '7d', label: t.analytics.period7d },
    { id: '14d', label: t.analytics.period14d },
    { id: '30d', label: t.analytics.period30d },
  ];

  const handleSelectStandard = (id: AnalyticsPeriod) => {
    setDrawerOpen(false);
    setStartOverride(null);
    setEndOverride(null);
    onChangePeriod(id);
  };

  const handleToggleCustom = () => {
    setDrawerOpen((prev) => !prev);
  };

  const handleApplyCustom = () => {
    const parsedStart = parseUserDate(startInput);
    const parsedEnd = parseUserDate(endInput);

    if (!parsedStart || !parsedEnd) {
      Alert.alert(
        isPt ? 'Data Inválida' : 'Invalid Date',
        t.analytics.invalidDate,
      );
      return;
    }

    let finalStart = parsedStart;
    let finalEnd = parsedEnd;
    if (finalStart > finalEnd) {
      finalStart = parsedEnd;
      finalEnd = parsedStart;
    }

    setStartOverride(toDisplayFormat(finalStart));
    setEndOverride(toDisplayFormat(finalEnd));

    const range: AnalyticsPeriodRange = {
      startDateKey: finalStart,
      endDateKey: finalEnd,
    };
    onChangePeriod(range);
  };

  const handleShiftDate = (type: 'start' | 'end', days: number) => {
    if (type === 'start') {
      const parsed = parseUserDate(startInput) ?? addDays(todayKey, -7);
      const shifted = addDays(parsed, days);
      setStartOverride(toDisplayFormat(shifted));
    } else {
      const parsed = parseUserDate(endInput) ?? todayKey;
      const shifted = addDays(parsed, days);
      setEndOverride(toDisplayFormat(shifted));
    }
  };

  const handleQuickPreset = (preset: 'today' | 'yesterday' | 'last7' | 'month') => {
    let start = todayKey;
    let end = todayKey;

    switch (preset) {
      case 'today':
        start = todayKey;
        end = todayKey;
        break;
      case 'yesterday':
        start = addDays(todayKey, -1);
        end = addDays(todayKey, -1);
        break;
      case 'last7':
        start = addDays(todayKey, -6);
        end = todayKey;
        break;
      case 'month': {
        const [y, m] = todayKey.split('-');
        start = `${y}-${m}-01`;
        end = todayKey;
        break;
      }
    }

    setStartOverride(toDisplayFormat(start));
    setEndOverride(toDisplayFormat(end));
    onChangePeriod({ startDateKey: start, endDateKey: end });
  };

  return (
    <View style={styles.wrapper}>
      {/* Segmented Control Superior */}
      <View style={styles.container}>
        {standardOptions.map((opt) => {
          const isSelected = !isCustomMode && period === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => handleSelectStandard(opt.id)}
              style={({ pressed }) => [
                styles.segment,
                isSelected && styles.segmentSelected,
                pressed && styles.segmentPressed,
              ]}>
              <Typography
                variant="labelSm"
                numberOfLines={1}
                color={isSelected ? colors.onSurface : colors.onSurfaceVariant}
                style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
                {opt.label}
              </Typography>
            </Pressable>
          );
        })}

        {/* 4ª Opção: Personalizado */}
        <Pressable
          onPress={handleToggleCustom}
          style={({ pressed }) => [
            styles.segment,
            styles.customSegment,
            (isCustomMode || showCustomDrawer) && styles.segmentSelected,
            pressed && styles.segmentPressed,
          ]}>
          <CalendarIcon
            size={12}
            color={isCustomMode || showCustomDrawer ? colors.primary : colors.onSurfaceVariant}
          />
          <Typography
            variant="labelSm"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            color={isCustomMode || showCustomDrawer ? colors.onSurface : colors.onSurfaceVariant}
            style={[
              styles.segmentText,
              styles.customSegmentText,
              (isCustomMode || showCustomDrawer) && styles.segmentTextSelected,
            ]}>
            {t.analytics.periodCustom}
          </Typography>
        </Pressable>
      </View>

      {/* Gaveta / Card Expansível de Intervalo Customizado */}
      {showCustomDrawer && (
        <View style={styles.customCard}>
          <View style={styles.customHeader}>
            <View style={styles.customTitleRow}>
              <Filter size={14} color={colors.primary} />
              <Typography variant="labelSm" color={colors.onSurface} style={styles.bold}>
                {t.analytics.customDateRange}
              </Typography>
            </View>

            {isCustomMode && (
              <View style={styles.activeCustomBadge}>
                <Check size={11} color={colors.primary} />
                <Typography variant="unitCaption" color={colors.primary} style={styles.bold}>
                  {toDisplayFormat((period as AnalyticsPeriodRange).startDateKey)} →{' '}
                  {toDisplayFormat((period as AnalyticsPeriodRange).endDateKey)}
                </Typography>
              </View>
            )}
          </View>

          {/* Atalhos Rápidos de Seleção */}
          <View style={styles.presetsRow}>
            <Pressable
              onPress={() => handleQuickPreset('today')}
              style={({ pressed }) => [styles.presetPill, pressed && styles.pressed]}>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                {isPt ? 'Hoje' : 'Today'}
              </Typography>
            </Pressable>
            <Pressable
              onPress={() => handleQuickPreset('yesterday')}
              style={({ pressed }) => [styles.presetPill, pressed && styles.pressed]}>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                {isPt ? 'Ontem' : 'Yesterday'}
              </Typography>
            </Pressable>
            <Pressable
              onPress={() => handleQuickPreset('last7')}
              style={({ pressed }) => [styles.presetPill, pressed && styles.pressed]}>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                {isPt ? '7 Dias' : '7 Days'}
              </Typography>
            </Pressable>
            <Pressable
              onPress={() => handleQuickPreset('month')}
              style={({ pressed }) => [styles.presetPill, pressed && styles.pressed]}>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant}>
                {isPt ? 'Este Mês' : 'This Month'}
              </Typography>
            </Pressable>
          </View>

          {/* Campos de Início e Fim com Steppers < e > */}
          <View style={styles.dateInputsRow}>
            {/* Data Início */}
            <View style={styles.dateInputCol}>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.label}>
                {t.analytics.startDate}
              </Typography>
              <View style={styles.inputWithSteppers}>
                <Pressable
                  onPress={() => handleShiftDate('start', -1)}
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}>
                  <ChevronLeft size={14} color={colors.onSurfaceVariant} />
                </Pressable>
                <TextInput
                  value={startInput}
                  onChangeText={setStartOverride}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.onSurfaceVariant + '80'}
                  style={styles.dateTextInput}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Pressable
                  onPress={() => handleShiftDate('start', 1)}
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}>
                  <ChevronRight size={14} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>
            </View>

            {/* Data Fim */}
            <View style={styles.dateInputCol}>
              <Typography variant="unitCaption" color={colors.onSurfaceVariant} style={styles.label}>
                {t.analytics.endDate}
              </Typography>
              <View style={styles.inputWithSteppers}>
                <Pressable
                  onPress={() => handleShiftDate('end', -1)}
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}>
                  <ChevronLeft size={14} color={colors.onSurfaceVariant} />
                </Pressable>
                <TextInput
                  value={endInput}
                  onChangeText={setEndOverride}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.onSurfaceVariant + '80'}
                  style={styles.dateTextInput}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Pressable
                  onPress={() => handleShiftDate('end', 1)}
                  style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}>
                  <ChevronRight size={14} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Botão de Aplicar Intervalo */}
          <Pressable
            onPress={handleApplyCustom}
            style={({ pressed }) => [styles.applyBtn, pressed && styles.pressed]}>
            <Check size={16} color={colors.surfaceLowest} strokeWidth={2.8} />
            <Typography variant="labelSm" color={colors.surfaceLowest} style={styles.applyBtnText}>
              {t.analytics.apply}
            </Typography>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.full,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  customSegment: {
    flex: 1.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 3,
  },
  segmentSelected: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentPressed: {
    opacity: 0.8,
  },
  segmentText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  customSegmentText: {
    fontSize: 11,
    letterSpacing: 0,
  },
  segmentTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  customCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    gap: spacing.sm,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bold: {
    fontWeight: '700',
  },
  activeCustomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.strokeSubtle,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateInputCol: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontWeight: '600',
  },
  inputWithSteppers: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.strokeCrisp,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTextInput: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 10,
    gap: 6,
    marginTop: 2,
  },
  applyBtnText: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
