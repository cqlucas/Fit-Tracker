import { activeOwner, expoDb, getDatabaseScope } from '@/db/client';
import { SCHEMA_VERSION } from '@/db/migrations';
import { SYNC_TABLES, type SyncTableName } from '@/db/schema';
import {
  isSyncTable,
  tableColumns,
  validateRecord,
  writeRaw,
  type RawRecord,
} from '@/sync/records';
import { foodSignature } from '@/repositories/logs.repository';
import { generateId } from '@/utils/id';
export interface Backup {
  app: 'FitTracker';
  schemaVersion: number;
  exportedAt: string;
  scope: string;
  tables: Record<SyncTableName, RawRecord[]>;
  preferences: { key: string; value: string }[];
  drafts: { id: string; payload: string }[];
  devicePreferences: {
    language: 'pt' | 'en';
    preferredAiProvider: 'gemini' | 'groq';
  };
}
export function exportBackup(): string {
  const connection = expoDb;
  const backup: Backup = {
    app: 'FitTracker',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    scope: getDatabaseScope(),
    tables: Object.fromEntries(
      SYNC_TABLES.map((t) => [
        t,
        connection.getAllSync<RawRecord>(`SELECT * FROM ${t} ORDER BY id`),
      ]),
    ) as Backup['tables'],
    preferences: connection.getAllSync(
      "SELECT key,value FROM local_preferences WHERE key<>'cloudSync'",
    ),
    drafts: connection.getAllSync('SELECT id,payload FROM form_drafts'),
    devicePreferences: connection.getFirstSync(
      'SELECT language,preferred_ai_provider preferredAiProvider FROM user_goals',
    )!,
  };
  return JSON.stringify(backup);
}
export function validateBackup(text: string): Backup {
  if (text.length > 100_000_000) throw new Error('Backup too large');
  const b = JSON.parse(text) as Backup;
  if (
    !b ||
    b.app !== 'FitTracker' ||
    b.schemaVersion !== SCHEMA_VERSION ||
    !b.tables ||
    !Array.isArray(b.preferences) ||
    !Array.isArray(b.drafts)
  )
    throw new Error('Backup incompatível / Incompatible backup');
  if (
    !b.devicePreferences ||
    !['pt', 'en'].includes(b.devicePreferences.language) ||
    !['gemini', 'groq'].includes(b.devicePreferences.preferredAiProvider)
  )
    throw new Error('Invalid device preferences');
  if (Object.keys(b.tables).some((k) => !isSyncTable(k)))
    throw new Error('Invalid backup table');
  for (const table of SYNC_TABLES) {
    const rows = b.tables[table];
    if (!Array.isArray(rows)) throw new Error('Invalid backup');
    const ids = new Set<string>();
    b.tables[table] = rows.map((r) => {
      const valid = validateRecord(table, r, tableColumns(expoDb, table));
      if (ids.has(String(valid.id))) throw new Error('Duplicate backup ID');
      ids.add(String(valid.id));
      return valid;
    });
  }
  const food = new Map(b.tables.food_logs.map((r) => [r.id, r]));
  const links = new Set<string>();
  for (const r of b.tables.water_logs)
    if (r.food_log_id) {
      const f = food.get(r.food_log_id);
      if (
        !f ||
        links.has(String(r.food_log_id)) ||
        f.group_id !== r.group_id ||
        f.date_key !== r.date_key ||
        (f.deleted_at !== null && f.deleted_at !== r.deleted_at)
      )
        throw new Error('Invalid linked drink');
      links.add(String(r.food_log_id));
    }
  for (const p of b.preferences) {
    if (
      typeof p.key !== 'string' ||
      p.key.length > 100 ||
      typeof p.value !== 'string'
    )
      throw new Error('Invalid preference');
    JSON.parse(p.value);
  }
  for (const d of b.drafts) {
    if (typeof d.id !== 'string' || typeof d.payload !== 'string')
      throw new Error('Invalid draft');
    const parsed = JSON.parse(d.payload);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid draft');
  }
  return b;
}
export function backupStats(b: Backup) {
  return Object.fromEntries(
    SYNC_TABLES.map((t) => [
      t,
      {
        count: b.tables[t].length,
        active: b.tables[t].filter((r) => !r.deleted_at).length,
      },
    ]),
  );
}
/** Restore only into an empty diary. Existing records are never overwritten by import. */
export function restoreBackup(text: string) {
  const b = validateBackup(text);
  if (
    SYNC_TABLES.filter((t) => t !== 'goal_plans').some((t) =>
      expoDb.getFirstSync(`SELECT id FROM ${t} LIMIT 1`),
    )
  ) {
    throw new Error(
      'Restaure em um diário vazio / Restore into an empty diary',
    );
  }
  if (
    expoDb.getFirstSync('SELECT id FROM goal_plans LIMIT 1 OFFSET 1') ||
    expoDb.getFirstSync('SELECT id FROM sync_outbox LIMIT 1') ||
    expoDb.getFirstSync('SELECT id FROM sync_conflicts LIMIT 1') ||
    expoDb.getFirstSync('SELECT id FROM goal_plans WHERE is_synced=1 LIMIT 1')
  )
    throw new Error('Synced diary is not empty');
  const sameOwner = b.scope === getDatabaseScope();
  // Importing into another account creates independent copies, never claims ownerless remote IDs.
  const ids = new Map(
    SYNC_TABLES.flatMap((t) =>
      b.tables[t].map(
        (r) => [String(r.id), sameOwner ? String(r.id) : generateId()] as const,
      ),
    ),
  );
  const mapped = (value: RawRecord[string]) =>
    value == null ? null : (ids.get(String(value)) ?? String(value));
  const operations = new Map<string, string>();
  const sourceSignature = (day: string) =>
    b.tables.food_logs
      .filter((r) => r.date_key === day && !r.deleted_at)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((r) => `${r.id}:${r.operation_id ?? r.updated_at}`)
      .join('|');
  expoDb.withTransactionSync(() => {
    expoDb.execSync('DELETE FROM goal_plans; DELETE FROM sync_checkpoints;');
    for (const table of SYNC_TABLES) {
      for (const row of b.tables[table]) {
        const group = String(row.group_id ?? row.id);
        if (!operations.has(group)) operations.set(group, generateId());
        const imported: RawRecord = {
          ...row,
          id: ids.get(String(row.id))!,
          owner_id: activeOwner,
          is_synced: sameOwner ? row.is_synced : 0,
          revision: sameOwner ? row.revision : 0,
          operation_id: sameOwner
            ? (row.operation_id ?? operations.get(group)!)
            : operations.get(group)!,
          group_id: mapped(row.group_id),
        };
        for (const key of ['food_log_id', 'template_id', 'replaces_id'])
          if (key in row) imported[key] = mapped(row[key]);
        if (!sameOwner && table === 'goal_plans')
          imported.replaces_revision = 0;
        if (
          !sameOwner &&
          table === 'daily_checkins' &&
          row.food_signature === sourceSignature(String(row.date_key))
        )
          imported.food_signature = foodSignature(String(row.date_key));
        writeRaw(expoDb, table, imported);
      }
    }
    expoDb.runSync(
      'UPDATE user_goals SET language=?,preferred_ai_provider=?',
      b.devicePreferences.language,
      b.devicePreferences.preferredAiProvider,
    );
    for (const p of b.preferences) {
      if (p.key !== 'cloudSync')
        expoDb.runSync(
          'INSERT INTO local_preferences(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
          p.key,
          p.value,
        );
    }
    for (const d of b.drafts) {
      let id = d.id,
        payload = d.payload;
      if (!sameOwner) {
        const draft = JSON.parse(payload);
        if (draft.templateId) draft.templateId = mapped(draft.templateId);
        payload = JSON.stringify(draft);
        const [type, oldId] = id.split(':');
        if (ids.has(oldId)) id = `${type}:${ids.get(oldId)}`;
      }
      expoDb.runSync(
        'INSERT INTO form_drafts(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
        id,
        payload,
      );
    }
    // Verify all IDs, counts and numeric values before committing the restore.
    for (const table of SYNC_TABLES) {
      const actual = expoDb.getAllSync<RawRecord>(
        `SELECT * FROM ${table} ORDER BY id`,
      );
      const expected = new Map(
        b.tables[table].map((r) => [ids.get(String(r.id)), r]),
      );
      if (actual.length !== expected.size)
        throw new Error('Restore count mismatch');
      for (const row of actual) {
        const original = expected.get(String(row.id));
        if (!original) throw new Error('Restore ID mismatch');
        for (const key of Object.keys(original)) {
          if (
            typeof original[key] === 'number' &&
            !['revision', 'replaces_revision', 'is_synced'].includes(key) &&
            Math.abs(Number(row[key]) - Number(original[key])) > 0.000001
          )
            throw new Error('Restore total mismatch');
        }
      }
    }
  });
  return backupStats(b);
}
