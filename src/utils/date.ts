/**
 * Helpers de data.
 *
 * - `date_key` ('YYYY-MM-DD') usa o fuso LOCAL: um registro às 23:30 em São Paulo
 *   pertence ao dia local, mesmo que em UTC já seja o dia seguinte.
 * - Timestamps (`created_at`, `updated_at`, `deleted_at`) são ISO 8601 em UTC.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Data → 'YYYY-MM-DD' no fuso local do dispositivo. */
export function toDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' → Date à meia-noite LOCAL (evita o bug de `new Date('YYYY-MM-DD')` ser UTC). */
export function fromDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Soma/subtrai dias respeitando DST (aritmética de calendário, não de ms). */
export function addDays(dateKey: string, days: number): string {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Últimos `n` dias terminando em `endDateKey` (inclusive), em ordem cronológica. */
export function lastNDateKeys(n: number, endDateKey: string = toDateKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(endDateKey, i - (n - 1)));
}

export function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toDateKey(fromDateKey(value)) === value;
}

/** Timestamp ISO UTC para colunas de controle. */
export function nowIso(): string {
  return new Date().toISOString();
}
