// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { borneLevies, corporateTaxBorne } from '../../src/engine/incidence.ts';
import { inKindReceived, type Allocation } from '../../src/engine/inKind.ts';
import { loadDataset } from '../../src/engine/params.ts';
import { computeProfile, grossForNet, grossSalaryFor } from '../../src/engine/profiles.ts';
import { resolve } from '../../src/engine/rules.ts';
import { referenceContext, referenceProfiles } from '../../src/engine/reference.ts';
import { householdLevies } from '../../src/engine/household/index.ts';
import { OUTPUT, renderReferenceProfiles } from '../../scripts/reference-profiles.ts';
import { emptyHousehold, rules, rulesWith } from './household/helpers.ts';

const data = loadDataset();
const results = Object.fromEntries(referenceProfiles(data).map((r) => [r.id, r]));
const profileData = Object.fromEntries(data.profiles.profiles.map((p) => [p.id, p]));
const get = (id: string) => {
  const r = results[id];
  if (!r) throw new Error(`no profile ${id}`);
  return r;
};
const profileOf = (id: string) => {
  const p = profileData[id];
  if (!p) throw new Error(`no profile ${id}`);
  return p;
};
const line = (id: string, levy: string) => get(id).borne.find((l) => l.id === levy)?.amount ?? 0;

describe('reference balance of each profile', () => {
  // Expected totals in € per year (rounded); see docs/reference-profiles.md.
  const expected = {
    student: { totalLevies: 992, benefits: 1_980, inKind: 15_881, economicIncome: 0 },
    apprentice: { totalLevies: 1_403, benefits: 0, inKind: 11_759, economicIncome: 10_018 },
    retiree1000: { totalLevies: 2_335, benefits: 12_000, inKind: 18_418, economicIncome: 12_000 },
    retiree2500: { totalLevies: 9_121, benefits: 33_149, inKind: 18_418, economicIncome: 33_149 },
    artisan: { totalLevies: 19_116, benefits: 0, inKind: 12_132, economicIncome: 44_384 },
    smic: { totalLevies: 8_191, benefits: 2_770, inKind: 12_132, economicIncome: 23_820 },
    employee1800: { totalLevies: 14_411, benefits: 1_875, inKind: 11_859, economicIncome: 33_179 },
    cadre3k: { totalLevies: 33_552, benefits: 0, inKind: 12_132, economicIncome: 63_426 },
    cadre10k: { totalLevies: 136_797, benefits: 0, inKind: 12_132, economicIncome: 217_082 },
    rentier5m: { totalLevies: 87_634, benefits: 0, inKind: 12_132, economicIncome: 153_617 },
    fortune100m: {
      totalLevies: 3_165_923,
      benefits: 0,
      inKind: 12_132,
      economicIncome: 10_666_667,
    },
  };

  for (const [id, values] of Object.entries(expected)) {
    describe(id, () => {
      const r = get(id);
      it('matches the reference totals', () => {
        expect(Math.round(r.totalLevies)).toBe(values.totalLevies);
        expect(Math.round(r.benefits)).toBe(values.benefits);
        expect(Math.round(r.inKind.total)).toBe(values.inKind);
        expect(Math.round(r.economicIncome)).toBe(values.economicIncome);
      });

      it('keeps its accounting identities', () => {
        expect(r.totalLevies).toBeCloseTo(
          r.borne.reduce((sum, l) => sum + l.amount, 0),
          6,
        );
        const fixed = data.consumption.byProfile[r.id].annualAmount?.value;
        const savings = profileData[id]?.savingsRate.value ?? NaN;
        expect(r.consumption).toBeCloseTo(fixed ?? r.disposableIncome * (1 - savings), 6);
        expect(r.inKind.total).toBeCloseTo(
          Object.values(r.inKind.byDivision).reduce((a, b) => a + b, 0),
          6,
        );
      });
    });
  }

  it('reaches the target net salaries', () => {
    expect(get('cadre3k').levies.salary.netSalary).toBeCloseTo(36_000, 2);
    expect(get('cadre10k').levies.salary.netSalary).toBeCloseTo(120_000, 2);
  });

  it('gives the prime d’activité to the SMIC profile, which owes no income tax', () => {
    expect(get('smic').benefits).toBeGreaterThan(0);
    expect(line('smic', 'incomeTax')).toBe(0);
  });

  it('applies the IFI to rental property but not to professional assets', () => {
    expect(line('rentier5m', 'wealthTax')).toBeCloseTo(15_690, 6);
    expect(line('fortune100m', 'wealthTax')).toBe(0);
  });

  it('charges the CDHR to the 100 M€ profile and imputes it the corporate tax', () => {
    expect(line('fortune100m', 'highIncomeMinimumTax')).toBeGreaterThan(0);
    expect(line('fortune100m', 'corporateTax')).toBeCloseTo(8_000_000 / 3, 0);
    expect(get('fortune100m').economicIncome).toBeGreaterThan(5 * get('fortune100m').fiscalIncome);
  });
});

describe('profile options', () => {
  it('uses the profile keys and drops corporate tax when not attributed', () => {
    const context = referenceContext(data);
    const notAttributed = rulesWith((r) => {
      r.incidence.corporateTax.bearer = 'notAttributed';
    });
    const allocation: Allocation = {
      keys: [{ id: 'all', label: 'Tous' }],
      rules: [{ cofog: '02.1', mode: 'perCapita', indexByKey: { all: 2 }, status: 'HYPOTHESE' }],
    };
    const fortune = referenceProfiles(data).find((r) => r.id === 'fortune100m');
    const result = computeProfile(
      { ...resolve(profileOf('fortune100m')), inKindKeys: ['all'] },
      resolve(data.consumption.byProfile.fortune100m),
      { ...context, rules: notAttributed, allocation },
    );
    expect(result.inKind.total).toBeCloseTo(
      ((context.groupAmounts['02.1'] ?? 0) * 2e9) / context.population,
      6,
    );
    expect(result.economicIncome).toBeLessThan(fortune?.economicIncome ?? 0);
    expect(result.borne.find((l) => l.id === 'corporateTax')?.amount).toBe(0);
  });
});

describe('docs/reference-profiles.md', () => {
  it('is up to date (run `npm run docs:profiles`)', () => {
    expect(readFileSync(OUTPUT, 'utf8')).toBe(renderReferenceProfiles(data));
  });
});

describe('salary of a profile', () => {
  it('is zero without salary and the full-time SMIC otherwise', () => {
    expect(grossSalaryFor({ kind: 'none' }, rules)).toBe(0);
    const { hourlyGross, monthlyHours } = rules.minimumWage;
    expect(grossSalaryFor({ kind: 'minimumWage' }, rules)).toBeCloseTo(
      hourlyGross * monthlyHours * 12,
      6,
    );
  });

  it('inverts the net salary', () => {
    const gross = grossForNet(50_000, rules);
    expect(
      householdLevies({ ...emptyHousehold, grossSalary: gross }, rules).salary.netSalary,
    ).toBeCloseTo(50_000, 3);
  });
});

describe('public services in kind', () => {
  const allocation: Allocation = {
    keys: [
      { id: 'young', label: 'Jeune' },
      { id: 'student', label: 'Étudiant' },
    ],
    rules: [
      { cofog: '02.1', mode: 'perCapita', status: 'HYPOTHESE' },
      { cofog: '07.3', mode: 'perCapita', index: 0.5, status: 'HYPOTHESE' },
      {
        cofog: '09.4',
        mode: 'perCapita',
        indexByKey: { student: 20, young: 2 },
        status: 'HYPOTHESE',
      },
      { cofog: '10.2', mode: 'notAllocated', status: 'HYPOTHESE' },
    ],
  };
  const amounts = { '02.1': 10, '07.3': 10, '09.4': 10, '10.2': 300 };

  it('shares per capita, weighted by index, and skips cash transfers', () => {
    const r = inKindReceived(amounts, allocation, 10e6, []);
    expect(r.byGroup['02.1']).toBeCloseTo(1_000, 6);
    expect(r.byGroup['07.3']).toBeCloseTo(500, 6);
    expect(r.byGroup['09.4']).toBeCloseTo(1_000, 6);
    expect(r.byGroup['10.2']).toBe(0);
    expect(r.total).toBeCloseTo(2_500, 6);
    expect(r.byDivision['07']).toBeCloseTo(500, 6);
  });

  it('uses the index of the first profile key a rule defines', () => {
    expect(
      inKindReceived(amounts, allocation, 10e6, ['student', 'young']).byGroup['09.4'],
    ).toBeCloseTo(20_000, 6);
    expect(
      inKindReceived(amounts, allocation, 10e6, ['young', 'student']).byGroup['09.4'],
    ).toBeCloseTo(2_000, 6);
    expect(inKindReceived(amounts, allocation, 10e6, ['other']).byGroup['09.4']).toBeCloseTo(
      1_000,
      6,
    );
  });

  it('follows spending changes', () => {
    const cut = inKindReceived({ ...amounts, '02.1': 9 }, allocation, 10e6, []);
    expect(cut.byGroup['02.1']).toBeCloseTo(900, 6);
  });

  it('gives the same per-capita services to every reference profile', () => {
    const context = referenceContext(data);
    expect(context.population).toBe(data.macro.population.value);
    expect(get('smic').inKind.total).toBeCloseTo(get('fortune100m').inKind.total, 6);
  });
});

describe('incidence assumptions', () => {
  const input = {
    ...emptyHousehold,
    grossSalary: 40_000,
    dividends: 3_000,
    retainedEarnings: 3_000,
    propertyTax: 800,
  };

  it('grosses up corporate tax at the statutory rate', () => {
    expect(corporateTaxBorne(7_500, rules)).toBeCloseTo(2_500, 6);
  });

  it('drops a levy whose bearer is not attributed', () => {
    const none = rulesWith((r) => {
      for (const key of Object.keys(r.incidence) as (keyof typeof r.incidence)[]) {
        r.incidence[key].bearer = 'notAttributed';
      }
    });
    const lines = borneLevies(input, householdLevies(input, none), none);
    for (const id of [
      'employerContributions',
      'vat',
      'energyExcise',
      'propertyTax',
      'corporateTax',
    ]) {
      expect(lines.find((l) => l.id === id)?.amount).toBe(0);
    }
    const all = borneLevies(input, householdLevies(input, rules), rules);
    expect(all.find((l) => l.id === 'propertyTax')?.amount).toBe(800);
    expect(all.find((l) => l.id === 'corporateTax')?.amount).toBeCloseTo(2_000, 6);
  });
});
