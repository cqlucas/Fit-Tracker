import { and, between, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { foodLogs, waterLogs, type EntryMethod, type FoodLog, type MealWindow, type WaterLog } from '@/db/schema';

import { isValidDateKey, lastNDateKeys, nowIso, toDateKey } from '@/utils/date';
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
}

export interface AddFoodInput {
  name: string;
  proteinG: number;
  caloriesKcal: number;
  entryMethod?: EntryMethod;
  mealWindow?: MealWindow;
  dateKey?: string;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Escrita
// ─────────────────────────────────────────────────────────────────────────────

async function addWater(input: AddWaterInput): Promise<WaterLog> {
  assertPositiveInt(input.amountMl, 'amountMl');
  const now = nowIso();

  const [row] = await db
    .insert(waterLogs)
    .values({
      id: generateId(),
      amountMl: input.amountMl,
      dateKey: resolveDateKey(input.dateKey),
      createdAt: now,
      updatedAt: now,
      isSynced: false,
    })
    .returning();

  return row;
}

async function addFood(input: AddFoodInput): Promise<FoodLog> {
  assertNonEmpty(input.name, 'name');
  assertNonNegativeNumber(input.proteinG, 'proteinG');
  assertNonNegativeNumber(input.caloriesKcal, 'caloriesKcal');
  const now = nowIso();

  const [row] = await db
    .insert(foodLogs)
    .values({
      id: generateId(),
      name: input.name.trim(),
      proteinG: round1(input.proteinG),
      caloriesKcal: Math.round(input.caloriesKcal),
      entryMethod: input.entryMethod ?? 'manual',
      mealWindow: input.mealWindow ?? 'lunch',
      dateKey: resolveDateKey(input.dateKey),
      createdAt: now,
      updatedAt: now,
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

export const logsRepository = {
  addWater,
  addWaterLog: addWater,
  addFood,
  addFoodLog: addFood,
  removeWater,
  removeFood,
  waterLogsByDateQuery,
  foodLogsByDateQuery,
  getDailySummary,
  getWeeklyConsistency,
};
