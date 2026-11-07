import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { type DailySeriesPoint } from '@/repositories/logs.repository';
import { Note, Panel } from '@/components/ui/Form';
export function ConsistencyGridCard({
  series,
}: {
  series: DailySeriesPoint[];
}) {
  const { isPt } = useLanguage();
  return (
    <Panel title={isPt ? 'Regularidade alimentar' : 'Food logging regularity'}>
      <Note>{`${series.filter((d) => d.confirmed).length}/${series.length} ${isPt ? 'dias confirmados' : 'confirmed days'}`}</Note>
      <Note>
        {isPt
          ? 'Confirmação, cobertura dos nutrientes e alcance de referências são informações diferentes. Líquidos têm registro independente.'
          : 'Confirmation, nutrient coverage and target comparisons are separate information. Fluids are tracked independently.'}
      </Note>
    </Panel>
  );
}
