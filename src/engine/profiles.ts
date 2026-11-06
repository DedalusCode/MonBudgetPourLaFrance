// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Balance of each household profile (PLAN.MD §5.3 and §7.2): levies borne, cash
 * benefits, public services received, fiscal and economic income. The same functions
 * compute the reference (law in force) and a scenario (its rules and spending).
 */
import { householdLevies, type HouseholdInput, type HouseholdLevies } from './household/index.ts';
import { grossForNetPension } from './household/pension.ts';
import { grossForProfessionalIncome } from './household/selfEmployed.ts';
import { annualMinimumWage, salaryContributions } from './household/socialContrib.ts';
import { borneLevies, type BorneLevy } from './incidence.ts';
import { inKindReceived, type Allocation, type InKindResult } from './inKind.ts';
import { invertIncreasing, sum } from './math.ts';
import type { Resolved, Rules } from './rules.ts';
import type { ConsumptionEntry, Profile } from './types.ts';

export type ProfileData = Resolved<Profile>;
export type ConsumptionData = Resolved<ConsumptionEntry>;

/** Annual gross salary of a profile. */
export function grossSalaryFor(salary: ProfileData['salary'], rules: Rules): number {
  switch (salary.kind) {
    case 'none':
      return 0;
    case 'minimumWage':
      return annualMinimumWage(rules) * hoursRatioOf(salary, rules);
    case 'targetNetMonthly':
      return grossForNet(salary.amount * 12, rules);
    case 'apprentice':
      return salary.smicShare * annualMinimumWage(rules);
  }
}

/** Contract hours / legal full time. */
export function hoursRatioOf(salary: ProfileData['salary'], rules: Rules): number {
  return salary.kind === 'minimumWage' && salary.weeklyHours !== undefined
    ? salary.weeklyHours / rules.minimumWage.legalWeeklyHours
    : 1;
}

/** Gross salary whose net salary is `annualNet`. */
export function grossForNet(annualNet: number, rules: Rules): number {
  return invertIncreasing((gross) => salaryContributions(gross, rules).netSalary, annualNet);
}

/**
 * How a scenario scales what a household receives or pays outside the tax rules: cash
 * benefits follow the spending that funds them (COFOG groups), the property tax its lever.
 */
export interface ScenarioFactors {
  /** Prime d'activité (COFOG 10.7). */
  activityBonus: number;
  /** Retirement pensions (COFOG 10.2). */
  pension: number;
  /** Housing aid (COFOG 10.6). */
  housingAid: number;
  /** Allocations familiales (COFOG 10.4), for the household described by the user. */
  family: number;
  propertyTax: number;
}

export const NO_CHANGE: ScenarioFactors = {
  activityBonus: 1,
  pension: 1,
  housingAid: 1,
  family: 1,
  propertyTax: 1,
};

export function householdInput(
  profile: ProfileData,
  consumption: ConsumptionData,
  consumptionAmount: number,
  rules: Rules,
  factors: ScenarioFactors = NO_CHANGE,
): HouseholdInput {
  const { incomes, wealth } = profile;
  return {
    grossSalary: grossSalaryFor(profile.salary, rules),
    hoursRatio: hoursRatioOf(profile.salary, rules),
    apprentice: profile.salary.kind === 'apprentice',
    selfEmployedGrossIncome:
      profile.selfEmployment.kind === 'targetProfessionalIncome'
        ? grossForProfessionalIncome(profile.selfEmployment.amount, rules)
        : 0,
    grossPension:
      profile.pension.kind === 'targetNetMonthly'
        ? grossForNetPension(profile.pension.amount * 12, rules) * factors.pension
        : 0,
    age: profile.age,
    rentalIncome: incomes.rentalIncome,
    rentalDeductibleCharges: incomes.rentalIncome * profile.rentalChargesRate,
    dividends: incomes.dividends,
    interest: incomes.interest,
    realizedCapitalGains: incomes.realizedCapitalGains,
    retainedEarnings: incomes.retainedEarnings,
    wealth,
    consumption: {
      annualAmount: consumptionAmount,
      vatShares: consumption.vatShares,
      energyShare: consumption.energyShare,
    },
    propertyTax: profile.propertyTax * factors.propertyTax,
    housingFlatRateApplies: profile.tenure === 'owner',
  };
}

/** Income left after direct levies, plus cash benefits (consumption taxes excluded). */
export function disposableIncome(input: HouseholdInput, levies: HouseholdLevies): number {
  const { salary, capital } = levies;
  const income =
    salary.netSalary +
    levies.selfEmployed.netIncome +
    levies.pension.net +
    levies.activityBonus +
    (input.rentalIncome - input.rentalDeductibleCharges) +
    capital.financialIncome;
  const directTaxes =
    levies.incomeTax.tax +
    levies.highIncomeContribution +
    levies.highIncomeMinimumTax +
    capital.flatTaxIncomePart +
    capital.socialLeviesFinancial +
    capital.socialLeviesRental +
    levies.wealthTax +
    levies.propertyTax;
  return income - directTaxes;
}

const PERSONAL_INCOME_TAXES = new Set([
  'incomeTax',
  'highIncomeContribution',
  'highIncomeMinimumTax',
  'flatTax',
  'capitalSocialLevies',
]);

function scaleBenefits(levies: HouseholdLevies, factor: number): HouseholdLevies {
  return factor === 1 ? levies : { ...levies, activityBonus: levies.activityBonus * factor };
}

export interface ProfileContext {
  rules: Rules;
  allocation: Allocation;
  /** Spending by COFOG group code, in billions of euros. */
  groupAmounts: Record<string, number>;
  population: number;
}

export interface ProfileResult {
  /** A reference profile, or the household described by the user. */
  id: ProfileData['id'] | 'household';
  input: HouseholdInput;
  levies: HouseholdLevies;
  borne: BorneLevy[];
  totalLevies: number;
  /** Personal taxes on income (IR, CEHR, CDHR, PFU, social levies on capital), to compare with fiscal income. */
  personalIncomeTaxes: number;
  /**
   * Cash benefits received: retirement pension (gross), prime d'activité, housing aid and,
   * for the household described by the user, allocations familiales.
   */
  benefits: number;
  pension: number;
  activityBonus: number;
  housingAid: number;
  /** Allocations familiales (household described by the user only). */
  familyAllowances?: number;
  inKind: InKindResult;
  disposableIncome: number;
  consumption: number;
  /** Revenu fiscal de référence (simplified). */
  fiscalIncome: number;
  /** Income before any levy: super-gross salary, capital income, retained profits before corporate tax. */
  economicIncome: number;
}

/** Result of a reference profile (its id is one of profiles.json). */
export type ReferenceProfileResult = ProfileResult & { id: ProfileData['id'] };

export function computeProfile(
  profile: ProfileData,
  consumption: ConsumptionData,
  context: ProfileContext,
  factors: ScenarioFactors = NO_CHANGE,
): ReferenceProfileResult {
  const housingAid = profile.housingAid * 12 * factors.housingAid;
  const { rules } = context;
  // First pass without consumption: consumption depends on disposable income,
  // which does not depend on consumption taxes.
  const firstInput = householdInput(profile, consumption, 0, rules, factors);
  const firstLevies = scaleBenefits(householdLevies(firstInput, rules), factors.activityBonus);
  const disposable = disposableIncome(firstInput, firstLevies) + housingAid;
  const consumptionAmount =
    consumption.annualAmount ?? Math.max(0, disposable * (1 - profile.savingsRate));

  const input = householdInput(profile, consumption, consumptionAmount, rules, factors);
  const levies = scaleBenefits(householdLevies(input, rules), factors.activityBonus);
  const borne = borneLevies(input, levies, rules);
  const totalLevies = sum(borne.map((l) => l.amount));
  const personalIncomeTaxes = sum(
    borne.filter((l) => PERSONAL_INCOME_TAXES.has(l.id)).map((l) => l.amount),
  );
  const borneAmount = (id: string) => borne.find((l) => l.id === id)?.amount ?? 0;

  const inKind = inKindReceived(
    context.groupAmounts,
    context.allocation,
    context.population,
    profile.inKindKeys,
  );

  // Income before any levy: the employer contributions and the corporate tax borne by
  // the household (0 when not attributed to it) are part of it.
  const economicIncome =
    input.grossSalary +
    borneAmount('employerContributions') +
    input.selfEmployedGrossIncome +
    input.grossPension +
    (input.rentalIncome - input.rentalDeductibleCharges) +
    levies.capital.financialIncome +
    input.retainedEarnings +
    borneAmount('corporateTax');

  return {
    id: profile.id,
    input,
    levies,
    borne,
    totalLevies,
    personalIncomeTaxes,
    benefits: levies.activityBonus + input.grossPension + housingAid,
    pension: input.grossPension,
    activityBonus: levies.activityBonus,
    housingAid,
    inKind,
    disposableIncome: disposable,
    consumption: consumptionAmount,
    fiscalIncome: levies.referenceIncome,
    economicIncome,
  };
}
