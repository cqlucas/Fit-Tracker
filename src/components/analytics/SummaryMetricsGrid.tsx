import React from 'react';
import { NUTRIENTS } from '@/domain/nutrition';
import { v2Translations } from '@/i18n/translations';
import { useLanguage } from '@/context/LanguageContext';
import { type Goals } from '@/repositories/goals.repository';
import { type AnalyticsKPIs } from '@/repositories/logs.repository';
import { Note, Panel, useNumberFormat } from '@/components/ui/Form';
export interface SummaryMetricsGridProps {
  kpis: AnalyticsKPIs;
  goals: Goals;
}
export function SummaryMetricsGrid({ kpis }: SummaryMetricsGridProps) {
  const { isPt, language } = useLanguage(),
    f = useNumberFormat();
  return (
    <Panel title={isPt ? 'Médias com cobertura' : 'Averages and coverage'}>
      <Note>{`${isPt ? 'Proteína' : 'Protein'}: ${f(kpis.avgProteinG)} g · ${kpis.proteinDays}/${kpis.totalDays} ${isPt ? 'dias confirmados completos' : 'complete confirmed days'}`}</Note>
      <Note>{`${isPt ? 'Energia' : 'Energy'}: ${f(kpis.avgCaloriesKcal)} kcal · ${kpis.calorieDays}/${kpis.totalDays} ${isPt ? 'dias confirmados completos' : 'complete confirmed days'}`}</Note>
      <Note>{`${isPt ? 'Líquidos registrados' : 'Logged fluids'}: ${f(kpis.avgWaterMl)} mL · ${kpis.waterDays}/${kpis.totalDays} ${isPt ? 'dias com líquidos' : 'days with fluids'}`}</Note>
      {NUTRIENTS.slice(2).map((key) => (
        <Note
          key={key}
        >{`${v2Translations[language].nutrients[key]}: ${f(kpis.nutrientAverages[key].value)} · ${kpis.nutrientAverages[key].days}/${kpis.totalDays} ${isPt ? 'dias confirmados completos' : 'complete confirmed days'}`}</Note>
      ))}
      <Note>
        {isPt
          ? '— significa dados insuficientes. Dias sem registro não entram como zero nas médias. Confirmar um dia não preenche nutrientes desconhecidos.'
          : '— means insufficient data. Unlogged days do not enter averages as zero. Confirming a day does not fill in unknown nutrients.'}
      </Note>
    </Panel>
  );
}
