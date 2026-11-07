import { and, desc, eq, isNull } from 'drizzle-orm';
import { activeOwner, db, expoDb, scopeGuard } from '@/db/client';
import {
  foodLogs,
  waterLogs,
  type EntryMethod,
  type FoodLog,
  type MealWindow,
  type WaterLog,
} from '@/db/schema';
import {
  NUTRIENTS,
  SOURCES,
  validateNutrients,
  eligibleAverage,
  goalState,
  selectPlan,
  type Coverage,
  type Nutrients,
  type NutritionSource,
} from '@/domain/nutrition';
import {
  addDays,
  fromDateKey,
  dateKeysInRange,
  isValidDateKey,
  lastNDateKeys,
  nowIso,
  toDateKey,
} from '@/utils/date';
import { generateId } from '@/utils/id';
import { goalsRepository, type Goals } from './goals.repository';
import { assertPositiveInt } from './validation';
export type { FoodLog, WaterLog, MealWindow };
export interface AddWaterInput {
  amountMl: number;
  category?: string;
  dateKey?: string;
  ingestedAt?: Date | string | null;
}
export type UpdateWaterInput = AddWaterInput;
export interface AddFoodInput extends Partial<Nutrients> {
  name: string;
  entryMethod?: EntryMethod;
  mealWindow?: MealWindow;
  imageUri?: string | null;
  nutritionSource?: NutritionSource;
  inputChannel?: 'text' | 'image';
  isEstimate?: boolean;
  nutrientSources?: string | null;
  portionAmount?: number | null;
  portionUnit?: string | null;
  templateId?: string | null;
  dateKey?: string;
  ingestedAt?: Date | string | null;
  beverageMl?: number | null;
  beverageCategory?: string;
}
export type UpdateFoodInput = AddFoodInput;
export interface HistoryCursor {
  occurredAt: string;
  id: string;
  type: string;
}
export interface HistoryFilters {
  type?: 'all' | 'water' | 'food';
  searchQuery?: string;
  dateKey?: string | null;
  cursor?: HistoryCursor;
}
export type AnalyticsPeriod = '7d' | '14d' | '30d';
export interface AnalyticsPeriodRange {
  startDateKey: string;
  endDateKey: string;
}
export type AnalyticsPeriodInput = AnalyticsPeriod | AnalyticsPeriodRange;
export type UnifiedLogItem =
  (FoodLog & { type: 'food' }) | (WaterLog & { type: 'water' });
export interface MacroProgress {
  consumed: number;
  goal: number;
  remaining: number;
  percent: number;
  met: boolean;
  coverage: Coverage;
  state: ReturnType<typeof goalState>;
}
export interface DailySummary {
  dateKey: string;
  protein: MacroProgress;
  calories: MacroProgress;
  water: MacroProgress;
  nutrients: Record<(typeof NUTRIENTS)[number], Coverage>;
  foodEntries: number;
  waterEntries: number;
  confirmed: boolean;
  goalsKnown: boolean;
}
export interface DayConsistency {
  dateKey: string;
  proteinG: number;
  caloriesKcal: number;
  waterMl: number;
  proteinGoalMet: boolean;
  waterGoalMet: boolean;
  bothGoalsMet: boolean;
  confirmed: boolean;
  hasLogs: boolean;
  proteinComplete: boolean;
  caloriesComplete: boolean;
  goals: Goals | null;
}
export interface WeeklyConsistency {
  startDateKey: string;
  endDateKey: string;
  totalDays: number;
  proteinDaysMet: number;
  waterDaysMet: number;
  bothGoalsMetDays: number;
  goals: Goals;
  days: DayConsistency[];
}
export interface AnalyticsKPIs {
  nutrientAverages: Record<
    (typeof NUTRIENTS)[number],
    { value: number | null; days: number }
  >;
  avgProteinG: number | null;
  avgWaterMl: number | null;
  avgCaloriesKcal: number | null;
  proteinSuccessRate: number;
  waterSuccessRate: number;
  bothSuccessRate: number;
  currentStreak: number;
  totalDays: number;
  daysWithLogs: number;
  proteinDays: number;
  calorieDays: number;
  waterDays: number;
}
export interface DailySeriesPoint {
  nutrients: Record<(typeof NUTRIENTS)[number], Coverage>;
  dateKey: string;
  label: string;
  proteinG: number;
  waterMl: number;
  caloriesKcal: number;
  hitProteinGoal: boolean;
  hitWaterGoal: boolean;
  hitBothGoals: boolean;
  confirmed: boolean;
  hasLogs: boolean;
  proteinComplete: boolean;
  caloriesComplete: boolean;
  goalsKnown: boolean;
  proteinKnown: number;
  caloriesKnown: number;
}
export interface MealWindowBreakdownItem {
  window: MealWindow;
  proteinG: number;
  caloriesKcal: number;
  proteinPercent: number;
  caloriesPercent: number;
  entriesCount: number;
}
export interface AnalyticsData {
  period: AnalyticsPeriod | 'custom';
  startDateKey: string;
  endDateKey: string;
  goals: Goals;
  kpis: AnalyticsKPIs;
  dailySeries: DailySeriesPoint[];
  mealWindowBreakdown: MealWindowBreakdownItem[];
}

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
export function resolveDateKey(key = toDateKey()) {
  if (!isValidDateKey(key)) throw new Error('Data inválida / Invalid date');
  return key;
}
export function occurrence(
  input: { dateKey?: string; ingestedAt?: Date | string | null },
  fallback?: { dateKey: string; occurredAt: string; timeZone: string },
) {
  const date = input.ingestedAt ? new Date(input.ingestedAt) : null;
  if (date && !Number.isFinite(date.getTime()))
    throw new Error('Invalid timestamp');
  if (date && fallback && date.getTime() === Date.parse(fallback.occurredAt))
    return {
      dateKey: fallback.dateKey,
      occurredAt: fallback.occurredAt,
      timeZone: fallback.timeZone,
    };
  const dateKey = date
    ? toDateKey(date)
    : resolveDateKey(input.dateKey ?? fallback?.dateKey);
  return {
    dateKey,
    occurredAt:
      date?.toISOString() ??
      fallback?.occurredAt ??
      (input.dateKey && input.dateKey !== toDateKey()
        ? new Date(`${dateKey}T12:00:00`).toISOString()
        : nowIso()),
    timeZone:
      (!date ? fallback?.timeZone : null) ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      'unknown',
  };
}
export function dirty(
  groupId: string | null = null,
  operationId = generateId(),
) {
  return {
    ownerId: activeOwner,
    updatedAt: nowIso(),
    isSynced: false,
    operationId,
    groupId,
  };
}
export function foodSignature(day: string): string {
  return (
    expoDb.getFirstSync<{ signature: string }>(
      `SELECT coalesce(group_concat(part,'|'),'') signature FROM (SELECT id || ':' || coalesce(operation_id,updated_at) part FROM food_logs WHERE date_key=? AND deleted_at IS NULL ORDER BY id)`,
      day,
    )?.signature ?? ''
  );
}
function reopen(day: string) {
  expoDb.runSync(
    'UPDATE daily_checkins SET confirmed=0,updated_at=?,is_synced=0,operation_id=? WHERE date_key=?',
    nowIso(),
    generateId(),
    day,
  );
}
export function validateFood(input: AddFoodInput) {
  if (
    typeof input.name !== 'string' ||
    !input.name.trim() ||
    input.name.trim().length > 200
  )
    throw new Error(
      'Nome obrigatório, até 200 caracteres / Name required, up to 200 characters',
    );
  const nutrients = validateNutrients(input);
  const source = input.nutritionSource ?? 'manual';
  if (!SOURCES.includes(source)) throw new Error('Invalid source');
  if (
    input.mealWindow &&
    !['breakfast', 'lunch', 'dinner', 'snack'].includes(input.mealWindow)
  )
    throw new Error('Invalid meal window');
  if (input.inputChannel && !['text', 'image'].includes(input.inputChannel))
    throw new Error('Invalid channel');
  if (
    input.portionAmount != null &&
    (!Number.isFinite(input.portionAmount) || input.portionAmount <= 0)
  )
    throw new Error('Invalid portion');
  if (
    input.portionUnit != null &&
    !['g', 'ml', 'portion'].includes(input.portionUnit)
  )
    throw new Error('Invalid unit');
  if ((input.portionAmount == null) !== (input.portionUnit == null))
    throw new Error('Specify portion amount and unit');
  if (input.nutrientSources) {
    const sources = JSON.parse(input.nutrientSources);
    if (
      !sources ||
      typeof sources !== 'object' ||
      Array.isArray(sources) ||
      Object.entries(sources).some(
        ([k, v]) =>
          !NUTRIENTS.includes(k as (typeof NUTRIENTS)[number]) ||
          !SOURCES.includes(v as NutritionSource),
      )
    )
      throw new Error('Invalid nutrient sources');
  }
  if (input.beverageMl != null)
    assertPositiveInt(input.beverageMl, 'beverageMl');
  return {
    ...nutrients,
    name: input.name.trim(),
    nutritionSource: source,
    inputChannel: input.inputChannel ?? ('text' as const),
    isEstimate: input.isEstimate ?? source === 'ai',
    nutrientSources: input.nutrientSources ?? null,
    entryMethod: input.entryMethod ?? ('manual' as const),
    mealWindow: input.mealWindow ?? ('lunch' as const),
    portionAmount: input.portionAmount ?? null,
    portionUnit: input.portionUnit ?? null,
    templateId: input.templateId ?? null,
    imageUri: input.imageUri ?? null,
  };
}
async function addWater(input: AddWaterInput): Promise<WaterLog> {
  assertPositiveInt(input.amountMl, 'amountMl');
  if (!['water', 'tea', 'coffee', 'other'].includes(input.category ?? 'water'))
    throw new Error(
      'Bebida calórica deve ser uma refeição / Log caloric drinks as food',
    );
  return db
    .insert(waterLogs)
    .values({
      id: generateId(),
      amountMl: input.amountMl,
      category: input.category ?? 'water',
      ...occurrence(input),
      ...dirty(),
    })
    .returning()
    .get();
}
async function getFoodLogById(id: string) {
  return (
    db
      .select()
      .from(foodLogs)
      .where(and(eq(foodLogs.id, id), isNull(foodLogs.deletedAt)))
      .get() ?? null
  );
}
async function getWaterLogById(id: string) {
  return (
    db
      .select()
      .from(waterLogs)
      .where(and(eq(waterLogs.id, id), isNull(waterLogs.deletedAt)))
      .get() ?? null
  );
}
async function writeFood(input: AddFoodInput, id?: string): Promise<FoodLog> {
  const assertScope = scopeGuard();
  const values = validateFood(input);
  const existing = id ? await getFoodLogById(id) : null;
  assertScope();
  if (id && !existing) throw new Error('Registro inexistente / Log not found');
  const foodId = id ?? generateId();
  const time = occurrence(input, existing ?? undefined);
  const linked = db
    .select()
    .from(waterLogs)
    .where(eq(waterLogs.foodLogId, foodId))
    .get();
  const hasBeverage =
    input.beverageMl != null || (!!linked && input.beverageMl === undefined);
  const group = hasBeverage || linked ? foodId : null;
  const patch = dirty(group);
  let result!: FoodLog;
  db.transaction((tx) => {
    if (existing)
      result = tx
        .update(foodLogs)
        .set({ ...values, ...time, ...patch })
        .where(eq(foodLogs.id, foodId))
        .returning()
        .get();
    else
      result = tx
        .insert(foodLogs)
        .values({ id: foodId, ...values, ...time, ...patch })
        .returning()
        .get();
    if (hasBeverage) {
      const drink = {
        amountMl: input.beverageMl ?? linked!.amountMl,
        category: input.beverageCategory ?? linked?.category ?? 'caloric',
        foodLogId: foodId,
        ...time,
        ...patch,
        deletedAt: null,
      };
      if (linked)
        tx.update(waterLogs)
          .set(drink)
          .where(eq(waterLogs.id, linked.id))
          .run();
      else
        tx.insert(waterLogs)
          .values({ id: generateId(), ...drink })
          .run();
    } else if (linked)
      tx.update(waterLogs)
        .set({ ...patch, deletedAt: nowIso() })
        .where(eq(waterLogs.id, linked.id))
        .run();
    reopen(time.dateKey);
    if (existing && existing.dateKey !== time.dateKey) reopen(existing.dateKey);
  });
  return result;
}
async function addFood(input: AddFoodInput) {
  return writeFood(input);
}
async function updateFoodLog(id: string, input: UpdateFoodInput) {
  return writeFood(input, id);
}
async function updateWaterLog(id: string, input: UpdateWaterInput) {
  const assertScope = scopeGuard();
  assertPositiveInt(input.amountMl, 'amountMl');
  const existing = await getWaterLogById(id);
  assertScope();
  if (!existing) return null;
  if (existing.foodLogId)
    throw new Error('Edite a refeição vinculada / Edit the linked meal');
  return db
    .update(waterLogs)
    .set({
      amountMl: input.amountMl,
      category: input.category ?? existing.category,
      ...occurrence(input, existing),
      ...dirty(),
    })
    .where(eq(waterLogs.id, id))
    .returning()
    .get();
}
async function removeFood(id: string) {
  const assertScope = scopeGuard();
  const food = await getFoodLogById(id);
  assertScope();
  if (!food) return;
  const patch = { ...dirty(food.groupId), deletedAt: nowIso() };
  db.transaction((tx) => {
    tx.update(foodLogs).set(patch).where(eq(foodLogs.id, id)).run();
    tx.update(waterLogs).set(patch).where(eq(waterLogs.foodLogId, id)).run();
    reopen(food.dateKey);
  });
}
async function removeWater(id: string) {
  const assertScope = scopeGuard();
  const row = await getWaterLogById(id);
  assertScope();
  if (!row) return;
  if (row.foodLogId) return removeFood(row.foodLogId);
  db.update(waterLogs)
    .set({ ...dirty(), deletedAt: nowIso() })
    .where(eq(waterLogs.id, id))
    .run();
}
async function deleteLog(id: string, type: 'water' | 'food') {
  return type === 'food' ? removeFood(id) : removeWater(id);
}
function foodLogsByDateQuery(day = toDateKey()) {
  return db
    .select()
    .from(foodLogs)
    .where(and(eq(foodLogs.dateKey, day), isNull(foodLogs.deletedAt)))
    .orderBy(desc(foodLogs.occurredAt), desc(foodLogs.id));
}
function waterLogsByDateQuery(day = toDateKey()) {
  return db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.dateKey, day), isNull(waterLogs.deletedAt)))
    .orderBy(desc(waterLogs.occurredAt), desc(waterLogs.id));
}
async function recentMeal(day = toDateKey()) {
  return foodLogsByDateQuery(day).limit(1).get() ?? null;
}

function progress(
  coverage: Coverage,
  goal: number | null,
  mode: 'reference' | 'energy' | 'limit' = 'reference',
): MacroProgress {
  const state = goalState(coverage, goal, mode);
  return {
    consumed: coverage.total,
    goal: goal ?? 0,
    remaining: Math.max(0, (goal ?? 0) - coverage.total),
    percent: goal ? (coverage.total / goal) * 100 : 0,
    met: state === 'within',
    coverage,
    state,
  };
}
async function summaries(start: string, end: string): Promise<DailySummary[]> {
  const aggregate = NUTRIENTS.map(
    (k) => `coalesce(sum(${snake(k)}),0) ${k},count(${snake(k)}) ${k}Known`,
  ).join(',');
  const food = expoDb.getAllSync<Record<string, number | string>>(
    `SELECT date_key, count(*) entries, ${aggregate} FROM food_logs WHERE date_key BETWEEN ? AND ? AND deleted_at IS NULL GROUP BY date_key`,
    start,
    end,
  );
  const water = expoDb.getAllSync<{
    date_key: string;
    total: number;
    entries: number;
  }>(
    `SELECT date_key,sum(amount_ml) total,count(*) entries FROM water_logs WHERE date_key BETWEEN ? AND ? AND deleted_at IS NULL GROUP BY date_key`,
    start,
    end,
  );
  const checks = expoDb.getAllSync<{
    date_key: string;
    confirmed: number;
    food_signature: string;
  }>(
    `SELECT date_key,confirmed,food_signature FROM daily_checkins WHERE date_key BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY updated_at`,
    start,
    end,
  );
  const planList = await goalsRepository.plans();
  const foodMap = new Map(food.map((r) => [r.date_key, r]));
  const waterMap = new Map(water.map((r) => [r.date_key, r]));
  const checkMap = new Map(checks.map((r) => [r.date_key, r]));
  return dateKeysInRange(start, end).map((day) => {
    const f = foodMap.get(day);
    const w = waterMap.get(day);
    const check = checkMap.get(day);
    const plan = selectPlan(planList, day);
    const nutrients = Object.fromEntries(
      NUTRIENTS.map((k) => {
        const entries = Number(f?.entries ?? 0);
        const known = Number(f?.[`${k}Known`] ?? 0);
        return [
          k,
          {
            total: Number(f?.[k] ?? 0),
            entries,
            known,
            complete: entries > 0 && known === entries,
          },
        ];
      }),
    ) as DailySummary['nutrients'];
    const wc = {
      total: w?.total ?? 0,
      known: w?.entries ?? 0,
      entries: w?.entries ?? 0,
      complete: !!w?.entries,
    };
    return {
      dateKey: day,
      protein: progress(nutrients.proteinG, plan?.proteinGoal ?? null),
      calories: progress(
        nutrients.caloriesKcal,
        plan?.caloriesGoal ?? null,
        'energy',
      ),
      water: progress(wc, plan?.waterGoal ?? null),
      nutrients,
      foodEntries: Number(f?.entries ?? 0),
      waterEntries: w?.entries ?? 0,
      confirmed:
        !!check?.confirmed && check.food_signature === foodSignature(day),
      goalsKnown: !!plan,
    };
  });
}
async function getDailySummary(day = toDateKey()) {
  const key = resolveDateKey(day);
  return (await summaries(key, key))[0];
}
async function getWeeklyConsistency(
  end = toDateKey(),
  days = 7,
): Promise<WeeklyConsistency> {
  const keys = lastNDateKeys(days, resolveDateKey(end));
  const list = await summaries(keys[0], end);
  const plans = await goalsRepository.plans();
  const rows = list.map((s) => ({
    dateKey: s.dateKey,
    proteinG: s.protein.consumed,
    caloriesKcal: s.calories.consumed,
    waterMl: s.water.consumed,
    proteinGoalMet: s.confirmed && s.protein.met,
    waterGoalMet: s.water.met,
    bothGoalsMet: s.confirmed && s.protein.met && s.calories.met,
    confirmed: s.confirmed,
    hasLogs: !!(s.foodEntries + s.waterEntries),
    proteinComplete: s.nutrients.proteinG.complete,
    caloriesComplete: s.nutrients.caloriesKcal.complete,
    goals: selectPlan(plans, s.dateKey) as Goals | null,
  }));
  return {
    startDateKey: keys[0],
    endDateKey: end,
    totalDays: days,
    proteinDaysMet: rows.filter((d) => d.proteinGoalMet).length,
    waterDaysMet: rows.filter((d) => d.waterGoalMet).length,
    bothGoalsMetDays: rows.filter((d) => d.bothGoalsMet).length,
    goals: await goalsRepository.get(),
    days: rows,
  };
}
async function calculateCurrentStreak(
  end: string = toDateKey(),
): Promise<number> {
  const days = expoDb.getAllSync<{ date_key: string }>(
    `SELECT date_key FROM (SELECT date_key FROM food_logs WHERE deleted_at IS NULL UNION SELECT date_key FROM water_logs WHERE deleted_at IS NULL) WHERE date_key<=? ORDER BY date_key DESC`,
    end,
  );
  const set = new Set(days.map((d) => d.date_key));
  let day = set.has(end) ? end : addDays(end, -1);
  let count = 0;
  while (set.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
async function getLogsHistory(
  filters: HistoryFilters = {},
): Promise<UnifiedLogItem[]> {
  const params: (string | number)[] = [];
  const where: string[] = ['deleted_at IS NULL'];
  if (filters.dateKey) {
    where.push('date_key=?');
    params.push(resolveDateKey(filters.dateKey));
  }
  if (filters.searchQuery?.trim()) {
    where.push("name LIKE ? ESCAPE '\\'");
    params.push(`%${filters.searchQuery.trim().replace(/[\\%_]/g, '\\$&')}%`);
  }
  if (filters.type && filters.type !== 'all') {
    where.push('type=?');
    params.push(filters.type);
  }
  if (filters.cursor) {
    where.push(
      '(occurred_at < ? OR (occurred_at=? AND (id < ? OR (id=? AND type < ?))))',
    );
    params.push(
      filters.cursor.occurredAt,
      filters.cursor.occurredAt,
      filters.cursor.id,
      filters.cursor.id,
      filters.cursor.type,
    );
  }
  // Only the first 50 keys are materialized; records are fetched by PK after the UNION.
  const keys = expoDb.getAllSync<{ id: string; type: 'food' | 'water' }>(
    `SELECT id,type FROM (
    SELECT id,'food' type,name,date_key,occurred_at,deleted_at FROM food_logs
    UNION ALL SELECT id,'water' type,category name,date_key,occurred_at,deleted_at FROM water_logs)
    WHERE ${where.join(' AND ')} ORDER BY occurred_at DESC,id DESC,type DESC LIMIT 50`,
    ...params,
  );
  return keys.map((k) =>
    k.type === 'food'
      ? {
          ...db.select().from(foodLogs).where(eq(foodLogs.id, k.id)).get()!,
          type: 'food' as const,
        }
      : {
          ...db.select().from(waterLogs).where(eq(waterLogs.id, k.id)).get()!,
          type: 'water' as const,
        },
  );
}
async function getAnalyticsData(
  input: AnalyticsPeriodInput = '7d',
): Promise<AnalyticsData> {
  const end =
    typeof input === 'string' ? toDateKey() : resolveDateKey(input.endDateKey);
  const start =
    typeof input === 'string'
      ? addDays(end, -(Number.parseInt(input) - 1))
      : resolveDateKey(input.startDateKey);
  if (
    start > end ||
    fromDateKey(end).getTime() - fromDateKey(start).getTime() > 365 * 86400000
  )
    throw new Error('Invalid period');
  const list = await summaries(start, end);
  const goals = await goalsRepository.get();
  const protein = list.filter(
    (s) => s.confirmed && s.protein.coverage.complete,
  );
  const calories = list.filter(
    (s) => s.confirmed && s.calories.coverage.complete,
  );
  const water = list.filter((s) => s.waterEntries > 0);
  const avg = (days: DailySummary[], key: 'protein' | 'calories' | 'water') =>
    days.length
      ? days.reduce((a, s) => a + s[key].consumed, 0) / days.length
      : null;
  const windows = expoDb.getAllSync<{
    window: MealWindow;
    proteinG: number;
    caloriesKcal: number;
    entriesCount: number;
  }>(
    'SELECT meal_window "window",coalesce(sum(protein_g),0) proteinG,coalesce(sum(calories_kcal),0) caloriesKcal,count(*) entriesCount FROM food_logs WHERE date_key BETWEEN ? AND ? AND deleted_at IS NULL GROUP BY meal_window',
    start,
    end,
  );
  const pTotal = windows.reduce((a, w) => a + w.proteinG, 0),
    eTotal = windows.reduce((a, w) => a + w.caloriesKcal, 0);
  const rate = (n: number, d: number) => (d ? (n / d) * 100 : 0);
  return {
    period: typeof input === 'string' ? input : 'custom',
    startDateKey: start,
    endDateKey: end,
    goals,
    kpis: {
      nutrientAverages: Object.fromEntries(
        NUTRIENTS.map((key) => [
          key,
          eligibleAverage(
            list.map((day) => ({
              confirmed: day.confirmed,
              coverage: day.nutrients[key],
            })),
          ),
        ]),
      ) as AnalyticsKPIs['nutrientAverages'],
      avgProteinG: avg(protein, 'protein'),
      avgCaloriesKcal: avg(calories, 'calories'),
      avgWaterMl: avg(water, 'water'),
      proteinDays: protein.length,
      calorieDays: calories.length,
      waterDays: water.length,
      proteinSuccessRate: rate(
        protein.filter((s) => s.protein.met).length,
        protein.length,
      ),
      waterSuccessRate: rate(
        water.filter((s) => s.water.met).length,
        water.length,
      ),
      bothSuccessRate: rate(
        list.filter((s) => s.confirmed && s.protein.met && s.calories.met)
          .length,
        protein.length,
      ),
      currentStreak: await calculateCurrentStreak(),
      totalDays: list.length,
      daysWithLogs: list.filter((s) => s.foodEntries + s.waterEntries > 0)
        .length,
    },
    dailySeries: list.map((s) => ({
      dateKey: s.dateKey,
      nutrients: s.nutrients,
      label: s.dateKey.slice(5),
      proteinG: s.protein.consumed,
      waterMl: s.water.consumed,
      caloriesKcal: s.calories.consumed,
      hitProteinGoal: s.confirmed && s.protein.met,
      hitWaterGoal: s.water.met,
      hitBothGoals: s.confirmed && s.protein.met && s.calories.met,
      confirmed: s.confirmed,
      hasLogs: !!(s.foodEntries + s.waterEntries),
      proteinComplete: s.protein.coverage.complete,
      caloriesComplete: s.calories.coverage.complete,
      goalsKnown: s.goalsKnown,
      proteinKnown: s.nutrients.proteinG.known,
      caloriesKnown: s.nutrients.caloriesKcal.known,
    })),
    mealWindowBreakdown: windows.map((w) => ({
      ...w,
      proteinPercent: rate(w.proteinG, pTotal),
      caloriesPercent: rate(w.caloriesKcal, eTotal),
    })),
  };
}
export const logsRepository = {
  addWater,
  addWaterLog: addWater,
  addFood,
  addFoodLog: addFood,
  getWaterLogById,
  getFoodLogById,
  updateWaterLog,
  updateFoodLog,
  removeWater,
  removeFood,
  deleteLog,
  getLogsHistory,
  getAnalyticsData,
  waterLogsByDateQuery,
  foodLogsByDateQuery,
  recentMeal,
  getDailySummary,
  getWeeklyConsistency,
  calculateCurrentStreak,
  summaries,
};
