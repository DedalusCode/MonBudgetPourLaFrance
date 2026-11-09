// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** A household described by the user: consistency with the reference profiles and family rules. */
import { describe, expect, it } from 'vitest';
import type { CustomAdult, CustomHousehold } from '../../src/engine/customHousehold.ts';
import { ageKey, closestPattern } from '../../src/engine/customHousehold.ts';
import { sum } from '../../src/engine/math.ts';
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
  childAges: [],
  tenure: 'tenant',
  rent: 0,
  zone: 2,
  propertyTax: 0,
  otherParentAbsent: false,
  maintenancePerChild: 0,
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
    const married = run({ adults, married: true, childAges: [5, 5] }).reference;
    const unmarried = run({ adults, married: false, childAges: [5, 5] }).reference;
    expect(married.taxParts).toEqual([3]);
    expect(unmarried.taxParts).toEqual([2, 1]);
    // The CAF ignores marriage: same family allowances.
    expect(married.familyAllowances).toBeCloseTo(unmarried.familyAllowances, 6);
    // Paid after the CRDS (0.5 %).
    expect(married.familyAllowances).toBeCloseTo(153.01 * 12 * 0.995, 0);
  });

  it('gives a single parent the extra half-part', () => {
    expect(run({ adults: [salaried(2_000)], childAges: [5] }).reference.taxParts).toEqual([2]);
  });

  it('counts every member for public services and consumption units', () => {
    const { reference } = run({ adults: [salaried(2_000), salaried(2_000)], childAges: [5, 5] });
    expect(reference.inKind.total).toBeCloseTo(4 * smic.inKind.total, 6);
    expect(reference.consumptionUnits).toBeCloseTo(1 + 0.5 + 2 * 0.3, 9);
    const teens = run({ adults: [salaried(2_000)], childAges: [14, 15] }).reference;
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
    // Under 65: no ASPA, which would itself count as a resource.
    const alone = run({ adults: [worker, { status: 'none', netMonthly: 0, age: 62 }] });
    const withPension = run({
      adults: [worker, { status: 'retired', netMonthly: 1_200, age: 62 }],
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
    const family = {
      adults: [salaried(4_000), salaried(3_000)],
      married: true,
      childAges: [5, 8, 10],
    };
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
    const family = { adults: [salaried(3_000), salaried(2_000)], married: true, childAges: [5, 5] };
    for (let i = 0; i < 5; i++) run(family); // warm-up (JIT)
    const runs = 20;
    const start = performance.now();
    for (let i = 0; i < runs; i++) run(family);
    // A slider recompute must stay within one frame (16 ms, PLAN.MD §6); the household
    // runs beside simulate() (< 5 ms), so it gets the remaining margin.
    expect((performance.now() - start) / runs).toBeLessThan(8);
  });
});

describe('situations added in v1.1', () => {
  const adult = (a: Partial<CustomAdult>): CustomAdult => ({
    status: 'salaried',
    netMonthly: 2_000,
    age: 40,
    ...a,
  });
  const one = (a: Partial<CustomAdult>, levers: Record<string, number> = {}) =>
    run({ adults: [adult(a)] }, levers);

  it('computes every situation and keeps the net income given by the user', () => {
    for (const status of [
      'salaried',
      'apprentice',
      'publicAgent',
      'selfEmployed',
      'farmer',
      'liberal',
      'student',
      'retired',
    ] as const) {
      const { reference } = one({ status });
      const p = reference.levies;
      const net =
        status === 'retired'
          ? p.pension.net
          : ['selfEmployed', 'farmer', 'liberal'].includes(status)
            ? p.selfEmployed.taxableIncome
            : p.salary.netSalary;
      expect(net / 12, status).toBeCloseTo(2_000, 2);
      expect(reference.totalLevies, status).toBeGreaterThan(0);
    }
  });

  it('bears a public servant’s employer contributions, at the rate of the branch', () => {
    const state = one({ status: 'publicAgent', publicBranch: 'state' }).reference;
    const local = one({ status: 'publicAgent', publicBranch: 'hospital' }).reference;
    const employer = (r: typeof state) => r.borne.find((l) => l.id === 'employerContributions');
    expect(employer(state)?.amount).toBeGreaterThan(employer(local)?.amount ?? Infinity);
    // A given bonus share replaces the average of the branch.
    const noBonus = one({ status: 'publicAgent', bonusShare: 0 }).reference;
    expect(noBonus.input.publicAgent?.bonusShare).toBe(0);
    expect(state.input.publicAgent?.bonusShare).toBe(0.264);
  });

  it('moves a public servant’s employer part with the State pension lever', () => {
    const id = 'socialContributions.publicEmployerStatePension.rate';
    const rate = model.levers.get(id)?.reference ?? NaN;
    const impact = one({ status: 'publicAgent' }, { [id]: rate - 0.1 });
    expect(impact.leviesImpact).toBeGreaterThan(0);
    expect(impact.benefitsImpact).toBeCloseTo(0, 6);
  });

  it('counts the unemployment benefit as received, scaled by COFOG 10.5', () => {
    const reference = model.levers.get('spending.cofog.10.5')?.reference ?? NaN;
    const unemployed = { status: 'unemployed' as const, unemploymentMonthly: 1_500 };
    expect(one(unemployed).reference.unemploymentBenefit).toBe(18_000);
    const cut = one(unemployed, { 'spending.cofog.10.5': reference / 2 });
    expect(cut.scenario.unemploymentBenefit).toBeCloseTo(9_000, 6);
    // Means-tested aids partly make up for the cut (here, the chèque énergie).
    const aidsChange =
      sum(Object.values(cut.scenario.aids)) - sum(Object.values(cut.reference.aids));
    expect(aidsChange).toBeGreaterThan(0);
    expect(cut.benefitsImpact).toBeCloseTo(-9_000 + aidsChange, 6);
  });

  it('adds an invalidity pension, scaled by COFOG 10.1, and the disability half-part', () => {
    const disabled = { invalidityMonthly: 800, disabilityRate: 0.8 };
    const { reference } = one(disabled);
    expect(reference.invalidityPension).toBeGreaterThan(800 * 12);
    expect(reference.taxParts).toEqual([1.5]);
    expect(one({ disabilityRate: 0.5 }).reference.taxParts).toEqual([1]);
    const groupReference = model.levers.get('spending.cofog.10.1')?.reference ?? NaN;
    const cut = one(disabled, { 'spending.cofog.10.1': groupReference / 2 });
    expect(cut.scenario.invalidityPension).toBeCloseTo(reference.invalidityPension / 2, 6);
  });

  it('gives a micro-entrepreneur one line of contributions and the versement libératoire', () => {
    const { reference } = one({
      status: 'micro',
      microActivity: 'services',
      microTurnover: 40_000,
      microFlatTax: true,
    });
    const line = (id: string) => reference.borne.find((l) => l.id === id)?.amount ?? 0;
    expect(line('microContributions')).toBeCloseTo(0.212 * 40_000 + 0.003 * 40_000, 6);
    expect(line('microFlatIncomeTax')).toBeCloseTo(0.017 * 40_000, 6);
    expect(reference.fiscalIncome).toBeCloseTo(20_000, 6);
  });

  it('gives no prime d’activité to a student below the minimum earnings', () => {
    expect(one({ status: 'student', netMonthly: 600 }).reference.activityBonus).toBe(0);
    expect(one({ status: 'student', netMonthly: 1_300 }).reference.activityBonus).toBeGreaterThan(
      0,
    );
    expect(one({ status: 'salaried', netMonthly: 600 }).reference.activityBonus).toBeGreaterThan(0);
  });
});

describe('means-tested aids of the household (step 16)', () => {
  const none = (age = 40): CustomAdult => ({ status: 'none', netMonthly: 0, age });

  it('pays the RSA to a person without resources, minus the housing flat rate', () => {
    const { reference } = run({ adults: [none()], tenure: 'free' });
    expect(reference.aids.rsa).toBeCloseTo((651.69 - 78.2) * 12, 6);
    // A tenant without rent entered gets no housing aid, hence no flat rate.
    expect(run({ adults: [none()] }).reference.aids.rsa).toBeCloseTo(651.69 * 12, 6);
    expect(run({ adults: [none(22)] }).reference.aids.rsa).toBe(0);
  });

  it('computes the housing aid of a tenant, which adds the flat rate to the prime d’activité', () => {
    const adults = [salaried(1_100)];
    const withoutRent = run({ adults }).reference;
    const tenant = run({ adults, rent: 550, zone: 1 }).reference;
    expect(tenant.housingAid).toBeGreaterThan(0);
    expect(tenant.activityBonus).toBeLessThan(withoutRent.activityBonus);
    const cut = run(
      { adults, rent: 550, zone: 1 },
      {
        'spending.cofog.10.6': (model.levers.get('spending.cofog.10.6')?.reference ?? NaN) / 2,
      },
    );
    expect(cut.scenario.housingAid).toBeCloseTo(tenant.housingAid / 2, 6);
  });

  it('pays the support allowance only when the other parent pays nothing', () => {
    const parent = { adults: [salaried(1_500)], childAges: [6] };
    expect(run(parent).reference.aids.supportAllowance).toBe(0);
    const absent = run({ ...parent, otherParentAbsent: true }).reference;
    expect(absent.aids.supportAllowance).toBeCloseTo(0.422 * 478.16 * 12 * 0.995, 6);
  });

  it('leaves the age increase of the allocations familiales out of the prime d’activité', () => {
    const family = (ages: number[]) =>
      run({ adults: [salaried(1_400), none(38)], married: true, childAges: ages }).reference;
    const younger = family([5, 8, 13]);
    const older = family([5, 8, 14]);
    expect(older.familyAllowances).toBeGreaterThan(younger.familyAllowances);
    expect(older.activityBonus).toBeCloseTo(younger.activityBonus, 6);
  });

  it('computes a student grant from the parents’ income, scaled by its spending item', () => {
    const student: CustomAdult = {
      status: 'student',
      netMonthly: 0,
      age: 20,
      studentGrant: {
        parentsIncome: 20_000,
        distanceKm: 250,
        siblings: 0,
        siblingStudents: 0,
        disabled: false,
      },
    };
    expect(run({ adults: [student] }).reference.aids.studentGrant).toBe(3_828);
    expect(run({ adults: [{ ...student, studentGrant: null }] }).reference.aids.studentGrant).toBe(
      0,
    );
    // Higher education grants are an item of COFOG 09.6 (step 13 audit).
    const id = 'spending.cofog.09.6.higher-education-grants';
    const reference = model.levers.get(id)?.reference ?? NaN;
    const cut = run({ adults: [student] }, { [id]: reference / 2 });
    expect(cut.scenario.aids.studentGrant).toBeCloseTo(3_828 / 2, 6);
    // The tertiary education group itself no longer changes the grant.
    const tertiary = model.levers.get('spending.cofog.09.4')?.reference ?? NaN;
    const other = run({ adults: [student] }, { 'spending.cofog.09.4': tertiary / 2 });
    expect(other.scenario.aids.studentGrant).toBe(3_828);
  });

  it('shows the complémentaire santé solidaire without adding it to the benefits', () => {
    const { reference } = run({ adults: [none()], tenure: 'free' });
    expect(reference.healthCover.status).toBe('free');
    const benefits =
      reference.activityBonus +
      reference.familyAllowances +
      reference.housingAid +
      sum(Object.values(reference.aids));
    expect(reference.benefits).toBeCloseTo(benefits, 6);
  });
});
