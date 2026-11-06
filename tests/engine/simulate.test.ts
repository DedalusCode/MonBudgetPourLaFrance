// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { buildLevers } from '../../src/engine/levers.ts';
import { aggregates } from '../../src/engine/macro.ts';
import { loadDataset } from '../../src/engine/params.ts';
import { emptyScenario, migrateScenario, type Scenario } from '../../src/engine/scenario.ts';
import { createModel, simulate } from '../../src/engine/simulate.ts';

const data = loadDataset();
const model = createModel(data);
const empty = emptyScenario(data.meta.baseYear);
const base = simulate(model, empty);
const scenario = (levers: Record<string, number>): Scenario => ({ ...empty, levers });
const propertyTaxOf = (id: string) =>
  data.profiles.profiles.find((p) => p.id === id)?.propertyTax.value ?? NaN;

describe('empty scenario', () => {
  it('reproduces the reference aggregates', () => {
    // 2025 national accounts (INSEE, Eurostat), as in macro.json: B9 = −151.592 Md€.
    expect(base.aggregates.revenue).toBeCloseTo(1_562.5197, 6);
    expect(base.aggregates.spending).toBeCloseTo(1_714.1117, 6);
    expect(base.aggregates.balance).toBeCloseTo(-151.592, 4);
    expect(base.aggregates.debt).toBeCloseTo(3_460.111, 6);
    expect(Object.keys(base.revenueChanges)).toHaveLength(0);
  });

  it('leaves every profile unchanged', () => {
    for (const p of base.profiles) {
      expect(p.total).toBeCloseTo(0, 6);
      expect(p.scenario.totalLevies).toBeCloseTo(p.reference.totalLevies, 6);
      expect(p.scenario.inKind.total).toBeCloseTo(p.reference.inKind.total, 6);
      expect(p.scenario.benefits).toBeCloseTo(p.reference.benefits, 6);
    }
  });

  it('projects the debt over the horizon, from the accounts year', () => {
    const horizon = data.macro.projectionHorizon.value ?? NaN;
    expect(base.aggregates.debtPath).toHaveLength(horizon + 1);
    expect(base.aggregates.debtPath[0]?.year).toBe(data.meta.accountsYear);
    expect(base.aggregates.debtPath.at(-1)?.year).toBe(data.meta.accountsYear + horizon);
  });
});

describe('each lever pushed to its maximum', () => {
  const finalDebtRatio = (s: ReturnType<typeof simulate>) =>
    s.aggregates.debtPath.at(-1)?.debtToGdp ?? NaN;

  for (const lever of model.levers.values()) {
    it(`${lever.id} has the expected sign`, () => {
      // COFOG groups with no spending in the accounts have a flat range (0 to 0).
      if (lever.group === 'spending' && lever.reference === 0) {
        expect(lever.max).toBe(0);
        return;
      }
      expect(lever.max).toBeGreaterThan(lever.reference);
      expect(lever.min).toBeLessThanOrEqual(lever.reference);
      const result = simulate(model, scenario({ [lever.id]: lever.max }));

      if (lever.group === 'macro') {
        // More growth lowers the debt ratio; a higher interest rate raises it.
        const direction = lever.id === 'macro.nominalGrowth' ? -1 : 1;
        expect(Math.sign(finalDebtRatio(result) - finalDebtRatio(base))).toBe(direction);
        return;
      }

      if (lever.group === 'spending') {
        // More spending: higher spending, lower balance, and no profile loses.
        // (Groups with zero spending in the accounts have no effect.)
        const reference = (lever.cofog ?? []).reduce(
          (sum, code) => sum + (model.context.groupAmounts[code] ?? 0),
          0,
        );
        if (reference > 0) {
          expect(result.aggregates.spending).toBeGreaterThan(base.aggregates.spending);
          expect(result.aggregates.balance).toBeLessThan(base.aggregates.balance);
        } else {
          expect(result.aggregates.spending).toBeCloseTo(base.aggregates.spending, 9);
        }
        for (const p of result.profiles) expect(p.total).toBeGreaterThanOrEqual(-1e-9);
        return;
      }

      // A tax rise brings revenue, improves the balance and makes no profile gain;
      // a tax cut (indexation, higher threshold) does the opposite.
      const raises = !['incomeTax.indexation', 'wealthTax.threshold'].includes(lever.id);
      const sign = raises ? 1 : -1;
      expect(sign * (result.aggregates.revenue - base.aggregates.revenue)).toBeGreaterThan(0);
      expect(sign * (result.aggregates.balance - base.aggregates.balance)).toBeGreaterThan(0);
      expect(sign * (finalDebtRatio(base) - finalDebtRatio(result))).toBeGreaterThan(0);
      for (const p of result.profiles) expect(sign * p.total).toBeLessThanOrEqual(1e-9);
    });
  }

  it('affects the profiles that pay the tax', () => {
    const impact = (id: string, value: number) =>
      simulate(model, scenario({ [id]: value })).profiles;
    const byId = (list: ReturnType<typeof impact>, id: string) =>
      list.find((p) => p.id === id)?.total ?? NaN;

    const vat = impact('vat.standard', 0.24);
    for (const p of vat) expect(p.total).toBeLessThan(0);

    const corporate = impact('corporateTax.standardRate', 0.3);
    expect(byId(corporate, 'smic')).toBe(0);
    expect(byId(corporate, 'fortune100m')).toBeLessThan(-100_000);

    // Property tax +20 %: the owner pays 20 % more property tax; a lower disposable
    // income then means slightly less consumption, hence less VAT.
    const propertyTax = impact('propertyTax.change', 0.2);
    const owner = propertyTax.find((p) => p.id === 'cadre10k');
    const line = (r: NonNullable<typeof owner>['scenario'], id: string) =>
      r.borne.find((l) => l.id === id)?.amount ?? NaN;
    expect(
      owner && line(owner.scenario, 'propertyTax') - line(owner.reference, 'propertyTax'),
    ).toBeCloseTo(propertyTaxOf('cadre10k') * 0.2, 6);
    expect(byId(propertyTax, 'cadre10k')).toBeLessThan(0);
    expect(byId(propertyTax, 'smic')).toBe(0);
  });
});

describe('levers without a household in their scope', () => {
  it('a higher IFI threshold leaves the rentier (3 M€ of real estate) taxed as before', () => {
    const r = simulate(model, scenario({ 'wealthTax.threshold': 1_560_000 }));
    const rentier = r.profiles.find((p) => p.id === 'rentier5m');
    expect(rentier?.total).toBeCloseTo(0, 6);
    // Threshold +20 % × the cost of one point (revenues.json, wealthTax.thresholdPoint).
    const point = data.revenues.items.find((i) => i.id === 'wealthTax')?.bases?.['thresholdPoint'];
    expect(r.revenueChanges['wealthTax.threshold']).toBeCloseTo(-20 * (point?.value ?? NaN), 9);
  });

  it('indexation lowers the income tax of the taxpayers', () => {
    const r = simulate(model, scenario({ 'incomeTax.indexation': 0.02 }));
    // 2 points × the cost of one point of indexation (revenues.json, 2.0 Md€).
    expect(r.revenueChanges['incomeTax.indexation']).toBeCloseTo(-4, 6);
    expect(r.profiles.find((p) => p.id === 'cadre3k')?.leviesImpact).toBeGreaterThan(0);
  });
});

describe('spending levers', () => {
  it('applies a division change to its groups unless a group is customised', () => {
    const health = simulate(
      model,
      scenario({
        'spending.cofog.07': (model.levers.get('spending.cofog.07')?.reference ?? NaN) * 1.1,
        'spending.cofog.07.3': (model.levers.get('spending.cofog.07.3')?.reference ?? NaN) * 0.9,
      }),
    );
    const ref = model.context.groupAmounts;
    expect(health.groupAmounts['07.1']).toBeCloseTo((ref['07.1'] ?? NaN) * 1.1, 6);
    expect(health.groupAmounts['07.3']).toBeCloseTo((ref['07.3'] ?? NaN) * 0.9, 6);
  });

  it('cuts services symmetrically with spending', () => {
    const cut = simulate(
      model,
      scenario({
        'spending.cofog.02': (model.levers.get('spending.cofog.02')?.reference ?? NaN) * 0.9,
      }),
    );
    for (const p of cut.profiles) expect(p.servicesImpact).toBeLessThan(0);
  });

  it('scales the prime d’activité with the social exclusion group', () => {
    const cut = simulate(
      model,
      scenario({
        'spending.cofog.10.7': (model.levers.get('spending.cofog.10.7')?.reference ?? NaN) * 0.8,
      }),
    );
    const smic = cut.profiles.find((p) => p.id === 'smic');
    expect(smic?.benefitsImpact).toBeCloseTo(-0.2 * (smic?.reference.benefits ?? NaN), 6);
    expect(smic?.scenario.consumption).toBeLessThan(smic?.reference.consumption ?? NaN);
  });
});

describe('debt path', () => {
  it('applies growth, apparent rate and a constant primary balance', () => {
    const r = aggregates({
      baseYear: 2024,
      gdp: 1_000,
      debt: 1_000,
      revenue: 500,
      spending: 520,
      interest: 20,
      nominalGrowth: 0.1,
      apparentInterestRate: 0.02,
      horizon: 1,
    });
    // Primary balance 0 % of GDP; interest 2 % of 1 000; debt 1 000 + 20.
    expect(r.debtPath[1]?.gdp).toBeCloseTo(1_100, 6);
    expect(r.debtPath[1]?.interest).toBeCloseTo(20, 6);
    expect(r.debtPath[1]?.debt).toBeCloseTo(1_020, 6);
    expect(r.debtPath[1]?.debtToGdp).toBeCloseTo(1_020 / 1_100, 6);
  });
});

describe('scenario format', () => {
  const known = new Set(model.levers.keys());

  it('keeps known levers and reports unknown ones', () => {
    const { scenario: s, droppedLevers } = migrateScenario(
      { schemaVersion: 1, baseYear: 2026, levers: { 'vat.standard': 0.21, 'old.lever': 1 } },
      known,
    );
    expect(s.levers).toEqual({ 'vat.standard': 0.21 });
    expect(droppedLevers).toEqual(['old.lever']);
  });

  it('rejects malformed scenarios', () => {
    expect(() => migrateScenario({ schemaVersion: 2, baseYear: 2026, levers: {} }, known)).toThrow(
      'Invalid scenario',
    );
    expect(() =>
      migrateScenario({ schemaVersion: 1, baseYear: 2026, levers: { x: Infinity } }, known),
    ).toThrow('Invalid scenario');
  });
});

describe('performance', () => {
  it('simulates a busy scenario in under 5 ms', () => {
    const busy = scenario(
      Object.fromEntries(
        [...model.levers.values()].map((l) => [l.id, (l.min + l.max) / 2 + l.step]),
      ),
    );
    for (let i = 0; i < 20; i++) simulate(model, busy);
    const runs = 100;
    const start = performance.now();
    for (let i = 0; i < runs; i++) simulate(model, busy);
    const perRun = (performance.now() - start) / runs;
    expect(perRun).toBeLessThan(5);
  });
});

describe('robustness', () => {
  it('ignores a lever id unknown to the catalogue', () => {
    const r = simulate(model, scenario({ 'unknown.lever': 1 }));
    expect(r.aggregates.revenue).toBeCloseTo(base.aggregates.revenue, 9);
  });

  it('refuses to build the catalogue when a lever base is missing', () => {
    const broken = structuredClone(data);
    const vat = broken.revenues.items.find((i) => i.id === 'vat');
    if (vat?.bases) delete vat.bases['standard'];
    expect(() => buildLevers(broken)).toThrow('No base vat.standard');
  });
});

describe('spending amounts', () => {
  it('expresses spending levers in Md€, from 0 to twice the current amount', () => {
    const health = model.levers.get('spending.cofog.07');
    expect(health?.unit).toBe('billions');
    // 2024 COFOG amount (261.1563 Md€) × scaling to the 2025 total (1.0248).
    expect(health?.reference).toBeCloseTo(267.633, 3);
    expect(health?.min).toBe(0);
    expect(health?.max).toBeCloseTo(2 * (health?.reference ?? NaN), 6);
    expect(health?.step).toBe(1);
    expect(model.levers.get('spending.cofog.02.2')?.step).toBe(0.01);
    expect(model.levers.get('spending.cofog.04.3')?.step).toBe(1);
    expect(model.levers.get('spending.cofog.02.5')?.step).toBe(0.1);
  });

  it('scales the groups of a division set to an amount', () => {
    const defence = model.levers.get('spending.cofog.02')?.reference ?? NaN;
    const r = simulate(model, scenario({ 'spending.cofog.02': defence + 10 }));
    expect(r.aggregates.spending - base.aggregates.spending).toBeCloseTo(10, 6);
    const military = model.context.groupAmounts['02.1'] ?? NaN;
    expect(r.groupAmounts['02.1']).toBeCloseTo((military * (defence + 10)) / defence, 6);
  });

  it('can set the spending of a group with no reference amount', () => {
    const r = simulate(model, scenario({ 'spending.cofog.03.5': 1 }));
    expect(r.aggregates.spending - base.aggregates.spending).toBeCloseTo(1, 6);
  });
});

describe('levers at their real values', () => {
  it('sets each social contribution at its 2026 rate, on the base of its ceiling', () => {
    const capped = model.levers.get('socialContributions.employeeOldAgeCapped.rate');
    expect(capped?.reference).toBe(0.069);
    // +1 point on the wages below one ceiling (629.8 Md€, Agirc-Arrco 2024).
    expect(capped?.revenueEffect?.(0.079)).toBeCloseTo(6.29833, 5);
    const health = model.levers.get('socialContributions.employerHealth.rate');
    expect(health?.reference).toBe(0.13);
    expect(health?.revenueEffect?.(0.14)).toBeCloseTo(7.4004, 4);
    expect(health?.revenueItem).toBe('employerContributions');
    expect(
      model.levers.get('socialContributions.employeeSupplementaryT2.rate')?.revenueEffect?.(0.0964),
    ).toBeCloseTo(1.16842, 5);
  });

  it('sets each energy excise at its 2026 tariff, fuels shown in €/L', () => {
    const diesel = model.levers.get('energyExcise.diesel.rate');
    expect(diesel?.reference).toBe(60.75);
    // Stored in €/hl as in the tariff tables, shown per litre.
    expect(diesel?.unitLabel).toBe('€/L');
    expect(diesel?.displayScale).toBe(0.01);
    const electricity = model.levers.get('energyExcise.electricity.rate');
    expect(electricity?.unitLabel).toBe('€/MWh');
    expect(electricity?.displayScale).toBeUndefined();
    expect(diesel?.revenueItem).toBe('energyExcise');
    // +1 €/hl on 320.6 million hl ≈ +0.32 Md€.
    expect(diesel?.revenueEffect?.(61.75)).toBeCloseTo(19.48 / 60.75, 6);
  });

  it('passes a fuel excise rise on to households by the product weight', () => {
    const r = simulate(model, scenario({ 'energyExcise.diesel.rate': 60.75 * 1.2 }));
    const line = (p: (typeof r.profiles)[number], which: 'reference' | 'scenario') =>
      p[which].borne.find((l) => l.id === 'energyExcise')?.amount ?? NaN;
    const smic = r.profiles.find((p) => p.id === 'smic');
    if (!smic) throw new Error('no smic');
    // Same consumption base in this first-order check: the excise rises by 41.4 % × 20 %.
    expect(line(smic, 'scenario') / line(smic, 'reference')).toBeCloseTo(1 + 0.414 * 0.2, 2);
  });
});

describe('slider bounds', () => {
  const bounds = (id: string) => {
    const lever = model.levers.get(id);
    return [lever?.min, lever?.max];
  };

  it('go from 0 to twice the current value wherever it makes sense', () => {
    expect(bounds('vat.standard')).toEqual([0, 0.4]);
    expect(bounds('incomeTax.bracket5.rate')).toEqual([0, 0.9]);
    expect(bounds('energyExcise.diesel.rate')).toEqual([0, 121.5]);
    expect(bounds('wealthTax.threshold')).toEqual([0, 2_600_000]);
    expect(bounds('macro.nominalGrowth')).toEqual([0, 0.04]);
    const health = model.levers.get('spending.cofog.07');
    expect([health?.min, health?.max]).toEqual([0, 2 * (health?.reference ?? NaN)]);
    // The property tax lever is a change: −100 % to +100 % of the current amount.
    expect(bounds('propertyTax.change')).toEqual([-1, 1]);
  });

  it('keep other bounds where doubling is meaningless', () => {
    // A 0 % bracket cannot be doubled: up to 1 point.
    expect(bounds('incomeTax.bracket1.rate')).toEqual([0, 0.01]);
    expect(bounds('incomeTax.indexation')).toEqual([-0.05, 0.05]);
  });

  it('never let a rate exceed 100 %', () => {
    for (const lever of model.levers.values()) {
      if (lever.unit === 'rate') expect(lever.max, lever.id).toBeLessThanOrEqual(1);
    }
  });
});

describe('fixes found in review', () => {
  it('treats a change of the debt interest line (COFOG 01.7) as interest, not primary spending', () => {
    const interest = model.levers.get('spending.cofog.01.7')?.reference ?? NaN;
    const cut = simulate(model, scenario({ 'spending.cofog.01.7': interest - 10 }));
    // The year's balance improves by 10 Md€, the primary balance (balance + interest) does not.
    expect(cut.aggregates.balance - base.aggregates.balance).toBeCloseTo(10, 6);
    const primary = (s: typeof base) =>
      (s.aggregates.debtPath[0]?.balance ?? NaN) + (s.aggregates.debtPath[0]?.interest ?? NaN);
    expect(primary(cut)).toBeCloseTo(primary(base), 6);
    // From the next year, interest is debt × apparent rate again: no lasting primary surplus.
    const lastYear = (s: typeof base) => s.aggregates.debtPath.at(-1)?.debt ?? NaN;
    expect(lastYear(base) - lastYear(cut)).toBeLessThan(11);
  });

  it('indexes the décote of couples and the quotient familial ceilings with the barème', () => {
    const lever = model.levers.get('incomeTax.indexation');
    const rules = structuredClone(model.context.rules);
    lever?.applyToRules?.(rules, 0.02);
    const before = model.context.rules.incomeTax;
    expect(rules.incomeTax.decote.coupleCeiling).toBeCloseTo(before.decote.coupleCeiling * 1.02, 6);
    expect(rules.incomeTax.family.halfPartCeiling).toBeCloseTo(
      before.family.halfPartCeiling * 1.02,
      6,
    );
    expect(rules.incomeTax.family.singleParentFirstChildCeiling).toBeCloseTo(
      before.family.singleParentFirstChildCeiling * 1.02,
      6,
    );
  });
});
