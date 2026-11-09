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
import { grossForNetPension, pensionOnly } from '../../src/engine/household/pension.ts';
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
  /** Monthly net pension, an input of OpenFisca's means tests. */
  netMonthlyPension?: number;
  apprentice: boolean;
  /** Public servant: OpenFisca category, indexed salary and bonuses (monthly gross). */
  publicServant?: { category: string; indexedMonthly: number; bonusesMonthly: number };
  /** Monthly gross unemployment benefit, and its taxable part (net of deductible CSG). */
  unemploymentGrossMonthly?: number;
  taxableUnemploymentMonthly?: number;
  /** Annual turnover of a micro-entrepreneur in services, with the versement libératoire. */
  microServicesTurnover?: number;
  /** Holder of a disability card. */
  disabilityCard?: boolean;
  /** Rate of incapacity (share) and restriction of access to employment (AAH). */
  disabilityRate?: number;
  employmentRestriction?: boolean;
  /** Unemployed (with or without benefit), student or retired, for the means tests. */
  activity?: 'chomeur' | 'etudiant' | 'retraite' | 'inactif';
  /** Jobseeker whose insurance rights have ended, with the required work history (ASS). */
  assEligible?: boolean;
}

interface Case {
  id: string;
  label: string;
  persons: Person[];
  children: number[];
  married: boolean;
  tenure: CustomHousehold['tenure'];
  /** Monthly rent and zone of the housing aids (tenant). */
  rent: number;
  zone: number;
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
          netMonthlyPension: result.levies.pension.net / 12,
          apprentice: result.input.apprentice ?? false,
        },
      ],
      children: [],
      married: false,
      tenure: profile.tenure === 'owner' ? 'owner' : 'tenant',
      rent: 0,
      zone: 2,
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
  // A tenant paying no rent: no housing aid is computed, as before step 16.
  const HOME = {
    childAges: [] as number[],
    tenure: 'tenant' as const,
    rent: 0,
    zone: 2 as const,
    propertyTax: 0,
    otherParentAbsent: false,
    maintenancePerChild: 0,
  };
  const families: { id: string; label: string; household: CustomHousehold }[] = [
    {
      id: 'coupleMarried2Children',
      label: 'Couple marié, 2 × 2 500 € net, 2 enfants',
      household: {
        adults: [salaried(2_500), salaried(2_500)],
        married: true,
        ...HOME,
        childAges: [6, 9],
      },
    },
    {
      id: 'coupleUnmarried2Children',
      label: 'Couple non marié, 2 × 2 500 € net, 2 enfants',
      household: {
        adults: [salaried(2_500), salaried(2_500)],
        married: false,
        ...HOME,
        childAges: [6, 9],
      },
    },
    {
      id: 'singleParent1Child',
      label: 'Parent isolé, 2 000 € net, 1 enfant',
      household: {
        adults: [salaried(2_000)],
        married: false,
        ...HOME,
        otherParentAbsent: true,
        childAges: [7],
      },
    },
    {
      id: 'coupleSmicInactive3Children',
      label: 'Couple marié, SMIC et sans revenu, 3 enfants dont 1 adolescent',
      household: {
        adults: [salaried(smicNetMonthly), { status: 'none', netMonthly: 0, age: 38 }],
        married: true,
        ...HOME,
        childAges: [4, 8, 15],
      },
    },
    {
      id: 'coupleMarried3Children',
      label: 'Couple marié, 4 000 € et 3 000 € net, 3 enfants',
      household: {
        adults: [salaried(4_000), salaried(3_000)],
        married: true,
        ...HOME,
        childAges: [3, 6, 10],
      },
    },
  ];

  // Situations added in v1.1 (PLAN.MD §13.4), where OpenFisca covers them.
  const single = (
    adult: CustomHousehold['adults'][number],
    home: Partial<CustomHousehold> = {},
  ): CustomHousehold => ({ adults: [adult], married: false, ...HOME, ...home });
  const situations: typeof families = [
    {
      id: 'publicServantState',
      label: 'Fonctionnaire d’État, 2 500 € net',
      household: single({
        status: 'publicAgent',
        netMonthly: 2_500,
        age: 40,
        publicBranch: 'state',
      }),
    },
    {
      id: 'publicServantLocal',
      label: 'Fonctionnaire territorial, 2 000 € net',
      household: single({
        status: 'publicAgent',
        netMonthly: 2_000,
        age: 40,
        publicBranch: 'territorial',
      }),
    },
    {
      id: 'unemployed',
      label: 'Au chômage, allocation de 2 400 € brut',
      household: single({
        status: 'unemployed',
        netMonthly: 0,
        age: 40,
        unemploymentMonthly: 2_400,
      }),
    },
    {
      id: 'microServices',
      label: 'Micro-entrepreneur, services, 40 000 € de chiffre d’affaires, versement libératoire',
      household: single(
        {
          status: 'micro',
          netMonthly: 0,
          age: 40,
          microActivity: 'services',
          microTurnover: 40_000,
          microFlatTax: true,
        },
        { rent: 450 },
      ),
    },
    {
      id: 'disabledEmployee',
      label: 'Salarié, 2 500 € net, carte d’invalidité',
      household: single({ status: 'salaried', netMonthly: 2_500, age: 40, disabilityRate: 0.8 }),
    },
    // Means-tested aids (PLAN.MD §13.5, step 16).
    {
      id: 'rsaHousedFree',
      label: 'Sans activité ni ressources, logé gratuitement',
      household: single({ status: 'none', netMonthly: 0, age: 40 }, { tenure: 'free' }),
    },
    {
      id: 'rsaTenant',
      label: 'Sans activité ni ressources, locataire, 450 € de loyer, zone 2',
      household: single({ status: 'none', netMonthly: 0, age: 40 }, { rent: 450 }),
    },
    {
      id: 'smicTenantZone1',
      label: 'Salarié au SMIC, locataire, 600 € de loyer, zone 1',
      household: single(salaried(smicNetMonthly), { rent: 600, zone: 1 }),
    },
    {
      id: 'partTimeTenant',
      label: 'Salarié à 800 € net, locataire, 500 € de loyer, zone 3',
      household: single(salaried(800), { rent: 500, zone: 3 }),
    },
    {
      id: 'aahTenant',
      label: 'Sans activité, incapacité de 80 %, locataire, 400 € de loyer, zone 2',
      household: single(
        { status: 'none', netMonthly: 0, age: 40, disabilityRate: 0.8 },
        { rent: 400 },
      ),
    },
    {
      id: 'aspaRetiree',
      label: 'Retraité de 70 ans, 800 € de pension nette, propriétaire',
      household: single({ status: 'retired', netMonthly: 800, age: 70 }, { tenure: 'owner' }),
    },
    {
      id: 'assJobseeker',
      label: 'Fin de droits au chômage (ASS), logé gratuitement',
      household: single(
        { status: 'unemployed', netMonthly: 0, age: 45, assEligible: true },
        { tenure: 'free' },
      ),
    },
    {
      id: 'singleParentYoungChild',
      label: 'Parent isolé sans revenu, enfant de 1 an, locataire, 500 € de loyer, zone 2',
      household: single(
        { status: 'none', netMonthly: 0, age: 30 },
        { childAges: [1], rent: 500, otherParentAbsent: true },
      ),
    },
    {
      id: 'couple4Children',
      label:
        'Couple marié, SMIC et sans revenu, 4 enfants de 4 à 16 ans, locataire, 750 € de loyer, zone 2',
      household: {
        adults: [salaried(smicNetMonthly), { status: 'none', netMonthly: 0, age: 38 }],
        married: true,
        ...HOME,
        childAges: [4, 8, 12, 16],
        rent: 750,
      },
    },
  ];

  for (const { id, label, household } of [...families, ...situations]) {
    const { reference } = simulateHousehold(model, emptyScenario(data.meta.baseYear), household);
    const line = (lineId: string) => reference.borne.find((l) => l.id === lineId)?.amount ?? 0;
    cases.push({
      id,
      label,
      persons: household.adults.map((a, i): Person => {
        const person: Person = {
          id: `adulte${String(i + 1)}`,
          age: a.age,
          grossMonthlySalary:
            a.status === 'salaried' ? grossForNet(a.netMonthly * 12, rules) / 12 : 0,
          grossMonthlyPension: 0,
          taxablePension: 0,
          apprentice: false,
        };
        if (a.status === 'retired') {
          const pension = pensionOnly(grossForNetPension(a.netMonthly * 12, rules), rules);
          person.grossMonthlyPension = pension.gross / 12;
          person.taxablePension = pension.taxable;
          person.netMonthlyPension = pension.net / 12;
        }
        const input = i === 0 ? reference.input : undefined;
        if (a.status === 'publicAgent' && input?.publicAgent) {
          const indexed = input.grossSalary * (1 - input.publicAgent.bonusShare);
          person.publicServant = {
            category: `public_titulaire_${a.publicBranch === 'state' ? 'etat' : a.publicBranch === 'hospital' ? 'hospitaliere' : 'territoriale'}`,
            indexedMonthly: indexed / 12,
            bonusesMonthly: (input.grossSalary - indexed) / 12,
          };
        }
        if (a.status === 'unemployed' && input) {
          person.unemploymentGrossMonthly = a.unemploymentMonthly ?? 0;
          person.taxableUnemploymentMonthly = reference.levies.unemployment.taxable / 12;
        }
        if (a.status === 'micro') person.microServicesTurnover = a.microTurnover ?? 0;
        if ((a.disabilityRate ?? 0) >= rules.incomeTax.disabilityCardMinRate) {
          person.disabilityCard = true;
        }
        if ((a.disabilityRate ?? 0) > 0) {
          person.disabilityRate = a.disabilityRate ?? 0;
          person.employmentRestriction = a.employmentRestriction ?? false;
        }
        if (a.status === 'unemployed') person.activity = 'chomeur';
        if (a.status === 'student') person.activity = 'etudiant';
        if (a.status === 'retired') person.activity = 'retraite';
        if (a.status === 'none') person.activity = 'inactif';
        if (a.assEligible) person.assEligible = true;
        return person;
      }),
      children: household.childAges,
      married: household.married,
      tenure: household.tenure,
      rent: household.rent,
      zone: household.zone,
      engine: {
        employeeContributions: line('employeeContributions'),
        csgCrdsSalary: line('csgCrdsSalary'),
        employerContributions: line('employerContributions'),
        csgCrdsReplacement: line('csgCrdsReplacement'),
        microContributions: line('microContributions'),
        incomeTax: reference.incomeTaxes.reduce((s, t) => s + t, 0),
        parts: reference.taxParts,
        activityBonus: reference.activityBonus,
        familyAllowances: reference.familyAllowances,
        housingAid: reference.housingAid,
        ...reference.aids,
        healthCoverParticipation: reference.healthCover.monthlyParticipation * 12,
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
