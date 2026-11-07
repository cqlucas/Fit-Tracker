import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';
import { SYNC_TABLES, type SyncTableName } from '@/db/schema';
import { NUTRIENTS, SOURCES } from '@/domain/nutrition';
import { isValidDateKey } from '@/utils/date';
export type RawRecord = Record<string, string | number | boolean | null>;
export interface RemoteRecord {
  table: SyncTableName;
  row: RawRecord;
}
export const isSyncTable = (s: string): s is SyncTableName =>
  (SYNC_TABLES as readonly string[]).includes(s);
export const snake = (s: string) =>
  s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const bools = ['is_estimate', 'confirmed'];
const numeric = new Set([
  ...NUTRIENTS.map(snake),
  'amount_ml',
  'beverage_ml',
  'portion_amount',
  'protein_goal',
  'water_goal',
  'calories_goal',
  'carb_goal',
  'fat_goal',
  'fiber_goal',
  'sodium_limit',
  'saturated_fat_limit',
  'creatine_goal',
  'weight_kg',
  'dose_g',
  'duration_min',
  'revision',
  'replaces_revision',
]);
export function validateRecord(
  table: SyncTableName,
  input: unknown,
  columns: string[],
): RawRecord {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid record');
  const raw = input as Record<string, unknown>,
    result: RawRecord = {};
  for (const key of columns) {
    let v = raw[key];
    if (v === undefined) throw new Error(`Missing ${table}.${key}`);
    if (numeric.has(key) && v !== null) {
      if (typeof v === 'string' && /^\d+(?:\.\d+)?$/.test(v)) v = Number(v);
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 99999999)
        throw new Error(`Invalid ${key}`);
    }
    if ((key === 'is_synced' || bools.includes(key)) && v !== null) {
      if (v !== true && v !== false && v !== 0 && v !== 1)
        throw new Error('Invalid boolean');
      v = v ? 1 : 0;
    }
    if (v !== null && typeof v !== 'string' && typeof v !== 'number')
      throw new Error(`Invalid ${key}`);
    result[key] = v as RawRecord[string];
  }
  if (
    typeof result.id !== 'string' ||
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      result.id,
    )
  )
    throw new Error('Invalid UUID');
  if ('date_key' in result && !isValidDateKey(String(result.date_key)))
    throw new Error('Invalid date');
  if (
    'effective_from' in result &&
    !isValidDateKey(String(result.effective_from))
  )
    throw new Error('Invalid goal date');
  for (const key of [
    'created_at',
    'updated_at',
    ...(table === 'food_logs' || table === 'water_logs' ? ['occurred_at'] : []),
  ]) {
    if (typeof result[key] !== 'string')
      throw new Error(`Missing timestamp ${key}`);
  }
  if (
    'time_zone' in result &&
    (typeof result.time_zone !== 'string' ||
      !result.time_zone ||
      result.time_zone.length > 100)
  )
    throw new Error('Invalid time zone');
  if (
    'portion_amount' in result &&
    (result.portion_amount == null) !== (result.portion_unit == null)
  )
    throw new Error('Incomplete portion');
  for (const key of ['created_at', 'updated_at', 'occurred_at', 'deleted_at'])
    if (
      result[key] != null &&
      (typeof result[key] !== 'string' ||
        !Number.isFinite(Date.parse(result[key] as string)))
    )
      throw new Error('Invalid timestamp');
  for (const key of ['revision', 'replaces_revision'])
    if (key in result && !Number.isSafeInteger(result[key]))
      throw new Error('Invalid revision');
  if (
    result.name !== undefined &&
    (typeof result.name !== 'string' ||
      !result.name.trim() ||
      result.name.length > 200)
  )
    throw new Error('Invalid name');
  if (
    result.nutrition_source !== undefined &&
    !SOURCES.includes(result.nutrition_source as (typeof SOURCES)[number])
  )
    throw new Error('Invalid source');
  if (
    result.input_channel !== undefined &&
    !['text', 'image'].includes(String(result.input_channel))
  )
    throw new Error('Invalid channel');
  if (
    result.entry_method !== undefined &&
    !['manual', 'image'].includes(String(result.entry_method))
  )
    throw new Error('Invalid entry method');
  if (
    result.meal_window !== undefined &&
    !['breakfast', 'lunch', 'dinner', 'snack'].includes(
      String(result.meal_window),
    )
  )
    throw new Error('Invalid meal window');
  if (
    result.saturated_fat_g != null &&
    result.fat_g != null &&
    Number(result.saturated_fat_g) > Number(result.fat_g)
  )
    throw new Error('Invalid saturated fat');
  if (
    result.portion_amount != null &&
    (Number(result.portion_amount) <= 0 ||
      !['g', 'ml', 'portion'].includes(String(result.portion_unit)))
  )
    throw new Error('Invalid portion');
  if (
    result.beverage_ml != null &&
    (!Number.isInteger(result.beverage_ml) || Number(result.beverage_ml) <= 0)
  )
    throw new Error('Invalid beverage volume');
  if (
    result.amount_ml != null &&
    (!Number.isInteger(result.amount_ml) || Number(result.amount_ml) <= 0)
  )
    throw new Error('Invalid volume');
  if (
    result.weight_kg != null &&
    (Number(result.weight_kg) <= 0 || Number(result.weight_kg) > 1000)
  )
    throw new Error('Invalid weight');
  if (
    result.dose_g != null &&
    (Number(result.dose_g) > 100 || result.supplement !== 'creatine')
  )
    throw new Error('Invalid supplement');
  if (
    result.duration_min != null &&
    (Number(result.duration_min) <= 0 || Number(result.duration_min) > 1440)
  )
    throw new Error('Invalid duration');
  for (const k of ['protein_goal', 'water_goal', 'calories_goal'])
    if (k in result && Number(result[k]) <= 0) throw new Error('Invalid goal');
  if (result.nutrient_sources != null) {
    const sources = JSON.parse(String(result.nutrient_sources));
    if (
      !sources ||
      Array.isArray(sources) ||
      typeof sources !== 'object' ||
      Object.entries(sources).some(
        ([k, v]) =>
          !NUTRIENTS.includes(k as (typeof NUTRIENTS)[number]) ||
          !SOURCES.includes(v as (typeof SOURCES)[number]),
      )
    )
      throw new Error('Invalid nutrient sources');
  }
  for (const k of ['note', 'context'])
    if (typeof result[k] === 'string' && (result[k] as string).length > 300)
      throw new Error('Text too long');
  return result;
}
export function tableColumns(connection: SQLiteDatabase, table: SyncTableName) {
  return connection
    .getAllSync<{ name: string }>(`PRAGMA table_info(${table})`)
    .map((c) => c.name);
}
export function writeRaw(
  connection: SQLiteDatabase,
  table: SyncTableName,
  row: RawRecord,
) {
  const keys = tableColumns(connection, table).filter((k) => k in row);
  connection.runSync(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${keys
      .filter((k) => k !== 'id')
      .map((k) => `${k}=excluded.${k}`)
      .join(',')}`,
    ...keys.map((k) => row[k] as SQLiteBindValue),
  );
}
export function toRemote(row: RawRecord) {
  const result = { ...row };
  delete result.is_synced;
  delete result.image_uri;
  if ('name' in result && 'date_key' in result) result.image_uri = null;
  for (const k of bools) if (k in result) result[k] = !!result[k];
  return result;
}
