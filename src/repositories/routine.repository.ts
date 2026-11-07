import { and, desc, eq, isNull } from 'drizzle-orm';
import { activeOwner, db, expoDb, scopeGuard } from '@/db/client';
import {
  dailyCheckins,
  foodTemplates,
  supplementLogs,
  trainingDays,
  weightLogs,
  type FoodTemplate,
} from '@/db/schema';
import {
  scaleNutrients,
  validateNutrients,
  type Nutrients,
} from '@/domain/nutrition';
import { weeklyReview } from '@/domain/weekly-review';
import { addDays, lastNDateKeys, nowIso, toDateKey } from '@/utils/date';
import { generateId } from '@/utils/id';
import {
  dirty,
  foodSignature,
  logsRepository,
  resolveDateKey,
  validateFood,
  type AddFoodInput,
} from './logs.repository';
import { goalsRepository } from './goals.repository';
import { getPreference } from './preferences.repository';
async function templates() {
  return db
    .select()
    .from(foodTemplates)
    .where(isNull(foodTemplates.deletedAt))
    .orderBy(desc(foodTemplates.updatedAt))
    .limit(50);
}
async function saveTemplate(input: AddFoodInput, id?: string) {
  const food = validateFood(input);
  const amount = input.portionAmount ?? 1,
    unit = input.portionUnit ?? 'portion';
  const patch = {
    name: food.name,
    ...validateNutrients(food),
    portionAmount: amount,
    portionUnit: unit,
    beverageMl: input.beverageMl ?? null,
    nutritionSource: food.nutritionSource,
    isEstimate: food.isEstimate,
    nutrientSources: food.nutrientSources,
    ...dirty(),
  };
  if (id)
    return db
      .update(foodTemplates)
      .set(patch)
      .where(eq(foodTemplates.id, id))
      .returning()
      .get();
  return db
    .insert(foodTemplates)
    .values({ id: generateId(), ...patch })
    .returning()
    .get();
}
async function removeTemplate(id: string) {
  db.update(foodTemplates)
    .set({ ...dirty(), deletedAt: nowIso() })
    .where(eq(foodTemplates.id, id))
    .run();
}
function useTemplate(
  template: FoodTemplate,
  amount = template.portionAmount,
  unit = template.portionUnit,
): AddFoodInput {
  return {
    name: template.name,
    ...scaleNutrients(
      template as Nutrients,
      amount,
      template.portionAmount,
      unit,
      template.portionUnit,
    ),
    nutritionSource: template.nutritionSource,
    isEstimate: template.isEstimate,
    nutrientSources: template.nutrientSources,
    portionAmount: amount,
    portionUnit: unit,
    templateId: template.id,
    beverageMl:
      template.beverageMl === null
        ? null
        : Math.round((template.beverageMl * amount) / template.portionAmount),
  };
}
async function checkin(day = toDateKey(), confirmed = true, context = '') {
  const assertScope = scopeGuard();
  resolveDateKey(day);
  if (context.length > 300) throw new Error('Context too long');
  const summary = await logsRepository.getDailySummary(day);
  assertScope();
  if (confirmed && !summary.foodEntries)
    throw new Error(
      'Registre alimentação antes de confirmar / Log food before confirming',
    );
  const existing = db
    .select()
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.dateKey, day), isNull(dailyCheckins.deletedAt)))
    .get();
  const patch = {
    dateKey: day,
    confirmed,
    context,
    foodSignature: foodSignature(day),
    ...dirty(),
  };
  if (existing)
    db.update(dailyCheckins)
      .set(patch)
      .where(eq(dailyCheckins.id, existing.id))
      .run();
  else
    db.insert(dailyCheckins)
      .values({ id: generateId(), ...patch })
      .run();
}
async function addWeight(
  weightKg: number,
  dateKey = toDateKey(),
  occurredAt: string | null = nowIso(),
) {
  resolveDateKey(dateKey);
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000)
    throw new Error('Invalid weight');
  db.insert(weightLogs)
    .values({
      id: generateId(),
      weightKg,
      dateKey,
      occurredAt,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown',
      ...dirty(),
    })
    .run();
}
async function addCreatine(doseG: number, dateKey = toDateKey()) {
  resolveDateKey(dateKey);
  if (!Number.isFinite(doseG) || doseG < 0 || doseG > 100)
    throw new Error('Invalid dose');
  db.insert(supplementLogs)
    .values({ id: generateId(), doseG, dateKey, ...dirty() })
    .run();
}
async function training(
  dateKey = toDateKey(),
  durationMin: number | null = null,
  note = '',
) {
  resolveDateKey(dateKey);
  if (
    (durationMin !== null &&
      (!Number.isFinite(durationMin) ||
        durationMin <= 0 ||
        durationMin > 1440)) ||
    note.length > 300
  )
    throw new Error('Invalid training');
  const existing = db
    .select()
    .from(trainingDays)
    .where(
      and(eq(trainingDays.dateKey, dateKey), isNull(trainingDays.deletedAt)),
    )
    .get();
  if (existing)
    db.update(trainingDays)
      .set({ durationMin, note, ...dirty() })
      .where(eq(trainingDays.id, existing.id))
      .run();
  else
    db.insert(trainingDays)
      .values({ id: generateId(), dateKey, durationMin, note, ...dirty() })
      .run();
}
async function removeRoutine(
  type: 'weight' | 'creatine' | 'training',
  id: string,
) {
  const table =
    type === 'weight'
      ? weightLogs
      : type === 'creatine'
        ? supplementLogs
        : trainingDays;
  db.update(table)
    .set({ ...dirty(), deletedAt: nowIso() })
    .where(eq(table.id, id))
    .run();
}
export interface RoutineHistoryItem {
  id: string;
  dateKey: string;
  value: number | null;
  note: string;
}
async function history(
  type: 'weight' | 'creatine' | 'training',
  cursor?: { dateKey: string; id: string },
): Promise<RoutineHistoryItem[]> {
  const [table, column] =
    type === 'weight'
      ? ['weight_logs', 'weight_kg']
      : type === 'creatine'
        ? ['supplement_logs', 'dose_g']
        : ['training_days', 'duration_min'];
  const where = cursor
    ? ' AND (date_key < ? OR (date_key = ? AND id < ?))'
    : '';
  return expoDb.getAllSync<RoutineHistoryItem>(
    `SELECT id,date_key dateKey,${column} value,${type === 'training' ? 'note' : "''"} note FROM ${table} WHERE deleted_at IS NULL${where} ORDER BY date_key DESC,id DESC LIMIT 50`,
    ...(cursor ? [cursor.dateKey, cursor.dateKey, cursor.id] : []),
  );
}
async function overview(end = toDateKey()) {
  const keys = lastNDateKeys(21, end),
    start = keys[0];
  const weights = expoDb.getAllSync<{
    id: string;
    dateKey: string;
    weightKg: number;
  }>(
    'SELECT id,date_key dateKey,weight_kg weightKg FROM weight_logs WHERE date_key BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY date_key',
    start,
    end,
  );
  const summaries = await logsRepository.summaries(start, end);
  const contexts = expoDb.getAllSync<{ date_key: string; context: string }>(
    'SELECT date_key,context FROM daily_checkins WHERE date_key BETWEEN ? AND ? AND deleted_at IS NULL',
    start,
    end,
  );
  const firstCreatine = expoDb.getFirstSync<{ day: string }>(
    'SELECT min(date_key) day FROM supplement_logs WHERE deleted_at IS NULL AND dose_g>0',
  )?.day;
  const plans = await goalsRepository.plans();
  const latest = plans.sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  )[0];
  const review = weeklyReview(
    keys,
    weights,
    summaries.map((s) => ({
      dateKey: s.dateKey,
      confirmed: s.confirmed,
      energyComplete: s.calories.coverage.complete,
      context: contexts.find((c) => c.date_key === s.dateKey)?.context,
    })),
    {
      blocked:
        getPreference('professionalOnly', false) ||
        (!!firstCreatine && firstCreatine >= addDays(end, -14)),
      adjustedRecently:
        !!latest &&
        latest.source === 'review' &&
        latest.effectiveFrom >= addDays(end, -14),
      minRate: getPreference('weeklyMinRate', 0.0025),
      maxRate: getPreference('weeklyMaxRate', 0.005),
    },
  );
  const week = weights.filter((w) => w.dateKey >= addDays(end, -6));
  const dates = [...new Set(week.map((w) => w.dateKey))];
  const mean = dates.length
    ? dates.reduce((sum, day) => {
        const values = week.filter((w) => w.dateKey === day);
        return sum + values.reduce((a, w) => a + w.weightKg, 0) / values.length;
      }, 0) / dates.length
    : null;
  return {
    weights,
    weekMean: mean,
    weekCount: week.length,
    weekDays: dates.length,
    review,
    creatine: expoDb.getAllSync<{ id: string; doseG: number; dateKey: string }>(
      'SELECT id,dose_g doseG,date_key dateKey FROM supplement_logs WHERE deleted_at IS NULL AND date_key BETWEEN ? AND ? ORDER BY date_key DESC',
      start,
      end,
    ),
    training: expoDb.getAllSync<{
      id: string;
      dateKey: string;
      durationMin: number | null;
      note: string;
    }>(
      'SELECT id,date_key dateKey,duration_min durationMin,note FROM training_days WHERE deleted_at IS NULL AND date_key BETWEEN ? AND ? ORDER BY date_key DESC',
      start,
      end,
    ),
    ownerId: activeOwner,
  };
}
export const routineRepository = {
  templates,
  saveTemplate,
  removeTemplate,
  useTemplate,
  checkin,
  addWeight,
  addCreatine,
  training,
  removeRoutine,
  overview,
  history,
};
