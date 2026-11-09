// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * A household described by the user: one or two adults, each with a situation (employee,
 * apprentice, public servant, self-employed, micro-entrepreneur, student, unemployed,
 * retired or without activity), possibly a disability or an invalidity pension, and
 * children. Contributions and pensions are computed for each adult; income tax for each tax household (a married or PACS couple
 * is taxed jointly, an unmarried couple as two tax households, the children being
 * attached to the first adult); family benefits, housing aid, minimum incomes and the
 * prime d'activité for the whole household, as the CAF does (PLAN.MD §13.5, graph of
 * docs/audit-v1.1/foyer.md §2). The result has the shape of a profile result, so the
 * same views apply. Aids are computed as if the household claimed them all.
 */
import { consumptionTax } from './household/consumptionTax.ts';
import { type HousingZone } from './household/housing.ts';
import { type StudentGrantInput } from './household/studentGrant.ts';
import {
  highIncomeContribution,
  highIncomeMinimumTax,
  householdIncomeTax,
  taxParts,
  type TaxHousehold,
} from './household/incomeTax.ts';
import { householdLevies, type HouseholdInput } from './household/index.ts';
import type { MicroActivity, SelfEmployedScheme } from './household/input.ts';
import { grossForNetPension } from './household/pension.ts';
import { grossForNetPublic } from './household/publicAgent.ts';
import { grossForProfessionalIncome } from './household/selfEmployed.ts';
import { salaryContributions } from './household/socialContrib.ts';
import { bears, borneLevies, type BorneLevy } from './incidence.ts';
import { householdAids } from './householdAids.ts';
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
import { invertIncreasing, sum } from './math.ts';

export type AdultStatus =
  | 'salaried'
  | 'apprentice'
  | 'publicAgent'
  | 'selfEmployed'
  | 'farmer'
  | 'liberal'
  | 'micro'
  | 'student'
  | 'unemployed'
  | 'retired'
  | 'none';

/** Branch of the civil service: the State, or the CNRACL for the other two. */
export type PublicBranch = 'state' | 'territorial' | 'hospital';

export interface CustomAdult {
  status: AdultStatus;
  /**
   * Net monthly salary (employee, apprentice, public servant, student with a job), professional
   * income after contributions (self-employed) or pension; ignored for the other situations.
   */
  netMonthly: number;
  age: number;
  publicBranch?: PublicBranch;
  /** Share of bonuses in a public servant's gross pay; the branch average when absent. */
  bonusShare?: number | null;
  /** Liberal profession: SSI (non-regulated) or Cipav. */
  liberalScheme?: Extract<SelfEmployedScheme, 'liberal' | 'cipav'>;
  microActivity?: MicroActivity;
  /** Annual turnover of a micro-entrepreneur. */
  microTurnover?: number;
  /** Versement libératoire of the income tax. */
  microFlatTax?: boolean;
  /** Gross monthly unemployment benefit (ARE), when unemployed. */
  unemploymentMonthly?: number;
  /** Net monthly invalidity pension (not for a retiree). */
  invalidityMonthly?: number;
  /** Rate of incapacity, as a share (0.8 = 80 %); 0 without disability. */
  disabilityRate?: number;
  /** Restriction substantielle et durable d'accès à l'emploi (AAH from 50 to 79 %). */
  employmentRestriction?: boolean;
  /** Unemployed whose insurance rights have ended, with the required work history (ASS). */
  assEligible?: boolean;
  /** Student: parents' income and family situation for the bourse sur critères sociaux. */
  studentGrant?: StudentGrantInput | null;
}

/** Statuses whose amount is a net monthly salary. */
const SALARY_STATUSES: ReadonlySet<AdultStatus> = new Set([
  'salaried',
  'apprentice',
  'publicAgent',
  'student',
]);

export interface CustomHousehold {
  /** One or two adults. */
  adults: CustomAdult[];
  /** Married or PACS: taxed jointly. */
  married: boolean;
  /** Ages of the dependent children (under 20). */
  childAges: number[];
  /** Tenant, owner or housed for free. */
  tenure: 'tenant' | 'owner' | 'free';
  /** Monthly rent, charges excluded (tenant). */
  rent: number;
  /** Zone of the housing aids (1 to 3). */
  zone: HousingZone;
  /** Annual property tax, as on the tax notice (owner). */
  propertyTax: number;
  /** Single parent: the children's other parent pays no maintenance (allocation de soutien familial). */
  otherParentAbsent: boolean;
  /** Monthly maintenance received per child, below the support allowance. */
  maintenancePerChild: number;
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
  unemploymentBenefit: number;
  invalidityPension: number;
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
export function consumptionUnits(
  household: Pick<CustomHousehold, 'adults' | 'childAges'>,
  context: ProfileContext,
): number {
  const u = context.rules.consumptionUnits;
  const from14 = household.childAges.filter((age) => age >= 14).length;
  return (
    u.firstAdult +
    (household.adults.length - 1) * u.otherFrom14 +
    from14 * u.otherFrom14 +
    (household.childAges.length - from14) * u.childUnder14
  );
}

/** Ages of the children, valid and below the age limit of the family benefits. */
export function validChildAges(ages: readonly number[], maxAge: number): number[] {
  return ages
    .map((age) => Math.floor(age))
    .filter((age) => Number.isFinite(age) && age >= 0 && age < maxAge);
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

/** Self-employed scheme of a status with professional income, if any. */
function schemeOf(adult: CustomAdult): SelfEmployedScheme | null {
  if (adult.status === 'selfEmployed') return 'craft';
  if (adult.status === 'farmer') return 'farmer';
  if (adult.status === 'liberal') return adult.liberalScheme ?? 'liberal';
  return null;
}

function adultInput(adult: CustomAdult, context: ProfileContext, factors: ScenarioFactors) {
  const { rules } = context;
  const input = emptyInput(adult.age);
  const annual = Math.max(0, adult.netMonthly) * 12;
  const salaried = SALARY_STATUSES.has(adult.status) && annual > 0;
  if (salaried && adult.status === 'publicAgent') {
    const branch = adult.publicBranch ?? 'state';
    input.publicAgent = {
      regime: branch === 'state' ? 'state' : 'local',
      territorial: branch === 'territorial',
      bonusShare: Math.min(
        1,
        Math.max(0, adult.bonusShare ?? rules.publicSector.bonusShare[branch]),
      ),
    };
    input.grossSalary = grossForNetPublic(annual, input.publicAgent, rules);
  } else if (salaried && adult.status === 'apprentice') {
    input.apprentice = true;
    input.grossSalary = invertIncreasing(
      (gross) => salaryContributions(gross, rules, 1, true).netSalary,
      annual,
    );
  } else if (salaried) {
    input.student = adult.status === 'student';
    input.grossSalary = grossForNet(annual, rules);
  }
  const scheme = schemeOf(adult);
  if (scheme && annual > 0) {
    input.selfEmployedScheme = scheme;
    input.selfEmployedGrossIncome = grossForProfessionalIncome(annual, rules, scheme);
  }
  if (adult.status === 'micro') {
    input.micro = {
      activity: adult.microActivity ?? 'services',
      turnover: Math.max(0, adult.microTurnover ?? 0),
      flatTax: adult.microFlatTax ?? false,
    };
  }
  if (adult.status === 'unemployed' && !adult.assEligible) {
    input.unemploymentBenefit =
      Math.max(0, adult.unemploymentMonthly ?? 0) * 12 * factors.unemployment;
  }
  if (adult.status === 'retired' && annual > 0) {
    input.grossPension = grossForNetPension(annual, rules) * factors.pension;
  }
  const invalidity = Math.max(0, adult.invalidityMonthly ?? 0) * 12;
  if (adult.status !== 'retired' && invalidity > 0) {
    input.invalidityPension = grossForNetPension(invalidity, rules, false) * factors.disability;
  }
  input.disabilityCard = (adult.disabilityRate ?? 0) >= rules.incomeTax.disabilityCardMinRate;
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
  const childAges = validChildAges(household.childAges, rules.familyAllowances.maxAge);
  const children = childAges.length;
  const couple = adults.length === 2;

  // 1. Each adult: contributions, CSG, pension levies, taxable income as a single person.
  const people = adults.map((adult) => {
    const input = adultInput(adult, context, factors);
    const levies = householdLevies(input, rules);
    return { adult, input, levies };
  });

  // 2. Tax households: one for a single adult or a married couple, else one per adult.
  const joint = couple && household.married;
  const disabled = (members: typeof people) => members.filter((m) => m.input.disabilityCard).length;
  const foyers: { members: typeof people; tax: TaxHousehold }[] =
    !couple || joint
      ? [
          {
            members: people,
            tax: { joint, children, singleParent: !couple, disabledAdults: disabled(people) },
          },
        ]
      : people.map((p, i) => ({
          members: [p],
          tax: {
            joint: false,
            children: i === 0 ? children : 0,
            singleParent: false,
            disabledAdults: disabled([p]),
          },
        }));
  const taxes = foyers.map(({ members, tax }) => {
    const taxableIncome = sum(members.map((m) => m.levies.incomeTax.taxableIncome));
    const ir = householdIncomeTax(taxableIncome, tax, rules);
    const cehr = highIncomeContribution(taxableIncome, rules, tax);
    const cdhr = highIncomeMinimumTax(taxableIncome, ir.tax + cehr, rules, tax);
    return { taxableIncome, ir, cehr, cdhr, parts: taxParts(tax, rules) };
  });
  const flatIncomeTax = sum(people.map((p) => p.levies.selfEmployed.flatIncomeTax));
  const fiscalIncome =
    sum(taxes.map((t) => t.taxableIncome)) +
    sum(people.map((p) => p.levies.selfEmployed.flatTaxedIncome));
  const incomeTaxTotal = sum(taxes.map((t) => t.ir.tax));
  const cehrTotal = sum(taxes.map((t) => t.cehr));
  const cdhrTotal = sum(taxes.map((t) => t.cdhr));

  // 3–7. Family benefits, minimum incomes, housing aid, prime d'activité and other aids.
  const result = householdAids(
    {
      members: people.map((p) => ({
        input: p.input,
        levies: p.levies,
        age: p.adult.age,
        student: p.adult.status === 'student',
        retired: p.adult.status === 'retired',
        assEligible: p.adult.status === 'unemployed' && (p.adult.assEligible ?? false),
        disabilityRate: p.adult.disabilityRate ?? 0,
        employmentRestriction: p.adult.employmentRestriction ?? false,
        studentGrant: p.adult.studentGrant ?? null,
      })),
      childAges,
      tenure: household.tenure,
      rent: household.rent,
      zone: household.zone,
      otherParentAbsent: household.otherParentAbsent,
      maintenancePerChild: household.maintenancePerChild,
      fiscalIncome,
    },
    rules,
    factors,
  );
  const { aids, activityBonus } = result;
  const allowances = result.familyAllowances;
  const housingAidAnnual = result.housingAid;
  const aidsTotal = sum(Object.values(aids));

  // 8. Disposable income and consumption (pattern of the closest reference standard of living).
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
    housingAidAnnual +
    aidsTotal +
    activityBonus -
    incomeTaxTotal -
    cehrTotal -
    cdhrTotal -
    propertyTax;
  const units = consumptionUnits({ adults, childAges }, context);
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

  // 9. Levies borne: each adult's lines, then the household-level ones.
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

  // 10. Public services: every member counts; children take the first adult's age key.
  const keys = [...adults.map((a) => [ageKey(a.age)]), ...childAges.map(() => [ageKey(first.age)])];
  const inKind = sumInKind(
    keys.map((k) =>
      inKindReceived(context.groupAmounts, context.allocation, context.population, k),
    ),
  );

  const pension = sum(people.map((p) => p.input.grossPension));
  const unemploymentBenefit = sum(people.map((p) => p.levies.unemployment.gross));
  const invalidityPension = sum(people.map((p) => p.levies.invalidity.gross));
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
    personalIncomeTaxes: incomeTaxTotal + cehrTotal + cdhrTotal + flatIncomeTax,
    benefits:
      activityBonus +
      pension +
      allowances +
      unemploymentBenefit +
      invalidityPension +
      housingAidAnnual +
      aidsTotal,
    pension,
    activityBonus,
    housingAid: housingAidAnnual,
    inKind,
    disposableIncome: disposable,
    consumption: consumptionAmount,
    fiscalIncome,
    economicIncome:
      sum(
        people.map(
          (p) =>
            p.input.grossSalary +
            p.levies.selfEmployed.grossIncome +
            p.input.grossPension +
            p.levies.unemployment.gross +
            p.levies.invalidity.gross,
        ),
      ) + employerBorne,
    taxParts: taxes.map((t) => t.parts),
    incomeTaxes: taxes.map((t) => t.ir.tax),
    familyAllowances: allowances,
    unemploymentBenefit,
    invalidityPension,
    aids,
    healthCover: result.healthCover,
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
