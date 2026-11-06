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
  type IncomeTaxResult,
} from './incomeTax.ts';
import type { HouseholdInput } from './input.ts';
import { propertyTax } from './propertyTax.ts';
import { pensionOnly, type PensionResult } from './pension.ts';
import { selfEmployedContributions, type SelfEmployedResult } from './selfEmployed.ts';
import { salaryContributions, type SalaryResult } from './socialContrib.ts';
import { wealthTax } from './wealthTax.ts';

export type { HouseholdInput } from './input.ts';

export interface HouseholdLevies {
  salary: SalaryResult;
  selfEmployed: SelfEmployedResult;
  pension: PensionResult;
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

export function householdLevies(input: HouseholdInput, rules: Rules): HouseholdLevies {
  const salary = salaryContributions(input.grossSalary, rules, input.hoursRatio, input.apprentice);
  const selfEmployed = selfEmployedContributions(input.selfEmployedGrossIncome, rules);
  const pension = pensionOnly(input.grossPension, rules);
  const capital = capitalIncome(input, rules);
  const tax = incomeTax(
    {
      taxableSalary: salary.taxableSalary,
      apprentice: input.apprentice,
      selfEmployedIncome: selfEmployed.taxableIncome,
      taxablePension: pension.taxable,
      age: input.age,
      rentalTaxableIncome: capital.rentalTaxableIncome,
      deductibleCsg: capital.deductibleCsg,
    },
    rules,
  );
  const referenceIncome = tax.taxableIncome + capital.financialIncome;
  const cehr = highIncomeContribution(referenceIncome, rules);
  const cdhr = highIncomeMinimumTax(
    referenceIncome,
    tax.tax + cehr + capital.flatTaxIncomePart,
    rules,
  );
  const consumption = consumptionTax(input.consumption, rules);
  const monthlyBonus = activityBonus(
    {
      monthlyEarnings: (salary.netSalary + selfEmployed.netIncome) / 12,
      // Pensions and capital income count as resources of the prime d'activité.
      otherMonthlyResources:
        (pension.net + capital.rentalTaxableIncome + capital.financialIncome) / 12,
      housingFlatRateApplies: input.housingFlatRateApplies,
      apprentice: input.apprentice,
    },
    rules,
  );
  return {
    salary,
    selfEmployed,
    pension,
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
