// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Prime d'activité (simplified): lump sum increased with the household size
 * + share of earnings + individual bonus of each worker − resources.
 * Monthly amounts; an amount below the minimum payment is not paid. The quarterly
 * averaging and the temporary single-parent increase are ignored.
 */
import type { Rules } from '../rules.ts';

/** Individual bonus: 0 up to `start` hourly SMICs of earnings, then linear up to its maximum. */
export function individualBonus(monthlyEarnings: number, rules: Rules): number {
  const b = rules.activityBonus;
  const smic = rules.minimumWage.hourlyGross;
  const start = b.individualBonusStartSmicHours * smic;
  const full = b.individualBonusFullSmicHours * smic;
  if (monthlyEarnings <= start) return 0;
  if (monthlyEarnings >= full) return b.individualBonusMax;
  return (b.individualBonusMax * (monthlyEarnings - start)) / (full - start);
}

export interface LumpSumRates {
  secondPersonRate: number;
  additionalPersonRate: number;
  thirdChildRate: number;
}

/**
 * Lump sum of a household from the amount for one person: +50 % for the second person,
 * +30 % for each further person, +40 % for each child from the third (CSS art. D843-1 for
 * the prime d'activité, CASF art. R262-1 for the RSA).
 */
export function scaledLumpSum(
  base: number,
  rates: LumpSumRates,
  adults: number,
  children: number,
): number {
  const persons = adults + children;
  const thirdAndNextChildren = Math.max(0, children - 2);
  const others = Math.max(0, persons - 2);
  const increase =
    (persons >= 2 ? rates.secondPersonRate : 0) +
    (others - thirdAndNextChildren) * rates.additionalPersonRate +
    thirdAndNextChildren * rates.thirdChildRate;
  return base * (1 + increase);
}

/** Lump sum of the prime d'activité for a household (CSS art. D843-1). */
export function householdLumpSum(adults: number, children: number, rules: Rules): number {
  const b = rules.activityBonus;
  return scaledLumpSum(b.lumpSum, b, adults, children);
}

/** Housing flat rate counted as a resource (CSS art. R844-3), by household size. */
export function housingFlatRate(persons: number, rules: Rules): number {
  const b = rules.activityBonus;
  if (persons <= 1) return b.lumpSum * b.housingFlatRate;
  if (persons === 2) return householdLumpSum(2, 0, rules) * b.housingFlatRateTwo;
  return householdLumpSum(3, 0, rules) * b.housingFlatRateThreeOrMore;
}

export interface HouseholdActivityBonusInput {
  /** Monthly net earnings from work of each adult (0 for an adult who does not work). */
  monthlyEarnings: number[];
  /** Dependent children (under 25). */
  children: number;
  /** Other monthly resources (capital income, family allowances...). */
  otherMonthlyResources: number;
  housingFlatRateApplies: boolean;
}

/** Monthly prime d'activité of a household. */
export function householdActivityBonus(input: HouseholdActivityBonusInput, rules: Rules): number {
  const earnings = input.monthlyEarnings.reduce((sum, e) => sum + e, 0);
  if (earnings <= 0) return 0;
  const adults = input.monthlyEarnings.length;
  const lumpSum = householdLumpSum(adults, input.children, rules);
  const housing = input.housingFlatRateApplies
    ? housingFlatRate(adults + input.children, rules)
    : 0;
  const resources = earnings + input.otherMonthlyResources + housing;
  const bonuses = input.monthlyEarnings.reduce((sum, e) => sum + individualBonus(e, rules), 0);
  const amount =
    lumpSum + rules.activityBonus.earningsShare * earnings + bonuses - Math.max(resources, lumpSum);
  return amount < rules.activityBonus.minimumPayment ? 0 : amount;
}

export interface ActivityBonusInput {
  /** Monthly net earnings from work. */
  monthlyEarnings: number;
  /** Other monthly resources (capital income...). */
  otherMonthlyResources: number;
  housingFlatRateApplies: boolean;
  /** Apprentices and students are eligible only above a minimum level of earnings. */
  minimumEarnings?: boolean;
}

/** Whether a worker who must reach the minimum earnings (apprentice, student) is below it. */
export function belowMinimumEarnings(monthlyEarnings: number, rules: Rules): boolean {
  return monthlyEarnings <= rules.activityBonus.apprenticeThreshold;
}

/** Monthly prime d'activité of a single person without children. */
export function activityBonus(input: ActivityBonusInput, rules: Rules): number {
  if (input.minimumEarnings && belowMinimumEarnings(input.monthlyEarnings, rules)) {
    return 0;
  }
  return householdActivityBonus(
    {
      monthlyEarnings: [input.monthlyEarnings],
      children: 0,
      otherMonthlyResources: input.otherMonthlyResources,
      housingFlatRateApplies: input.housingFlatRateApplies,
    },
    rules,
  );
}
