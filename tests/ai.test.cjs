const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path'),
  ts = require('typescript');
const { runtime, root } = require('./runtime.cjs');
const result = {
  name: 'Meal',
  protein_g: 23.7,
  calories_kcal: 137,
  carb_g: null,
  fat_g: null,
  fiber_g: null,
  saturated_fat_g: null,
  sodium_mg: 0,
  portion_amount: null,
  portion_unit: null,
  provider: 'gemini',
  is_estimate: true,
};
test('AI client rejects invalid data rather than replacing it with zero', () => {
  const r = runtime(),
    ai = r.load('@/services/ai.service');
  assert.equal(ai.parseFoodAnalysis(result).fiber_g, null);
  assert.equal(ai.parseFoodAnalysis(result).sodium_mg, 0);
  for (const patch of [
    { protein_g: -1 },
    { protein_g: NaN },
    { protein_g: '23.7' },
    { portion_amount: 0 },
    { portion_unit: 'cup' },
    { fat_g: 1, saturated_fat_g: 2 },
  ])
    assert.throws(() => ai.parseFoodAnalysis({ ...result, ...patch }));
});
test('AI requires sign in, sends only to server, and defaults alternate consent off', async () => {
  const r = runtime(),
    ai = r.load('@/services/ai.service');
  await assert.rejects(
    ai.analyzeFoodWithAI({ userContext: 'rice' }),
    /email|e-mail/,
  );
  let sent;
  const session = { access_token: 'test' };
  r.supabase.getDynamicSupabaseClient = async () => ({
    auth: { getSession: async () => ({ data: { session } }) },
    functions: {
      invoke: async (name, options) => {
        sent = { name, options };
        return { data: result };
      },
    },
  });
  assert.equal(
    (await ai.analyzeFoodWithAI({ userContext: 'rice' })).protein_g,
    23.7,
  );
  assert.equal(sent.name, 'analyze-food');
  assert.equal(sent.options.body.allowFallback, false);
  r.load('@/repositories/preferences.repository').setPreference(
    'aiFallback',
    true,
  );
  await ai.analyzeFoodWithAI({ userContext: 'rice' });
  assert.equal(sent.options.body.allowFallback, true);
});
function edge({ primaryFails = false, authorized = true } = {}) {
  let handler,
    calls = [],
    usage = 0;
  const sandbox = {
    Deno: {
      env: {
        get: (k) =>
          ({
            SUPABASE_URL: 'https://example.test',
            SUPABASE_ANON_KEY: 'public',
            SUPABASE_SERVICE_ROLE_KEY: 'server',
            GEMINI_API_KEY: 'server-gemini',
            GROQ_API_KEY: 'server-groq',
          })[k],
      },
      serve: (fn) => {
        handler = fn;
      },
    },
    Response,
    Request,
    Headers,
    AbortSignal,
    TextDecoder,
    Uint8Array,
    console: {
      log() {
        throw new Error('No sensitive logging');
      },
    },
    createClient: () => ({
      auth: {
        getUser: async () => ({
          data: { user: authorized ? { id: 'A' } : null },
          error: authorized ? null : { message: 'expired' },
        }),
      },
      rpc: async () => ({ data: ++usage <= 30 }),
    }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (primaryFails && url.includes('googleapis'))
        return new Response('{}', { status: 503 });
      if (url.includes('googleapis'))
        return Response.json({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(result) }] } },
          ],
        });
      return Response.json({
        choices: [{ message: { content: JSON.stringify(result) } }],
      });
    },
  };
  const code = ts.transpileModule(
    fs
      .readFileSync(
        path.join(root, 'supabase/functions/analyze-food/index.ts'),
        'utf8',
      )
      .replace(/^import .*\n/, ''),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
      },
    },
  ).outputText;
  vm.runInNewContext(code, sandbox);
  return {
    request: (body) =>
      handler(
        new Request('https://example.test/analyze-food', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer test',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }),
      ),
    calls,
  };
}
const body = {
  text: 'Rice 150 g',
  image: null,
  mimeType: 'image/jpeg',
  provider: 'gemini',
  language: 'pt',
  allowFallback: false,
};
test('Edge function validates authentication, daily quota and request contract', async () => {
  const unauth = edge({ authorized: false });
  assert.equal((await unauth.request(body)).status, 401);
  assert.equal(unauth.calls.length, 0);
  const r = edge();
  assert.equal((await r.request({ ...body, text: '' })).status, 400);
  assert.equal(
    (await r.request({ ...body, allowFallback: 'yes' })).status,
    400,
  );
  for (let i = 0; i < 30; i++)
    assert.equal((await r.request(body)).status, 200);
  assert.equal((await r.request(body)).status, 429);
  assert.equal(r.calls.length, 30);
});
test('Edge never forwards to alternate without explicit consent and makes at most one fallback', async () => {
  const denied = edge({ primaryFails: true });
  assert.equal((await denied.request(body)).status, 502);
  assert.equal(denied.calls.length, 1);
  const allowed = edge({ primaryFails: true });
  const response = await allowed.request({ ...body, allowFallback: true });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).provider, 'groq');
  assert.equal(allowed.calls.length, 2);
});

test('configuration accepts only public Supabase keys without a native decoder', () => {
  const r = runtime();
  r.extras['expo-secure-store'] = {};
  const { assertPublicSupabaseKey } = r.load('@/services/api-keys.service');
  const jwt = (role) =>
    `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.doesNotThrow(() => assertPublicSupabaseKey(jwt('anon')));
  assert.doesNotThrow(() => assertPublicSupabaseKey('sb_publishable_test-key'));
  for (const key of [jwt('service_role'), 'sb_secret_server-only', 'invalid'])
    assert.throws(() => assertPublicSupabaseKey(key));
});
