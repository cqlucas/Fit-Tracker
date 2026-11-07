const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runtime } = require('./runtime.cjs');
test('decimal input, unknown versus zero, scaling and invalid nutrients', () => {
  const { load } = runtime();
  const n = load('@/domain/nutrition');
  assert.equal(n.parseDecimal('23,7'), 23.7);
  assert.equal(n.parseDecimal('23.7'), 23.7);
  assert.equal(n.parseDecimal(''), null);
  assert.equal(n.parseDecimal('0'), 0);
  for (const value of ['NaN', 'Infinity', '-1', '1,2.3', '23x'])
    assert.throws(() => n.parseDecimal(value));
  for (const value of [NaN, Infinity, -1, '23'])
    assert.throws(() => n.validateNutrients({ proteinG: value }));
  assert.throws(() => n.validateNutrients({ fatG: 2, saturatedFatG: 3 }));
  const row = n.validateNutrients({
    proteinG: 23.7,
    caloriesKcal: 137,
    fiberG: 0,
  });
  assert.equal(n.scaleNutrients(row, 150, 100, 'g', 'g').proteinG, 35.55);
  assert.throws(() => n.scaleNutrients(row, 1, 100, 'ml', 'g'));
  assert.throws(() => n.scaleNutrients(row, 0, 100, 'g', 'g'));
  const fiber = n.sumNutrient([row, { fiberG: null }], 'fiberG');
  assert.equal(fiber.total, 0);
  assert.equal(fiber.known, 1);
  assert.equal(fiber.complete, false);
  assert.equal(n.goalState(fiber, 30, 'reference'), 'partial');
  assert.equal(
    n.goalState(
      { entries: 1, known: 1, total: 2001, complete: true },
      2000,
      'limit',
    ),
    'above',
  );
  assert.equal(n.remainingCarbs(2500, 120, 80), 325);
  assert.throws(() => n.remainingCarbs(100, 120, 80));
});
test('historical plans and eligible averages do not reinterpret empty days', () => {
  const n = runtime().load('@/domain/nutrition');
  const plans = [
    { effectiveFrom: '2026-11-06', revision: 1, createdAt: 'a' },
    { effectiveFrom: '2026-11-07', revision: 1, createdAt: 'b' },
  ];
  assert.equal(n.selectPlan(plans, '2026-11-05'), null);
  assert.equal(n.selectPlan(plans, '2026-11-06'), plans[0]);
  const c = { entries: 1, known: 1, total: 100, complete: true };
  assert.equal(
    n.eligibleAverage([
      { confirmed: true, coverage: c },
      { confirmed: false, coverage: { ...c, total: 0 } },
    ]).value,
    100,
  );
  assert.equal(n.eligibleAverage([]).value, null);
});
test('weekly review requires repeated adequate weeks and pauses for context', () => {
  const r = runtime(),
    { weeklyReview } = r.load('@/domain/weekly-review'),
    date = r.load('@/utils/date');
  const keys = date.lastNDateKeys(21, '2026-11-06');
  const days = keys.map((dateKey) => ({
    dateKey,
    confirmed: true,
    energyComplete: true,
  }));
  const weights = keys
    .filter((_, i) => i % 2 === 0)
    .map((dateKey) => ({ dateKey, weightKg: 60 }));
  assert.equal(weeklyReview(keys, weights, days).status, 'review_up');
  assert.equal(
    weeklyReview(keys, weights, days, { blocked: true }).status,
    'context',
  );
  assert.equal(weeklyReview(keys, [], days).status, 'insufficient');
  assert.equal(weeklyReview(keys, weights.slice(4), days).status, 'observe');
  assert.equal(
    weeklyReview(
      keys,
      weights,
      days.map((d) => ({ ...d, confirmed: false })),
    ).status,
    'insufficient',
  );
  assert.equal(
    weeklyReview(
      keys,
      weights,
      days.map((d, i) => ({ ...d, context: i === 20 ? 'travel' : '' })),
    ).status,
    'context',
  );
});
