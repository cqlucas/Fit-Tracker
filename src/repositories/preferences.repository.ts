import { expoDb } from '@/db/client';
export function getPreference<T>(key: string, fallback: T): T {
  const row = expoDb.getFirstSync<{ value: string }>(
    'SELECT value FROM local_preferences WHERE key=?',
    key,
  );
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}
export function setPreference(key: string, value: unknown) {
  expoDb.runSync(
    'INSERT INTO local_preferences(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    key,
    JSON.stringify(value),
  );
}
