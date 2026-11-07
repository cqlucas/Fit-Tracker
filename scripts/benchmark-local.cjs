// Synthetic in-memory SQLite benchmark on this host; does not measure Android or startup.
const { runtime } = require('../tests/runtime.cjs');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
(async () => {
  const r = runtime(),
    { connection: c } = r,
    logs = r.load('@/repositories/logs.repository').logsRepository,
    routine = r.load('@/repositories/routine.repository').routineRepository,
    date = r.load('@/utils/date'),
    day = date.toDateKey();
  const template = await logs.addFood({
    name: 'Synthetic meal',
    proteinG: 23.7,
    caloriesKcal: 137,
    carbG: 12,
    fatG: 4,
    fiberG: 2,
  });
  const fields = c
    .getAllSync('PRAGMA table_info(food_logs)')
    .map((c) => c.name);
  const base = c.getFirstSync('SELECT * FROM food_logs');
  c.withTransactionSync(() => {
    for (let i = 1; i < 10000; i++) {
      const row = {
        ...base,
        id: randomUUID(),
        date_key: date.addDays(day, -(i % 365)),
      };
      c.runSync(
        `INSERT INTO food_logs(${fields.join(',')}) VALUES(${fields.map(() => '?').join(',')})`,
        ...fields.map((f) => row[f]),
      );
    }
  });
  const measure = async (fn) => {
    const times = [];
    for (let i = 0; i < 5; i++) await fn();
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await fn();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return {
      samples: 100,
      p50Ms: +times[49].toFixed(2),
      p95Ms: +times[94].toFixed(2),
    };
  };
  const dashboard = await measure(() =>
    Promise.all([
      logs.getDailySummary(day),
      logs.getWeeklyConsistency(day),
      logs.recentMeal(day),
      logs.getLogsHistory({ dateKey: day }),
      routine.overview(day),
    ]),
  );
  const history = await measure(() => logs.getLogsHistory());
  const analytics = await measure(() => logs.getAnalyticsData('30d'));
  const write = await measure(() =>
    logs.addFood({
      name: 'Synthetic write',
      proteinG: 23.7,
      caloriesKcal: 137,
    }),
  );
  console.log(
    JSON.stringify(
      {
        environment: `Node ${process.version}, ${process.platform}/${process.arch}, SQLite ${c.getFirstSync('SELECT sqlite_version() v').v}`,
        initialRecords: 10000,
        dashboard,
        historyFirst50: history,
        analytics30d: analytics,
        localWrite: write,
        limitation: 'Host only; Android timing targets remain unverified.',
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
