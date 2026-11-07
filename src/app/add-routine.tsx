import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import {
  Action,
  Field,
  Note,
  Panel,
  Screen,
  formStyles,
  useNumberFormat,
} from '@/components/ui/Form';
import { useLanguage } from '@/context/LanguageContext';
import { parseDecimal } from '@/domain/nutrition';
import { routineRepository } from '@/repositories/routine.repository';
import { goalsRepository } from '@/repositories/goals.repository';
import { scopeGuard } from '@/db/client';
import { useLocalData } from '@/hooks/useLocalData';
import { toDateKey } from '@/utils/date';
export default function AddRoutineScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { isPt } = useLanguage();
  const [kind, setKind] = useState(
      ['weight', 'creatine', 'training', 'checkin'].includes(params.kind ?? '')
        ? params.kind!
        : 'weight',
    ),
    [value, setValue] = useState(''),
    [day, setDay] = useState(toDateKey),
    [note, setNote] = useState(''),
    [context, setContext] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [creatine, setCreatine] = useState(false);
  useEffect(() => {
    void goalsRepository
      .get()
      .then((g) => setCreatine(g.creatineGoal !== null));
  }, []);
  const format = useNumberFormat();
  const [cursor, setCursor] = useState<
    { dateKey: string; id: string } | undefined
  >();
  const routineType =
    kind === 'creatine'
      ? 'creatine'
      : kind === 'training'
        ? 'training'
        : 'weight';
  const {
    data: history,
    refresh: refreshHistory,
    error: historyError,
  } = useLocalData(() => routineRepository.history(routineType, cursor));
  useEffect(() => {
    void refreshHistory();
  }, [routineType, cursor, refreshHistory]);
  const remove = (id: string) => {
    const assertScope = scopeGuard();
    Alert.alert(
      isPt ? 'Excluir este registro?' : 'Delete this log?',
      isPt
        ? 'A exclusão será salva no aparelho e ficará pendente de sincronização, se habilitada.'
        : 'Deletion is saved locally and awaits sync if enabled.',
      [
        { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isPt ? 'Excluir' : 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              assertScope();
              void routineRepository
                .removeRoutine(routineType, id)
                .catch((e) => setError(e.message));
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Error');
            }
          },
        },
      ],
    );
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const n = parseDecimal(value);
      if (kind === 'weight') {
        if (n === null) throw new Error('Informe kg / Enter kg');
        await routineRepository.addWeight(n, day, null);
      } else if (kind === 'creatine') {
        if (n === null) throw new Error('Informe g / Enter g');
        await routineRepository.addCreatine(n, day);
      } else if (kind === 'training')
        await routineRepository.training(day, n, note);
      else await routineRepository.checkin(day, true, context);
      Alert.alert(isPt ? 'Salvo no aparelho' : 'Saved on this device');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title={isPt ? 'Rotina e acompanhamento' : 'Routine and tracking'}
      back
    >
      <View style={formStyles.row}>
        {[
          ['weight', isPt ? 'Peso' : 'Weight'],
          ['training', isPt ? 'Treino' : 'Training'],
          ['checkin', isPt ? 'Confirmar dia' : 'Confirm day'],
          ...(creatine ? [['creatine', 'Creatina / Creatine']] : []),
        ].map(([key, label]) => (
          <Action
            key={key}
            label={`${kind === key ? '✓ ' : ''}${label}`}
            secondary
            onPress={() => {
              setKind(key);
              setCursor(undefined);
              setValue('');
              setError('');
            }}
          />
        ))}
      </View>
      <Panel>
        <Field
          label={isPt ? 'Data (AAAA-MM-DD)' : 'Date (YYYY-MM-DD)'}
          value={day}
          onChangeText={setDay}
        />
        {kind !== 'checkin' && (
          <Field
            label={
              kind === 'weight'
                ? 'kg'
                : kind === 'creatine'
                  ? 'g'
                  : isPt
                    ? 'Duração em minutos (opcional)'
                    : 'Duration in minutes (optional)'
            }
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
          />
        )}
        {kind === 'training' && (
          <Field
            label={isPt ? 'Nota curta' : 'Short note'}
            value={note}
            maxLength={300}
            onChangeText={setNote}
          />
        )}
        {kind === 'checkin' && (
          <>
            <Note>
              {isPt
                ? 'Confirme quando terminar o registro alimentar deste dia. Qualquer edição na alimentação reabre a confirmação. Campos vazios continuam incompletos.'
                : 'Confirm when you finish logging food for this day. Any food edit reopens confirmation. Empty nutrients remain incomplete.'}
            </Note>
            <Field
              label={
                isPt
                  ? 'Contexto opcional: doença, viagem, mudança de rotina'
                  : 'Optional context: illness, travel, routine change'
              }
              value={context}
              onChangeText={setContext}
              maxLength={300}
            />
          </>
        )}
        {kind === 'weight' && (
          <Note>
            {isPt
              ? 'Use condições semelhantes quando possível. A tendência semanal não identifica ganho de músculo. Três medições na semana ajudam, sem obrigação.'
              : 'Use similar conditions when possible. Weekly trends do not identify muscle gain. Three weekly measurements help, without obligation.'}
          </Note>
        )}
        {kind === 'creatine' && (
          <Note>
            {isPt
              ? 'Opcional. Registre a dose usada; sem calorias, proteína ou água extra automática.'
              : 'Optional. Log the dose used; no automatic calories, protein or extra water.'}
          </Note>
        )}
        <Action
          label={isPt ? 'Salvar' : 'Save'}
          busy={busy}
          disabled={kind === 'creatine' && !creatine}
          onPress={() => void save()}
        />
        {error && <Note error>{error}</Note>}
      </Panel>
      {kind !== 'checkin' && (
        <Panel
          title={isPt ? 'Registros desta categoria' : 'Logs in this category'}
        >
          {(history ?? []).map((item) => (
            <Panel key={item.id}>
              <Note>{`${item.dateKey} · ${format(item.value)} ${kind === 'weight' ? 'kg' : kind === 'creatine' ? 'g' : 'min'}${item.note ? ' · ' + item.note : ''}`}</Note>
              <Action
                label={isPt ? 'Excluir registro' : 'Delete log'}
                secondary
                onPress={() => remove(item.id)}
              />
            </Panel>
          ))}
          {history?.length === 50 && (
            <Action
              label={isPt ? 'Registros anteriores' : 'Older logs'}
              secondary
              onPress={() => {
                const last = history[history.length - 1];
                setCursor({ dateKey: last.dateKey, id: last.id });
              }}
            />
          )}
          {cursor && (
            <Action
              label={isPt ? 'Voltar aos recentes' : 'Back to recent logs'}
              secondary
              onPress={() => setCursor(undefined)}
            />
          )}
          {historyError && <Note error>{historyError}</Note>}
        </Panel>
      )}
    </Screen>
  );
}
