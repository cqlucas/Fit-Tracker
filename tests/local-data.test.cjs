const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { runtime } = require('./runtime.cjs');
for (const version of [1, 2, 3, 4, 5])
  test(`migration v${version} preserves records, tombstones and custom targets`, () => {
    const r = runtime({ version, seed: false }),
      c = r.connection,
      id = randomUUID();
    c.runSync(
      'INSERT INTO user_goals(id,protein_goal,water_goal,calories_goal,updated_at,is_synced) VALUES (?,?,?,?,?,0)',
      'default_user',
      123,
      2700,
      2421,
      '2026-11-01T00:00:00.000Z',
    );
    c.runSync(
      'INSERT INTO food_logs(id,name,protein_g,calories_kcal,date_key,created_at,updated_at,deleted_at) VALUES (?,?,?,?,?,?,?,?)',
      id,
      'old',
      23.7,
      137,
      '2026-11-01',
      '2026-11-02T02:30:00Z',
      '2026-11-02T02:30:00Z',
      '2026-11-03T00:00:00Z',
    );
    r.migration.runMigrationsSync(c);
    const row = c.getFirstSync('SELECT * FROM food_logs WHERE id=?', id);
    assert.equal(row.protein_g, 23.7);
    assert.equal(row.calories_kcal, 137);
    assert.equal(row.carb_g, null);
    assert.equal(row.fiber_g, null);
    assert.equal(row.date_key, '2026-11-01');
    assert.equal(row.occurred_at, row.created_at);
    assert.equal(row.deleted_at, '2026-11-03T00:00:00Z');
    assert.equal(c.getFirstSync('SELECT * FROM goal_plans').protein_goal, 123);
    r.migration.runMigrationsSync(c);
    assert.equal(c.getFirstSync('SELECT count(*) n FROM goal_plans').n, 1);
  });
test('migration error rolls the schema and user_version back', () => {
  const r = runtime({ version: 4, seed: false }),
    c = r.connection,
    original = c.execSync;
  c.execSync = (sql) => {
    if (sql.includes('CREATE TABLE weight_logs')) throw new Error('injected');
    original(sql);
  };
  assert.throws(() => r.migration.runMigrationsSync(c), /injected/);
  assert.equal(c.getFirstSync('PRAGMA user_version').user_version, 4);
  assert.equal(
    c
      .getAllSync('PRAGMA table_info(food_logs)')
      .some((c) => c.name === 'fiber_g'),
    false,
  );
});
test('food decimals, linked drinks and day confirmation are atomic', async () => {
  const r = runtime(),
    logs = r.load('@/repositories/logs.repository').logsRepository,
    routine = r.load('@/repositories/routine.repository').routineRepository,
    day = r.load('@/utils/date').toDateKey();
  const food = await logs.addFood({
    name: 'Smoothie',
    proteinG: 23.7,
    caloriesKcal: 137,
    beverageMl: 300,
    portionAmount: 150,
    portionUnit: 'ml',
  });
  let summary = await logs.getDailySummary(day);
  assert.equal(summary.protein.consumed, 23.7);
  assert.equal(summary.water.consumed, 300);
  assert.equal(summary.nutrients.fiberG.complete, false);
  await routine.checkin(day);
  assert.equal((await logs.getDailySummary(day)).confirmed, true);
  await logs.updateFoodLog(food.id, {
    ...food,
    proteinG: 23.75,
    beverageMl: 450,
  });
  summary = await logs.getDailySummary(day);
  assert.equal(summary.confirmed, false);
  assert.equal(summary.water.consumed, 450);
  assert.equal(summary.protein.consumed, 23.75);
  assert.equal((await logs.getFoodLogById(food.id)).createdAt, food.createdAt);
  const water = (await logs.waterLogsByDateQuery(day))[0];
  await logs.removeWater(water.id);
  summary = await logs.getDailySummary(day);
  assert.equal(summary.foodEntries, 0);
  assert.equal(summary.waterEntries, 0);
  await assert.rejects(
    logs.addFood({ name: 'Invalid', proteinG: NaN, beverageMl: 300 }),
  );
  assert.equal((await logs.getDailySummary(day)).waterEntries, 0);
});
test('immutable favorites and historical target versions', async () => {
  const r = runtime(),
    logs = r.load('@/repositories/logs.repository').logsRepository,
    rr = r.load('@/repositories/routine.repository').routineRepository,
    g = r.load('@/repositories/goals.repository').goalsRepository,
    date = r.load('@/utils/date');
  const template = await rr.saveTemplate({
    name: 'Rice cooked',
    proteinG: 2.5,
    caloriesKcal: 130,
    portionAmount: 100,
    portionUnit: 'g',
  });
  const food = await logs.addFood(rr.useTemplate(template, 150, 'g'));
  await rr.saveTemplate(
    {
      name: 'Rice cooked',
      proteinG: 5,
      caloriesKcal: 150,
      portionAmount: 100,
      portionUnit: 'g',
    },
    template.id,
  );
  assert.equal((await logs.getFoodLogById(food.id)).proteinG, 3.75);
  const today = date.toDateKey(),
    tomorrow = date.addDays(today, 1);
  await g.update({ proteinGoal: 130, effectiveFrom: tomorrow });
  assert.equal((await g.get(today)).proteinGoal, 120);
  assert.equal((await g.get(tomorrow)).proteinGoal, 130);
  assert.equal(await g.forDate(date.addDays(today, -1)), null);
  const plansBefore = (await g.plans()).length;
  await g.update({ language: 'en', preferredAiProvider: 'groq' });
  assert.equal((await g.plans()).length, plansBefore);
});
test('history pages tie-break timestamps and escape search wildcards', async () => {
  const r = runtime(),
    logs = r.load('@/repositories/logs.repository').logsRepository;
  const when = new Date();
  for (let i = 0; i < 121; i++)
    await logs.addFood({
      name: i === 0 ? '100% real' : 'Food',
      proteinG: i,
      ingestedAt: when,
    });
  let cursor,
    all = [];
  do {
    const page = await logs.getLogsHistory({ cursor });
    all.push(...page);
    const last = page.at(-1);
    cursor =
      page.length === 50
        ? { occurredAt: last.occurredAt, id: last.id, type: last.type }
        : null;
  } while (cursor);
  assert.equal(all.length, 121);
  assert.equal(new Set(all.map((x) => x.id)).size, 121);
  assert.equal((await logs.getLogsHistory({ searchQuery: '%' })).length, 1);
});
test('analytics excludes unconfirmed and incomplete days, preserves missing averages', async () => {
  const r = runtime(),
    logs = r.load('@/repositories/logs.repository').logsRepository,
    rr = r.load('@/repositories/routine.repository').routineRepository,
    date = r.load('@/utils/date'),
    day = date.toDateKey();
  assert.equal((await logs.getAnalyticsData('7d')).kpis.avgProteinG, null);
  await logs.addFood({ name: 'meal', proteinG: 100, caloriesKcal: 1000 });
  await rr.checkin(day);
  await logs.addFood({
    name: 'incomplete',
    dateKey: date.addDays(day, -1),
    caloriesKcal: 300,
  });
  await rr.checkin(date.addDays(day, -1));
  const data = await logs.getAnalyticsData('7d');
  assert.equal(data.kpis.avgProteinG, 100);
  assert.equal(data.kpis.proteinDays, 1);
  assert.equal(data.kpis.avgCaloriesKcal, 650);
  assert.equal(data.kpis.calorieDays, 2);
});
test('backup round trip validates all records and rejects destructive restore', async () => {
  const r = runtime(),
    logs = r.load('@/repositories/logs.repository').logsRepository,
    b = r.load('@/services/backup.service');
  await logs.addFood({
    name: 'saved',
    proteinG: 23.7,
    caloriesKcal: 137,
    beverageMl: 300,
  });
  const text = b.exportBackup(),
    backup = b.validateBackup(text);
  assert.equal(backup.tables.food_logs.length, 1);
  assert.throws(() => b.restoreBackup(text), /empty/);
  const fresh = runtime(),
    target = fresh.load('@/services/backup.service');
  target.restoreBackup(text);
  const after = target.validateBackup(target.exportBackup());
  assert.deepEqual(b.backupStats(backup), target.backupStats(after));
  assert.equal(after.tables.food_logs[0].protein_g, 23.7);
  assert.equal(after.tables.water_logs[0].amount_ml, 300);
  assert.throws(() => target.validateBackup('{broken'));
  const bad = JSON.parse(text);
  bad.tables.food_logs[0].sodium_mg = -1;
  assert.throws(() => target.validateBackup(JSON.stringify(bad)));
});

test('import into an account remaps IDs and preserves linked volume and confirmation', async () => {
  const source = runtime(),
    logs = source.load('@/repositories/logs.repository').logsRepository,
    rr = source.load('@/repositories/routine.repository').routineRepository;
  const food = await logs.addFood({
    name: 'legacy local smoothie',
    proteinG: 20,
    caloriesKcal: 200,
    beverageMl: 300,
  });
  await rr.checkin();
  const backup = source.load('@/services/backup.service').exportBackup();
  const target = runtime();
  target.client.activeOwner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  target.client.scope = 'project:account';
  target.load('@/services/backup.service').restoreBackup(backup);
  const row = target.connection.getFirstSync('SELECT * FROM food_logs'),
    water = target.connection.getFirstSync('SELECT * FROM water_logs');
  assert.notEqual(row.id, food.id);
  assert.equal(water.food_log_id, row.id);
  assert.equal(water.group_id, row.group_id);
  assert.equal(row.owner_id, target.client.activeOwner);
  const summary = await target
    .load('@/repositories/logs.repository')
    .logsRepository.getDailySummary();
  assert.equal(summary.water.consumed, 300);
  assert.equal(summary.confirmed, true);
});

test('drink favorites retain linked volume when portion scales', async () => {
  const r = runtime(),
    rr = r.load('@/repositories/routine.repository').routineRepository;
  const f = await rr.saveTemplate({
    name: 'Smoothie',
    proteinG: 20,
    portionAmount: 100,
    portionUnit: 'ml',
    beverageMl: 100,
  });
  const repeated = rr.useTemplate(f, 150, 'ml');
  assert.equal(repeated.proteinG, 30);
  assert.equal(repeated.beverageMl, 150);
});

test('editing nutrients after a timezone change preserves the original consumption day', async () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'America/Sao_Paulo';
    const r = runtime(),
      logs = r.load('@/repositories/logs.repository').logsRepository;
    const f = await logs.addFood({
      name: 'Late meal',
      proteinG: 20,
      ingestedAt: '2026-11-06T02:30:00Z',
    });
    assert.equal(f.dateKey, '2026-11-05');
    process.env.TZ = 'UTC';
    const edited = await logs.updateFoodLog(f.id, {
      ...f,
      proteinG: 23.7,
      ingestedAt: new Date(f.occurredAt),
    });
    assert.equal(edited.proteinG, 23.7);
    assert.equal(edited.dateKey, '2026-11-05');
    assert.equal(edited.timeZone, 'America/Sao_Paulo');
    assert.equal(edited.createdAt, f.createdAt);
  } finally {
    process.env.TZ = original;
  }
});

test('successive offline goal edits form a chain after an accepted same-day plan', async () => {
  const r = runtime(),
    goals = r.load('@/repositories/goals.repository').goalsRepository,
    date = r.load('@/utils/date');
  r.connection.runSync('UPDATE goal_plans SET is_synced=1,revision=1');
  await goals.update({ caloriesGoal: 2600, effectiveFrom: date.toDateKey() });
  const first = (await goals.plans()).find((p) => p.caloriesGoal === 2600);
  await goals.update({ caloriesGoal: 2700, effectiveFrom: date.toDateKey() });
  const second = (await goals.plans()).find((p) => p.caloriesGoal === 2700);
  assert.equal(second.replacesId, first.id);
  assert.equal((await goals.get()).caloriesGoal, 2700);
});
