// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Prime d'activité (simplified): lump sum increased with the household size
 * + share of earnings + individual bonus of each worker − resources.
 * Monthly amounts; the quarterly averaging, the minimum payment and the temporary
 * single-parent increase are ignored.
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

/**
 * Lump sum for a household (CSS art. D843-1): +50 % for the second person, +30 % for
 * each further person, +40 % for each child from the third.
 */
export function householdLumpSum(adults: number, children: number, rules: Rules): number {
  const b = rules.activityBonus;
  const persons = adults + children;
  const thirdAndNextChildren = Math.max(0, children - 2);
  const others = Math.max(0, persons - 2);
  const increase =
    (persons >= 2 ? b.secondPersonRate : 0) +
    (others - thirdAndNextChildren) * b.additionalPersonRate +
    thirdAndNextChildren * b.thirdChildRate;
  return b.lumpSum * (1 + increase);
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
  return Math.max(0, amount);
}

export interface ActivityBonusInput {
  /** Monthly net earnings from work. */
  monthlyEarnings: number;
  /** Other monthly resources (capital income...). */
  otherMonthlyResources: number;
  housingFlatRateApplies: boolean;
  /** An apprentice is eligible only above a minimum level of earnings. */
  apprentice?: boolean;
}

/** Monthly prime d'activité of a single person without children. */
export function activityBonus(input: ActivityBonusInput, rules: Rules): number {
  if (input.apprentice && input.monthlyEarnings <= rules.activityBonus.apprenticeThreshold) {
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
