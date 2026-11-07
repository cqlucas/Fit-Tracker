/** Pure rules shared by forms, summaries, backup validation and tests. */
export const NUTRIENTS = [
  'proteinG',
  'caloriesKcal',
  'carbG',
  'fatG',
  'fiberG',
  'saturatedFatG',
  'sodiumMg',
] as const;
export type Nutrient = (typeof NUTRIENTS)[number];
export type Nutrients = Record<Nutrient, number | null>;
export const SOURCES = ['manual', 'label', 'food_table', 'ai'] as const;
export type NutritionSource = (typeof SOURCES)[number];
export const EMPTY_NUTRIENTS: Nutrients = Object.fromEntries(
  NUTRIENTS.map((k) => [k, null]),
) as Nutrients;

export function parseDecimal(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(text))
    throw new Error('Número inválido / Invalid number');
  const number = Number(text.replace(',', '.'));
  if (!Number.isFinite(number) || number > 99999999)
    throw new Error('Número inválido / Invalid number');
  return number;
}
export function validateNutrients(input: Partial<Nutrients>): Nutrients {
  const result = { ...EMPTY_NUTRIENTS };
  for (const key of NUTRIENTS) {
    const value = input[key] ?? null;
    if (
      value !== null &&
      (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 99999999)
    )
      throw new Error(`Invalid ${key}`);
    result[key] = value;
  }
  if (
    result.fatG !== null &&
    result.saturatedFatG !== null &&
    result.saturatedFatG > result.fatG
  )
    throw new Error(
      'Gordura saturada supera gordura total / Saturated fat exceeds total fat',
    );
  return result;
}
export function scaleNutrients(
  input: Nutrients,
  amount: number,
  baseAmount: number,
  unit: string,
  baseUnit: string,
): Nutrients {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(baseAmount) ||
    baseAmount <= 0 ||
    unit !== baseUnit
  )
    throw new Error('Porção/unidade inválida / Invalid portion or unit');
  return validateNutrients(
    Object.fromEntries(
      NUTRIENTS.map((k) => [
        k,
        input[k] === null ? null : (input[k]! * amount) / baseAmount,
      ]),
    ),
  );
}
export type Coverage = {
  known: number;
  entries: number;
  total: number;
  complete: boolean;
};
export function sumNutrient(
  rows: Partial<Nutrients>[],
  key: Nutrient,
): Coverage {
  const values = rows
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return {
    total: values.reduce((a, b) => a + b, 0),
    known: values.length,
    entries: rows.length,
    complete: rows.length > 0 && values.length === rows.length,
  };
}
export function energyWarning(n: Partial<Nutrients>): boolean {
  const { proteinG: p, carbG: c, fatG: f, caloriesKcal: e } = n;
  return (
    p != null &&
    c != null &&
    f != null &&
    e != null &&
    Math.abs(4 * p + 4 * c + 9 * f - e) > Math.max(50, e * 0.1)
  );
}
export function remainingCarbs(
  energy: number,
  protein: number,
  fat: number,
): number {
  const result = (energy - 4 * protein - 9 * fat) / 4;
  if (!Number.isFinite(result) || result < 0)
    throw new Error(
      'Revise energia, proteína e gordura / Review energy, protein and fat',
    );
  return result;
}
export type GoalState = 'unknown' | 'partial' | 'below' | 'within' | 'above';
export function goalState(
  coverage: Coverage,
  goal: number | null,
  mode: 'reference' | 'energy' | 'limit',
): GoalState {
  if (!coverage.entries || goal === null) return 'unknown';
  if (!coverage.complete) return 'partial';
  if (mode === 'energy')
    return coverage.total < goal * 0.95
      ? 'below'
      : coverage.total > goal * 1.05
        ? 'above'
        : 'within';
  if (mode === 'limit') return coverage.total > goal ? 'above' : 'within';
  return coverage.total >= goal ? 'within' : 'below';
}
export function selectPlan<
  T extends {
    effectiveFrom: string;
    revision: number;
    createdAt: string;
    isSynced?: boolean | number;
  },
>(plans: T[], day: string): T | null {
  return (
    plans
      .filter((p) => p.effectiveFrom <= day)
      .sort(
        (a, b) =>
          b.effectiveFrom.localeCompare(a.effectiveFrom) ||
          Number(
            (b.isSynced === false || b.isSynced === 0) && b.revision === 0,
          ) -
            Number(
              (a.isSynced === false || a.isSynced === 0) && a.revision === 0,
            ) ||
          b.revision - a.revision ||
          b.createdAt.localeCompare(a.createdAt),
      )[0] ?? null
  );
}
export function eligibleAverage(
  days: { confirmed: boolean; coverage: Coverage }[],
): { value: number | null; days: number } {
  const values = days
    .filter((d) => d.confirmed && d.coverage.complete)
    .map((d) => d.coverage.total);
  return {
    value: values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null,
    days: values.length,
  };
}
