// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** A household described by the user: consistency with the reference profiles and family rules. */
import { describe, expect, it } from 'vitest';
import type { CustomAdult, CustomHousehold } from '../../src/engine/customHousehold.ts';
import { ageKey, closestPattern } from '../../src/engine/customHousehold.ts';
import { loadDataset } from '../../src/engine/params.ts';
import { emptyScenario } from '../../src/engine/scenario.ts';
import { createModel, simulateHousehold } from '../../src/engine/simulate.ts';

const model = createModel(loadDataset());
const empty = emptyScenario(2026);
const smic = model.reference.find((r) => r.id === 'smic');
if (!smic) throw new Error('no smic profile');
const salaried = (netMonthly: number, age = 45): CustomAdult => ({
  status: 'salaried',
  netMonthly,
  age,
});
const household = (h: Partial<CustomHousehold>): CustomHousehold => ({
  adults: [salaried(smic.levies.salary.netSalary / 12)],
  married: false,
  children: 0,
  childrenFrom14: 0,
  tenure: 'tenant',
  propertyTax: 0,
  ...h,
});
const run = (h: Partial<CustomHousehold>, levers: Record<string, number> = {}) =>
  simulateHousehold(model, { ...empty, levers }, household(h));

describe('household described by the user', () => {
  it('reproduces the SMIC profile for a single employee paid the SMIC', () => {
    const { reference } = run({});
    expect(reference.totalLevies).toBeCloseTo(smic.totalLevies, 0);
    expect(reference.activityBonus).toBeCloseTo(smic.activityBonus, 0);
    expect(reference.inKind.total).toBeCloseTo(smic.inKind.total, 6);
    expect(reference.taxParts).toEqual([1]);
    expect(reference.consumptionUnits).toBe(1);
  });

  it('taxes a married couple jointly and an unmarried couple separately', () => {
    const adults = [salaried(2_500), salaried(2_500)];
    const married = run({ adults, married: true, children: 2 }).reference;
    const unmarried = run({ adults, married: false, children: 2 }).reference;
    expect(married.taxParts).toEqual([3]);
    expect(unmarried.taxParts).toEqual([2, 1]);
    // The CAF ignores marriage: same family allowances.
    expect(married.familyAllowances).toBeCloseTo(unmarried.familyAllowances, 6);
    expect(married.familyAllowances).toBeCloseTo(153.01 * 12, 0);
  });

  it('gives a single parent the extra half-part', () => {
    expect(run({ adults: [salaried(2_000)], children: 1 }).reference.taxParts).toEqual([2]);
  });

  it('counts every member for public services and consumption units', () => {
    const { reference } = run({ adults: [salaried(2_000), salaried(2_000)], children: 2 });
    expect(reference.inKind.total).toBeCloseTo(4 * smic.inKind.total, 6);
    expect(reference.consumptionUnits).toBeCloseTo(1 + 0.5 + 2 * 0.3, 9);
    const teens = run({ adults: [salaried(2_000)], children: 2, childrenFrom14: 2 }).reference;
    expect(teens.consumptionUnits).toBeCloseTo(1 + 2 * 0.5, 9);
  });

  it('reproduces the craftsman profile for a self-employed adult', () => {
    const artisan = model.reference.find((r) => r.id === 'artisan');
    if (!artisan) throw new Error('no artisan profile');
    const { reference } = run({
      adults: [{ status: 'selfEmployed', netMonthly: 31_440 / 12, age: 45 }],
    });
    const line = (r: { borne: { id: string; amount: number }[] }, id: string) =>
      r.borne.find((l) => l.id === id)?.amount;
    for (const id of ['selfEmployedContributions', 'csgCrdsSelfEmployed', 'incomeTax']) {
      expect(line(reference, id), id).toBeCloseTo(line(artisan, id) ?? NaN, 0);
    }
    expect(reference.activityBonus).toBeCloseTo(artisan.activityBonus, 0);
  });

  it('counts a spouse’s pension in the resources of the prime d’activité', () => {
    const worker = salaried(1_500);
    const alone = run({ adults: [worker, { status: 'none', netMonthly: 0, age: 66 }] });
    const withPension = run({
      adults: [worker, { status: 'retired', netMonthly: 1_200, age: 66 }],
    });
    expect(withPension.reference.activityBonus).toBeLessThan(alone.reference.activityBonus);
  });

  it('computes the pension of a retired adult', () => {
    const { reference } = run({ adults: [{ status: 'retired', netMonthly: 1_500, age: 70 }] });
    expect(reference.pension).toBeGreaterThan(18_000);
    expect(reference.activityBonus).toBe(0);
  });

  it('owes no property tax as a tenant, and follows the property tax lever as an owner', () => {
    const tenant = run({ propertyTax: 1_000 }).reference;
    expect(tenant.borne.find((l) => l.id === 'propertyTax')?.amount).toBe(0);
    const owner = run({ tenure: 'owner', propertyTax: 1_000 }, { 'propertyTax.change': 0.1 });
    expect(owner.reference.borne.find((l) => l.id === 'propertyTax')?.amount).toBeCloseTo(1_000);
    expect(owner.scenario.borne.find((l) => l.id === 'propertyTax')?.amount).toBeCloseTo(1_100);
    // Less disposable income, slightly less consumption and VAT: a bit less than 100 €.
    expect(owner.leviesImpact).toBeLessThan(0);
    expect(owner.leviesImpact).toBeGreaterThan(-100);
  });

  it('follows the levers: income tax, family spending', () => {
    const family = { adults: [salaried(4_000), salaried(3_000)], married: true, children: 3 };
    const base = run(family);
    expect(base.total).toBe(0);
    const taxCut = run(family, { 'incomeTax.bracket2.rate': 0.09 });
    expect(taxCut.leviesImpact).toBeGreaterThan(0);
    const reference = model.levers.get('spending.cofog.10.4')?.reference ?? NaN;
    const familyCut = run(family, { 'spending.cofog.10.4': reference * 0.5 });
    expect(familyCut.scenario.familyAllowances).toBeCloseTo(
      base.reference.familyAllowances * 0.5,
      6,
    );
  });

  it('maps ages to the in-kind keys and picks the closest consumption pattern', () => {
    expect([20, 35, 45, 60, 70].map(ageKey)).toEqual([
      'age18to29',
      'age30to39',
      'age40to49',
      'age50to64',
      'age65plus',
    ]);
    const low = closestPattern(model.patterns, 0);
    const high = closestPattern(model.patterns, 1e9);
    expect(low.standardOfLiving).toBeLessThan(high.standardOfLiving);
  });

  it('stays fast enough for a recompute on every slider move', () => {
    const family = { adults: [salaried(3_000), salaried(2_000)], married: true, children: 2 };
    for (let i = 0; i < 5; i++) run(family); // warm-up (JIT)
    const runs = 20;
    const start = performance.now();
    for (let i = 0; i < runs; i++) run(family);
    // A slider recompute must stay within one frame (16 ms, PLAN.MD §6); the household
    // runs beside simulate() (< 5 ms), so it gets the remaining margin.
    expect((performance.now() - start) / runs).toBeLessThan(8);
  });
});
