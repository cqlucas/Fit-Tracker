import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { AccountSyncSection } from '@/components/settings/AccountSyncSection';
import { BackupSection } from '@/components/settings/BackupSection';
import {
  Action,
  Field,
  Note,
  Panel,
  Screen,
  Toggle,
  formStyles,
} from '@/components/ui/Form';
import { scopeGuard } from '@/db/client';
import { useLanguage } from '@/context/LanguageContext';
import { parseDecimal, remainingCarbs } from '@/domain/nutrition';
import { goalsRepository } from '@/repositories/goals.repository';
import {
  getPreference,
  setPreference,
} from '@/repositories/preferences.repository';
import { addDays, toDateKey } from '@/utils/date';

const keys = [
  'caloriesGoal',
  'proteinGoal',
  'carbGoal',
  'fatGoal',
  'fiberGoal',
  'waterGoal',
  'sodiumLimit',
  'saturatedFatLimit',
  'creatineGoal',
] as const;
type GoalInputs = Record<(typeof keys)[number], string>;
const labels = {
  pt: {
    caloriesGoal: 'Energia (kcal)',
    proteinGoal: 'Proteína (g)',
    carbGoal: 'Carboidratos (g)',
    fatGoal: 'Gorduras totais (g)',
    fiberGoal: 'Fibras (g)',
    waterGoal: 'Líquidos registrados (mL)',
    sodiumLimit: 'Limite de sódio (mg, opcional)',
    saturatedFatLimit: 'Limite de gordura saturada (g, opcional)',
    creatineGoal: 'Creatina (g, opcional)',
  },
  en: {
    caloriesGoal: 'Energy (kcal)',
    proteinGoal: 'Protein (g)',
    carbGoal: 'Carbohydrates (g)',
    fatGoal: 'Total fat (g)',
    fiberGoal: 'Fiber (g)',
    waterGoal: 'Logged fluids (mL)',
    sodiumLimit: 'Sodium limit (mg, optional)',
    saturatedFatLimit: 'Saturated fat limit (g, optional)',
    creatineGoal: 'Creatine (g, optional)',
  },
};
export default function SettingsScreen() {
  const { isPt, language, setLanguage } = useLanguage();
  const params = useLocalSearchParams<{ adjustment?: string }>();
  const adjustmentSeen = useRef('');
  const [values, setValues] = useState<GoalInputs>(
      Object.fromEntries(keys.map((k) => [k, ''])) as GoalInputs,
    ),
    [date, setDate] = useState(addDays(toDateKey(), 1)),
    [source, setSource] = useState<
      'manual' | 'suggestion' | 'professional' | 'review'
    >('manual'),
    [provider, setProvider] = useState<'gemini' | 'groq'>('gemini'),
    [fallback, setFallback] = useState(false),
    [professional, setProfessional] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [saving, setSaving] = useState(false),
    [plans, setPlans] = useState<
      Awaited<ReturnType<typeof goalsRepository.plans>>
    >([]),
    [ready, setReady] = useState(false);
  const [weight, setWeight] = useState(''),
    [objective, setObjective] = useState(''),
    [frequency, setFrequency] = useState(''),
    [duration, setDuration] = useState(''),
    [activity, setActivity] = useState(''),
    [rateMin, setRateMin] = useState('0.25'),
    [rateMax, setRateMax] = useState('0.5');
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void (async () => {
        const current = await goalsRepository.get();
        const history = await goalsRepository.plans();
        if (!live) return;
        const form = Object.fromEntries(
          keys.map((k) => [k, current[k] === null ? '' : String(current[k])]),
        ) as GoalInputs;
        if (params.adjustment && adjustmentSeen.current !== params.adjustment) {
          const energy = current.caloriesGoal + Number(params.adjustment);
          form.caloriesGoal = String(energy);
          if (current.fatGoal !== null)
            form.carbGoal = String(
              remainingCarbs(energy, current.proteinGoal, current.fatGoal),
            );
          setSource('review');
          adjustmentSeen.current = params.adjustment;
        }
        setValues(form);
        setProvider(current.preferredAiProvider);
        setPlans(history);
        setFallback(getPreference('aiFallback', false));
        setProfessional(getPreference('professionalOnly', false));
        const profile = getPreference('routineProfile', {
          weight: '',
          objective: '',
          frequency: '',
          duration: '',
          activity: '',
        });
        setWeight(profile.weight);
        setObjective(profile.objective);
        setFrequency(profile.frequency);
        setDuration(profile.duration);
        setActivity(profile.activity);
        setRateMin(String(getPreference('weeklyMinRate', 0.0025) * 100));
        setRateMax(String(getPreference('weeklyMaxRate', 0.005) * 100));
        setReady(true);
      })().catch((e) => {
        if (live) setError(e.message);
      });
      return () => {
        live = false;
      };
    }, [params.adjustment]),
  );
  const change = (key: (typeof keys)[number], value: string) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === 'caloriesGoal') {
        try {
          const energy = parseDecimal(value),
            p = parseDecimal(next.proteinGoal),
            f = parseDecimal(next.fatGoal);
          if (energy !== null && p !== null && f !== null)
            next.carbGoal = String(remainingCarbs(energy, p, f));
        } catch {}
      }
      return next;
    });
  };
  const suggest = () => {
    setValues({
      caloriesGoal: '2500',
      proteinGoal: '120',
      carbGoal: '325',
      fatGoal: '80',
      fiberGoal: '30',
      waterGoal: '2500',
      sodiumLimit: '',
      saturatedFatLimit: '',
      creatineGoal: '',
    });
    setSource('suggestion');
    setMessage(
      isPt
        ? 'Sugestão inicial preenchida. Revise e salve para aceitar; não substitui orientação profissional.'
        : 'Initial suggestion filled in. Review and save to accept; it does not replace professional advice.',
    );
  };
  const persist = async () => {
    const assertScope = scopeGuard();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const nutrition = Object.fromEntries(
        keys.map((k) => [k, parseDecimal(values[k])]),
      ) as Record<(typeof keys)[number], number | null>;
      if (
        nutrition.proteinGoal === null ||
        nutrition.caloriesGoal === null ||
        nutrition.waterGoal === null
      )
        throw new Error(
          isPt
            ? 'Informe energia, proteína e líquidos.'
            : 'Enter energy, protein and fluids.',
        );
      const min = parseDecimal(rateMin),
        max = parseDecimal(rateMax);
      if (min === null || max === null || min > max || max > 5)
        throw new Error('Faixa semanal inválida / Invalid weekly range');
      if (weight && (!parseDecimal(weight) || parseDecimal(weight)! > 1000))
        throw new Error('Invalid profile weight');
      if (
        frequency &&
        (!Number.isInteger(parseDecimal(frequency)) ||
          Number(parseDecimal(frequency)) > 14)
      )
        throw new Error('Invalid training frequency');
      if (
        duration &&
        (!parseDecimal(duration) || Number(parseDecimal(duration)) > 1440)
      )
        throw new Error('Invalid duration');
      await goalsRepository.update({
        ...nutrition,
        proteinGoal: nutrition.proteinGoal,
        caloriesGoal: nutrition.caloriesGoal,
        waterGoal: nutrition.waterGoal,
        effectiveFrom: date,
        source: professional ? 'professional' : source,
      });
      assertScope();
      setPreference('routineProfile', {
        weight,
        objective,
        frequency,
        duration,
        activity,
      });
      setPreference('professionalOnly', professional);
      setPreference('weeklyMinRate', min / 100);
      setPreference('weeklyMaxRate', max / 100);
      setMessage(
        isPt
          ? `Metas salvas no aparelho, com vigência em ${date}.`
          : `Targets saved locally, effective ${date}.`,
      );
      setPlans(await goalsRepository.plans());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };
  const save = () => {
    if (date === toDateKey())
      Alert.alert(
        isPt ? 'Aplicar a partir de hoje?' : 'Apply from today?',
        isPt
          ? 'O resumo de hoje usará esta nova versão. Dias anteriores mantêm sua referência.'
          : 'Today’s summary will use this new version. Earlier days keep their reference.',
        [
          { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
          {
            text: isPt ? 'Confirmar' : 'Confirm',
            onPress: () => void persist(),
          },
        ],
      );
    else void persist();
  };
  let energyMismatch = false,
    invalidRemainder = false;
  try {
    const p = parseDecimal(values.proteinGoal),
      c = parseDecimal(values.carbGoal),
      f = parseDecimal(values.fatGoal),
      e = parseDecimal(values.caloriesGoal);
    if (p !== null && f !== null && e !== null) remainingCarbs(e, p, f);
    if (p !== null && c !== null && f !== null && e !== null)
      energyMismatch =
        Math.abs(4 * p + 4 * c + 9 * f - e) > Math.max(50, e * 0.1);
  } catch {
    invalidRemainder = true;
  }
  return (
    <Screen title={isPt ? 'Configurações' : 'Settings'}>
      <Panel title={isPt ? 'Sua rotina' : 'Your routine'}>
        <Note>
          {isPt
            ? 'Campos opcionais para contextualizar a revisão. Metas atuais são mantidas até você aceitar uma nova versão. Não há cálculo automático de metabolismo.'
            : 'Optional context for review. Current targets stay until you accept a new version. There is no automatic metabolism calculation.'}
        </Note>
        <Field
          label={
            isPt
              ? 'Peso atual em kg (opcional)'
              : 'Current weight in kg (optional)'
          }
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />
        <Field
          label={isPt ? 'Objetivo' : 'Goal'}
          value={objective}
          onChangeText={setObjective}
          maxLength={200}
        />
        <Field
          label={isPt ? 'Treinos por semana' : 'Sessions per week'}
          value={frequency}
          onChangeText={setFrequency}
          keyboardType="number-pad"
        />
        <Field
          label={
            isPt
              ? 'Duração aproximada em minutos'
              : 'Approximate duration in minutes'
          }
          value={duration}
          onChangeText={setDuration}
          keyboardType="decimal-pad"
        />
        <Field
          label={
            isPt ? 'Atividade fora do treino' : 'Activity outside training'
          }
          value={activity}
          onChangeText={setActivity}
          maxLength={300}
        />
        <Toggle
          label={
            isPt
              ? 'Usar orientação profissional (restrições ou metas individualizadas)'
              : 'Use professional guidance (restrictions or individual targets)'
          }
          value={professional}
          onChange={setProfessional}
        />
        <Note>
          {isPt
            ? 'Com restrição de líquidos, doença renal ou orientação individual, use metas profissionais e mantenha sugestões genéricas desativadas.'
            : 'With fluid restrictions, kidney disease or individual guidance, use professional targets and keep generic suggestions disabled.'}
        </Note>
      </Panel>
      <Panel
        title={isPt ? 'Metas com vigência' : 'Targets with effective date'}
      >
        <Note>
          {isPt
            ? 'Sugestão inicial ajustável: 2.500 kcal, 120 g de proteína, 325 g de carboidratos, 80 g de gordura, 30 g de fibras e 2.500 mL. É uma hipótese, não uma prescrição.'
            : 'Adjustable initial suggestion: 2,500 kcal, 120 g protein, 325 g carbohydrates, 80 g fat, 30 g fiber and 2,500 mL. A starting hypothesis, not a prescription.'}
        </Note>
        <Action
          label={
            isPt ? 'Preencher sugestão inicial' : 'Fill initial suggestion'
          }
          secondary
          disabled={professional}
          onPress={suggest}
        />
        {keys.map((key) => (
          <Field
            key={key}
            label={labels[language][key]}
            value={values[key]}
            onChangeText={(v) => change(key, v)}
            keyboardType="decimal-pad"
          />
        ))}
        <Note>
          {isPt
            ? 'Campos opcionais vazios ficam desativados. Sódio e saturadas são limites, não metas mínimas. Creatina é opcional.'
            : 'Empty optional fields are disabled. Sodium and saturated fat are upper limits, not minimum targets. Creatine is optional.'}
        </Note>
        {weight && parseDecimalSafe(weight) > 0 && (
          <Note>
            {isPt
              ? `Contexto de proteína: ${(parseDecimalSafe(weight) * 1.6).toFixed(1)}–${(parseDecimalSafe(weight) * 2.2).toFixed(1)} g/dia (faixa geral, não mínimo obrigatório).`
              : `Protein context: ${(parseDecimalSafe(weight) * 1.6).toFixed(1)}–${(parseDecimalSafe(weight) * 2.2).toFixed(1)} g/day (general range, not a required minimum).`}
          </Note>
        )}
        {energyMismatch && (
          <Note>
            {isPt
              ? 'A conta aproximada 4P + 4C + 9G difere da energia escolhida. Revise a distribuição.'
              : 'Approximate 4P + 4C + 9G differs from chosen energy. Review the distribution.'}
          </Note>
        )}
        {invalidRemainder && (
          <Note error>
            {isPt
              ? 'Revise os números: proteína e gordura não podem ultrapassar o orçamento energético.'
              : 'Review the numbers: protein and fat cannot exceed the energy budget.'}
          </Note>
        )}
        <Field
          label={
            isPt
              ? 'Início da vigência (AAAA-MM-DD), padrão amanhã'
              : 'Effective from (YYYY-MM-DD), defaults to tomorrow'
          }
          value={date}
          onChangeText={setDate}
        />
        <Field
          label={
            isPt
              ? 'Faixa semanal mínima (% do peso)'
              : 'Weekly lower reference (% of weight)'
          }
          value={rateMin}
          onChangeText={setRateMin}
          keyboardType="decimal-pad"
        />
        <Field
          label={
            isPt
              ? 'Faixa semanal máxima (% do peso)'
              : 'Weekly upper reference (% of weight)'
          }
          value={rateMax}
          onChangeText={setRateMax}
          keyboardType="decimal-pad"
        />
        <Action
          label={
            isPt ? 'Salvar nova versão das metas' : 'Save new target version'
          }
          busy={saving}
          disabled={!ready || invalidRemainder}
          onPress={save}
        />
        {plans.slice(0, 6).map((p) => (
          <Note
            key={p.id}
          >{`${p.effectiveFrom} · ${p.caloriesGoal} kcal · ${p.proteinGoal} g · ${p.source}${getPreference('cloudSync', false) && !p.isSynced ? ' · ' + (isPt ? 'pendente' : 'pending') : ''}`}</Note>
        ))}
        <Note>
          {isPt
            ? 'Metas anteriores à primeira versão são desconhecidas. Registrar peso não altera metas automaticamente.'
            : 'Targets before the first version are unknown. Weight entries do not change targets automatically.'}
        </Note>
      </Panel>
      <Panel
        title={
          isPt ? 'Idioma e preferência de IA' : 'Language and AI preference'
        }
      >
        <View style={formStyles.row}>
          <Action
            label="Português"
            secondary
            onPress={() => void setLanguage('pt')}
          />
          <Action
            label="English"
            secondary
            onPress={() => void setLanguage('en')}
          />
        </View>
        <View style={formStyles.row}>
          {(['gemini', 'groq'] as const).map((p) => (
            <Action
              key={p}
              label={`${provider === p ? '✓ ' : ''}${p}`}
              secondary
              onPress={() => {
                setProvider(p);
                void goalsRepository.update({ preferredAiProvider: p });
              }}
            />
          ))}
        </View>
        <Toggle
          label={
            isPt
              ? 'Autorizar envio ao outro provedor se o primeiro falhar'
              : 'Allow sending to the other provider if the first fails'
          }
          value={fallback}
          onChange={(value) => {
            setFallback(value);
            setPreference('aiFallback', value);
          }}
        />
        <Note>
          {isPt
            ? 'Foto e texto vão apenas ao provedor escolhido, salvo autorização acima. Segredos de IA ficam no servidor.'
            : 'Photo and text go only to the selected provider unless authorized above. AI secrets stay on the server.'}
        </Note>
      </Panel>
      {message && <Note>{message}</Note>}
      {error && <Note error>{error}</Note>}
      <BackupSection />
      <AccountSyncSection />
    </Screen>
  );
}
function parseDecimalSafe(value: string) {
  try {
    return parseDecimal(value) ?? 0;
  } catch {
    return 0;
  }
}
