// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Allocations familiales (CSS art. L521-1 and D521-1): from two children under 20, in
 * shares of the BMAF, with an age increase and three income brackets (simplified: the
 * current taxable income stands for the net income of two years before, and the
 * smoothing just above each ceiling is ignored).
 */
import type { Rules } from '../rules.ts';

export interface FamilyAllowancesInput {
  /** Children under 20. */
  children: number;
  /** Of which old enough for the age increase. */
  childrenAboveAge: number;
  /** Annual taxable income of the household. */
  annualIncome: number;
}

export interface FamilyAllowancesParts {
  /** Monthly allocations familiales, before the CRDS. */
  total: number;
  /** Of which the age increase (majoration pour âge), excluded from the RSA and prime d'activité resources. */
  ageIncrease: number;
}

/** Monthly allocations familiales and their age increase. */
export function familyAllowanceParts(
  input: FamilyAllowancesInput,
  rules: Rules,
): FamilyAllowancesParts {
  const f = rules.familyAllowances;
  const n = input.children;
  if (n < 2) return { total: 0, ageIncrease: 0 };
  // The eldest of a two-child family gets no age increase.
  const increased = Math.max(0, Math.min(input.childrenAboveAge, n) - (n === 2 ? 1 : 0));
  const firstCeiling = f.firstBracketBase + n * f.perChildCeiling;
  const secondCeiling = f.secondBracketBase + n * f.perChildCeiling;
  const factor =
    input.annualIncome <= firstCeiling
      ? 1
      : input.annualIncome <= secondCeiling
        ? f.secondBracketFactor
        : f.thirdBracketFactor;
  const ageIncrease = f.bmaf * increased * f.ageMajorationRate * factor;
  const base = f.bmaf * (f.twoChildrenRate + (n - 2) * f.perAdditionalChildRate) * factor;
  return { total: base + ageIncrease, ageIncrease };
}

/** Monthly allocations familiales. */
export function familyAllowances(input: FamilyAllowancesInput, rules: Rules): number {
  return familyAllowanceParts(input, rules).total;
}
