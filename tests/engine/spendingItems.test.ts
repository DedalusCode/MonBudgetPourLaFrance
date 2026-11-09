// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Level-3 spending items and the benefits they finance (PLAN.MD §13.2, §13.3, step 17). */
import { describe, expect, it } from 'vitest';
import { BENEFIT_ITEMS, benefitFactors } from '../../src/engine/benefitItems.ts';
import { spendingAmountsFor } from '../../src/engine/levers.ts';
import type { CustomHousehold } from '../../src/engine/customHousehold.ts';
import { loadDataset } from '../../src/engine/params.ts';
import { emptyScenario } from '../../src/engine/scenario.ts';
import { createModel, simulate, simulateHousehold } from '../../src/engine/simulate.ts';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';

const data = loadDataset();
const model = createModel(data);
const empty = emptyScenario(data.meta.baseYear);
const run = (levers: Record<string, number>) => simulate(model, { ...empty, levers });
const base = run({});
const itemLevers = [...model.levers.values()].filter((l) => l.item !== undefined);
const reference = (id: string) => model.levers.get(id)?.reference ?? NaN;

describe('level-3 items', () => {
  it('has 314 item levers, in 59 groups', () => {
    expect(itemLevers).toHaveLength(314);
    expect(model.items.size).toBe(59);
  });

  it('adds up exactly to each group, with no negative item', () => {
    for (const [group, items] of model.items) {
      const total = items.reduce((sum, item) => sum + item.reference, 0);
      expect(total, group).toBeCloseTo(model.context.groupAmounts[group] ?? NaN, 9);
      for (const item of items) expect(item.reference, item.key).toBeGreaterThanOrEqual(0);
    }
  });

  it('has no level 3 under 0.5 Md€, nor for the debt interest', () => {
    for (const [code, amount] of Object.entries(model.context.groupAmounts)) {
      if (amount < 0.5 || code === '01.7') expect(model.items.has(code), code).toBe(false);
    }
  });

  it('bounds every item from 0 to twice its amount', () => {
    for (const lever of itemLevers) {
      expect(lever.min).toBe(0);
      expect(lever.max).toBeCloseTo(2 * lever.reference, 6);
      expect(lever.unit).toBe('billions');
    }
  });

  it('scales the items of a group, and of a function, in proportion', () => {
    const group = run({ 'spending.cofog.10.7': reference('spending.cofog.10.7') * 1.1 });
    expect(group.itemAmounts['10.7.rsa']).toBeCloseTo(
      reference('spending.cofog.10.7.rsa') * 1.1,
      9,
    );
    const division = run({ 'spending.cofog.10': reference('spending.cofog.10') * 0.9 });
    expect(division.itemAmounts['10.7.rsa']).toBeCloseTo(
      reference('spending.cofog.10.7.rsa') * 0.9,
      9,
    );
  });

  it('makes a group the sum of its items once one is set', () => {
    const r = run({ 'spending.cofog.10.7.rsa': 0, 'spending.cofog.10.7': 40 });
    const items = model.items.get('10.7') ?? [];
    const sum = items.reduce((s, i) => s + (r.itemAmounts[i.key] ?? 0), 0);
    expect(r.groupAmounts['10.7']).toBeCloseTo(sum, 9);
    expect(r.itemAmounts['10.7.rsa']).toBe(0);
    // The other items follow the group lever.
    const factor = 40 / reference('spending.cofog.10.7');
    expect(r.itemAmounts['10.7.prime-activite']).toBeCloseTo(
      reference('spending.cofog.10.7.prime-activite') * factor,
      9,
    );
  });

  it('links every benefit to existing items', () => {
    for (const keys of Object.values(BENEFIT_ITEMS))
      for (const key of keys) expect(model.levers.has(`spending.cofog.${key}`), key).toBe(true);
  });
});

describe('benefit items (§13.3)', () => {
  const singleParent: CustomHousehold = {
    adults: [{ status: 'none', netMonthly: 0, age: 30 }],
    married: false,
    childAges: [1],
    tenure: 'tenant',
    rent: 500,
    zone: 2,
    propertyTax: 0,
    otherParentAbsent: true,
    maintenancePerChild: 0,
  };
  const household = (levers: Record<string, number>) =>
    simulateHousehold(model, { ...empty, levers }, singleParent);

  it('at 0, cuts the spending and the RSA of a household that receives it', () => {
    const id = 'spending.cofog.10.7.rsa';
    const cut = run({ [id]: 0 });
    expect(cut.aggregates.spending).toBeCloseTo(base.aggregates.spending - reference(id), 6);
    const before = household({});
    expect(before.reference.aids.rsa).toBeGreaterThan(0);
    const after = household({ [id]: 0 });
    expect(after.scenario.aids.rsa).toBe(0);
    expect(after.benefitsImpact).toBeLessThan(0);
    // Each benefit is treated on its own: the prime d'activité and the other aids are kept.
    expect(after.scenario.aids.supportAllowance).toBeCloseTo(
      before.scenario.aids.supportAllowance,
      6,
    );
  });

  it('at 0, removes the prime d’activité of the SMIC profile', () => {
    const id = 'spending.cofog.10.7.prime-activite';
    const smic = (r: ReturnType<typeof run>) => r.profiles.find((p) => p.id === 'smic');
    expect(smic(base)?.scenario.activityBonus).toBeGreaterThan(0);
    const cut = run({ [id]: 0 });
    expect(smic(cut)?.scenario.activityBonus).toBe(0);
    expect(cut.aggregates.spending).toBeCloseTo(base.aggregates.spending - reference(id), 6);
  });

  it('halves the pensions of the retirees with the CNAV and Agirc-Arrco items', () => {
    const r = run({
      'spending.cofog.10.2.pensions-cnav': reference('spending.cofog.10.2.pensions-cnav') / 2,
      'spending.cofog.10.2.pensions-agirc-arrco':
        reference('spending.cofog.10.2.pensions-agirc-arrco') / 2,
    });
    const retiree = r.profiles.find((p) => p.id === 'retiree2500');
    expect(retiree?.scenario.levies.pension.gross).toBeCloseTo(
      (retiree?.reference.levies.pension.gross ?? NaN) / 2,
      6,
    );
  });

  it('leaves the households unchanged when a non-benefit item moves', () => {
    const r = run({ 'spending.cofog.10.7.municipal-social-action': 0 });
    for (const p of r.profiles) expect(p.benefitsImpact, p.id).toBeCloseTo(0, 9);
  });
});

describe('performance with every lever (step 17)', () => {
  it('recomputes in under 16 ms after a slider move', () => {
    const store = new ScenarioStore(model);
    store.restore(Object.fromEntries(itemLevers.map((l) => [l.id, (l.min + l.max) / 2 + l.step])));
    void store.result;
    const runs = 30;
    const start = performance.now();
    for (let i = 0; i < runs; i++) {
      store.set('spending.cofog.10.7.rsa', i / 10);
      void store.result.aggregates.balance;
    }
    expect((performance.now() - start) / runs).toBeLessThan(16);
  });
});

describe('totals set from the panel', () => {
  it('spreads a new group total over the items that are not customised', () => {
    const store = new ScenarioStore(model);
    store.set('spending.cofog.10.7.rsa', 0);
    store.setGroupTotal('10.7', 30);
    expect(store.groupTotal('10.7')).toBeCloseTo(30, 9);
    expect(store.result.itemAmounts['10.7.rsa']).toBe(0);
  });

  it('spreads a new function total over the groups and items that are not customised', () => {
    const store = new ScenarioStore(model);
    store.set('spending.cofog.10.7.rsa', 0);
    store.set('spending.cofog.10.1', 80);
    store.setDivisionTotal('10', 700);
    expect(store.divisionTotal('10')).toBeCloseTo(700, 9);
    expect(store.result.groupAmounts['10.1']).toBeCloseTo(80, 9);
    expect(store.result.itemAmounts['10.7.rsa']).toBe(0);
  });

  it('scales the customised items when nothing else follows the group', () => {
    const store = new ScenarioStore(model);
    const items = store.itemsOf('10.3');
    for (const item of items) store.set(`spending.cofog.${item.key}`, item.reference);
    // Equal to the reference: unmodified. Set them all one by one to a new value.
    for (const item of items) store.set(`spending.cofog.${item.key}`, item.reference * 2);
    store.setGroupTotal('10.3', store.groupTotal('10.3') / 2);
    expect(store.groupTotal('10.3')).toBeCloseTo(model.context.groupAmounts['10.3'] ?? NaN, 9);
  });

  it('resets a group with its items', () => {
    const store = new ScenarioStore(model);
    store.set('spending.cofog.10.7.rsa', 0);
    store.set('spending.cofog.10.7', 40);
    store.resetGroup('10.7');
    expect(store.levers).toEqual({});
  });
});

describe('fallbacks', () => {
  it('leaves a benefit unchanged when its items have no reference amount', () => {
    expect(benefitFactors(new Map(), {}).rsa).toBe(1);
  });

  it('labels the rest of a group "Autres" unless the data name it', () => {
    expect(model.items.get('10.7')?.at(-1)?.label).toBe('Autres');
    expect(model.items.get('06.1')?.at(-1)?.label).toBe('Transferts et autres');
  });

  it('keeps a group without items at its lever amount', () => {
    const r = run({ 'spending.cofog.01.5': 0.01 });
    expect(r.groupAmounts['01.5']).toBe(0.01);
    expect(Object.keys(r.itemAmounts).some((k) => k.startsWith('01.5.'))).toBe(false);
  });

  it('gives no item amount to a group whose reference is 0', () => {
    const items = new Map([['03.5', [{ key: '03.5.x', group: '03.5', label: 'x', reference: 0 }]]]);
    const amounts = spendingAmountsFor(data, model.context.groupAmounts, items, {});
    expect(amounts.items['03.5.x']).toBe(0);
  });
});
