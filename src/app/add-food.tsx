import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, AppState, View } from 'react-native';
import { MealWindowSelector } from '@/components/food/MealWindowSelector';
import { OptionalDateTimePicker } from '@/components/ui/OptionalDateTimePicker';
import {
  Action,
  Field,
  Note,
  Panel,
  Screen,
  Toggle,
  formStyles,
  useNumberFormat,
} from '@/components/ui/Form';
import { useLanguage } from '@/context/LanguageContext';
import { expoDb } from '@/db/client';
import type { FoodTemplate, MealWindow } from '@/db/schema';
import {
  NUTRIENTS,
  SOURCES,
  energyWarning,
  parseDecimal,
  scaleNutrients,
  type Nutrients,
  type NutritionSource,
} from '@/domain/nutrition';
import { v2Translations } from '@/i18n/translations';
import {
  logsRepository,
  type AddFoodInput,
} from '@/repositories/logs.repository';
import { routineRepository } from '@/repositories/routine.repository';
import { goalsRepository } from '@/repositories/goals.repository';
import { getPreference } from '@/repositories/preferences.repository';
import {
  analyzeFoodWithAI,
  type FoodAnalysisResult,
} from '@/services/ai.service';
import { syncEngine } from '@/sync/sync.service';
import { toDateKey } from '@/utils/date';

type Draft = {
  name: string;
  values: Record<keyof Nutrients, string>;
  source: NutritionSource;
  sources: Partial<Record<keyof Nutrients, NutritionSource>>;
  estimate: boolean;
  channel: 'text' | 'image';
  portion: string;
  unit: 'g' | 'ml' | 'portion';
  mealWindow: MealWindow;
  context: string;
  imageUri: string | null;
  base64: string | null;
  mime: string;
  beverage: string;
  templateId: string | null;
  at: string | null;
  dateKey?: string;
};
const emptyDraft = (): Draft => ({
  name: '',
  values: Object.fromEntries(NUTRIENTS.map((k) => [k, ''])) as Draft['values'],
  source: 'manual',
  sources: {},
  estimate: false,
  channel: 'text',
  portion: '',
  unit: 'portion',
  mealWindow: 'lunch',
  context: '',
  imageUri: null,
  base64: null,
  mime: 'image/jpeg',
  beverage: '',
  templateId: null,
  at: null,
});
export default function AddFoodScreen() {
  const { id, repeatId, editTemplate, favoriteId } = useLocalSearchParams<{
    id?: string;
    repeatId?: string;
    editTemplate?: string;
    favoriteId?: string;
  }>();
  const { isPt, language } = useLanguage();
  const t = v2Translations[language],
    format = useNumberFormat();
  const draftKey = id
    ? `food:${id}`
    : editTemplate
      ? `template:${editTemplate}`
      : 'food:new';
  const [draft, setDraft] = useState<Draft>(emptyDraft),
    [ready, setReady] = useState(false),
    [templates, setTemplates] = useState<FoodTemplate[]>([]),
    [recent, setRecent] = useState<AddFoodInput[]>([]);
  const [details, setDetails] = useState(false),
    [saving, setSaving] = useState(false),
    [analyzing, setAnalyzing] = useState(false),
    [preview, setPreview] = useState<FoodAnalysisResult | null>(null),
    [error, setError] = useState('');
  const revision = useRef(0),
    mounted = useRef(true),
    request = useRef<AbortController | null>(null),
    selectedTemplate = useRef<FoodTemplate | null>(null);
  const lastDraft = useRef({ draft, ready, key: draftKey });
  const savedDraft = useRef(false);
  useLayoutEffect(() => {
    lastDraft.current = { draft, ready, key: draftKey };
  }, [draft, ready, draftKey]);
  useEffect(() => {
    const connection = expoDb;
    const persist = () => {
      const current = lastDraft.current;
      if (!current.ready || savedDraft.current) return;
      try {
        connection.runSync(
          'INSERT INTO form_drafts(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
          current.key,
          JSON.stringify(current.draft),
        );
      } catch {
        if (mounted.current)
          setError('Falha ao guardar rascunho / Could not save draft');
      }
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist();
    });
    return () => {
      sub.remove();
      persist();
    };
  }, []);
  useEffect(() => {
    mounted.current = true;
    let live = true;
    const fromFood = (f: AddFoodInput): Draft => ({
      ...emptyDraft(),
      name: f.name,
      values: Object.fromEntries(
        NUTRIENTS.map((k) => [k, f[k] == null ? '' : String(f[k])]),
      ) as Draft['values'],
      source: f.nutritionSource ?? 'manual',
      sources: f.nutrientSources ? JSON.parse(f.nutrientSources) : {},
      estimate: !!f.isEstimate,
      channel: f.inputChannel ?? 'text',
      portion: f.portionAmount == null ? '' : String(f.portionAmount),
      unit: (f.portionUnit as Draft['unit']) ?? 'portion',
      templateId: f.templateId ?? null,
      mealWindow: f.mealWindow ?? 'lunch',
      imageUri: f.imageUri ?? null,
      beverage: f.beverageMl == null ? '' : String(f.beverageMl),
    });
    void (async () => {
      const favorites = await routineRepository.templates();
      const logs = await logsRepository.getLogsHistory({ type: 'food' });
      if (!live) return;
      setTemplates(favorites);
      setRecent(
        logs
          .filter((l) => l.type === 'food')
          .slice(0, 5)
          .map((f) => ({
            ...f,
            beverageMl:
              expoDb.getFirstSync<{ amount_ml: number }>(
                'SELECT amount_ml FROM water_logs WHERE food_log_id=? AND deleted_at IS NULL',
                f.id,
              )?.amount_ml ?? null,
          })),
      );
      const saved = expoDb.getFirstSync<{ payload: string }>(
        'SELECT payload FROM form_drafts WHERE id=?',
        draftKey,
      );
      if (saved && !repeatId && !favoriteId) {
        try {
          const parsed = JSON.parse(saved.payload);
          if (parsed && typeof parsed.name === 'string' && parsed.values)
            setDraft({ ...emptyDraft(), ...parsed });
        } catch {}
      } else if (id || repeatId) {
        const f = await logsRepository.getFoodLogById((id ?? repeatId)!);
        if (f && live) {
          const linked = expoDb.getFirstSync<{ amount_ml: number }>(
            'SELECT amount_ml FROM water_logs WHERE food_log_id=? AND deleted_at IS NULL',
            f.id,
          );
          setDraft({
            ...fromFood(f),
            at: id ? f.occurredAt : null,
            dateKey: id ? f.dateKey : undefined,
            beverage: linked ? String(linked.amount_ml) : '',
          });
        }
      } else if (editTemplate || favoriteId) {
        const f = favorites.find((f) => f.id === (editTemplate ?? favoriteId));
        if (f) {
          setDraft(fromFood({ ...f, templateId: f.id }));
          if (favoriteId) selectedTemplate.current = f;
        }
      }
      if (live) setReady(true);
    })().catch((e) => {
      if (live) {
        setError(e.message);
        setReady(true);
      }
    });
    return () => {
      live = false;
      mounted.current = false;
      request.current?.abort();
    };
  }, [draftKey, id, repeatId, editTemplate, favoriteId]);
  useEffect(() => {
    if (!ready) return;
    const connection = expoDb;
    const timer = setTimeout(() => {
      try {
        connection.runSync(
          'INSERT INTO form_drafts(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
          draftKey,
          JSON.stringify(draft),
        );
      } catch {
        if (mounted.current)
          setError('Falha ao guardar rascunho / Could not save draft');
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [draft, ready, draftKey]);
  const change = (patch: Partial<Draft>) => {
    revision.current++;
    setPreview(null);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const nutrients = () =>
    Object.fromEntries(
      NUTRIENTS.map((k) => [k, parseDecimal(draft.values[k])]),
    ) as Nutrients;
  const input = (): AddFoodInput => ({
    name: draft.name,
    ...nutrients(),
    nutritionSource: draft.source,
    nutrientSources: JSON.stringify(draft.sources),
    isEstimate: draft.estimate || Object.values(draft.sources).includes('ai'),
    inputChannel: draft.channel,
    entryMethod: draft.channel === 'image' ? 'image' : 'manual',
    mealWindow: draft.mealWindow,
    imageUri: draft.imageUri,
    portionAmount: parseDecimal(draft.portion),
    portionUnit: draft.portion.trim() ? draft.unit : null,
    templateId: draft.templateId,
    beverageMl: parseDecimal(draft.beverage),
    dateKey: draft.at ? toDateKey(new Date(draft.at)) : draft.dateKey,
    ingestedAt: draft.at,
  });
  const fill = (f: AddFoodInput) => {
    selectedTemplate.current = null;
    change({
      name: f.name,
      values: Object.fromEntries(
        NUTRIENTS.map((k) => [k, f[k] == null ? '' : String(f[k])]),
      ) as Draft['values'],
      source: f.nutritionSource ?? 'manual',
      sources: f.nutrientSources
        ? JSON.parse(f.nutrientSources)
        : Object.fromEntries(
            NUTRIENTS.map((k) => [k, f.nutritionSource ?? 'manual']),
          ),
      estimate: !!f.isEstimate,
      portion: f.portionAmount == null ? '' : String(f.portionAmount),
      unit: (f.portionUnit as Draft['unit']) ?? 'portion',
      templateId: f.templateId ?? null,
      channel: f.inputChannel ?? 'text',
      imageUri: null,
      base64: null,
      beverage: f.beverageMl ? String(f.beverageMl) : '',
    });
  };
  const selectTemplate = (template: FoodTemplate) => {
    fill(routineRepository.useTemplate(template));
    selectedTemplate.current = template;
  };
  const changePortion = (text: string) => {
    try {
      const amount = parseDecimal(text);
      const base = selectedTemplate.current;
      if (base && amount && draft.unit === base.portionUnit) {
        const scaled = scaleNutrients(
          base as Nutrients,
          amount,
          base.portionAmount,
          draft.unit,
          base.portionUnit,
        );
        change({
          portion: text,
          beverage:
            base.beverageMl === null
              ? ''
              : String(
                  Math.round((base.beverageMl * amount) / base.portionAmount),
                ),
          values: Object.fromEntries(
            NUTRIENTS.map((k) => [
              k,
              scaled[k] == null ? '' : String(scaled[k]),
            ]),
          ) as Draft['values'],
        });
        return;
      }
    } catch {}
    change({ portion: text });
  };
  const save = async (asTemplate = false) => {
    if (saving) return;
    setSaving(true);
    setError('');
    request.current?.abort();
    try {
      const food = input();
      if (asTemplate || editTemplate) {
        await routineRepository.saveTemplate(food, editTemplate);
        setTemplates(await routineRepository.templates());
        if (!editTemplate) {
          Alert.alert(
            t.saved,
            isPt
              ? 'Favorito disponível para próximos registros.'
              : 'Favorite available for future logs.',
          );
          return;
        }
      } else if (id) await logsRepository.updateFoodLog(id, food);
      else await logsRepository.addFood(food);
      savedDraft.current = true;
      expoDb.runSync('DELETE FROM form_drafts WHERE id=?', draftKey);
      syncEngine.requestSync(0);
      Alert.alert(t.saved);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      if (mounted.current) setSaving(false);
    }
  };
  const pick = async (camera: boolean) => {
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          isPt
            ? 'Autorize o acesso às fotos/câmera.'
            : 'Allow photo/camera access.',
        );
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.assets?.[0];
      if (!result.canceled && asset)
        change({
          imageUri: asset.uri,
          base64: asset.base64 ?? null,
          mime: asset.mimeType ?? 'image/jpeg',
          channel: 'image',
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };
  const analyze = async () => {
    const start = revision.current;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setAnalyzing(true);
    setError('');
    try {
      const result = await analyzeFoodWithAI({
        base64Image: draft.base64,
        mimeType: draft.mime,
        userContext: draft.context,
        language,
        signal: controller.signal,
      });
      if (
        mounted.current &&
        !controller.signal.aborted &&
        start === revision.current
      )
        setPreview(result);
    } catch (e) {
      if (mounted.current && !controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Error');
    } finally {
      if (mounted.current && request.current === controller)
        setAnalyzing(false);
    }
  };
  const requestAnalysis = async () => {
    const goals = await goalsRepository.get();
    const alternate = getPreference('aiFallback', false);
    Alert.alert(
      isPt ? 'Enviar para análise?' : 'Send for analysis?',
      isPt
        ? `Foto e descrição serão enviadas ao ${goals.preferredAiProvider}${alternate ? ' e, se necessário, ao provedor alternativo autorizado' : ''}. É preciso entrar por e-mail em Configurações. Sincronizar o diário é opcional.`
        : `Photo and description will be sent to ${goals.preferredAiProvider}${alternate ? ' and, if needed, your authorized alternate provider' : ''}. Email sign in is required in Settings. Diary sync is optional.`,
      [
        { text: t.cancel, style: 'cancel' },
        { text: isPt ? 'Analisar' : 'Analyze', onPress: () => void analyze() },
      ],
    );
  };
  let warning = false;
  try {
    warning = energyWarning(nutrients());
  } catch {}
  return (
    <Screen
      title={
        editTemplate
          ? isPt
            ? 'Editar favorito'
            : 'Edit favorite'
          : id
            ? isPt
              ? 'Editar refeição'
              : 'Edit meal'
            : isPt
              ? 'Registrar refeição'
              : 'Log meal'
      }
      back
    >
      {!id && !editTemplate && (
        <Panel title={isPt ? 'Favoritos e recentes' : 'Favorites and recent'}>
          {templates.map((f) => (
            <View key={f.id} style={formStyles.row}>
              <View style={{ flex: 1 }}>
                <Action
                  label={f.name}
                  secondary
                  onPress={() => selectTemplate(f)}
                />
              </View>
              <Action
                label={isPt ? 'Editar' : 'Edit'}
                secondary
                onPress={() =>
                  router.push({
                    pathname: '/add-food',
                    params: { editTemplate: f.id },
                  })
                }
              />
            </View>
          ))}
          {templates.length === 0 && (
            <Note>
              {isPt
                ? 'Crie favoritos para repetir com um toque. Modelos: café com pão e ovos, arroz com feijão e frango, vitamina. Informe as porções e os nutrientes que conhecer.'
                : 'Create favorites to repeat with one tap. Examples: bread and eggs, rice with beans and chicken, smoothie. Fill in known portions and nutrients.'}
            </Note>
          )}
          {recent.map((f, i) => (
            <Action
              key={i}
              label={`${isPt ? 'Repetir' : 'Repeat'}: ${f.name}`}
              secondary
              onPress={() => fill(f)}
            />
          ))}
        </Panel>
      )}
      <Panel>
        <Field
          label={isPt ? 'Nome da refeição' : 'Meal name'}
          value={draft.name}
          onChangeText={(name) => change({ name })}
          maxLength={200}
        />
        <Note>{t.unknown}</Note>
        {NUTRIENTS.slice(0, 4).map((k) => (
          <Field
            key={k}
            label={`${t.nutrients[k]} · ${t.sources[draft.sources[k] ?? draft.source]}`}
            value={draft.values[k]}
            keyboardType="decimal-pad"
            onChangeText={(v) => {
              selectedTemplate.current = null;
              change({
                values: { ...draft.values, [k]: v },
                sources: {
                  ...draft.sources,
                  [k]: draft.source === 'ai' ? 'manual' : draft.source,
                },
              });
            }}
          />
        ))}
        <Action
          label={t.details}
          secondary
          onPress={() => setDetails((v) => !v)}
        />
        {details &&
          NUTRIENTS.slice(4).map((k) => (
            <Field
              key={k}
              label={`${t.nutrients[k]} · ${t.sources[draft.sources[k] ?? draft.source]}`}
              value={draft.values[k]}
              keyboardType="decimal-pad"
              onChangeText={(v) => {
                selectedTemplate.current = null;
                change({
                  values: { ...draft.values, [k]: v },
                  sources: {
                    ...draft.sources,
                    [k]: draft.source === 'ai' ? 'manual' : draft.source,
                  },
                });
              }}
            />
          ))}
        {warning && (
          <Note>
            {isPt
              ? 'Energia e macros diferem da conta aproximada 4P + 4C + 9G. Confira a fonte; o valor informado será preservado.'
              : 'Energy differs from approximate 4P + 4C + 9G. Review the source; your value is preserved.'}
          </Note>
        )}
      </Panel>
      <Panel title={isPt ? 'Porção e origem' : 'Portion and source'}>
        <Field
          label={
            isPt
              ? 'Quantidade consumida (opcional)'
              : 'Consumed amount (optional)'
          }
          value={draft.portion}
          onChangeText={changePortion}
          keyboardType="decimal-pad"
        />
        <View style={formStyles.row}>
          {(['g', 'ml', 'portion'] as const).map((unit) => (
            <Action
              key={unit}
              label={`${draft.unit === unit ? '✓ ' : ''}${unit === 'portion' ? (isPt ? 'porção' : 'portion') : unit}`}
              secondary
              onPress={() => {
                selectedTemplate.current = null;
                change({ unit });
              }}
            />
          ))}
        </View>
        <Note>
          {isPt
            ? 'Gramas e mL não são convertidos entre si. Distinga alimentos crus e cozidos no nome.'
            : 'Grams and mL are not interchangeable. Name raw and cooked foods distinctly.'}
        </Note>
        <View style={formStyles.row}>
          {SOURCES.filter((s) => s !== 'ai').map((source) => (
            <Action
              key={source}
              label={`${draft.source === source ? '✓ ' : ''}${t.sources[source]}`}
              secondary
              onPress={() => change({ source })}
            />
          ))}
        </View>
        <Note>{`${t.sources[draft.source]}${draft.estimate ? ' · ' + (isPt ? 'estimativa revisável' : 'reviewable estimate') : ''}`}</Note>
        <Toggle
          label={isPt ? 'Salvar como estimativa' : 'Save as estimate'}
          value={draft.estimate}
          onChange={(estimate) => change({ estimate })}
        />
        <Field
          label={
            isPt
              ? 'Volume de bebida vinculada (mL, opcional)'
              : 'Linked drink volume (mL, optional)'
          }
          value={draft.beverage}
          keyboardType="number-pad"
          onChangeText={(beverage) => change({ beverage })}
        />
        <Note>
          {isPt
            ? 'Para vitaminas e shakes: registre os nutrientes acima e o volume aqui uma única vez.'
            : 'For smoothies and shakes: log nutrients above and volume here once.'}
        </Note>
      </Panel>
      <MealWindowSelector
        selected={draft.mealWindow}
        onSelect={(mealWindow) => change({ mealWindow })}
        isPt={isPt}
      />
      <Panel title={isPt ? 'Foto e IA opcionais' : 'Optional photo and AI'}>
        <Field
          label={isPt ? 'Descrição e porções' : 'Description and portions'}
          value={draft.context}
          multiline
          maxLength={4000}
          onChangeText={(context) => change({ context })}
        />
        <View style={formStyles.row}>
          <Action
            label={isPt ? 'Câmera' : 'Camera'}
            secondary
            onPress={() => void pick(true)}
          />
          <Action
            label={isPt ? 'Galeria' : 'Library'}
            secondary
            onPress={() => void pick(false)}
          />
        </View>
        {draft.imageUri && (
          <>
            <Note>
              {isPt ? 'Foto anexada ao rascunho' : 'Photo attached to draft'}
            </Note>
            <Action
              label={isPt ? 'Remover foto' : 'Remove photo'}
              secondary
              onPress={() =>
                change({ imageUri: null, base64: null, channel: 'text' })
              }
            />
          </>
        )}
        <Action
          label={isPt ? 'Pedir estimativa de IA' : 'Request AI estimate'}
          busy={analyzing}
          disabled={!draft.context.trim() && !draft.base64}
          onPress={() => void requestAnalysis()}
        />
        {analyzing && (
          <Action
            label={
              isPt
                ? 'Cancelar e continuar manualmente'
                : 'Cancel and continue manually'
            }
            secondary
            onPress={() => {
              request.current?.abort();
              setAnalyzing(false);
            }}
          />
        )}
        {preview && (
          <Panel title={isPt ? 'Revise a proposta' : 'Review proposal'}>
            <Note>{preview.name}</Note>
            {NUTRIENTS.map((k) => (
              <Note
                key={k}
              >{`${t.nutrients[k]}: ${format(preview[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`) as keyof FoodAnalysisResult] as number | null)}`}</Note>
            ))}
            <Note>
              {isPt
                ? 'Confirme ou informe a porção. Valores de IA continuam estimativas.'
                : 'Confirm or provide the portion. AI values remain estimates.'}
            </Note>
            <Action
              label={
                isPt
                  ? 'Aplicar estimativa ao formulário'
                  : 'Apply estimate to form'
              }
              onPress={() => {
                const n = Object.fromEntries(
                  NUTRIENTS.map((k) => [
                    k,
                    preview[
                      k.replace(
                        /[A-Z]/g,
                        (c) => `_${c.toLowerCase()}`,
                      ) as keyof FoodAnalysisResult
                    ],
                  ]),
                ) as Nutrients;
                change({
                  name: preview.name,
                  values: Object.fromEntries(
                    NUTRIENTS.map((k) => [k, n[k] == null ? '' : String(n[k])]),
                  ) as Draft['values'],
                  source: 'ai',
                  sources: Object.fromEntries(
                    NUTRIENTS.filter((k) => n[k] != null).map((k) => [k, 'ai']),
                  ),
                  estimate: true,
                  portion:
                    preview.portion_amount == null
                      ? ''
                      : String(preview.portion_amount),
                  unit: preview.portion_unit ?? 'portion',
                  channel: draft.base64 ? 'image' : 'text',
                });
              }}
            />
          </Panel>
        )}
      </Panel>
      <OptionalDateTimePicker
        value={draft.at ? new Date(draft.at) : null}
        onChange={(date) => change({ at: date?.toISOString() ?? null })}
        isPt={isPt}
        isEditMode={!!id}
      />
      {error && <Note error>{error}</Note>}
      <Action
        label={
          editTemplate ? (isPt ? 'Salvar favorito' : 'Save favorite') : t.save
        }
        disabled={!ready}
        busy={saving}
        onPress={() => void save()}
      />
      {!id && !editTemplate && (
        <Action
          label={isPt ? 'Guardar como favorito' : 'Save as favorite'}
          secondary
          busy={saving}
          onPress={() => void save(true)}
        />
      )}
      {editTemplate && (
        <Action
          label={
            isPt
              ? 'Excluir favorito (mantém refeições antigas)'
              : 'Delete favorite (keeps previous meals)'
          }
          secondary
          onPress={() =>
            Alert.alert(
              isPt ? 'Excluir favorito?' : 'Delete favorite?',
              isPt
                ? 'Registros de consumo anteriores permanecem intactos.'
                : 'Previous consumption logs stay unchanged.',
              [
                { text: t.cancel, style: 'cancel' },
                {
                  text: isPt ? 'Excluir' : 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    void routineRepository
                      .removeTemplate(editTemplate)
                      .then(() => {
                        savedDraft.current = true;
                        expoDb.runSync(
                          'DELETE FROM form_drafts WHERE id=?',
                          draftKey,
                        );
                        router.back();
                      })
                      .catch((e) => setError(e.message));
                  },
                },
              ],
            )
          }
        />
      )}
    </Screen>
  );
}
