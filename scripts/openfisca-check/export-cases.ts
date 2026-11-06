// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Cross-check with OpenFisca-France (PLAN.MD step 11), part 1: exports the households
 * that both engines can compute, with their inputs and the results of the TypeScript
 * engine, to scripts/openfisca-check/out/cases.json. compare.py then recomputes them
 * with OpenFisca and writes the report of the gaps.
 *
 * Usage: node scripts/openfisca-check/export-cases.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CustomHousehold } from '../../src/engine/customHousehold.ts';
import type { HouseholdLevies } from '../../src/engine/household/index.ts';
import { grossForNetPension } from '../../src/engine/household/pension.ts';
import { sum } from '../../src/engine/math.ts';
import { grossForNet } from '../../src/engine/profiles.ts';
import { resolveRules } from '../../src/engine/rules.ts';
import { emptyScenario } from '../../src/engine/scenario.ts';
import { createModel, simulateHousehold } from '../../src/engine/simulate.ts';
import { loadDatasetFromDisk } from '../lib/dataset.ts';

const OUT_DIR = fileURLToPath(new URL('./out/', import.meta.url));

/** Reference profiles OpenFisca can compute from wages and pensions alone. */
const PROFILE_IDS = [
  'apprentice',
  'smic',
  'employee1800',
  'cadre3k',
  'cadre10k',
  'retiree1000',
  'retiree2500',
];

interface Person {
  id: string;
  age: number;
  /** Monthly gross salary (constant over the months). */
  grossMonthlySalary: number;
  /** Monthly gross retirement pension. */
  grossMonthlyPension: number;
  /** Annual taxable pension (net of the deductible levies), declared as such for income tax. */
  taxablePension: number;
  apprentice: boolean;
}

interface Case {
  id: string;
  label: string;
  persons: Person[];
  children: number[];
  married: boolean;
  owner: boolean;
  /** Annual amounts of the TypeScript engine (€). */
  engine: Record<string, number | number[]>;
}

function personResults(levies: HouseholdLevies) {
  const s = levies.salary;
  const p = levies.pension;
  return {
    employeeContributions: s.employeeContributions,
    csgCrdsSalary: sum([s.csgDeductible, s.csgNonDeductible, s.crds]),
    netSalary: s.netSalary,
    employerContributions: s.employerContributions,
    csgCrdsPension: sum([p.csgDeductible, p.csgNonDeductible, p.crds]),
  };
}

function main() {
  const data = loadDatasetFromDisk();
  const model = createModel(data);
  const rules = resolveRules(data.taxRules);
  const cases: Case[] = [];

  for (const id of PROFILE_IDS) {
    const result = model.reference.find((r) => r.id === id);
    const profile = data.profiles.profiles.find((p) => p.id === id);
    if (!result || !profile) throw new Error(`Unknown profile ${id}`);
    cases.push({
      id,
      label: profile.label,
      persons: [
        {
          id: 'adulte1',
          age: result.input.age,
          grossMonthlySalary: result.input.grossSalary / 12,
          grossMonthlyPension: result.input.grossPension / 12,
          taxablePension: result.levies.pension.taxable,
          apprentice: result.input.apprentice ?? false,
        },
      ],
      children: [],
      married: false,
      owner: profile.tenure === 'owner',
      engine: {
        ...personResults(result.levies),
        incomeTax: result.levies.incomeTax.tax,
        parts: [1],
        activityBonus: result.activityBonus,
        familyAllowances: 0,
      },
    });
  }

  // Households described as in the "Votre foyer" form.
  const smicProfile = model.reference.find((r) => r.id === 'smic');
  if (!smicProfile) throw new Error('Unknown profile smic');
  const smicNetMonthly = smicProfile.levies.salary.netSalary / 12;
  const salaried = (netMonthly: number, age = 40) => ({
    status: 'salaried' as const,
    netMonthly,
    age,
  });
  const families: { id: string; label: string; household: CustomHousehold; ages: number[] }[] = [
    {
      id: 'coupleMarried2Children',
      label: 'Couple marié, 2 × 2 500 € net, 2 enfants',
      household: {
        adults: [salaried(2_500), salaried(2_500)],
        married: true,
        children: 2,
        childrenFrom14: 0,
        tenure: 'tenant',
        propertyTax: 0,
      },
      ages: [6, 9],
    },
    {
      id: 'coupleUnmarried2Children',
      label: 'Couple non marié, 2 × 2 500 € net, 2 enfants',
      household: {
        adults: [salaried(2_500), salaried(2_500)],
        married: false,
        children: 2,
        childrenFrom14: 0,
        tenure: 'tenant',
        propertyTax: 0,
      },
      ages: [6, 9],
    },
    {
      id: 'singleParent1Child',
      label: 'Parent isolé, 2 000 € net, 1 enfant',
      household: {
        adults: [salaried(2_000)],
        married: false,
        children: 1,
        childrenFrom14: 0,
        tenure: 'tenant',
        propertyTax: 0,
      },
      ages: [7],
    },
    {
      id: 'coupleSmicInactive3Children',
      label: 'Couple marié, SMIC et sans revenu, 3 enfants dont 1 adolescent',
      household: {
        adults: [salaried(smicNetMonthly), { status: 'none', netMonthly: 0, age: 38 }],
        married: true,
        children: 3,
        childrenFrom14: 1,
        tenure: 'tenant',
        propertyTax: 0,
      },
      ages: [4, 8, 15],
    },
    {
      id: 'coupleMarried3Children',
      label: 'Couple marié, 4 000 € et 3 000 € net, 3 enfants',
      household: {
        adults: [salaried(4_000), salaried(3_000)],
        married: true,
        children: 3,
        childrenFrom14: 0,
        tenure: 'tenant',
        propertyTax: 0,
      },
      ages: [3, 6, 10],
    },
  ];

  for (const { id, label, household, ages } of families) {
    const { reference } = simulateHousehold(model, emptyScenario(data.meta.baseYear), household);
    const line = (lineId: string) => reference.borne.find((l) => l.id === lineId)?.amount ?? 0;
    cases.push({
      id,
      label,
      persons: household.adults.map((a, i) => ({
        id: `adulte${String(i + 1)}`,
        age: a.age,
        grossMonthlySalary:
          a.status === 'salaried' ? grossForNet(a.netMonthly * 12, rules) / 12 : 0,
        grossMonthlyPension:
          a.status === 'retired' ? grossForNetPension(a.netMonthly * 12, rules) / 12 : 0,
        taxablePension: 0,
        apprentice: false,
      })),
      children: ages,
      married: household.married,
      owner: household.tenure === 'owner',
      engine: {
        employeeContributions: line('employeeContributions'),
        csgCrdsSalary: line('csgCrdsSalary'),
        employerContributions: line('employerContributions'),
        incomeTax: reference.incomeTaxes.reduce((s, t) => s + t, 0),
        parts: reference.taxParts,
        activityBonus: reference.activityBonus,
        familyAllowances: reference.familyAllowances,
      },
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const file = `${OUT_DIR}cases.json`;
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        dataVersion: data.meta.dataVersion,
        legislationYear: data.meta.baseYear,
        assumptions: {
          employerSize: 'au moins 50 salariés (RGDU, FNAL 0,5 %)',
          category: 'salarié non cadre du secteur privé, temps plein',
          workAccidentRate: rules.socialContributions.items.find(
            (i) => i.id === 'employerWorkAccidents',
          )?.rate,
        },
        cases,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`✓ ${String(cases.length)} cas exportés dans ${file}`);
}

main();
