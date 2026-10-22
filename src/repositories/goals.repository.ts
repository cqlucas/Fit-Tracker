import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { DEFAULT_USER_ID, userGoals, type UserGoals } from '@/db/schema';
import { nowIso } from '@/utils/date';

import { assertPositiveInt } from './validation';

export type Goals = Pick<UserGoals, 'proteinGoal' | 'waterGoal' | 'caloriesGoal' | 'language'>;
export type UpdateGoalsInput = Partial<Goals>;

export const DEFAULT_GOALS: Goals = {
  proteinGoal: 160,
  waterGoal: 3000,
  caloriesGoal: 2200,
  language: 'pt',
};

/**
 * Query reutilizável — use com `useLiveQuery(goalsRepository.liveQuery())`
 * para a tela re-renderizar quando as metas mudarem (localmente ou via pull do sync).
 */
function liveQuery() {
  return db.select().from(userGoals).where(eq(userGoals.id, DEFAULT_USER_ID)).limit(1);
}

async function get(): Promise<Goals> {
  const [row] = await liveQuery();
  if (!row) return DEFAULT_GOALS; // seed garante a linha; fallback defensivo.
  return {
    proteinGoal: row.proteinGoal,
    waterGoal: row.waterGoal,
    caloriesGoal: row.caloriesGoal,
    language: row.language ?? 'pt',
  };
}

async function update(input: UpdateGoalsInput): Promise<UserGoals> {
  const patch: UpdateGoalsInput = {};
  if (input.proteinGoal !== undefined) {
    assertPositiveInt(input.proteinGoal, 'proteinGoal');
    patch.proteinGoal = input.proteinGoal;
  }
  if (input.waterGoal !== undefined) {
    assertPositiveInt(input.waterGoal, 'waterGoal');
    patch.waterGoal = input.waterGoal;
  }
  if (input.caloriesGoal !== undefined) {
    assertPositiveInt(input.caloriesGoal, 'caloriesGoal');
    patch.caloriesGoal = input.caloriesGoal;
  }
  if (input.language !== undefined) {
    if (input.language !== 'pt' && input.language !== 'en') {
      throw new Error('Invalid language');
    }
    patch.language = input.language;
  }

  // Upsert: resiliente caso a linha tenha sido removida por qualquer motivo.
  const [row] = await db
    .insert(userGoals)
    .values({ id: DEFAULT_USER_ID, ...DEFAULT_GOALS, ...patch, updatedAt: nowIso(), isSynced: false })
    .onConflictDoUpdate({
      target: userGoals.id,
      set: { ...patch, updatedAt: nowIso(), isSynced: false },
    })
    .returning();

  return row;
}

export const goalsRepository = {
  liveQuery,
  get,
  getGoals: get,
  update,
  updateGoals: update,
};
