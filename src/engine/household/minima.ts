// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Minimum incomes (PLAN.MD §13.5): RSA, AAH, ASPA and ASS. Each function takes resources
 * already counted by the caller (the household graph decides which income each one counts)
 * and returns a monthly amount, or an annual one for the ASPA. Resources are those of the
 * simulated year: the reference periods (quarter, twelve months, year N-2) are not modelled.
 */
import type { Rules } from '../rules.ts';
import { scaledLumpSum } from './benefits.ts';

/** Monthly housing flat rate of the RSA and the prime d'activité, by household size. */
export function flatRateFor(
  persons: number,
  amounts: { one: number; two: number; threeOrMore: number },
): number {
  if (persons <= 1) return amounts.one;
  if (persons === 2) return amounts.two;
  return amounts.threeOrMore;
}

export interface RsaInput {
  /** Adults of the household (1 or 2). */
  adults: number;
  /** Dependent children. */
  children: number;
  /** Single parent entitled to the increased amount (RSA majoré). */
  singleParentIncrease: boolean;
  /** Monthly resources counted by the RSA (CASF R262-6 to R262-11). */
  monthlyResources: number;
  /** Owner, housed for free or receiving a housing aid (CASF R262-9 and R262-10). */
  housingFlatRateApplies: boolean;
}

/** Lump sum of the RSA for a household (CASF R262-1). */
export function rsaLumpSum(
  input: Omit<RsaInput, 'monthlyResources' | 'housingFlatRateApplies'>,
  rules: Rules,
): number {
  const r = rules.socialBenefits.rsa;
  if (input.singleParentIncrease) {
    return r.lumpSum * (r.singleParentRate + input.children * r.singleParentPerChildRate);
  }
  return scaledLumpSum(
    r.lumpSum,
    {
      secondPersonRate: r.secondPersonRate,
      additionalPersonRate: r.additionalPersonRate,
      thirdChildRate: r.thirdDependentRate,
    },
    input.adults,
    input.children,
  );
}

/** Monthly RSA: lump sum − resources − housing flat rate, not paid below the minimum. */
export function rsaAmount(input: RsaInput, rules: Rules): number {
  const r = rules.socialBenefits.rsa;
  const housing = input.housingFlatRateApplies
    ? flatRateFor(input.adults + input.children, r.housingFlatRate)
    : 0;
  const amount = rsaLumpSum(input, rules) - input.monthlyResources - housing;
  return amount < r.minimumPayment ? 0 : amount;
}

export interface AahInput {
  /** Rate of incapacity, as a share. */
  disabilityRate: number;
  /** Restriction substantielle et durable d'accès à l'emploi (needed from 50 to 79 %). */
  employmentRestriction: boolean;
  age: number;
  /** Retired: below 80 %, the AAH stops at the retirement age (the ASPA takes over). */
  retired: boolean;
  /** Dependent children (each raises the ceiling by 50 %). */
  children: number;
  /** Annual net earnings from work (revenu net catégoriel), before the AAH allowance. */
  annualEarnings: number;
  /** Other annual net income of the beneficiary (capital, replacement income...). */
  annualOtherIncome: number;
  /** Monthly net pension (invalidity or retirement): the AAH tops it up to the maximum. */
  monthlyPension: number;
}

/** Whether a person is entitled to the AAH, whatever the resources. */
export function aahEligible(
  input: Pick<AahInput, 'disabilityRate' | 'employmentRestriction' | 'age' | 'retired'>,
  rules: Rules,
): boolean {
  const a = rules.socialBenefits.aah;
  if (input.age < a.minAge) return false;
  if (input.disabilityRate >= a.fullRate) return true;
  return input.disabilityRate >= a.partialRate && input.employmentRestriction && !input.retired;
}

/** Earnings counted by the AAH after the allowance of CSS D821-9 (annual amounts). */
export function aahCountedEarnings(annualEarnings: number, rules: Rules): number {
  const a = rules.socialBenefits.aah;
  const threshold =
    a.activityAllowanceThreshold *
    rules.minimumWage.hourlyGross *
    rules.minimumWage.monthlyHours *
    12;
  const earnings = Math.max(0, annualEarnings);
  const allowance =
    a.activityAllowanceLowRate * Math.min(earnings, threshold) +
    a.activityAllowanceHighRate * Math.max(0, earnings - threshold);
  return earnings - allowance;
}

/** Monthly AAH of one person (resources of the beneficiary alone since October 2023). */
export function aahAmount(input: AahInput, rules: Rules): number {
  if (!aahEligible(input, rules)) return 0;
  const a = rules.socialBenefits.aah;
  const ceiling = a.ceiling * (1 + a.perChildCeilingRate * input.children);
  const resources =
    aahCountedEarnings(input.annualEarnings, rules) + Math.max(0, input.annualOtherIncome);
  const byResources = (ceiling - resources) / 12;
  return Math.max(0, Math.min(a.maxAmount - Math.max(0, input.monthlyPension), byResources));
}

export interface AspaInput {
  /** Adults aged 65 or more (0, 1 or 2). */
  eligibleAdults: number;
  couple: boolean;
  /** Annual pensions, replacement and capital income of the household. */
  annualIncome: number;
  /** Annual earnings from work of the household, before the allowance. */
  annualEarnings: number;
}

/** Annual ASPA of a household (one allowance for a couple; wealth is not entered). */
export function aspaAmount(input: AspaInput, rules: Rules): number {
  if (input.eligibleAdults <= 0) return 0;
  const a = rules.socialBenefits.aspa;
  const resources =
    Math.max(0, input.annualIncome) + Math.max(0, input.annualEarnings - a.professionalAllowance);
  if (!input.couple) return Math.max(0, a.singleMax - resources);
  const coupleAmount = Math.max(0, a.coupleMax - resources);
  return input.eligibleAdults >= 2 ? coupleAmount : Math.min(a.singleMax, coupleAmount);
}

/** Monthly ASS of a jobseeker whose insurance rights have ended. */
export function assAmount(
  input: { couple: boolean; monthlyResources: number },
  rules: Rules,
): number {
  const a = rules.socialBenefits.ass;
  const ceiling = input.couple ? a.ceilingCouple : a.ceilingSingle;
  return Math.min(a.fullAmount, Math.max(0, ceiling - Math.max(0, input.monthlyResources)));
}
