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
} from '@/components/ui/Form';
import { OptionalDateTimePicker } from '@/components/ui/OptionalDateTimePicker';
import { useLanguage } from '@/context/LanguageContext';
import { parseDecimal } from '@/domain/nutrition';
import { logsRepository } from '@/repositories/logs.repository';
import { syncEngine } from '@/sync/sync.service';
import { v2Translations } from '@/i18n/translations';
export default function AddWaterScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isPt, language } = useLanguage();
  const t = v2Translations[language];
  const [amount, setAmount] = useState('250'),
    [category, setCategory] = useState('water'),
    [at, setAt] = useState<Date | null>(null),
    [day, setDay] = useState<string | undefined>(),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    if (id)
      void logsRepository.getWaterLogById(id).then((row) => {
        if (!row || !live) return;
        if (row.foodLogId) {
          router.replace({
            pathname: '/add-food',
            params: { id: row.foodLogId },
          });
          return;
        }
        setAmount(String(row.amountMl));
        setCategory(row.category);
        setAt(new Date(row.occurredAt));
        setDay(row.dateKey);
      });
    return () => {
      live = false;
    };
  }, [id]);
  const save = async (preset?: number) => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const value = preset ?? parseDecimal(amount);
      if (value == null)
        throw new Error(isPt ? 'Informe o volume' : 'Enter volume');
      const input = {
        amountMl: value,
        category: preset ? 'water' : category,
        ingestedAt: at,
        dateKey: day,
      };
      if (id) await logsRepository.updateWaterLog(id, input);
      else await logsRepository.addWater(input);
      syncEngine.requestSync(0);
      Alert.alert(t.saved);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen title={t.liquids} back>
      <Panel title={isPt ? 'Água rápida' : 'Quick water'}>
        <View style={formStyles.row}>
          {[250, 500, 750, 1000].map((n) => (
            <Action
              key={n}
              label={`+ ${n} mL`}
              busy={saving}
              onPress={() => void save(n)}
            />
          ))}
        </View>
        <Note>
          {isPt
            ? 'Cada atalho salva água no aparelho. Não é necessário atingir a referência à força.'
            : 'Each shortcut saves water locally. There is no need to force yourself to reach the reference.'}
        </Note>
      </Panel>
      <Panel title={isPt ? 'Outro volume' : 'Custom volume'}>
        <Field
          label="mL"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
        />
        <View style={formStyles.row}>
          {[
            ['water', isPt ? 'Água' : 'Water'],
            ['tea', isPt ? 'Chá sem açúcar' : 'Unsweetened tea'],
            ['coffee', isPt ? 'Café sem açúcar' : 'Black coffee'],
            ['other', isPt ? 'Outro sem calorias' : 'Other noncaloric'],
          ].map(([key, label]) => (
            <Action
              key={key}
              label={`${category === key ? '✓ ' : ''}${label}`}
              secondary
              onPress={() => setCategory(key)}
            />
          ))}
        </View>
        <OptionalDateTimePicker
          value={at}
          onChange={setAt}
          isPt={isPt}
          isEditMode={!!id}
        />
        <Action label={t.save} busy={saving} onPress={() => void save()} />
      </Panel>
      <Panel
        title={isPt ? 'Vitamina, leite ou shake?' : 'Smoothie, milk or shake?'}
      >
        <Note>
          {isPt
            ? 'Registre na refeição, com nutrientes e volume vinculado, para contar o líquido uma vez.'
            : 'Use a meal with nutrients and linked volume to count the fluid once.'}
        </Note>
        <Action
          label={
            isPt
              ? 'Registrar bebida com nutrientes'
              : 'Log drink with nutrients'
          }
          secondary
          onPress={() => router.replace('/add-food')}
        />
      </Panel>
      {error && <Note error>{error}</Note>}
    </Screen>
  );
}
