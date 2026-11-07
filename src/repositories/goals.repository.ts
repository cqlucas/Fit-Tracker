import { desc, eq, isNull } from 'drizzle-orm';
import { activeOwner, db, scopeGuard } from '@/db/client';
import {
  DEFAULT_USER_ID,
  goalPlans,
  userGoals,
  type AppLanguage,
  type GoalPlan,
  type PreferredAiProvider,
} from '@/db/schema';
import { remainingCarbs, selectPlan } from '@/domain/nutrition';
import { addDays, isValidDateKey, nowIso, toDateKey } from '@/utils/date';
import { generateId } from '@/utils/id';

export interface Goals {
  proteinGoal: number;
  waterGoal: number;
  caloriesGoal: number;
  carbGoal: number | null;
  fatGoal: number | null;
  fiberGoal: number | null;
  sodiumLimit: number | null;
  saturatedFatLimit: number | null;
  creatineGoal: number | null;
  language: AppLanguage;
  preferredAiProvider: PreferredAiProvider;
}
export type UpdateGoalsInput = Partial<Goals> & {
  effectiveFrom?: string;
  source?: 'manual' | 'suggestion' | 'professional' | 'review';
};
export const DEFAULT_GOALS: Goals = {
  proteinGoal: 120,
  waterGoal: 2500,
  caloriesGoal: 2500,
  carbGoal: 325,
  fatGoal: 80,
  fiberGoal: 30,
  sodiumLimit: null,
  saturatedFatLimit: null,
  creatineGoal: null,
  language: 'pt',
  preferredAiProvider: 'gemini',
};
function liveQuery() {
  return db
    .select()
    .from(userGoals)
    .where(eq(userGoals.id, DEFAULT_USER_ID))
    .limit(1);
}
async function plans() {
  return db
    .select()
    .from(goalPlans)
    .where(isNull(goalPlans.deletedAt))
    .orderBy(desc(goalPlans.effectiveFrom));
}
async function forDate(day: string): Promise<GoalPlan | null> {
  return selectPlan(await plans(), day);
}
async function get(day = toDateKey()): Promise<Goals> {
  const local = (await liveQuery())[0];
  const plan = await forDate(day);
  return {
    ...DEFAULT_GOALS,
    ...(plan ?? local),
    // Missing new fields on a legacy baseline stay unknown.
    carbGoal: plan?.carbGoal ?? null,
    fatGoal: plan?.fatGoal ?? null,
    fiberGoal: plan?.fiberGoal ?? null,
    sodiumLimit: plan?.sodiumLimit ?? null,
    saturatedFatLimit: plan?.saturatedFatLimit ?? null,
    creatineGoal: plan?.creatineGoal ?? null,
    language: local?.language ?? 'pt',
    preferredAiProvider: local?.preferredAiProvider ?? 'gemini',
  };
}
async function update(input: UpdateGoalsInput) {
  const assertScope = scopeGuard();
  const current = await get();
  assertScope();
  const next = { ...current, ...input };
  if (
    !['pt', 'en'].includes(next.language) ||
    !['gemini', 'groq'].includes(next.preferredAiProvider)
  )
    throw new Error('Invalid preference');
  const nutritionKeys = [
    'proteinGoal',
    'waterGoal',
    'caloriesGoal',
    'carbGoal',
    'fatGoal',
    'fiberGoal',
    'sodiumLimit',
    'saturatedFatLimit',
    'creatineGoal',
  ] as const;
  const changed = nutritionKeys.some((k) => input[k] !== undefined);
  if (changed) {
    for (const key of nutritionKeys) {
      const value = next[key];
      if (
        value !== null &&
        (!Number.isFinite(value) || value < 0 || value > 99999999)
      )
        throw new Error(`Invalid ${key}`);
    }
    if (next.proteinGoal <= 0 || next.waterGoal <= 0 || next.caloriesGoal <= 0)
      throw new Error('Invalid goals');
    if (next.fatGoal !== null)
      remainingCarbs(next.caloriesGoal, next.proteinGoal, next.fatGoal);
    const day = input.effectiveFrom ?? addDays(toDateKey(), 1);
    if (!isValidDateKey(day) || day < toDateKey())
      throw new Error(
        'Use hoje ou uma data futura / Use today or a future date',
      );
    const previous = selectPlan(
      (await plans()).filter((p) => p.effectiveFrom === day),
      day,
    );
    assertScope();
    const stamp = new Date(
      Math.max(Date.now(), previous ? Date.parse(previous.createdAt) + 1 : 0),
    ).toISOString();
    await db.insert(goalPlans).values({
      id: generateId(),
      effectiveFrom: day,
      ...Object.fromEntries(nutritionKeys.map((k) => [k, next[k]])),
      proteinGoal: next.proteinGoal,
      caloriesGoal: next.caloriesGoal,
      waterGoal: next.waterGoal,
      source: input.source ?? 'manual',
      replacesId: previous?.id ?? null,
      replacesRevision: previous?.revision ?? 0,
      // Pending versions use creation order; the server assigns their revisions.
      revision: 0,
      ownerId: activeOwner,
      createdAt: stamp,
      updatedAt: stamp,
      isSynced: false,
    });
  }
  assertScope();
  const [row] = await db
    .update(userGoals)
    .set({
      language: next.language,
      preferredAiProvider: next.preferredAiProvider,
      updatedAt: nowIso(),
      isSynced: true,
    })
    .where(eq(userGoals.id, DEFAULT_USER_ID))
    .returning();
  return row;
}
export const goalsRepository = {
  liveQuery,
  get,
  getGoals: get,
  update,
  updateGoals: update,
  plans,
  forDate,
};
