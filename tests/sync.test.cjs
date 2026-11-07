const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  { randomUUID } = require('node:crypto');
const { runtime } = require('./runtime.cjs');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function setup() {
  const r = runtime();
  r.client.activeOwner = A;
  r.client.scope = `project:${A}`;
  r.load('@/repositories/preferences.repository').setPreference(
    'cloudSync',
    true,
  );
  // Seed is independent from the scenarios under test.
  r.connection.runSync(
    'UPDATE goal_plans SET is_synced=1,revision=1,owner_id=?',
    A,
  );
  const remote = new Map(),
    receipts = new Map(),
    calls = [];
  let onPush = null,
    loseNext = false;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: A } }, error: null }) },
    async rpc(name, params) {
      calls.push({ name, params });
      if (name === 'fit_schema_v2') return { data: 2 };
      if (name === 'fit_mutate_v2') {
        if (receipts.has(params.p_operation_id))
          return { data: receipts.get(params.p_operation_id) };
        const changes = params.p_changes;
        if (onPush) {
          const f = onPush;
          onPush = null;
          await f();
        }
        const conflicts = changes.filter(
          (c) =>
            (remote.get(`${c.table}:${c.row.id}`)?.revision ?? 0) !==
            c.expectedRevision,
        );
        let result;
        if (conflicts.length)
          result = {
            ok: false,
            conflicts: changes.map((c) => ({
              table: c.table,
              localId: c.row.id,
              row: remote.get(`${c.table}:${c.row.id}`) ?? null,
            })),
          };
        else {
          result = {
            ok: true,
            records: changes.map((c) => {
              const row = {
                ...c.row,
                owner_id: A,
                revision: c.expectedRevision + 1,
                operation_id: params.p_operation_id,
                server_updated_at: '2026-11-06T12:00:00.000Z',
              };
              remote.set(`${c.table}:${row.id}`, row);
              return { table: c.table, row };
            }),
          };
        }
        receipts.set(params.p_operation_id, result);
        if (loseNext) {
          loseNext = false;
          return { error: { message: 'response lost' } };
        }
        return { data: result };
      }
      if (name === 'fit_page_v2')
        return {
          data: [...remote.entries()]
            .filter(
              ([k, v]) =>
                k.startsWith(params.p_table + ':') &&
                (v.server_updated_at > params.p_after_time ||
                  (v.server_updated_at === params.p_after_time &&
                    v.id > params.p_after_id)),
            )
            .map(([, v]) => v)
            .sort(
              (a, b) =>
                a.server_updated_at.localeCompare(b.server_updated_at) ||
                a.id.localeCompare(b.id),
            )
            .slice(0, params.p_limit),
        };
      if (name === 'fit_group_v2')
        return {
          data: [...remote.entries()]
            .filter(([, v]) => v.group_id === params.p_group)
            .map(([k, row]) => ({ table: k.split(':')[0], row })),
        };
      throw new Error(name);
    },
  };
  r.supabase.getDynamicSupabaseClient = async () => client;
  r.supabase.getAuthSession = () => ({ user: { id: A } });
  return {
    ...r,
    remote,
    calls,
    receipts,
    sync: r.load('@/sync/sync.service'),
    onPush: (f) => {
      onPush = f;
    },
    loseResponse: () => {
      loseNext = true;
    },
  };
}
test('lost responses retry the same operation without duplicate consumption', async () => {
  const r = setup(),
    logs = r.load('@/repositories/logs.repository').logsRepository;
  await logs.addFood({ name: 'meal', proteinG: 20 });
  r.loseResponse();
  const first = await r.sync.syncWithSupabase();
  assert.equal(first.ok, false);
  assert.equal(
    r.connection.getFirstSync('SELECT count(*) n FROM sync_outbox').n,
    1,
  );
  const second = await r.sync.syncWithSupabase();
  assert.equal(second.ok, true);
  assert.equal(r.remote.size, 1);
  const pushes = r.calls.filter((c) => c.name === 'fit_mutate_v2');
  assert.equal(
    pushes[0].params.p_operation_id,
    pushes[1].params.p_operation_id,
  );
  assert.deepEqual(pushes[0].params.p_changes, pushes[1].params.p_changes);
});
test('a local edit during push is not falsely acknowledged', async () => {
  const r = setup(),
    logs = r.load('@/repositories/logs.repository').logsRepository;
  const food = await logs.addFood({ name: 'initial', proteinG: 10 });
  r.onPush(() =>
    logs.updateFoodLog(food.id, { ...food, name: 'new local', proteinG: 23.7 }),
  );
  assert.equal((await r.sync.syncWithSupabase()).ok, false);
  let local = await logs.getFoodLogById(food.id);
  assert.equal(local.name, 'new local');
  assert.equal(local.isSynced, false);
  assert.equal(local.revision, 1);
  assert.equal((await r.sync.syncWithSupabase()).ok, true);
  assert.equal(r.remote.get(`food_logs:${food.id}`).name, 'new local');
});
test('conflicts preserve device edits until either resolution choice', async () => {
  const r = setup(),
    logs = r.load('@/repositories/logs.repository').logsRepository;
  const food = await logs.addFood({ name: 'device', proteinG: 10 });
  const raw = r
    .load('@/sync/records')
    .toRemote(
      r.connection.getFirstSync('SELECT * FROM food_logs WHERE id=?', food.id),
    );
  r.remote.set(`food_logs:${food.id}`, {
    ...raw,
    name: 'cloud',
    owner_id: A,
    revision: 2,
    server_updated_at: '2026-11-06T12:00:00.000Z',
  });
  assert.equal((await r.sync.syncWithSupabase()).ok, false);
  assert.equal((await logs.getFoodLogById(food.id)).name, 'device');
  assert.equal((await logs.getFoodLogById(food.id)).isSynced, false);
  const conflict = r.sync.getSyncConflicts()[0];
  r.sync.resolveSyncConflict(conflict.id, 'device');
  assert.equal((await r.sync.syncWithSupabase()).ok, true);
  assert.equal(r.remote.get(`food_logs:${food.id}`).name, 'device');
  const row = r.remote.get(`food_logs:${food.id}`);
  r.remote.set(`food_logs:${food.id}`, {
    ...row,
    name: 'cloud again',
    revision: 4,
  });
  await logs.updateFoodLog(food.id, { ...food, name: 'offline edit' });
  await r.sync.syncWithSupabase();
  r.sync.resolveSyncConflict(r.sync.getSyncConflicts()[0].id, 'cloud');
  assert.equal((await logs.getFoodLogById(food.id)).name, 'cloud again');
  r.sync.syncEngine.stop();
});
test('paging, replay and full reconciliation include late older transactions', async () => {
  const r = setup(),
    logs = r.load('@/repositories/logs.repository').logsRepository;
  const food = await logs.addFood({ name: 'model' }),
    raw = r
      .load('@/sync/records')
      .toRemote(
        r.connection.getFirstSync(
          'SELECT * FROM food_logs WHERE id=?',
          food.id,
        ),
      );
  r.connection.runSync('DELETE FROM food_logs');
  for (let i = 0; i < 501; i++) {
    const id = randomUUID();
    r.remote.set(`food_logs:${id}`, {
      ...raw,
      id,
      name: `Row ${i}`,
      owner_id: A,
      revision: 1,
      server_updated_at: '2026-11-06T12:00:00.000Z',
    });
  }
  assert.equal((await r.sync.syncWithSupabase()).ok, true);
  assert.equal(
    r.connection.getFirstSync('SELECT count(*) n FROM food_logs').n,
    501,
  );
  assert.equal((await r.sync.syncWithSupabase()).ok, true);
  assert.equal(
    r.connection.getFirstSync('SELECT count(*) n FROM food_logs').n,
    501,
  );
  const late = randomUUID();
  r.remote.set(`food_logs:${late}`, {
    ...raw,
    id: late,
    owner_id: A,
    revision: 1,
    server_updated_at: '2026-11-05T12:00:00.000Z',
  });
  await r.sync.syncWithSupabase({ forceFullSync: true });
  assert.equal(
    r.connection.getFirstSync('SELECT count(*) n FROM food_logs').n,
    502,
  );
});
test('account changes during requests never apply to the next account file', async () => {
  const r = setup(),
    logs = r.load('@/repositories/logs.repository').logsRepository;
  await logs.addFood({ name: 'A only' });
  r.onPush(() => {
    r.client.scope = 'project:B';
    r.client.activeOwner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  });
  const result = await r.sync.syncWithSupabase();
  assert.equal(result.ok, false);
  assert.equal(result.error, 'account_changed');
  assert.equal(
    r.connection.getFirstSync('SELECT is_synced FROM food_logs').is_synced,
    0,
  );
});
test('linked meal and liquid are pulled together and confirmation survives canonical timestamps', async () => {
  const r = setup(),
    logs = r.load('@/repositories/logs.repository').logsRepository,
    rr = r.load('@/repositories/routine.repository').routineRepository,
    date = r.load('@/utils/date');
  const food = await logs.addFood({
    name: 'shake',
    proteinG: 20,
    caloriesKcal: 200,
    beverageMl: 300,
  });
  await rr.checkin(date.toDateKey());
  assert.equal((await r.sync.syncWithSupabase()).ok, true);
  assert.equal((await logs.getDailySummary()).confirmed, true);
  const f = r.remote.get(`food_logs:${food.id}`);
  f.updated_at = f.updated_at.replace('Z', '+00:00');
  f.revision++;
  await r.sync.syncWithSupabase();
  assert.equal((await logs.getDailySummary()).confirmed, true);
  assert.equal((await logs.getDailySummary()).water.consumed, 300);
});

test('same-day confirmation conflict can keep the device values using the canonical cloud UUID', async () => {
  const r = setup(),
    logs = r.load('@/repositories/logs.repository').logsRepository,
    rr = r.load('@/repositories/routine.repository').routineRepository;
  await logs.addFood({ name: 'meal', proteinG: 20 });
  await rr.checkin();
  const local = r.connection.getFirstSync('SELECT * FROM daily_checkins'),
    canonical = {
      ...r.load('@/sync/records').toRemote(local),
      id: randomUUID(),
      owner_id: A,
      revision: 1,
      confirmed: false,
      server_updated_at: '2026-11-06T12:00:00.000Z',
    };
  r.connection.runSync(
    'INSERT INTO sync_conflicts(id,table_name,local_id,remote_json,operation_id) VALUES (?,?,?,?,?)',
    'daily_checkins:' + local.id,
    'daily_checkins',
    local.id,
    JSON.stringify(canonical),
    local.operation_id,
  );
  r.remote.set('daily_checkins:' + canonical.id, canonical);
  r.sync.resolveSyncConflict('daily_checkins:' + local.id, 'device');
  const active = r.connection.getAllSync(
    'SELECT * FROM daily_checkins WHERE deleted_at IS NULL',
  );
  assert.equal(active.length, 1);
  assert.equal(active[0].id, canonical.id);
  assert.equal(active[0].confirmed, 1);
  assert.equal(active[0].is_synced, 0);
  assert.equal((await r.sync.syncWithSupabase()).ok, true);
  r.sync.syncEngine.stop();
});
