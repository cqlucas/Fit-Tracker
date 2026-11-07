import React, { useState } from 'react';
import { View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { NUTRIENTS, type Nutrient } from '@/domain/nutrition';
import { v2Translations } from '@/i18n/translations';
import { type Goals } from '@/repositories/goals.repository';
import { type DailySeriesPoint } from '@/repositories/logs.repository';
import { colors } from '@/theme/tokens';
import {
  Action,
  Note,
  Panel,
  formStyles,
  useNumberFormat,
} from '@/components/ui/Form';
export function DailyTrendBarChart({
  series,
}: {
  series: DailySeriesPoint[];
  goals: Goals;
}) {
  const { isPt, language } = useLanguage(),
    f = useNumberFormat();
  const [metric, setMetric] = useState<Nutrient | 'waterMl'>('caloriesKcal');
  const values = series.map((day) => ({
    day,
    value: metric === 'waterMl' ? day.waterMl : day.nutrients[metric].total,
    known:
      metric === 'waterMl' ? day.waterMl > 0 : day.nutrients[metric].known > 0,
    complete:
      metric === 'waterMl' ? day.waterMl > 0 : day.nutrients[metric].complete,
  }));
  const max = Math.max(1, ...values.map((v) => v.value));
  return (
    <Panel
      title={
        isPt
          ? 'Evolução diária · valores conhecidos'
          : 'Daily trend · known values'
      }
    >
      <View style={formStyles.row}>
        {NUTRIENTS.map((key) => (
          <Action
            key={key}
            label={`${metric === key ? '✓ ' : ''}${v2Translations[language].nutrients[key]}`}
            secondary
            onPress={() => setMetric(key)}
          />
        ))}
        <Action
          label={`${metric === 'waterMl' ? '✓ ' : ''}${v2Translations[language].liquids}`}
          secondary
          onPress={() => setMetric('waterMl')}
        />
      </View>
      {values.map(({ day, value, known, complete }) => (
        <View key={day.dateKey} style={{ gap: 4 }}>
          <Note>{`${day.dateKey} · ${known ? f(value) : '—'} · ${!known ? (isPt ? 'sem dados' : 'no data') : !complete ? (isPt ? 'parcial' : 'partial') : metric === 'waterMl' ? (isPt ? 'registrado' : 'logged') : day.confirmed ? (isPt ? 'confirmado' : 'confirmed') : isPt ? 'em aberto' : 'open'}`}</Note>
          <View
            style={{
              height: 8,
              backgroundColor: colors.surfaceHighest,
              borderRadius: 4,
            }}
          >
            {known && (
              <View
                style={{
                  height: 8,
                  width: `${Math.min(100, (value / max) * 100)}%`,
                  backgroundColor: complete ? colors.primary : colors.outline,
                  borderRadius: 4,
                }}
              />
            )}
          </View>
          {!day.goalsKnown && day.hasLogs && (
            <Note>
              {isPt
                ? 'Referência histórica de meta desconhecida'
                : 'Historical target reference unknown'}
            </Note>
          )}
        </View>
      ))}
    </Panel>
  );
}
