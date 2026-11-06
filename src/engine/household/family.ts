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

/** Monthly allocations familiales. */
export function familyAllowances(input: FamilyAllowancesInput, rules: Rules): number {
  const f = rules.familyAllowances;
  const n = input.children;
  if (n < 2) return 0;
  // The eldest of a two-child family gets no age increase.
  const increased = Math.min(input.childrenAboveAge, n) - (n === 2 ? 1 : 0);
  const rate =
    f.twoChildrenRate +
    (n - 2) * f.perAdditionalChildRate +
    Math.max(0, increased) * f.ageMajorationRate;
  const firstCeiling = f.firstBracketBase + n * f.perChildCeiling;
  const secondCeiling = f.secondBracketBase + n * f.perChildCeiling;
  const factor =
    input.annualIncome <= firstCeiling
      ? 1
      : input.annualIncome <= secondCeiling
        ? f.secondBracketFactor
        : f.thirdBracketFactor;
  return f.bmaf * rate * factor;
}
