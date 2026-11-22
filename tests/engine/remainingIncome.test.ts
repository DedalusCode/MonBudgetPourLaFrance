// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Reste à vivre: disposable income minus pre-committed spending (PLAN.MD §14.5). */
import { describe, expect, it } from 'vitest';
import type { CustomHousehold } from '../../src/engine/customHousehold.ts';
import { loadDataset } from '../../src/engine/params.ts';
import { emptyScenario } from '../../src/engine/scenario.ts';
import { createModel, simulate, simulateHousehold } from '../../src/engine/simulate.ts';

const model = createModel(loadDataset());
const empty = emptyScenario(2026);
const base = simulate(model, empty);
const run = (levers: Record<string, number>) => simulate(model, { ...empty, levers });
const monthly = (id: string, result = base) => {
  const impact = result.profiles.find((p) => p.id === id);
  if (!impact) throw new Error(id);
  return {
    before: impact.remaining.reference.remaining / 12,
    after: impact.remaining.scenario.remaining / 12,
  };
};

describe('reste à vivre of the reference profiles', () => {
  // Computed by hand from docs/reference-profiles.md (disposable income, consumption, housing
  // aid) and the shares of consumption.json: rent = rentShare × C, + housing aid (gross rent),
  // + nonRentShare × (C − rent); reste à vivre = disposable income − that, per month.
  const HAND: Record<string, number> = {
    student: -297.6,
    apprentice: 490.0,
    retiree1000: 692.1,
    smic: 1002.9,
    employee1800: 1125.2,
    retiree2500: 1639.5,
    artisan: 1459.6,
    cadre3k: 1844.7,
    cadre10k: 6207.5,
    rentier5m: 4453.0,
    fortune100m: 44591.2,
  };

  it.each(Object.entries(HAND))('%s: replays the hand calculation within 1 €', (id, expected) => {
    expect(Math.abs(monthly(id).before - expected)).toBeLessThan(1);
  });

  it('does not change without a scenario', () => {
    for (const p of base.profiles) {
      expect(p.remaining.scenario.remaining).toBeCloseTo(p.remaining.reference.remaining, 6);
    }
  });
});

describe('scenario effects', () => {
  const excise = model.levers.get('energyExcise.electricity.rate');
  if (!excise) throw new Error('no electricity excise lever');

  it('falls when the electricity excise rises and rises when it falls, by equal amounts', () => {
    const up = monthly('smic', run({ [excise.id]: excise.reference * 1.5 }));
    const down = monthly('smic', run({ [excise.id]: excise.reference * 0.5 }));
    expect(up.after).toBeLessThan(up.before);
    expect(down.after).toBeGreaterThan(down.before);
    // Volumes are fixed: the price effect on pre-committed spending is linear in the tariff.
    const preUp = run({ [excise.id]: excise.reference * 1.5 }).profiles.find(
      (p) => p.id === 'smic',
    );
    const preDown = run({ [excise.id]: excise.reference * 0.5 }).profiles.find(
      (p) => p.id === 'smic',
    );
    const refPre = preUp?.remaining.reference.preCommitted.total ?? NaN;
    expect((preUp?.remaining.scenario.preCommitted.total ?? NaN) - refPre).toBeCloseTo(
      refPre - (preDown?.remaining.scenario.preCommitted.total ?? NaN),
      6,
    );
  });

  it('follows the standard VAT rate through housing energy', () => {
    const r = run({ 'vat.standard': 0.25 }).profiles.find((p) => p.id === 'cadre3k');
    const before = r?.remaining.reference.preCommitted;
    const after = r?.remaining.scenario.preCommitted;
    expect(after?.energy).toBeCloseTo(((before?.energy ?? NaN) * 1.25) / 1.2, 6);
    expect(after?.rent).toBe(before?.rent);
  });

  it('moves with the housing aid, since the rent is counted before aid', () => {
    const aid = model.levers.get('spending.cofog.10.6');
    if (!aid) throw new Error('no 10.6 lever');
    const student = monthly('student', run({ [aid.id]: 0 }));
    expect(student.before - student.after).toBeCloseTo(1_980 / 12, 0);
  });
});

describe('household described by the user', () => {
  const household = (h: Partial<CustomHousehold>): CustomHousehold => ({
    adults: [{ status: 'salaried', netMonthly: 1_800, age: 40 }],
    married: false,
    childAges: [],
    tenure: 'tenant',
    rent: 700,
    zone: 2,
    propertyTax: 0,
    otherParentAbsent: false,
    maintenancePerChild: 0,
    ...h,
  });

  it('deducts the rent typed in, before housing aid', () => {
    const { remaining, reference } = simulateHousehold(model, empty, household({}));
    expect(remaining.reference.preCommitted.rent).toBe(700 * 12);
    expect(remaining.reference.disposable).toBe(reference.disposableIncome);
  });

  it('deducts an owner’s loan repayment, and no rent', () => {
    const owner = simulateHousehold(
      model,
      empty,
      household({ tenure: 'owner', rent: 0, housingLoan: 900, propertyTax: 1_000 }),
    ).remaining.reference;
    expect(owner.preCommitted.housingLoan).toBe(900 * 12);
    expect(owner.preCommitted.rent).toBe(0);
    const withoutLoan = simulateHousehold(
      model,
      empty,
      household({ tenure: 'owner', rent: 0, propertyTax: 1_000 }),
    ).remaining.reference;
    expect(withoutLoan.remaining - owner.remaining).toBeCloseTo(900 * 12, 6);
  });

  it('ignores a loan typed in by a tenant', () => {
    const tenant = simulateHousehold(model, empty, household({ housingLoan: 900 }));
    expect(tenant.remaining.reference.preCommitted.housingLoan).toBe(0);
  });
});
