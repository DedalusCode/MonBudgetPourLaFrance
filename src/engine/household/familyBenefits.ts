// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Family benefits other than the allocations familiales, in shares of the BMAF and before
 * the CRDS (PLAN.MD §13.5): allocation de soutien familial, complément familial, allocation
 * de rentrée scolaire and allocation de base de la PAJE. The income is the household's annual
 * net income, standing for the income of two years before, as for the allocations familiales.
 */
import type { Rules } from '../rules.ts';

export interface FamilyCeiling {
  base: number;
  perChild: number;
  perChildFrom3: number;
  twoIncomes: number;
}

/** Ceiling for `children` dependents, raised for two working parents or a single parent. */
export function familyCeiling(
  ceiling: FamilyCeiling,
  children: number,
  twoIncomesOrSingleParent: boolean,
): number {
  return (
    ceiling.base +
    Math.min(children, 2) * ceiling.perChild +
    Math.max(0, children - 2) * ceiling.perChildFrom3 +
    (twoIncomesOrSingleParent ? ceiling.twoIncomes : 0)
  );
}

/**
 * Monthly allocation de soutien familial of a single parent whose children's other parent
 * pays no or a low maintenance allowance: the full amount minus the allowance received,
 * per child, nothing below the minimum payment.
 */
export function supportAllowance(
  input: { children: number; monthlyMaintenancePerChild: number },
  rules: Rules,
): number {
  const f = rules.socialBenefits.familyBenefits.asf;
  const perChild =
    f.rate * rules.familyAllowances.bmaf - Math.max(0, input.monthlyMaintenancePerChild);
  return perChild < f.minimumPayment ? 0 : perChild * Math.max(0, input.children);
}

export interface IncomeTestedInput {
  /** Ages of the dependent children. */
  childAges: number[];
  /** Annual net income of the household. */
  annualIncome: number;
  /** Two working parents or a single parent. */
  twoIncomesOrSingleParent: boolean;
}

/**
 * Monthly complément familial: three children or more, all aged 3 or more. Increased
 * amount under the lower ceiling; above the ceiling, a differential amount.
 */
export function familySupplement(input: IncomeTestedInput, rules: Rules): number {
  const { cf, ceilings } = rules.socialBenefits.familyBenefits;
  const n = input.childAges.length;
  if (n < cf.minChildren || input.childAges.some((age) => age < cf.minAge)) return 0;
  const bmaf = rules.familyAllowances.bmaf;
  const increased = familyCeiling(ceilings.increased, n, input.twoIncomesOrSingleParent);
  if (input.annualIncome <= increased) return cf.increasedRate * bmaf;
  const full = familyCeiling(ceilings.full, n, input.twoIncomesOrSingleParent);
  const amount = cf.rate * bmaf;
  if (input.annualIncome <= full) return amount;
  return Math.max(0, amount - (input.annualIncome - full) / 12);
}

/** Annual allocation de rentrée scolaire: per child from 6 to 18, differential above the ceiling. */
export function backToSchoolAllowance(
  input: Omit<IncomeTestedInput, 'twoIncomesOrSingleParent'>,
  rules: Rules,
): number {
  const a = rules.socialBenefits.familyBenefits.ars;
  const bmaf = rules.familyAllowances.bmaf;
  const rateOf = (age: number) => {
    if (age >= 6 && age <= 10) return a.rate6to10;
    if (age >= 11 && age <= 14) return a.rate11to14;
    if (age >= 15 && age <= 18) return a.rate15to18;
    return 0;
  };
  const full = input.childAges.reduce((sum, age) => sum + rateOf(age) * bmaf, 0);
  if (full <= 0) return 0;
  const ceiling = a.ceilingBase * (1 + a.perChildRate * input.childAges.length);
  return Math.max(0, full - Math.max(0, input.annualIncome - ceiling));
}

/** Monthly allocation de base de la PAJE: one per household with a child under 3. */
export function youngChildAllowance(input: IncomeTestedInput, rules: Rules): number {
  const { paje, ceilings } = rules.socialBenefits.familyBenefits;
  if (!input.childAges.some((age) => age < paje.maxAge)) return 0;
  const n = input.childAges.length;
  const bmaf = rules.familyAllowances.bmaf;
  if (input.annualIncome <= familyCeiling(ceilings.full, n, input.twoIncomesOrSingleParent)) {
    return paje.fullRate * bmaf;
  }
  if (
    input.annualIncome <= familyCeiling(ceilings.pajePartial, n, input.twoIncomesOrSingleParent)
  ) {
    return paje.partialRate * bmaf;
  }
  return 0;
}
