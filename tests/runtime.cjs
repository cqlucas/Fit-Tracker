const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function connection() {
  const native = new DatabaseSync(':memory:');
  return {
    native,
    databasePath: ':memory:',
    execSync: (sql) => native.exec(sql),
    getAllSync: (sql, ...params) => native.prepare(sql).all(...params),
    getFirstSync: (sql, ...params) =>
      native.prepare(sql).get(...params) ?? null,
    runSync: (sql, ...params) => native.prepare(sql).run(...params),
    withTransactionSync(fn) {
      native.exec('BEGIN');
      try {
        fn();
        native.exec('COMMIT');
      } catch (e) {
        native.exec('ROLLBACK');
        throw e;
      }
    },
    prepareSync(sql) {
      return {
        executeSync(params) {
          const stmt = native.prepare(sql);
          const rows = stmt.columns().length ? stmt.all(...params) : null;
          const info = rows
            ? { changes: 0, lastInsertRowId: 0 }
            : stmt.run(...params);
          return {
            ...info,
            getAllSync: () => rows ?? [],
            getFirstSync: () => rows?.[0] ?? null,
          };
        },
        executeForRawResultSync(params) {
          const stmt = native.prepare(sql);
          stmt.setReturnArrays(true);
          const rows = stmt.all(...params);
          return { getAllSync: () => rows };
        },
      };
    },
  };
}
function runtime({ version = 0, seed = true } = {}) {
  const cache = new Map(),
    client = {},
    supabase = {
      getDynamicSupabaseClient: async () => null,
      getAuthSession: () => null,
      subscribeAuth: () => () => {},
    },
    extras = {};
  function load(request, parent = root + '/entry.ts') {
    if (request === '@/db/client') return client;
    if (request === '@/sync/supabase') return supabase;
    if (request === 'expo-crypto') return { randomUUID };
    if (request === 'expo-sqlite')
      return { addDatabaseChangeListener: () => ({ remove() {} }) };
    if (request === '@react-native-community/netinfo')
      return {
        __esModule: true,
        default: {
          fetch: async () => ({ isConnected: true, isInternetReachable: true }),
          addEventListener: () => () => {},
        },
      };
    if (request === 'react-native')
      return { AppState: { addEventListener: () => ({ remove() {} }) } };
    if (extras[request]) return extras[request];
    if (!request.startsWith('@/') && !request.startsWith('.'))
      return require(request);
    let file = request.startsWith('@/')
      ? path.join(root, 'src', request.slice(2))
      : path.resolve(path.dirname(parent), request);
    if (!/\.tsx?$/.test(file)) file += '.ts';
    if (file === path.join(root, 'src/sync/supabase.ts')) return supabase;
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`, {
      filename: file,
    })((r) => load(r, file), module, module.exports);
    return module.exports;
  }
  const schema = load('@/db/schema'),
    migration = load('@/db/migrations'),
    conn = connection();
  if (version) {
    for (let i = 0; i < version; i++) conn.execSync(migration.MIGRATIONS[i]);
    conn.execSync(`PRAGMA user_version=${version}`);
  }
  Object.assign(client, {
    expoDb: conn,
    activeOwner: null,
    getDatabaseScope: () => client.scope ?? 'local',
    scope: 'local',
    scopeGuard: () => {
      const expected = client.scope;
      return () => {
        if (client.scope !== expected) throw new Error('account_changed');
      };
    },
  });
  if (seed) migration.runMigrationsSync(conn);
  client.db = require(
    path.join(
      path.dirname(require.resolve('drizzle-orm/expo-sqlite')),
      'driver.cjs',
    ),
  ).drizzle(conn, { schema });
  return {
    load,
    client,
    schema,
    migration,
    connection: conn,
    supabase,
    extras,
  };
}
module.exports = { runtime, connection, root };
