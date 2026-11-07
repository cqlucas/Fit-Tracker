const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  { spawnSync } = require('node:child_process'),
  { randomUUID } = require('node:crypto'),
  fs = require('node:fs');
const { runtime, root } = require('./runtime.cjs');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function pg(
  input,
  {
    owner = A,
    role = 'authenticated',
    fail = false,
    database = 'fittracker_v2_test',
  } = {},
) {
  if (!database.startsWith('fittracker_v2_'))
    throw new Error('Only disposable test databases are allowed');
  const prefix = role
    ? `SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${owner ?? ''}',false);\n`
    : '';
  const r = spawnSync(
    'psql',
    [
      '-h',
      process.env.FITTRACKER_PG_TEST_SOCKET ?? '/tmp/fittracker-v2-pg-socket',
      '-p',
      process.env.FITTRACKER_PG_TEST_PORT ?? '55439',
      '-d',
      database,
      '-v',
      'ON_ERROR_STOP=1',
      '-qAt',
    ],
    { input: prefix + input, encoding: 'utf8' },
  );
  if (fail) {
    assert.notEqual(r.status, 0, 'expected server rejection');
    return r.stderr;
  }
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim().split('\n').at(-1);
}
pg(
  'TRUNCATE public.food_logs,public.water_logs,public.goal_plans,public.food_templates,public.weight_logs,public.supplement_logs,public.training_days,public.daily_checkins,public.fit_sync_receipts,public.fit_ai_usage',
  { role: null },
);
const literal = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
function mutate(changes, op = randomUUID(), options) {
  return JSON.parse(
    pg(`SELECT public.fit_mutate_v2('${op}',${literal(changes)},2);`, options),
  );
}
async function sample() {
  const r = runtime(),
    logs = r.load('@/repositories/logs.repository').logsRepository;
  const food = await logs.addFood({
    name: 'Test meal',
    proteinG: 23.7,
    caloriesKcal: 137,
    carbG: null,
  });
  const raw = r.connection.getFirstSync(
    'SELECT * FROM food_logs WHERE id=?',
    food.id,
  );
  return { r, raw, row: r.load('@/sync/records').toRemote(raw) };
}
test('Postgres CAS, duplicate retries and tombstones', async () => {
  const { row } = await sample();
  const op = randomUUID(),
    change = { table: 'food_logs', expectedRevision: 0, row };
  const first = mutate([change], op);
  assert.equal(first.ok, true);
  assert.equal(first.records[0].row.revision, 1);
  assert.equal(first.records[0].row.protein_g, 23.7);
  assert.equal(first.records[0].row.owner_id, A);
  assert.deepEqual(mutate([change], op), first);
  const edited = { ...first.records[0].row, name: 'New server version' };
  const next = mutate([{ ...change, expectedRevision: 1, row: edited }]);
  assert.equal(next.records[0].row.revision, 2);
  const conflict = mutate([
    { ...change, row: { ...row, name: 'Stale device' } },
  ]);
  assert.equal(conflict.ok, false);
  assert.equal(conflict.conflicts[0].row.name, 'New server version');
  const deleted = mutate([
    {
      ...change,
      expectedRevision: 2,
      row: { ...next.records[0].row, deleted_at: new Date().toISOString() },
    },
  ]);
  assert.equal(deleted.ok, true);
  const deletionConflict = mutate([
    { ...change, expectedRevision: 2, row: edited },
  ]);
  assert.equal(deletionConflict.ok, false);
  assert.ok(deletionConflict.conflicts[0].row.deleted_at);
});
test('Postgres denies anonymous, cross-account and old-client writes', async () => {
  const { row } = await sample();
  mutate([{ table: 'food_logs', expectedRevision: 0, row }]);
  assert.equal(
    pg(`SELECT count(*) FROM public.food_logs WHERE id='${row.id}'`, {
      owner: B,
    }),
    '0',
  );
  pg(
    `SELECT public.fit_mutate_v2('${randomUUID()}',${literal([{ table: 'food_logs', expectedRevision: 1, row }])},2)`,
    { owner: B, fail: true },
  );
  pg('SELECT * FROM public.food_logs', {
    owner: null,
    role: 'anon',
    fail: true,
  });
  pg(`SELECT public.fit_mutate_v2('${randomUUID()}','[]',2)`, {
    owner: null,
    role: 'anon',
    fail: true,
  });
  pg(`UPDATE public.food_logs SET name='overwrite' WHERE id='${row.id}'`, {
    fail: true,
  });
  pg(
    `SELECT public.fit_mutate_v2('${randomUUID()}',${literal([{ table: 'food_logs', expectedRevision: 0, row }])},1)`,
    { fail: true },
  );
});
test('Postgres atomic linked drink rollback and complete group read', async () => {
  const { r } = await sample(),
    logs = r.load('@/repositories/logs.repository').logsRepository;
  const f = await logs.addFood({
    name: 'Shake',
    proteinG: 20,
    beverageMl: 300,
  });
  const toRemote = r.load('@/sync/records').toRemote;
  const food = toRemote(
    r.connection.getFirstSync('SELECT * FROM food_logs WHERE id=?', f.id),
  );
  const water = toRemote(
    r.connection.getFirstSync(
      'SELECT * FROM water_logs WHERE food_log_id=?',
      f.id,
    ),
  );
  const changes = [
    { table: 'food_logs', expectedRevision: 0, row: food },
    {
      table: 'water_logs',
      expectedRevision: 0,
      row: { ...water, amount_ml: -1 },
    },
  ];
  pg(`SELECT public.fit_mutate_v2('${randomUUID()}',${literal(changes)},2)`, {
    fail: true,
  });
  assert.equal(
    pg(`SELECT count(*) FROM public.food_logs WHERE id='${f.id}'`),
    '0',
  );
  changes[1].row = water;
  assert.equal(mutate(changes).ok, true);
  const group = JSON.parse(
    pg(`SELECT public.fit_group_v2('${food.group_id}')`),
  );
  assert.equal(group.length, 2);
  const latest = group.find((m) => m.table === 'water_logs').row;
  const conflict = mutate([
    {
      ...changes[0],
      expectedRevision: 1,
      row: group.find((m) => m.table === 'food_logs').row,
    },
    { ...changes[1], row: latest },
  ]);
  assert.equal(conflict.ok, false);
});
test('Postgres immutable plans reject competing same-date versions', () => {
  const r = runtime(),
    record = r.connection.getFirstSync('SELECT * FROM goal_plans'),
    toRemote = r.load('@/sync/records').toRemote;
  const row = toRemote(record);
  row.effective_from = '2028-01-01';
  const first = mutate([{ table: 'goal_plans', expectedRevision: 0, row }]);
  assert.equal(first.ok, true);
  const competing = { ...row, id: randomUUID() };
  assert.equal(
    mutate([{ table: 'goal_plans', expectedRevision: 0, row: competing }]).ok,
    false,
  );
  const replacing = {
    ...row,
    id: randomUUID(),
    replaces_id: row.id,
    replaces_revision: 1,
  };
  const accepted = mutate([
    { table: 'goal_plans', expectedRevision: 0, row: replacing },
  ]);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.records[0].row.revision, 2);
  assert.equal(
    pg(
      `SELECT count(*) FROM public.goal_plans WHERE effective_from='2028-01-01'`,
    ),
    '2',
  );
});
test('Postgres composite cursor reads more than 500 equal timestamps', async () => {
  const { row } = await sample();
  const stamp = '2027-01-01T00:00:00Z';
  const values = Array.from({ length: 501 }, () => ({
    ...row,
    id: randomUUID(),
    owner_id: A,
    revision: 1,
    server_updated_at: stamp,
  }));
  pg(
    `INSERT INTO public.food_logs SELECT * FROM jsonb_populate_recordset(NULL::public.food_logs,${literal(values)})`,
    { role: null },
  );
  let time = stamp,
    id = '',
    seen = [];
  for (;;) {
    const page = JSON.parse(
      pg(`SELECT public.fit_page_v2('food_logs','${time}','${id}',500)`),
    );
    seen.push(...page);
    if (page.length < 500) break;
    time = page.at(-1).server_updated_at;
    id = page.at(-1).id;
  }
  assert.equal(seen.length, 501);
  assert.equal(new Set(seen.map((r) => r.id)).size, 501);
});
test('server validation rejects negative/NaN nutrition and fractional or mismatched units', async () => {
  const { row } = await sample();
  for (const patch of [
    { protein_g: -1 },
    { protein_g: 'NaN' },
    { portion_amount: 0, portion_unit: 'g' },
    { fat_g: 1, saturated_fat_g: 2 },
  ])
    pg(
      `SELECT public.fit_mutate_v2('${randomUUID()}',${literal([{ table: 'food_logs', expectedRevision: 0, row: { ...row, ...patch, id: randomUUID() } }])},2)`,
      { fail: true },
    );
});
test('AI allowance is atomic and unavailable to authenticated clients', () => {
  pg(`SELECT public.fit_use_ai('${A}')`, { fail: true });
  for (let i = 0; i < 30; i++)
    assert.equal(
      pg(`SELECT public.fit_use_ai('${B}')`, { role: 'service_role' }),
      't',
    );
  assert.equal(
    pg(`SELECT public.fit_use_ai('${B}')`, { role: 'service_role' }),
    'f',
  );
});

test('legacy upgrade keeps ownerless records private and cannot publicly claim them', () => {
  const options = { database: 'fittracker_v2_legacy_test' };
  assert.equal(
    pg(
      "SELECT protein_g FROM public.food_logs WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'",
      { ...options, role: null },
    ),
    '23.70',
  );
  assert.equal(pg('SELECT count(*) FROM public.food_logs', options), '0');
  pg('SELECT * FROM public.food_logs', {
    ...options,
    role: 'anon',
    owner: null,
    fail: true,
  });
  pg(
    'SELECT public.fit_mutate_v2(\'dddddddd-dddd-4ddd-8ddd-dddddddddddd\',\'[{"table":"food_logs","expectedRevision":0,"row":{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}}]\'::jsonb,2)',
    { ...options, fail: true },
  );
});

test('same-day check-ins from two offline devices conflict instead of duplicating confirmation', async () => {
  const r = runtime(),
    logs = r.load('@/repositories/logs.repository').logsRepository,
    rr = r.load('@/repositories/routine.repository').routineRepository;
  await logs.addFood({ name: 'meal', proteinG: 20, caloriesKcal: 200 });
  await rr.checkin();
  const row = r
    .load('@/sync/records')
    .toRemote(r.connection.getFirstSync('SELECT * FROM daily_checkins'));
  const first = mutate([{ table: 'daily_checkins', expectedRevision: 0, row }]);
  assert.equal(first.ok, true);
  const second = mutate([
    {
      table: 'daily_checkins',
      expectedRevision: 0,
      row: { ...row, id: randomUUID(), confirmed: false },
    },
  ]);
  assert.equal(second.ok, false);
  assert.equal(second.conflicts[0].row.id, row.id);
  assert.equal(
    pg(
      `SELECT count(*) FROM public.daily_checkins WHERE date_key='${row.date_key}'`,
    ),
    '1',
  );
  const remote = first.records[0].row;
  const resolved = mutate([
    {
      table: 'daily_checkins',
      expectedRevision: remote.revision,
      row: { ...remote, confirmed: false },
    },
  ]);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.records[0].row.confirmed, false);
});

test('server rejects omitted v2 fields and null protocol controls', async () => {
  const { row } = await sample();
  const incomplete = { ...row };
  delete incomplete.fiber_g;
  pg(
    `SELECT public.fit_mutate_v2('${randomUUID()}',${literal([{ table: 'food_logs', expectedRevision: 0, row: incomplete }])},2)`,
    { fail: true },
  );
  pg(`SELECT public.fit_mutate_v2('${randomUUID()}',NULL,2)`, { fail: true });
  pg(
    `SELECT public.fit_mutate_v2('${randomUUID()}',${literal([{ table: 'food_logs', expectedRevision: 0, row }])},NULL)`,
    { fail: true },
  );
  pg("SELECT public.fit_page_v2('food_logs','1970-01-01','',NULL)", {
    fail: true,
  });
});
