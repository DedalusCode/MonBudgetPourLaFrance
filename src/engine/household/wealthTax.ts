// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Impôt sur la fortune immobilière (IFI). Only real estate is taxable;
 * professional assets are exempt. Debts and the 75 % income cap are ignored.
 */
import type { Rules } from '../rules.ts';
import type { HouseholdInput } from './input.ts';
import { progressiveTax } from './incomeTax.ts';

export function taxableRealEstate(wealth: HouseholdInput['wealth'], rules: Rules): number {
  return (
    wealth.rentalProperty + wealth.mainResidence * (1 - rules.wealthTax.mainResidenceAllowance)
  );
}

export function wealthTax(wealth: HouseholdInput['wealth'], rules: Rules): number {
  const { threshold, brackets, decote } = rules.wealthTax;
  const taxable = taxableRealEstate(wealth, rules);
  // Due only above the threshold (CGI art. 964).
  if (taxable <= threshold) return 0;
  const tax = progressiveTax(taxable, brackets);
  const reduction = taxable < decote.upperBound ? decote.constant - decote.rate * taxable : 0;
  return Math.max(0, tax - reduction);
}
