export interface ReviewDay {
  dateKey: string;
  confirmed: boolean;
  energyComplete: boolean;
  context?: string;
}
export interface WeighIn {
  dateKey: string;
  weightKg: number;
}
export interface WeeklyReview {
  status: 'insufficient' | 'context' | 'observe' | 'review_up' | 'review_down';
  averages: (number | null)[];
  counts: number[];
  confirmedDays: number[];
  delta: number | null;
  min: number | null;
  max: number | null;
}
export function weeklyReview(
  keys: string[],
  weights: WeighIn[],
  days: ReviewDay[],
  options: {
    blocked?: boolean;
    adjustedRecently?: boolean;
    minRate?: number;
    maxRate?: number;
  } = {},
): WeeklyReview {
  const blocks = [keys.slice(-21, -14), keys.slice(-14, -7), keys.slice(-7)];
  // Average daily means so repeated weighing on one day cannot inflate its influence.
  const counts = blocks.map(
    (block) =>
      new Set(
        weights.filter((w) => block.includes(w.dateKey)).map((w) => w.dateKey),
      ).size,
  );
  const averages = blocks.map((block) => {
    const daily = block
      .map((day) => weights.filter((w) => w.dateKey === day))
      .filter((ws) => ws.length)
      .map((ws) => ws.reduce((a, w) => a + w.weightKg, 0) / ws.length);
    return daily.length
      ? daily.reduce((a, b) => a + b, 0) / daily.length
      : null;
  });
  const confirmedDays = blocks.map(
    (block) =>
      new Set(
        days
          .filter(
            (d) => block.includes(d.dateKey) && d.confirmed && d.energyComplete,
          )
          .map((d) => d.dateKey),
      ).size,
  );
  const [old, previous, current] = averages;
  const delta =
    previous !== null && current !== null ? current - previous : null;
  const min = previous !== null ? previous * (options.minRate ?? 0.0025) : null,
    max = previous !== null ? previous * (options.maxRate ?? 0.005) : null;
  const result = { averages, counts, confirmedDays, delta, min, max };
  if (
    options.blocked ||
    options.adjustedRecently ||
    days.some((d) => keys.slice(-14).includes(d.dateKey) && d.context)
  )
    return { ...result, status: 'context' };
  if (
    counts.slice(1).some((n) => n < 3) ||
    confirmedDays.slice(1).some((n) => n < 5) ||
    delta === null
  )
    return { ...result, status: 'insufficient' };
  if (old === null || counts[0] < 3 || confirmedDays[0] < 5)
    return { ...result, status: 'observe' };
  const priorDelta = previous! - old;
  if (delta < min! && priorDelta < old * (options.minRate ?? 0.0025))
    return { ...result, status: 'review_up' };
  if (delta > max! && priorDelta > old * (options.maxRate ?? 0.005))
    return { ...result, status: 'review_down' };
  return { ...result, status: 'observe' };
}
