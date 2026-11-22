// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Lines of the profile cards and the levers that move them (PLAN.MD §14.3). */
import { describe, expect, it } from 'vitest';
import type { CustomAdult, CustomHousehold } from '../../src/engine/customHousehold.ts';
import {
  LEVY_LINES,
  LINE_LEVERS,
  LINES_WITHOUT_LEVER,
  RECEIVED_LINES,
  leversOfLine,
  lineEffects,
  lineValue,
  type LineId,
} from '../../src/engine/lineLevers.ts';
import { loadDataset } from '../../src/engine/params.ts';
import type { ProfileResult } from '../../src/engine/profiles.ts';
import { emptyScenario } from '../../src/engine/scenario.ts';
import {
  createModel,
  simulate,
  simulateHousehold,
  subjectResult,
  type Subject,
} from '../../src/engine/simulate.ts';

const model = createModel(loadDataset());
const empty = emptyScenario(2026);
const DIVISIONS = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
const LINES: LineId[] = [
  ...LEVY_LINES,
  ...RECEIVED_LINES,
  ...DIVISIONS.map((d): LineId => `inKind.${d}`),
];

const adult = (a: Partial<CustomAdult>): CustomAdult => ({
  status: 'salaried',
  netMonthly: 1_500,
  age: 40,
  ...a,
});
const household = (h: Partial<CustomHousehold>): CustomHousehold => ({
  adults: [adult({})],
  married: false,
  childAges: [],
  tenure: 'tenant',
  rent: 600,
  zone: 2,
  propertyTax: 0,
  otherParentAbsent: false,
  maintenancePerChild: 0,
  ...h,
});
/** Households that reach the lines the reference profiles do not have. */
const HOUSEHOLDS: CustomHousehold[] = [
  household({
    adults: [adult({ netMonthly: 1_300 })],
    childAges: [2, 8, 15],
    otherParentAbsent: true,
  }),
  household({
    adults: [
      adult({ status: 'unemployed', netMonthly: 0, unemploymentMonthly: 1_200 }),
      adult({ status: 'publicAgent', netMonthly: 2_200, publicBranch: 'territorial' }),
    ],
    married: true,
    childAges: [4, 6, 9],
  }),
  household({
    adults: [adult({ status: 'none', netMonthly: 0, disabilityRate: 0.8, invalidityMonthly: 300 })],
  }),
  household({
    adults: [
      adult({ status: 'unemployed', netMonthly: 0, assEligible: true, age: 55 }),
      adult({
        status: 'micro',
        netMonthly: 0,
        microTurnover: 30_000,
        microActivity: 'services',
        microFlatTax: true,
      }),
    ],
  }),
  household({
    adults: [
      adult({
        status: 'student',
        netMonthly: 0,
        age: 20,
        studentGrant: {
          parentsIncome: 20_000,
          distanceKm: 300,
          siblings: 1,
          siblingStudents: 0,
          disabled: false,
        },
      }),
    ],
    rent: 450,
  }),
  household({
    adults: [adult({ status: 'retired', netMonthly: 900, age: 75 })],
    tenure: 'owner',
    rent: 0,
    propertyTax: 900,
  }),
];

describe('line → levers table', () => {
  it('gives every line at least one lever, except the three lines no lever can move', () => {
    for (const line of LINES) {
      const { direct, indirect } = leversOfLine(model, line);
      const count = direct.length + indirect.length;
      if (LINES_WITHOUT_LEVER.includes(line)) expect(count, line).toBe(0);
      else expect(count, line).toBeGreaterThan(0);
    }
  });

  it('only uses patterns that match an existing lever', () => {
    const ids = [...model.levers.keys()];
    for (const [line, { direct, indirect }] of Object.entries(LINE_LEVERS)) {
      for (const pattern of [...direct, ...indirect]) {
        const found = pattern.endsWith('*')
          ? ids.some((id) => id.startsWith(pattern.slice(0, -1)))
          : ids.includes(pattern);
        expect(found, `${line}: ${pattern}`).toBe(true);
      }
    }
  });

  it('leaves out levers that move no household', () => {
    const all = LINES.flatMap((line) => {
      const { direct, indirect } = leversOfLine(model, line);
      return [...direct, ...indirect].map((l) => l.id);
    });
    expect(all).not.toContain('energyExcise.heatingOil.rate');
    expect(all).not.toContain('spending.cofog.03.5');
    expect(all.some((id) => id.startsWith('macro.'))).toBe(false);
  });

  it('lists a function’s public services under its own levers only', () => {
    const health = leversOfLine(model, 'inKind.07').direct.map((l) => l.id);
    expect(health).toContain('spending.cofog.07');
    expect(health).toContain('spending.cofog.07.3');
    expect(health.every((id) => id.startsWith('spending.cofog.07'))).toBe(true);
  });

  it('never lets a line move without the lever in its table (every lever at its bounds)', () => {
    const profileRefs = model.reference;
    const householdRefs = HOUSEHOLDS.map(
      (h) => simulateHousehold(model, empty, h).reference as ProfileResult,
    );
    const tables = new Map(
      LINES.map((line) => {
        const { direct, indirect } = leversOfLine(model, line);
        return [line, new Set([...direct, ...indirect].map((l) => l.id))];
      }),
    );
    const misses = new Set<string>();
    const check = (lever: string, before: ProfileResult, after: ProfileResult) => {
      for (const line of LINES) {
        if (Math.abs(lineValue(after, line) - lineValue(before, line)) > 0.005) {
          if (!tables.get(line)?.has(lever)) misses.add(`${line} ← ${lever}`);
        }
      }
    };
    for (const lever of model.levers.values()) {
      if (lever.max <= lever.min) continue;
      for (const value of [lever.min, lever.max]) {
        const scenario = { ...empty, levers: { [lever.id]: value } };
        simulate(model, scenario).profiles.forEach((p, i) => {
          const reference = profileRefs[i];
          if (reference) check(lever.id, reference, p.scenario);
        });
        // Public services work the same for a household: its sweep only needs the levers
        // that reach the lines the profiles lack (levies, benefits of functions 09 and 10).
        if (/^spending\.cofog\.0[1-8]/.test(lever.id)) continue;
        HOUSEHOLDS.forEach((h, i) => {
          const reference = householdRefs[i];
          if (reference)
            check(
              lever.id,
              reference,
              subjectResult(model, scenario, { kind: 'household', household: h }),
            );
        });
      }
    }
    expect([...misses]).toEqual([]);
  }, 60_000);
});

describe('levy parts', () => {
  it('add up to their line, for the profiles and for a two-adult household', () => {
    const results: ProfileResult[] = [
      ...model.reference,
      ...HOUSEHOLDS.map((h) => simulateHousehold(model, empty, h).reference),
    ];
    for (const result of results) {
      for (const line of result.borne) {
        if (!line.parts) continue;
        const total = line.parts.reduce((s, p) => s + p.amount, 0);
        expect(total, `${result.id} ${line.id}`).toBeCloseTo(line.amount, 6);
      }
    }
  });

  it('details contributions, CSG and the décote', () => {
    const cadre = model.reference.find((r) => r.id === 'cadre3k');
    const parts = (id: string) => cadre?.borne.find((l) => l.id === id)?.parts?.map((p) => p.id);
    expect(parts('csgCrdsSalary')).toEqual(['csgDeductible', 'csgNonDeductible', 'crds']);
    expect(parts('employeeContributions')).toContain('employeeOldAgeCapped');
    expect(parts('employerContributions')).toContain('employerHealth');
    const smic = model.reference.find((r) => r.id === 'smic');
    const relief = smic?.borne
      .find((l) => l.id === 'employerContributions')
      ?.parts?.find((p) => p.id === 'employerRelief');
    expect(relief?.amount).toBeLessThan(0);
    const artisan = model.reference.find((r) => r.id === 'artisan');
    expect(
      artisan?.borne.find((l) => l.id === 'selfEmployedContributions')?.parts?.map((p) => p.id),
    ).toEqual(expect.arrayContaining(['health', 'basePension', 'training']));
  });

  it('gives a student of « Votre foyer » the same public services as the student profile', () => {
    const student = model.reference.find((r) => r.id === 'student');
    const own = simulateHousehold(
      model,
      empty,
      household({ adults: [adult({ status: 'student', netMonthly: 0, age: 20 })] }),
    ).reference;
    expect(own.inKind.total).toBeCloseTo(student?.inKind.total ?? NaN, 6);
  });
});

describe('effect of each lever on a line', () => {
  const smic: Subject = { kind: 'profile', id: 'smic' };
  const reference = (id: string) => {
    const r = model.reference.find((p) => p.id === id);
    if (!r) throw new Error(id);
    return r;
  };

  it('gives one lever the whole change, with no combined effect', () => {
    const scenario = { ...empty, levers: { 'vat.standard': 0.25 } };
    const { before, after, effects, combined } = lineEffects(
      model,
      scenario,
      smic,
      'vat',
      reference('smic'),
    );
    expect(effects).toHaveLength(1);
    expect(effects[0]?.effect).toBeCloseTo(after - before, 6);
    expect(Math.abs(combined)).toBeLessThan(1e-6);
  });

  it('adds up to the change of the line, the rest in the combined effects', () => {
    const scenario = {
      ...empty,
      levers: {
        'incomeTax.bracket2.rate': 0.2,
        'incomeTax.indexation': -0.05,
        'csg.activity.rate': 0.1,
        'vat.standard': 0.21,
      },
    };
    const subject: Subject = { kind: 'profile', id: 'employee1800' };
    const r = lineEffects(model, scenario, subject, 'incomeTax', reference('employee1800'));
    expect(r.effects.map((e) => e.lever.id).sort()).toEqual([
      'csg.activity.rate',
      'incomeTax.bracket2.rate',
      'incomeTax.indexation',
    ]);
    const explained = r.effects.reduce((s, e) => s + e.effect, 0);
    expect(explained + r.combined).toBeCloseTo(r.after - r.before, 6);
  });

  it('splits the public services of a function between its own levers exactly', () => {
    const scenario = {
      ...empty,
      levers: {
        'spending.cofog.07': (model.levers.get('spending.cofog.07')?.reference ?? NaN) * 0.9,
        'spending.cofog.07.3': (model.levers.get('spending.cofog.07.3')?.reference ?? NaN) * 1.2,
      },
    };
    const r = lineEffects(model, scenario, smic, 'inKind.07', reference('smic'));
    expect(r.effects).toHaveLength(2);
    expect(Math.abs(r.combined)).toBeLessThan(1e-6);
  });
});
