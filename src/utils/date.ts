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

/** Array de todas as chaves de data entre startDateKey e endDateKey (inclusivo). */
export function dateKeysInRange(startDateKey: string, endDateKey: string): string[] {
  const result: string[] = [];
  let curr = startDateKey;
  while (curr <= endDateKey) {
    result.push(curr);
    curr = addDays(curr, 1);
  }
  return result;
}

/** Verifica se uma data corresponde ao dia de hoje no fuso local. */
export function isToday(date: Date): boolean {
  return toDateKey(date) === toDateKey(new Date());
}

/** Verifica se uma data corresponde ao dia de ontem no fuso local. */
export function isYesterday(date: Date): boolean {
  return toDateKey(date) === addDays(toDateKey(new Date()), -1);
}

/** Formata data e hora para exibição amigável em chips e detalhes de logs. */
export function formatDateTimeFriendly(date: Date, isPt: boolean = true): string {
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const timeStr = `${hours}:${minutes}`;

  if (isToday(date)) {
    return isPt ? `Hoje às ${timeStr}` : `Today at ${timeStr}`;
  }
  if (isYesterday(date)) {
    return isPt ? `Ontem às ${timeStr}` : `Yesterday at ${timeStr}`;
  }

  const day = pad(date.getDate());
  const monthNamesPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = (isPt ? monthNamesPt : monthNamesEn)[date.getMonth()];

  return isPt ? `${day} de ${month} às ${timeStr}` : `${month} ${day} at ${timeStr}`;
}

