// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * All levies paid and cash benefits received by one person, before the incidence
 * assumptions (incidence.ts) decide which of them the household bears.
 */
import type { Rules } from '../rules.ts';
import { activityBonus } from './benefits.ts';
import { capitalIncome, type CapitalResult } from './capitalTax.ts';
import { consumptionTax } from './consumptionTax.ts';
import {
  highIncomeContribution,
  highIncomeMinimumTax,
  incomeTax,
  professionalExpensesAllowance,
  SINGLE_PERSON,
  type IncomeTaxResult,
} from './incomeTax.ts';
import type { HouseholdInput } from './input.ts';
import { propertyTax } from './propertyTax.ts';
import { microContributions } from './micro.ts';
import { pensionOnly, type PensionResult } from './pension.ts';
import { publicAgentContributions } from './publicAgent.ts';
import { unemploymentOnly, type ReplacementResult } from './replacement.ts';
import { selfEmployedContributions, type SelfEmployedResult } from './selfEmployed.ts';
import { salaryContributions, type SalaryResult } from './socialContrib.ts';
import { wealthTax } from './wealthTax.ts';

export type { HouseholdInput } from './input.ts';

export interface HouseholdLevies {
  salary: SalaryResult;
  selfEmployed: SelfEmployedResult;
  pension: PensionResult;
  /** Unemployment insurance benefit (ARE). */
  unemployment: ReplacementResult;
  /** Invalidity pension: pension levies without the contribution on complementary pensions. */
  invalidity: PensionResult;
  capital: CapitalResult;
  incomeTax: IncomeTaxResult;
  /** Revenu fiscal de référence (simplified): taxable income + income taxed at the flat rate. */
  referenceIncome: number;
  highIncomeContribution: number;
  highIncomeMinimumTax: number;
  wealthTax: number;
  vat: number;
  energyExcise: number;
  propertyTax: number;
  /** Annual prime d'activité (a benefit, not a levy). */
  activityBonus: number;
}

/**
 * Monthly earnings from work counted by the prime d'activité: net salary and net
 * self-employed income; for a micro-entrepreneur, turnover minus the flat allowance.
 */
export function activityEarnings(levies: Pick<HouseholdLevies, 'salary' | 'selfEmployed'>): number {
  const selfEmployed = levies.selfEmployed.micro
    ? levies.selfEmployed.grossIncome
    : levies.selfEmployed.netIncome;
  return (levies.salary.netSalary + selfEmployed) / 12;
}

/**
 * Annual net income from work as declared (revenu net catégoriel): taxable salary after the
 * 10 % allowance, taxable self-employed income and micro income taxed at the flat rate.
 */
export function categoricalWorkIncome(
  levies: Pick<HouseholdLevies, 'salary' | 'selfEmployed'>,
  rules: Rules,
): number {
  const { salary, selfEmployed } = levies;
  return (
    salary.taxableSalary -
    professionalExpensesAllowance(salary.taxableSalary, rules) +
    selfEmployed.taxableIncome +
    selfEmployed.flatTaxedIncome
  );
}

export function householdLevies(input: HouseholdInput, rules: Rules): HouseholdLevies {
  const salary = input.publicAgent
    ? publicAgentContributions(input.grossSalary, input.publicAgent, rules)
    : salaryContributions(input.grossSalary, rules, input.hoursRatio, input.apprentice);
  const selfEmployed = input.micro
    ? microContributions(input.micro, rules)
    : selfEmployedContributions(
        input.selfEmployedGrossIncome,
        rules,
        input.selfEmployedScheme ?? 'craft',
      );
  const pension = pensionOnly(input.grossPension, rules);
  // The CSG band of a replacement income depends on the person's other income.
  const workIncome = categoricalWorkIncome({ salary, selfEmployed }, rules);
  const unemployment = unemploymentOnly(input.unemploymentBenefit ?? 0, rules, workIncome);
  const invalidity = pensionOnly(
    input.invalidityPension ?? 0,
    rules,
    workIncome + unemployment.taxable - professionalExpensesAllowance(unemployment.taxable, rules),
    false,
  );
  const capital = capitalIncome(input, rules);
  const tax = incomeTax(
    {
      taxableSalary: salary.taxableSalary,
      apprentice: input.apprentice,
      taxableReplacementIncome: unemployment.taxable,
      selfEmployedIncome: selfEmployed.taxableIncome,
      taxablePension: pension.taxable + invalidity.taxable,
      age: input.age,
      disabilityCard: input.disabilityCard ?? false,
      rentalTaxableIncome: capital.rentalTaxableIncome,
      deductibleCsg: capital.deductibleCsg,
    },
    rules,
    { ...SINGLE_PERSON, disabledAdults: input.disabilityCard ? 1 : 0 },
  );
  const referenceIncome =
    tax.taxableIncome + capital.financialIncome + selfEmployed.flatTaxedIncome;
  const cehr = highIncomeContribution(referenceIncome, rules);
  const cdhr = highIncomeMinimumTax(
    referenceIncome,
    tax.tax + cehr + capital.flatTaxIncomePart + selfEmployed.flatIncomeTax,
    rules,
  );
  const consumption = consumptionTax(input.consumption, rules);
  const monthlyBonus = activityBonus(
    {
      monthlyEarnings: activityEarnings({ salary, selfEmployed }),
      // Pensions, replacement and capital income count as resources of the prime d'activité.
      otherMonthlyResources:
        (pension.net +
          unemployment.net +
          invalidity.net +
          capital.rentalTaxableIncome +
          capital.financialIncome) /
        12,
      housingFlatRateApplies: input.housingFlatRateApplies,
      minimumEarnings: input.apprentice || (input.student ?? false),
    },
    rules,
  );
  return {
    salary,
    selfEmployed,
    pension,
    unemployment,
    invalidity,
    capital,
    incomeTax: tax,
    referenceIncome,
    highIncomeContribution: cehr,
    highIncomeMinimumTax: cdhr,
    wealthTax: wealthTax(input.wealth, rules),
    vat: consumption.vat,
    energyExcise: consumption.energyExcise,
    propertyTax: propertyTax(input),
    activityBonus: monthlyBonus * 12,
  };
}
