import NetInfo from '@react-native-community/netinfo';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDatabaseChangeListener, type SQLiteDatabase } from 'expo-sqlite';
import { AppState } from 'react-native';
import { activeOwner, expoDb, getDatabaseScope } from '@/db/client';
import { SYNC_TABLES, type SyncTableName } from '@/db/schema';
import { getPreference } from '@/repositories/preferences.repository';
import { generateId } from '@/utils/id';
import {
  getAuthSession,
  getDynamicSupabaseClient,
  subscribeAuth,
} from './supabase';
import {
  isSyncTable,
  tableColumns,
  toRemote,
  validateRecord,
  writeRaw,
  type RawRecord,
  type RemoteRecord,
} from './records';
export interface SyncResult {
  ok: boolean;
  pushed: Record<SyncTableName, number>;
  pulled: Record<SyncTableName, number>;
  error?: string;
  finishedAt: string;
}
export interface SyncState {
  isSyncing: boolean;
  isOnline: boolean;
  isEnabled: boolean;
  lastResult: SyncResult | null;
  pending: number;
  conflicts: number;
}
export type SchemaVerificationResult =
  | { status: 'ready' }
  | { status: 'missing_tables'; table: string }
  | { status: 'invalid_credentials'; message: string };
export type Listener = (state: SyncState) => void;
interface Change {
  table: SyncTableName;
  expectedRevision: number;
  row: RawRecord;
}
interface Pending {
  id: string;
  payload: string;
  attempted: number;
}
interface Receipt {
  ok: boolean;
  records?: RemoteRecord[];
  conflicts?: {
    table: SyncTableName;
    localId: string;
    row: RawRecord | null;
  }[];
}
const counts = () =>
  Object.fromEntries(SYNC_TABLES.map((t) => [t, 0])) as Record<
    SyncTableName,
    number
  >;
const LOGICAL_DAY_TABLES = ['daily_checkins', 'training_days'];
const EPOCH = '1970-01-01T00:00:00.000Z';
function pendingCount(connection = expoDb) {
  return SYNC_TABLES.reduce(
    (n, t) =>
      n +
      (connection.getFirstSync<{ n: number }>(
        `SELECT count(*) n FROM ${t} WHERE is_synced=0`,
      )?.n ?? 0),
    0,
  );
}
export async function verifySupabaseSchema(
  client?: SupabaseClient | null,
): Promise<SchemaVerificationResult> {
  const c = client ?? (await getDynamicSupabaseClient());
  if (!c)
    return { status: 'invalid_credentials', message: 'Configure Supabase' };
  const { data, error } = await c.rpc('fit_schema_v2');
  if (error || data !== 2)
    return { status: 'missing_tables', table: 'fit_schema_v2' };
  return { status: 'ready' };
}
function remoteLocal(
  connection: SQLiteDatabase,
  record: RemoteRecord,
  owner: string,
) {
  if (!isSyncTable(record.table) || record.row.owner_id !== owner)
    throw new Error('Invalid remote owner');
  return validateRecord(
    record.table,
    { ...record.row, is_synced: 1 },
    tableColumns(connection, record.table),
  );
}
function storeConflict(
  connection: SQLiteDatabase,
  id: string,
  change: Change,
  remote: RawRecord | null,
) {
  connection.runSync(
    'INSERT INTO sync_conflicts(id,table_name,local_id,remote_json,operation_id) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET remote_json=excluded.remote_json,operation_id=excluded.operation_id',
    `${change.table}:${change.row.id}`,
    change.table,
    String(change.row.id),
    JSON.stringify(remote),
    id,
  );
}
function applyRecords(
  connection: SQLiteDatabase,
  records: RemoteRecord[],
  owner: string,
) {
  const prepared = records.map((record) => ({
    ...record,
    row: remoteLocal(connection, record, owner),
    local:
      connection.getFirstSync<RawRecord>(
        `SELECT * FROM ${record.table} WHERE id=?`,
        String(record.row.id),
      ) ??
      (LOGICAL_DAY_TABLES.includes(record.table)
        ? connection.getFirstSync<RawRecord>(
            `SELECT * FROM ${record.table} WHERE date_key=? AND deleted_at IS NULL`,
            String(record.row.date_key),
          )
        : null),
  }));
  const changedDirty = prepared.some(
    (p) =>
      p.local &&
      !p.local.is_synced &&
      (p.row.id !== p.local.id ||
        Number(p.row.revision) > Number(p.local.revision)),
  );
  // Linked food and volume always apply or wait together.
  if (changedDirty) {
    const operation = String(
      prepared.find((p) => p.local?.operation_id)?.local?.operation_id ??
        generateId(),
    );
    for (const p of prepared)
      if (p.local && !p.local.is_synced)
        storeConflict(
          connection,
          operation,
          {
            table: p.table,
            expectedRevision: Number(p.local.revision),
            row: p.local,
          },
          p.row,
        );
    return;
  }
  for (const p of prepared) {
    if (
      p.local &&
      p.local.id !== p.row.id &&
      LOGICAL_DAY_TABLES.includes(p.table)
    ) {
      connection.runSync(
        `UPDATE ${p.table} SET deleted_at=?,is_synced=1 WHERE id=?`,
        new Date().toISOString(),
        String(p.local.id),
      );
      writeRaw(connection, p.table, p.row);
      continue;
    }
    if (
      p.local &&
      (!p.local.is_synced || Number(p.local.revision) >= Number(p.row.revision))
    )
      continue;
    if (p.local?.image_uri && 'image_uri' in p.row)
      p.row.image_uri = p.local.image_uri;
    writeRaw(connection, p.table, p.row);
  }
}
function prepareOutbox(connection: SQLiteDatabase) {
  const queued = new Set<string>();
  for (const pending of connection.getAllSync<Pending>(
    'SELECT * FROM sync_outbox',
  ))
    for (const c of JSON.parse(pending.payload) as Change[])
      queued.add(`${c.table}:${c.row.id}`);
  const blocked = new Set(
    connection
      .getAllSync<{ table_name: string; local_id: string }>(
        'SELECT table_name,local_id FROM sync_conflicts',
      )
      .map((r) => `${r.table_name}:${r.local_id}`),
  );
  const visited = new Set<string>();
  for (const table of SYNC_TABLES) {
    const rows = connection.getAllSync<RawRecord>(
      `SELECT * FROM ${table} WHERE is_synced=0 ORDER BY created_at,id`,
    );
    for (const row of rows) {
      const key = `${table}:${row.id}`;
      if (queued.has(key) || blocked.has(key) || visited.has(key)) continue;
      let members: { table: SyncTableName; row: RawRecord }[] = [
        { table, row },
      ];
      if (row.group_id)
        members = (['food_logs', 'water_logs'] as const).flatMap((t) =>
          connection
            .getAllSync<RawRecord>(
              `SELECT * FROM ${t} WHERE group_id=?`,
              String(row.group_id),
            )
            .map((r) => ({ table: t, row: r })),
        );
      if (
        members.some(
          (m) =>
            queued.has(`${m.table}:${m.row.id}`) ||
            blocked.has(`${m.table}:${m.row.id}`),
        )
      )
        continue;
      const id = String(row.operation_id ?? generateId());
      const changes = members.map((m) => {
        visited.add(`${m.table}:${m.row.id}`);
        return {
          table: m.table,
          expectedRevision: Number(m.row.revision),
          row: toRemote(m.row),
        };
      });
      connection.runSync(
        'INSERT OR IGNORE INTO sync_outbox(id,payload) VALUES (?,?)',
        id,
        JSON.stringify(changes),
      );
    }
  }
}
export async function syncWithSupabase(options?: {
  forceFullSync?: boolean;
}): Promise<SyncResult> {
  const pushed = counts(),
    pulled = counts();
  const result = (ok: boolean, error?: string): SyncResult => ({
    ok,
    pushed,
    pulled,
    error,
    finishedAt: new Date().toISOString(),
  });
  let client: SupabaseClient | null;
  try {
    client = await getDynamicSupabaseClient();
  } catch (e) {
    return result(false, e instanceof Error ? e.message : 'unconfigured');
  }
  const owner = activeOwner,
    connection = expoDb,
    scope = getDatabaseScope();
  const assertScope = () => {
    if (scope !== getDatabaseScope() || activeOwner !== owner)
      throw new Error('account_changed');
  };
  if (!client || !owner || !getAuthSession())
    return result(false, 'sign_in_required');
  if (!getPreference('cloudSync', false)) return result(false, 'local_only');
  try {
    const network = await NetInfo.fetch();
    assertScope();
    if (!network.isConnected || network.isInternetReachable === false)
      return result(false, 'offline');
    const { data: auth, error: authError } = await client.auth.getUser();
    assertScope();
    if (authError || auth.user?.id !== owner)
      throw new Error('sign_in_required');
    if ((await verifySupabaseSchema(client)).status !== 'ready')
      throw new Error('server_update_required');
    assertScope();
    connection.withTransactionSync(() => prepareOutbox(connection));
    const outbox = connection.getAllSync<Pending>(
      'SELECT * FROM sync_outbox ORDER BY rowid',
    );
    for (const op of outbox) {
      assertScope();
      let changes = JSON.parse(op.payload) as Change[];
      // A preceding goal plan may just have received its server revision.
      if (!op.attempted)
        changes = changes.map((c) => {
          if (c.table !== 'goal_plans' || !c.row.replaces_id) return c;
          const base = connection.getFirstSync<{ revision: number }>(
            'SELECT revision FROM goal_plans WHERE id=?',
            String(c.row.replaces_id),
          );
          return {
            ...c,
            row: {
              ...c.row,
              replaces_revision: base?.revision ?? c.row.replaces_revision,
            },
          };
        });
      // Freeze the exact request for idempotent retries after a lost response.
      connection.runSync(
        'UPDATE sync_outbox SET payload=?,attempted=1 WHERE id=?',
        JSON.stringify(changes),
        op.id,
      );
      const { data, error } = await client.rpc('fit_mutate_v2', {
        p_operation_id: op.id,
        p_changes: changes,
        p_client_version: 2,
      });
      assertScope();
      if (error) throw new Error(error.message);
      const receipt = data as Receipt;
      connection.withTransactionSync(() => {
        if (!receipt.ok) {
          for (const change of changes) {
            const conflict = receipt.conflicts?.find(
              (c) => c.table === change.table && c.localId === change.row.id,
            );
            const remote = conflict?.row ?? null;
            if (remote)
              remoteLocal(
                connection,
                { table: change.table, row: remote },
                owner,
              );
            storeConflict(connection, op.id, change, remote);
          }
        } else {
          for (const record of receipt.records ?? []) {
            const remote = remoteLocal(connection, record, owner);
            const local = connection.getFirstSync<RawRecord>(
              `SELECT * FROM ${record.table} WHERE id=?`,
              String(remote.id),
            );
            const sent = changes.find(
              (c) => c.table === record.table && c.row.id === remote.id,
            );
            if (!local || !sent) throw new Error('Invalid sync receipt');
            const unchanged =
              String(local.operation_id ?? op.id) === op.id &&
              String(local.updated_at) === String(sent.row.updated_at);
            if (unchanged) {
              if (local.image_uri && 'image_uri' in remote)
                remote.image_uri = local.image_uri;
              writeRaw(connection, record.table, remote);
            } else
              connection.runSync(
                `UPDATE ${record.table} SET revision=? WHERE id=?`,
                Number(remote.revision),
                String(remote.id),
              );
            if (record.table === 'goal_plans')
              connection.runSync(
                'UPDATE goal_plans SET replaces_revision=? WHERE replaces_id=? AND is_synced=0',
                Number(remote.revision),
                String(remote.id),
              );
            pushed[record.table]++;
          }
          connection.runSync('DELETE FROM sync_outbox WHERE id=?', op.id);
        }
      });
    }
    for (const table of SYNC_TABLES) {
      assertScope();
      const checkpoint = connection.getFirstSync<{
        timestamp: string;
        row_id: string;
        reconciled_at: string | null;
      }>('SELECT * FROM sync_checkpoints WHERE table_name=?', table);
      const full =
        options?.forceFullSync ||
        !checkpoint?.reconciled_at ||
        Date.now() - Date.parse(checkpoint.reconciled_at) > 86400000;
      let time = full
          ? EPOCH
          : new Date(
              Math.max(0, Date.parse(checkpoint!.timestamp) - 300000),
            ).toISOString(),
        id = '';
      let lastTime = checkpoint?.timestamp ?? EPOCH,
        lastId = checkpoint?.row_id ?? '';
      for (;;) {
        const { data, error } = await client.rpc('fit_page_v2', {
          p_table: table,
          p_after_time: time,
          p_after_id: id,
          p_limit: 500,
        });
        assertScope();
        if (error) throw new Error(error.message);
        if (!Array.isArray(data)) throw new Error('Invalid sync page');
        const page = data as RawRecord[];
        if (!page.length) break;
        const records: RemoteRecord[][] = [];
        const groups = new Set<string>();
        for (const row of page) {
          if (row.group_id) {
            const group = String(row.group_id);
            if (groups.has(group)) continue;
            groups.add(group);
            const response = await client.rpc('fit_group_v2', {
              p_group: group,
            });
            assertScope();
            if (response.error) throw response.error;
            const members = response.data as RemoteRecord[];
            if (
              !Array.isArray(members) ||
              members.length !== 2 ||
              !members.some((m) => m.table === 'food_logs') ||
              !members.some((m) => m.table === 'water_logs') ||
              members.some((m) => m.row.group_id !== group)
            )
              throw new Error('Incomplete remote group');
            records.push(members);
          } else records.push([{ table, row }]);
        }
        const last = page[page.length - 1];
        time = String(last.server_updated_at);
        id = String(last.id);
        if (time > lastTime || (time === lastTime && id > lastId)) {
          lastTime = time;
          lastId = id;
        }
        connection.withTransactionSync(() => {
          for (const group of records) applyRecords(connection, group, owner);
          connection.runSync(
            'INSERT INTO sync_checkpoints(table_name,timestamp,row_id,reconciled_at) VALUES (?,?,?,?) ON CONFLICT(table_name) DO UPDATE SET timestamp=excluded.timestamp,row_id=excluded.row_id',
            table,
            lastTime,
            lastId,
            checkpoint?.reconciled_at ?? null,
          );
        });
        pulled[table] += page.length;
        if (page.length < 500) break;
      }
      if (full)
        connection.runSync(
          'INSERT INTO sync_checkpoints(table_name,timestamp,row_id,reconciled_at) VALUES (?,?,?,?) ON CONFLICT(table_name) DO UPDATE SET reconciled_at=excluded.reconciled_at',
          table,
          lastTime,
          lastId,
          new Date().toISOString(),
        );
    }
    assertScope();
    return pendingCount(connection) === 0 &&
      !connection.getFirstSync('SELECT id FROM sync_conflicts LIMIT 1')
      ? result(true)
      : result(false, 'pending');
  } catch (e) {
    return result(false, e instanceof Error ? e.message : 'sync_failed');
  }
}
export function getSyncConflicts() {
  return expoDb.getAllSync<{
    id: string;
    table_name: SyncTableName;
    local_id: string;
    remote_json: string;
    operation_id: string;
  }>('SELECT * FROM sync_conflicts ORDER BY id');
}
export function resolveSyncConflict(id: string, choice: 'cloud' | 'device') {
  const conflict = getSyncConflicts().find((c) => c.id === id);
  if (!conflict) return;
  const conflicts = getSyncConflicts().filter(
    (c) => c.operation_id === conflict.operation_id,
  );
  const nextOp = generateId();
  expoDb.withTransactionSync(() => {
    for (const c of conflicts) {
      const remote = JSON.parse(c.remote_json) as RawRecord | null;
      const local = expoDb.getFirstSync<RawRecord>(
        `SELECT * FROM ${c.table_name} WHERE id=?`,
        c.local_id,
      );
      if (!local) continue;
      if (choice === 'cloud') {
        if (remote && remote.id === c.local_id)
          writeRaw(expoDb, c.table_name, {
            ...remote,
            is_synced: 1,
            image_uri: local.image_uri ?? null,
          });
        else {
          expoDb.runSync(
            `UPDATE ${c.table_name} SET deleted_at=?,is_synced=1 WHERE id=?`,
            new Date().toISOString(),
            c.local_id,
          );
          if (remote)
            writeRaw(expoDb, c.table_name, { ...remote, is_synced: 1 });
        }
      } else if (
        remote &&
        remote.id !== local.id &&
        LOGICAL_DAY_TABLES.includes(c.table_name)
      ) {
        expoDb.runSync(
          `UPDATE ${c.table_name} SET deleted_at=?,is_synced=1 WHERE id=?`,
          new Date().toISOString(),
          c.local_id,
        );
        writeRaw(expoDb, c.table_name, {
          ...local,
          id: remote.id,
          revision: remote.revision,
          created_at: remote.created_at,
          is_synced: 0,
          operation_id: nextOp,
          updated_at: new Date().toISOString(),
        });
      } else if (c.table_name === 'goal_plans')
        expoDb.runSync(
          'UPDATE goal_plans SET replaces_id=?,replaces_revision=?,revision=0,operation_id=?,updated_at=?,is_synced=0 WHERE id=?',
          remote?.id ?? null,
          Number(remote?.revision ?? 0),
          nextOp,
          new Date().toISOString(),
          c.local_id,
        );
      else
        expoDb.runSync(
          `UPDATE ${c.table_name} SET revision=?,operation_id=?,updated_at=?,is_synced=0 WHERE id=?`,
          Number(remote?.revision ?? 0),
          nextOp,
          new Date().toISOString(),
          c.local_id,
        );
    }
    expoDb.runSync(
      'DELETE FROM sync_conflicts WHERE operation_id=?',
      conflict.operation_id,
    );
    expoDb.runSync('DELETE FROM sync_outbox WHERE id=?', conflict.operation_id);
  });
  syncEngine.requestSync(0);
}
class SyncEngine {
  private listeners = new Set<Listener>();
  private subscriptions: (() => void)[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<SyncResult> | null = null;
  private lastResult: SyncResult | null = null;
  private isOnline = true;
  private rerun = false;
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  get isEnabled() {
    return (
      !!activeOwner && !!getAuthSession() && getPreference('cloudSync', false)
    );
  }
  get online() {
    return this.isOnline;
  }
  getState(): SyncState {
    return {
      isEnabled: this.isEnabled,
      isOnline: this.isOnline,
      isSyncing: !!this.inFlight,
      lastResult: this.lastResult,
      pending: pendingCount(),
      conflicts: getSyncConflicts().length,
    };
  }
  async refreshEnabledStatus() {
    await getDynamicSupabaseClient();
    this.lastResult = null;
    this.emit();
    if (this.isEnabled) this.requestSync(0);
  }
  start() {
    if (this.subscriptions.length) return;
    void this.refreshEnabledStatus().catch(() => this.emit());
    this.subscriptions.push(
      NetInfo.addEventListener((s) => {
        const before = this.isOnline;
        this.isOnline = !!s.isConnected && s.isInternetReachable !== false;
        this.emit();
        if (!before && this.isOnline) this.requestSync(0);
      }),
      subscribeAuth(() => {
        this.lastResult = null;
        this.emit();
        this.requestSync(0);
      }),
    );
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') this.requestSync(0);
    });
    const database = addDatabaseChangeListener(
      ({ tableName, databaseFilePath }) => {
        if (databaseFilePath !== expoDb.databasePath) return;
        if (
          (SYNC_TABLES as readonly string[]).includes(tableName) ||
          tableName === 'local_preferences'
        ) {
          if (this.inFlight) this.rerun = true;
          else this.requestSync();
          if (!this.stateTimer)
            this.stateTimer = setTimeout(() => {
              this.stateTimer = null;
              this.emit();
            }, 80);
        }
      },
    );
    this.subscriptions.push(
      () => app.remove(),
      () => database.remove(),
    );
  }
  stop() {
    this.subscriptions.forEach((f) => f());
    this.subscriptions = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.stateTimer) clearTimeout(this.stateTimer);
    this.stateTimer = null;
  }
  requestSync(delay = 1500) {
    if (!this.isEnabled) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.syncNow();
    }, delay);
  }
  syncNow(options?: { forceFullSync?: boolean }) {
    if (this.inFlight) return this.inFlight;
    const scope = getDatabaseScope();
    this.rerun = false;
    this.inFlight = syncWithSupabase(options)
      .then((r) => {
        if (scope === getDatabaseScope()) this.lastResult = r;
        return r;
      })
      .finally(() => {
        this.inFlight = null;
        this.emit();
        if (
          this.rerun &&
          this.isEnabled &&
          pendingCount() > 0 &&
          !getSyncConflicts().length
        )
          this.requestSync();
      });
    this.emit();
    return this.inFlight;
  }
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    const state = this.getState();
    this.listeners.forEach((f) => f(state));
  }
}
export const syncEngine = new SyncEngine();
