import { and, between, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { foodLogs, waterLogs, type EntryMethod, type FoodLog, type MealWindow, type WaterLog } from '@/db/schema';

import { addDays, dateKeysInRange, isValidDateKey, lastNDateKeys, nowIso, toDateKey } from '@/utils/date';
import { generateId } from '@/utils/id';

import { goalsRepository, type Goals } from './goals.repository';
import {
  ValidationError,
  assertNonEmpty,
  assertNonNegativeNumber,
  assertPositiveInt,
} from './validation';

export type { FoodLog, WaterLog, MealWindow };

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export interface AddWaterInput {
  amountMl: number;
  /** Default: hoje (fuso local). Permite lançar retroativamente. */
  dateKey?: string;
  /** Data e horário opcional da ingestão. Se omitido, usa momento atual. */
  ingestedAt?: Date | string | null;
}

export interface UpdateWaterInput {
  amountMl: number;
  dateKey?: string;
  ingestedAt?: Date | string | null;
}

export interface AddFoodInput {
  name: string;
  proteinG: number;
  caloriesKcal: number;
  entryMethod?: EntryMethod;
  mealWindow?: MealWindow;
  imageUri?: string | null;
  dateKey?: string;
  /** Data e horário opcional da ingestão. Se omitido, usa momento atual. */
  ingestedAt?: Date | string | null;
}

export interface UpdateFoodInput {
  name: string;
  proteinG: number;
  caloriesKcal: number;
  mealWindow?: MealWindow;
  imageUri?: string | null;
  entryMethod?: EntryMethod;
  dateKey?: string;
  ingestedAt?: Date | string | null;
}

export interface HistoryFilters {
  type?: 'all' | 'water' | 'food';
  searchQuery?: string;
  dateKey?: string | null;
}

export type AnalyticsPeriod = '7d' | '14d' | '30d';

export interface AnalyticsPeriodRange {
  startDateKey: string;
  endDateKey: string;
}

export type AnalyticsPeriodInput = AnalyticsPeriod | AnalyticsPeriodRange;

export interface AnalyticsKPIs {
  avgProteinG: number;
  avgWaterMl: number;
  avgCaloriesKcal: number;
  proteinSuccessRate: number; // 0..100 (%)
  waterSuccessRate: number; // 0..100 (%)
  bothSuccessRate: number; // 0..100 (%)
  currentStreak: number;
  totalDays: number;
  daysWithLogs: number;
}

export interface DailySeriesPoint {
  dateKey: string;
  label: string;
  proteinG: number;
  waterMl: number;
  caloriesKcal: number;
  hitProteinGoal: boolean;
  hitWaterGoal: boolean;
  hitBothGoals: boolean;
}

export interface MealWindowBreakdownItem {
  window: MealWindow;
  proteinG: number;
  caloriesKcal: number;
  proteinPercent: number; // 0..100 (%)
  caloriesPercent: number; // 0..100 (%)
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

export type UnifiedLogItem =
  | {
      id: string;
      type: 'food';
      name: string;
      proteinG: number;
      caloriesKcal: number;
      entryMethod: EntryMethod;
      mealWindow: MealWindow;
      imageUri?: string | null;
      dateKey: string;
      createdAt: string;
      updatedAt: string;
    }
  | {
      id: string;
      type: 'water';
      amountMl: number;
      dateKey: string;
      createdAt: string;
      updatedAt: string;
    };

export interface MacroProgress {
  consumed: number;
  goal: number;
  remaining: number;
  /** 0..∞ (não limitado a 100 para permitir UI de "excedeu"). */
  percent: number;
  met: boolean;
}

export interface DailySummary {
  dateKey: string;
  protein: MacroProgress;
  calories: MacroProgress;
  water: MacroProgress;
  foodEntries: number;
  waterEntries: number;
}

export interface DayConsistency {
  dateKey: string;
  proteinG: number;
  caloriesKcal: number;
  waterMl: number;
  proteinGoalMet: boolean;
  waterGoalMet: boolean;
  /** Proteína >= meta E água >= meta. */
  bothGoalsMet: boolean;
}

export interface WeeklyConsistency {
  startDateKey: string;
  endDateKey: string;
  totalDays: number;
  proteinDaysMet: number;
  waterDaysMet: number;
  bothGoalsMetDays: number;
  goals: Goals;
  /** Ordem cronológica, inclui dias sem registro (zerados). */
  days: DayConsistency[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

const notDeletedWater = isNull(waterLogs.deletedAt);
const notDeletedFood = isNull(foodLogs.deletedAt);

function resolveDateKey(dateKey?: string): string {
  const key = dateKey ?? toDateKey();
  if (!isValidDateKey(key)) throw new ValidationError(`dateKey inválido: ${key}`, 'dateKey');
  return key;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function buildProgress(consumed: number, goal: number): MacroProgress {
  return {
    consumed,
    goal,
    remaining: Math.max(goal - consumed, 0),
    percent: goal > 0 ? Math.round((consumed / goal) * 100) : 0,
    met: goal > 0 && consumed >= goal,
  };
}

function parseIngestedAt(ingestedAt?: Date | string | null): Date | null {
  if (!ingestedAt) return null;
  const d = typeof ingestedAt === 'string' ? new Date(ingestedAt) : ingestedAt;
  return isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Escrita
// ─────────────────────────────────────────────────────────────────────────────

async function addWater(input: AddWaterInput): Promise<WaterLog> {
  assertPositiveInt(input.amountMl, 'amountMl');
  const now = new Date();
  const customDate = parseIngestedAt(input.ingestedAt);
  const effectiveDate = customDate ?? now;
  const createdAt = effectiveDate.toISOString();
  const dateKey = customDate ? toDateKey(customDate) : resolveDateKey(input.dateKey);

  const [row] = await db
    .insert(waterLogs)
    .values({
      id: generateId(),
      amountMl: input.amountMl,
      dateKey,
      createdAt,
      updatedAt: now.toISOString(),
      isSynced: false,
    })
    .returning();

  return row;
}

async function addFood(input: AddFoodInput): Promise<FoodLog> {
  assertNonEmpty(input.name, 'name');
  assertNonNegativeNumber(input.proteinG, 'proteinG');
  assertNonNegativeNumber(input.caloriesKcal, 'caloriesKcal');
  const now = new Date();
  const customDate = parseIngestedAt(input.ingestedAt);
  const effectiveDate = customDate ?? now;
  const createdAt = effectiveDate.toISOString();
  const dateKey = customDate ? toDateKey(customDate) : resolveDateKey(input.dateKey);

  const [row] = await db
    .insert(foodLogs)
    .values({
      id: generateId(),
      name: input.name.trim(),
      proteinG: round1(input.proteinG),
      caloriesKcal: Math.round(input.caloriesKcal),
      entryMethod: input.entryMethod ?? 'manual',
      mealWindow: input.mealWindow ?? 'lunch',
      imageUri: input.imageUri ?? null,
      dateKey,
      createdAt,
      updatedAt: now.toISOString(),
      isSynced: false,
    })
    .returning();

  return row;
}

/** Soft delete: mantém a linha para que a exclusão seja propagada ao Supabase. */
async function removeWater(id: string): Promise<void> {
  const now = nowIso();
  await db
    .update(waterLogs)
    .set({ deletedAt: now, updatedAt: now, isSynced: false })
    .where(and(eq(waterLogs.id, id), notDeletedWater));
}

async function removeFood(id: string): Promise<void> {
  const now = nowIso();
  await db
    .update(foodLogs)
    .set({ deletedAt: now, updatedAt: now, isSynced: false })
    .where(and(eq(foodLogs.id, id), notDeletedFood));
}

async function deleteLog(id: string, type: 'water' | 'food'): Promise<void> {
  if (type === 'water') {
    await removeWater(id);
  } else {
    await removeFood(id);
  }
}

async function getWaterLogById(id: string): Promise<WaterLog | null> {
  const [row] = await db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.id, id), notDeletedWater))
    .limit(1);

  return row ?? null;
}

async function getFoodLogById(id: string): Promise<FoodLog | null> {
  const [row] = await db
    .select()
    .from(foodLogs)
    .where(and(eq(foodLogs.id, id), notDeletedFood))
    .limit(1);

  return row ?? null;
}

async function updateWaterLog(id: string, input: UpdateWaterInput): Promise<WaterLog | null> {
  assertPositiveInt(input.amountMl, 'amountMl');
  const now = nowIso();
  const customDate = parseIngestedAt(input.ingestedAt);

  const [row] = await db
    .update(waterLogs)
    .set({
      amountMl: input.amountMl,
      ...(customDate
        ? { createdAt: customDate.toISOString(), dateKey: toDateKey(customDate) }
        : input.dateKey
        ? { dateKey: resolveDateKey(input.dateKey) }
        : {}),
      updatedAt: now,
      isSynced: false,
    })
    .where(and(eq(waterLogs.id, id), notDeletedWater))
    .returning();

  return row ?? null;
}

async function updateFoodLog(id: string, input: UpdateFoodInput): Promise<FoodLog | null> {
  assertNonEmpty(input.name, 'name');
  assertNonNegativeNumber(input.proteinG, 'proteinG');
  assertNonNegativeNumber(input.caloriesKcal, 'caloriesKcal');
  const now = nowIso();
  const customDate = parseIngestedAt(input.ingestedAt);

  const [row] = await db
    .update(foodLogs)
    .set({
      name: input.name.trim(),
      proteinG: round1(input.proteinG),
      caloriesKcal: Math.round(input.caloriesKcal),
      ...(input.mealWindow ? { mealWindow: input.mealWindow } : {}),
      ...(input.entryMethod ? { entryMethod: input.entryMethod } : {}),
      ...(input.imageUri !== undefined ? { imageUri: input.imageUri } : {}),
      ...(customDate
        ? { createdAt: customDate.toISOString(), dateKey: toDateKey(customDate) }
        : input.dateKey
        ? { dateKey: resolveDateKey(input.dateKey) }
        : {}),
      updatedAt: now,
      isSynced: false,
    })
    .where(and(eq(foodLogs.id, id), notDeletedFood))
    .returning();

  return row ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura — queries "live" (use com useLiveQuery nas telas)
// ─────────────────────────────────────────────────────────────────────────────

function waterLogsByDateQuery(dateKey: string = toDateKey()) {
  return db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.dateKey, dateKey), notDeletedWater))
    .orderBy(desc(waterLogs.createdAt));
}

function foodLogsByDateQuery(dateKey: string = toDateKey()) {
  return db
    .select()
    .from(foodLogs)
    .where(and(eq(foodLogs.dateKey, dateKey), notDeletedFood))
    .orderBy(desc(foodLogs.createdAt));
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura — agregações de negócio
// ─────────────────────────────────────────────────────────────────────────────

/** Progresso do dia: consumido vs metas (proteína, calorias, água). */
async function getDailySummary(dateKey?: string): Promise<DailySummary> {
  const key = resolveDateKey(dateKey);

  const [goals, [water], [food]] = await Promise.all([
    goalsRepository.get(),
    db
      .select({
        totalMl: sql<number>`coalesce(sum(${waterLogs.amountMl}), 0)`,
        entries: sql<number>`count(*)`,
      })
      .from(waterLogs)
      .where(and(eq(waterLogs.dateKey, key), notDeletedWater)),
    db
      .select({
        proteinG: sql<number>`coalesce(sum(${foodLogs.proteinG}), 0)`,
        caloriesKcal: sql<number>`coalesce(sum(${foodLogs.caloriesKcal}), 0)`,
        entries: sql<number>`count(*)`,
      })
      .from(foodLogs)
      .where(and(eq(foodLogs.dateKey, key), notDeletedFood)),
  ]);

  return {
    dateKey: key,
    protein: buildProgress(round1(food.proteinG), goals.proteinGoal),
    calories: buildProgress(food.caloriesKcal, goals.caloriesGoal),
    water: buildProgress(water.totalMl, goals.waterGoal),
    foodEntries: food.entries,
    waterEntries: water.entries,
  };
}

/**
 * Consistência semanal: nos últimos `days` dias (default 7, incluindo hoje),
 * quantos dias a soma de proteína >= meta e a soma de água >= meta.
 *
 * Usa um único GROUP BY por tabela (2 queries, O(dias) no JS) em vez de N queries.
 * Nota: compara com a meta ATUAL. Se no futuro quiser meta histórica, versione `user_goals`.
 */
async function getWeeklyConsistency(endDateKey?: string, days = 7): Promise<WeeklyConsistency> {
  const end = resolveDateKey(endDateKey);
  const keys = lastNDateKeys(days, end);
  const start = keys[0];

  const [goals, waterByDay, foodByDay] = await Promise.all([
    goalsRepository.get(),
    db
      .select({
        dateKey: waterLogs.dateKey,
        totalMl: sql<number>`coalesce(sum(${waterLogs.amountMl}), 0)`,
      })
      .from(waterLogs)
      .where(and(between(waterLogs.dateKey, start, end), notDeletedWater))
      .groupBy(waterLogs.dateKey),
    db
      .select({
        dateKey: foodLogs.dateKey,
        proteinG: sql<number>`coalesce(sum(${foodLogs.proteinG}), 0)`,
        caloriesKcal: sql<number>`coalesce(sum(${foodLogs.caloriesKcal}), 0)`,
      })
      .from(foodLogs)
      .where(and(between(foodLogs.dateKey, start, end), notDeletedFood))
      .groupBy(foodLogs.dateKey),
  ]);

  const waterMap = new Map(waterByDay.map((r) => [r.dateKey, r.totalMl]));
  const foodMap = new Map(foodByDay.map((r) => [r.dateKey, r]));

  const dayRows: DayConsistency[] = keys.map((dateKey) => {
    const proteinG = round1(foodMap.get(dateKey)?.proteinG ?? 0);
    const caloriesKcal = foodMap.get(dateKey)?.caloriesKcal ?? 0;
    const waterMl = waterMap.get(dateKey) ?? 0;
    const proteinGoalMet = proteinG >= goals.proteinGoal;
    const waterGoalMet = waterMl >= goals.waterGoal;
    return {
      dateKey,
      proteinG,
      caloriesKcal,
      waterMl,
      proteinGoalMet,
      waterGoalMet,
      bothGoalsMet: proteinGoalMet && waterGoalMet,
    };
  });

  return {
    startDateKey: start,
    endDateKey: end,
    totalDays: days,
    proteinDaysMet: dayRows.filter((d) => d.proteinGoalMet).length,
    waterDaysMet: dayRows.filter((d) => d.waterGoalMet).length,
    bothGoalsMetDays: dayRows.filter((d) => d.bothGoalsMet).length,
    goals,
    days: dayRows,
  };
}

/**
 * Consulta unificada para a tela de Histórico com suporte a filtros
 * de tipo ('all' | 'water' | 'food'), busca textual e data específica.
 */
async function getLogsHistory(filters: HistoryFilters = {}): Promise<UnifiedLogItem[]> {
  const { type = 'all', searchQuery = '', dateKey = null } = filters;
  const q = searchQuery.trim().toLowerCase();

  const fetchFood = type === 'all' || type === 'food';
  const fetchWater =
    (type === 'all' || type === 'water') &&
    (!q || q.includes('água') || q.includes('agua') || q.includes('water'));

  const foodConditions = [notDeletedFood];
  if (dateKey) {
    foodConditions.push(eq(foodLogs.dateKey, dateKey));
  }
  if (q) {
    foodConditions.push(sql`lower(${foodLogs.name}) LIKE ${`%${q}%`}`);
  }

  const waterConditions = [notDeletedWater];
  if (dateKey) {
    waterConditions.push(eq(waterLogs.dateKey, dateKey));
  }

  const [foodRows, waterRows] = await Promise.all([
    fetchFood
      ? db
          .select()
          .from(foodLogs)
          .where(and(...foodConditions))
          .orderBy(desc(foodLogs.createdAt))
      : Promise.resolve([]),
    fetchWater
      ? db
          .select()
          .from(waterLogs)
          .where(and(...waterConditions))
          .orderBy(desc(waterLogs.createdAt))
      : Promise.resolve([]),
  ]);

  const unified: UnifiedLogItem[] = [
    ...foodRows.map((f) => ({
      id: f.id,
      type: 'food' as const,
      name: f.name,
      proteinG: f.proteinG,
      caloriesKcal: f.caloriesKcal,
      entryMethod: f.entryMethod,
      mealWindow: f.mealWindow,
      imageUri: f.imageUri ?? null,
      dateKey: f.dateKey,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    ...waterRows.map((w) => ({
      id: w.id,
      type: 'water' as const,
      amountMl: w.amountMl,
      dateKey: w.dateKey,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })),
  ];

  unified.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return unified;
}

/**
 * Calcula a sequência atual (streak) de dias consecutivos batendo pelo menos uma meta
 * (proteína, água ou calorias) até hoje. Se hoje ainda não bateu mas ontem bateu, o streak permanece ativo.
 */
async function calculateCurrentStreak(
  param1?: string | Goals,
  param2?: string | Goals,
): Promise<number> {
  let currentTodayKey: string;
  let goalsParam: Goals | undefined;

  if (typeof param1 === 'string') {
    currentTodayKey = param1;
    goalsParam = typeof param2 === 'object' ? param2 : undefined;
  } else if (typeof param1 === 'object') {
    goalsParam = param1;
    currentTodayKey = typeof param2 === 'string' ? param2 : toDateKey();
  } else {
    currentTodayKey = toDateKey();
  }

  const currentGoals = goalsParam ?? (await goalsRepository.get());
  const checkStart = addDays(currentTodayKey, -365);

  const [waterRows, foodRows] = await Promise.all([
    db
      .select({
        dateKey: waterLogs.dateKey,
        totalMl: sql<number>`coalesce(sum(${waterLogs.amountMl}), 0)`,
      })
      .from(waterLogs)
      .where(and(between(waterLogs.dateKey, checkStart, currentTodayKey), notDeletedWater))
      .groupBy(waterLogs.dateKey),
    db
      .select({
        dateKey: foodLogs.dateKey,
        proteinG: sql<number>`coalesce(sum(${foodLogs.proteinG}), 0)`,
        caloriesKcal: sql<number>`coalesce(sum(${foodLogs.caloriesKcal}), 0)`,
      })
      .from(foodLogs)
      .where(and(between(foodLogs.dateKey, checkStart, currentTodayKey), notDeletedFood))
      .groupBy(foodLogs.dateKey),
  ]);

  const waterMap = new Map(waterRows.map((r) => [r.dateKey, r.totalMl]));
  const foodMap = new Map(foodRows.map((r) => [r.dateKey, r]));

  const isDayHit = (dk: string) => {
    const f = foodMap.get(dk);
    const p = f?.proteinG ?? 0;
    const c = f?.caloriesKcal ?? 0;
    const w = waterMap.get(dk) ?? 0;
    const proteinHit = currentGoals.proteinGoal > 0 && p >= currentGoals.proteinGoal;
    const waterHit = currentGoals.waterGoal > 0 && w >= currentGoals.waterGoal;
    const caloriesHit = currentGoals.caloriesGoal > 0 && c >= currentGoals.caloriesGoal;
    return proteinHit || waterHit || caloriesHit;
  };

  let streak = 0;
  let currentKey = currentTodayKey;

  if (isDayHit(currentTodayKey)) {
    streak = 1;
    currentKey = addDays(currentTodayKey, -1);
  } else {
    const yesterday = addDays(currentTodayKey, -1);
    if (isDayHit(yesterday)) {
      streak = 1;
      currentKey = addDays(yesterday, -1);
    } else {
      return 0;
    }
  }

  while (currentKey >= checkStart) {
    if (isDayHit(currentKey)) {
      streak++;
      currentKey = addDays(currentKey, -1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calcula métricas agregadas para a tela de Analytics diretamente do SQLite.
 * Preenche dias vazios com 0 e gera KPIs, série temporal e divisão por janelas de refeição.
 */
async function getAnalyticsData(periodInput: AnalyticsPeriodInput = '7d'): Promise<AnalyticsData> {
  const todayKey = toDateKey();
  let period: AnalyticsPeriod | 'custom';
  let dateKeys: string[];
  let start: string;
  let end: string;

  if (typeof periodInput === 'string') {
    period = periodInput;
    const count = periodInput === '30d' ? 30 : periodInput === '14d' ? 14 : 7;
    dateKeys = lastNDateKeys(count, todayKey);
    start = dateKeys[0];
    end = dateKeys[dateKeys.length - 1];
  } else {
    period = 'custom';
    start = resolveDateKey(periodInput.startDateKey);
    end = resolveDateKey(periodInput.endDateKey);
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    dateKeys = dateKeysInRange(start, end);
  }

  const goals = await goalsRepository.get();

  const [waterByDay, foodByDay, mealWindows, streak] = await Promise.all([
    db
      .select({
        dateKey: waterLogs.dateKey,
        totalMl: sql<number>`coalesce(sum(${waterLogs.amountMl}), 0)`,
        entries: sql<number>`count(*)`,
      })
      .from(waterLogs)
      .where(and(between(waterLogs.dateKey, start, end), notDeletedWater))
      .groupBy(waterLogs.dateKey),
    db
      .select({
        dateKey: foodLogs.dateKey,
        proteinG: sql<number>`coalesce(sum(${foodLogs.proteinG}), 0)`,
        caloriesKcal: sql<number>`coalesce(sum(${foodLogs.caloriesKcal}), 0)`,
        entries: sql<number>`count(*)`,
      })
      .from(foodLogs)
      .where(and(between(foodLogs.dateKey, start, end), notDeletedFood))
      .groupBy(foodLogs.dateKey),
    db
      .select({
        mealWindow: foodLogs.mealWindow,
        proteinG: sql<number>`coalesce(sum(${foodLogs.proteinG}), 0)`,
        caloriesKcal: sql<number>`coalesce(sum(${foodLogs.caloriesKcal}), 0)`,
        entries: sql<number>`count(*)`,
      })
      .from(foodLogs)
      .where(and(between(foodLogs.dateKey, start, end), notDeletedFood))
      .groupBy(foodLogs.mealWindow),
    calculateCurrentStreak(goals, todayKey),
  ]);

  const waterMap = new Map(waterByDay.map((r) => [r.dateKey, r]));
  const foodMap = new Map(foodByDay.map((r) => [r.dateKey, r]));

  let totalProtein = 0;
  let totalWater = 0;
  let totalCalories = 0;
  let daysWithProteinHit = 0;
  let daysWithWaterHit = 0;
  let daysWithBothHit = 0;
  let daysWithLogs = 0;

  const dailySeries: DailySeriesPoint[] = dateKeys.map((dateKey) => {
    const f = foodMap.get(dateKey);
    const w = waterMap.get(dateKey);

    const proteinG = round1(f?.proteinG ?? 0);
    const caloriesKcal = Math.round(f?.caloriesKcal ?? 0);
    const waterMl = Math.round(w?.totalMl ?? 0);

    const hasLog = (f?.entries ?? 0) > 0 || (w?.entries ?? 0) > 0;
    if (hasLog) daysWithLogs++;

    const hitProteinGoal = proteinG >= goals.proteinGoal;
    const hitWaterGoal = waterMl >= goals.waterGoal;
    const hitBothGoals = hitProteinGoal && hitWaterGoal;

    if (hitProteinGoal) daysWithProteinHit++;
    if (hitWaterGoal) daysWithWaterHit++;
    if (hitBothGoals) daysWithBothHit++;

    totalProtein += proteinG;
    totalWater += waterMl;
    totalCalories += caloriesKcal;

    const [, m, d] = dateKey.split('-');
    const label = `${d}/${m}`;

    return {
      dateKey,
      label,
      proteinG,
      waterMl,
      caloriesKcal,
      hitProteinGoal,
      hitWaterGoal,
      hitBothGoals,
    };
  });

  const totalDays = dateKeys.length || 1;
  const avgProteinG = round1(totalProtein / totalDays);
  const avgWaterMl = Math.round(totalWater / totalDays);
  const avgCaloriesKcal = Math.round(totalCalories / totalDays);

  const proteinSuccessRate = Math.round((daysWithProteinHit / totalDays) * 100);
  const waterSuccessRate = Math.round((daysWithWaterHit / totalDays) * 100);
  const bothSuccessRate = Math.round((daysWithBothHit / totalDays) * 100);

  const ALL_WINDOWS: MealWindow[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealMap = new Map(mealWindows.map((m) => [m.mealWindow, m]));

  const totalPeriodFoodProtein = mealWindows.reduce((acc, curr) => acc + (curr.proteinG || 0), 0);
  const totalPeriodFoodCalories = mealWindows.reduce((acc, curr) => acc + (curr.caloriesKcal || 0), 0);

  const mealWindowBreakdown: MealWindowBreakdownItem[] = ALL_WINDOWS.map((win) => {
    const found = mealMap.get(win);
    const proteinG = round1(found?.proteinG ?? 0);
    const caloriesKcal = Math.round(found?.caloriesKcal ?? 0);
    const entriesCount = Number(found?.entries ?? 0);

    return {
      window: win,
      proteinG,
      caloriesKcal,
      proteinPercent:
        totalPeriodFoodProtein > 0 ? Math.round((proteinG / totalPeriodFoodProtein) * 100) : 0,
      caloriesPercent:
        totalPeriodFoodCalories > 0 ? Math.round((caloriesKcal / totalPeriodFoodCalories) * 100) : 0,
      entriesCount,
    };
  });

  return {
    period,
    startDateKey: start,
    endDateKey: end,
    goals,
    kpis: {
      avgProteinG,
      avgWaterMl,
      avgCaloriesKcal,
      proteinSuccessRate,
      waterSuccessRate,
      bothSuccessRate,
      currentStreak: streak,
      totalDays,
      daysWithLogs,
    },
    dailySeries,
    mealWindowBreakdown,
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
  getDailySummary,
  getWeeklyConsistency,
  calculateCurrentStreak,
};

