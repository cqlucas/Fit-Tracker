import { router } from 'expo-router';
import React from 'react';
import Svg, { Polyline } from 'react-native-svg';
import { View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { routineRepository } from '@/repositories/routine.repository';
import { colors } from '@/theme/tokens';
import { Action, Note, Panel, useNumberFormat } from '@/components/ui/Form';
export function RoutineReviewCard({
  data,
}: {
  data: Awaited<ReturnType<typeof routineRepository.overview>>;
}) {
  const { isPt } = useLanguage(),
    f = useNumberFormat();
  const { review } = data;
  const texts = {
    insufficient: isPt
      ? 'Dados insuficientes. Para cada uma das duas semanas, registre peso em pelo menos 3 dias e confirme 5 dias com energia completa. Mantenha as metas.'
      : 'Insufficient data. In each of the two weeks, log weight on at least 3 days and confirm 5 days with complete energy. Keep your targets.',
    context: isPt
      ? 'Revisão adiada por contexto, início recente de creatina ou ajuste de metas. Observe uma nova janela antes de sugerir mudanças.'
      : 'Review postponed due to context, recent creatine start or target adjustment. Observe a new window before considering changes.',
    observe: isPt
      ? 'Continue observando. São necessárias duas revisões semanais consecutivas fora da faixa antes de sugerir ajuste.'
      : 'Keep observing. Two consecutive weekly reviews outside the range are needed before suggesting an adjustment.',
    review_up: isPt
      ? 'A tendência ficou abaixo da faixa em duas revisões. Considere revisar a ingestão em cerca de +100–150 kcal/dia com acompanhamento.'
      : 'The trend was below range in two reviews. Consider reviewing intake by about +100–150 kcal/day with professional support.',
    review_down: isPt
      ? 'A tendência ficou acima da faixa em duas revisões. Considere revisar a ingestão em cerca de −100–150 kcal/dia com acompanhamento.'
      : 'The trend was above range in two reviews. Consider reviewing intake by about −100–150 kcal/day with professional support.',
  };
  const weights = data.weights,
    low = Math.min(...weights.map((w) => w.weightKg)),
    high = Math.max(...weights.map((w) => w.weightKg));
  const points = weights
    .map(
      (w, i) =>
        `${weights.length > 1 ? (i / (weights.length - 1)) * 280 : 140},${120 - ((w.weightKg - low) / (high - low || 1)) * 100}`,
    )
    .join(' ');
  return (
    <Panel title={isPt ? 'Peso e revisão semanal' : 'Weight and weekly review'}>
      <Note>{`${isPt ? 'Média de 7 dias' : '7-day mean'}: ${f(data.weekMean, 2)} kg · ${data.weekCount} ${isPt ? 'medições em' : 'measurements on'} ${data.weekDays} ${isPt ? 'dias' : 'days'}`}</Note>
      {!!weights.length && (
        <View
          accessible
          accessibilityLabel={`${isPt ? 'Peso registrado' : 'Logged weight'}: ${weights.map((w) => `${w.dateKey}: ${f(w.weightKg)} kg`).join('; ')}`}
        >
          <Svg viewBox="0 0 280 140" width="100%" height={140}>
            <Polyline
              points={points}
              fill="none"
              stroke={colors.primary}
              strokeWidth={3}
            />
          </Svg>
        </View>
      )}
      <Note>{`${isPt ? 'Diferença entre médias semanais' : 'Difference between weekly means'}: ${f(review.delta, 2)} kg`}</Note>
      {review.min !== null && (
        <Note>{`${isPt ? 'Faixa de referência ajustável' : 'Adjustable reference range'}: ${f(review.min, 2)}–${f(review.max, 2)} kg/${isPt ? 'semana' : 'week'}`}</Note>
      )}
      <Note>{texts[review.status]}</Note>
      <Note>
        {isPt
          ? 'Peso não identifica composição corporal. Dias confirmados continuam sendo autorrelato.'
          : 'Weight does not identify body composition. Confirmed days remain self reports.'}
      </Note>
      {(review.status === 'review_up' || review.status === 'review_down') && (
        <Action
          label={
            isPt
              ? 'Revisar metas (não aplica automaticamente)'
              : 'Review targets (no automatic change)'
          }
          onPress={() =>
            router.push({
              pathname: '/(tabs)/settings',
              params: {
                adjustment: review.status === 'review_up' ? '125' : '-125',
              },
            })
          }
        />
      )}
      <Action
        label={isPt ? 'Registrar peso ou treino' : 'Log weight or training'}
        secondary
        onPress={() => router.push('/add-routine')}
      />
    </Panel>
  );
}
