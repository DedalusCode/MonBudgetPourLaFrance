// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * A household described by the user: one or two adults (salaried, self-employed
 * craftsman, retired or without income) and children. Contributions and pensions are
 * computed for each adult; income tax for each tax household (a married or PACS couple
 * is taxed jointly, an unmarried couple as two tax households, the children being
 * attached to the first adult); prime d'activité and allocations familiales for the
 * whole household, as the CAF does. The result has the shape of a profile result, so
 * the same views apply.
 */
import { householdActivityBonus } from './household/benefits.ts';
import { consumptionTax } from './household/consumptionTax.ts';
import { familyAllowances } from './household/family.ts';
import {
  highIncomeContribution,
  highIncomeMinimumTax,
  householdIncomeTax,
  taxParts,
  type TaxHousehold,
} from './household/incomeTax.ts';
import { householdLevies, type HouseholdInput } from './household/index.ts';
import { grossForNetPension } from './household/pension.ts';
import { grossForProfessionalIncome } from './household/selfEmployed.ts';
import { bears, borneLevies, type BorneLevy } from './incidence.ts';
import { inKindReceived, type InKindResult } from './inKind.ts';
import {
  disposableIncome,
  grossForNet,
  type ConsumptionData,
  NO_CHANGE,
  type ProfileContext,
  type ProfileResult,
  type ScenarioFactors,
} from './profiles.ts';
import { sum } from './math.ts';

export type AdultStatus = 'salaried' | 'selfEmployed' | 'retired' | 'none';

export interface CustomAdult {
  status: AdultStatus;
  /**
   * Net monthly salary, professional income after contributions (self-employed) or pension;
   * ignored without income.
   */
  netMonthly: number;
  age: number;
}

export interface CustomHousehold {
  /** One or two adults. */
  adults: CustomAdult[];
  /** Married or PACS: taxed jointly. */
  married: boolean;
  /** Dependent children under 20. */
  children: number;
  /** Of which aged 14 or more. */
  childrenFrom14: number;
  tenure: 'tenant' | 'owner';
  /** Annual property tax, as on the tax notice (owner). */
  propertyTax: number;
}

/** Consumption pattern of a reference profile, chosen by standard of living. */
export interface ConsumptionPattern {
  /** Disposable income per consumption unit of the reference profile. */
  standardOfLiving: number;
  consumption: ConsumptionData;
  savingsRate: number;
}

export interface CustomHouseholdResult extends ProfileResult {
  /** Parts of each tax household (one, or two for an unmarried couple). */
  taxParts: number[];
  /** Income tax of each tax household, after the décote. */
  incomeTaxes: number[];
  familyAllowances: number;
  consumptionUnits: number;
}

/** In-kind key of an adult by age, as in inKindAllocation.json. */
export function ageKey(age: number): string {
  if (age < 30) return 'age18to29';
  if (age < 40) return 'age30to39';
  if (age < 50) return 'age40to49';
  if (age < 65) return 'age50to64';
  return 'age65plus';
}

/** Consumption units of the INSEE scale (children under 14 count 0.3, others 0.5). */
export function consumptionUnits(household: CustomHousehold, context: ProfileContext): number {
  const u = context.rules.consumptionUnits;
  const childrenFrom14 = Math.min(household.childrenFrom14, household.children);
  return (
    u.firstAdult +
    (household.adults.length - 1) * u.otherFrom14 +
    childrenFrom14 * u.otherFrom14 +
    (household.children - childrenFrom14) * u.childUnder14
  );
}

function emptyInput(age: number): HouseholdInput {
  return {
    grossSalary: 0,
    hoursRatio: 1,
    selfEmployedGrossIncome: 0,
    grossPension: 0,
    age,
    rentalIncome: 0,
    rentalDeductibleCharges: 0,
    dividends: 0,
    interest: 0,
    realizedCapitalGains: 0,
    retainedEarnings: 0,
    wealth: { mainResidence: 0, rentalProperty: 0, financial: 0, business: 0 },
    consumption: {
      annualAmount: 0,
      vatShares: { standard: 0, intermediate: 0, reduced: 0, superReduced: 0, exempt: 1 },
      energyShare: 0,
    },
    propertyTax: 0,
    housingFlatRateApplies: false,
    apprentice: false,
  };
}

function adultInput(adult: CustomAdult, context: ProfileContext, pensionFactor: number) {
  const input = emptyInput(adult.age);
  const annual = Math.max(0, adult.netMonthly) * 12;
  if (adult.status === 'salaried' && annual > 0) {
    input.grossSalary = grossForNet(annual, context.rules);
  }
  if (adult.status === 'selfEmployed' && annual > 0) {
    input.selfEmployedGrossIncome = grossForProfessionalIncome(annual, context.rules);
  }
  if (adult.status === 'retired' && annual > 0) {
    input.grossPension = grossForNetPension(annual, context.rules) * pensionFactor;
  }
  return input;
}

function sumInKind(results: InKindResult[]): InKindResult {
  const add = (a: Record<string, number>, b: Record<string, number>) => {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
    return out;
  };
  return results.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      byGroup: add(acc.byGroup, r.byGroup),
      byDivision: add(acc.byDivision, r.byDivision),
    }),
    { total: 0, byGroup: {}, byDivision: {} },
  );
}

/** Lines replaced at household level: income taxes, consumption taxes, property tax. */
const HOUSEHOLD_LINES = new Set([
  'incomeTax',
  'highIncomeContribution',
  'highIncomeMinimumTax',
  'vat',
  'energyExcise',
  'propertyTax',
]);

export function computeCustomHousehold(
  household: CustomHousehold,
  context: ProfileContext,
  patterns: ConsumptionPattern[],
  factors: ScenarioFactors = NO_CHANGE,
): CustomHouseholdResult {
  const { rules } = context;
  const adults = household.adults.slice(0, 2);
  const first = adults[0];
  if (!first) throw new Error('A household needs at least one adult');
  const children = Math.max(0, Math.floor(household.children));
  const childrenFrom14 = Math.min(children, Math.max(0, Math.floor(household.childrenFrom14)));

  // 1. Each adult: contributions, CSG, pension levies, taxable income as a single person.
  const people = adults.map((adult) => {
    const input = adultInput(adult, context, factors.pension);
    const levies = householdLevies(input, rules);
    return { adult, input, levies };
  });

  // 2. Tax households: one for a single adult or a married couple, else one per adult.
  const joint = adults.length === 2 && household.married;
  const foyers: { members: typeof people; tax: TaxHousehold }[] =
    adults.length === 1 || joint
      ? [{ members: people, tax: { joint, children, singleParent: adults.length === 1 } }]
      : people.map((p, i) => ({
          members: [p],
          tax: { joint: false, children: i === 0 ? children : 0, singleParent: false },
        }));
  const taxes = foyers.map(({ members, tax }) => {
    const taxableIncome = sum(members.map((m) => m.levies.incomeTax.taxableIncome));
    const ir = householdIncomeTax(taxableIncome, tax, rules);
    const cehr = highIncomeContribution(taxableIncome, rules, tax);
    const cdhr = highIncomeMinimumTax(taxableIncome, ir.tax + cehr, rules, tax);
    return { taxableIncome, ir, cehr, cdhr, parts: taxParts(tax, rules) };
  });
  const fiscalIncome = sum(taxes.map((t) => t.taxableIncome));
  const incomeTaxTotal = sum(taxes.map((t) => t.ir.tax));
  const cehrTotal = sum(taxes.map((t) => t.cehr));
  const cdhrTotal = sum(taxes.map((t) => t.cdhr));

  // 3. Family benefits, for the whole household (the CAF ignores marriage).
  const allowances =
    familyAllowances(
      {
        children,
        childrenAboveAge: childrenFrom14,
        annualIncome: fiscalIncome,
      },
      rules,
    ) *
    12 *
    factors.family;
  const activityBonus =
    householdActivityBonus(
      {
        monthlyEarnings: people.map(
          (p) => (p.levies.salary.netSalary + p.levies.selfEmployed.netIncome) / 12,
        ),
        children,
        // Family allowances and pensions count as resources of the prime d'activité.
        otherMonthlyResources: (allowances + sum(people.map((p) => p.levies.pension.net))) / 12,
        housingFlatRateApplies: household.tenure === 'owner',
      },
      rules,
    ) *
    12 *
    factors.activityBonus;

  // 4. Disposable income and consumption (pattern of the closest reference standard of living).
  const propertyTax =
    household.tenure === 'owner' ? Math.max(0, household.propertyTax) * factors.propertyTax : 0;
  // Each adult's income after social levies; income taxes and benefits are household-level.
  const disposable =
    sum(
      people.map((p) =>
        disposableIncome(p.input, {
          ...p.levies,
          incomeTax: { ...p.levies.incomeTax, tax: 0 },
          highIncomeContribution: 0,
          highIncomeMinimumTax: 0,
          activityBonus: 0,
        }),
      ),
    ) +
    allowances +
    activityBonus -
    incomeTaxTotal -
    cehrTotal -
    cdhrTotal -
    propertyTax;
  const units = consumptionUnits({ ...household, adults, children, childrenFrom14 }, context);
  const pattern = closestPattern(patterns, disposable / units);
  const consumptionAmount = Math.max(0, disposable * (1 - pattern.savingsRate));
  const consumption = consumptionTax(
    {
      annualAmount: consumptionAmount,
      vatShares: pattern.consumption.vatShares,
      energyShare: pattern.consumption.energyShare,
    },
    rules,
  );

  // 5. Levies borne: each adult's lines, then the household-level ones.
  const totals = new Map<string, number>();
  for (const p of people) {
    for (const line of borneLevies(p.input, p.levies, rules)) {
      if (!HOUSEHOLD_LINES.has(line.id)) {
        totals.set(line.id, (totals.get(line.id) ?? 0) + line.amount);
      }
    }
  }
  totals.set('incomeTax', incomeTaxTotal);
  totals.set('highIncomeContribution', cehrTotal);
  totals.set('highIncomeMinimumTax', cdhrTotal);
  totals.set('vat', bears(rules, 'vat', 'consumer') ? consumption.vat : 0);
  totals.set(
    'energyExcise',
    bears(rules, 'energyExcise', 'consumer') ? consumption.energyExcise : 0,
  );
  totals.set('propertyTax', bears(rules, 'propertyTax', 'owner') ? propertyTax : 0);
  const borne: BorneLevy[] = [...totals].map(([id, amount]) => ({ id, amount }));
  const totalLevies = sum(borne.map((l) => l.amount));

  // 6. Public services: every member counts; children take the first adult's age key.
  const keys = [
    ...adults.map((a) => [ageKey(a.age)]),
    ...Array.from({ length: children }, () => [ageKey(first.age)]),
  ];
  const inKind = sumInKind(
    keys.map((k) =>
      inKindReceived(context.groupAmounts, context.allocation, context.population, k),
    ),
  );

  const pension = sum(people.map((p) => p.input.grossPension));
  const employerBorne = totals.get('employerContributions') ?? 0;
  const [firstPerson] = people;
  if (!firstPerson) throw new Error('A household needs at least one adult'); // narrows the type
  return {
    id: 'household',
    // A profile result describes one person: the first adult stands for the household
    // there, while every household total (borne levies, benefits...) covers all members.
    input: firstPerson.input,
    levies: firstPerson.levies,
    borne,
    totalLevies,
    personalIncomeTaxes: incomeTaxTotal + cehrTotal + cdhrTotal,
    benefits: activityBonus + pension + allowances,
    pension,
    activityBonus,
    housingAid: 0,
    inKind,
    disposableIncome: disposable,
    consumption: consumptionAmount,
    fiscalIncome,
    economicIncome:
      sum(
        people.map(
          (p) => p.input.grossSalary + p.input.selfEmployedGrossIncome + p.input.grossPension,
        ),
      ) + employerBorne,
    taxParts: taxes.map((t) => t.parts),
    incomeTaxes: taxes.map((t) => t.ir.tax),
    familyAllowances: allowances,
    consumptionUnits: units,
  };
}

export function closestPattern(
  patterns: ConsumptionPattern[],
  standardOfLiving: number,
): ConsumptionPattern {
  const [best] = [...patterns].sort(
    (a, b) =>
      Math.abs(a.standardOfLiving - standardOfLiving) -
      Math.abs(b.standardOfLiving - standardOfLiving),
  );
  if (!best) throw new Error('No consumption pattern');
  return best;
}
