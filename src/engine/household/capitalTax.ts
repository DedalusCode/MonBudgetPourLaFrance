// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Capital income: rental income (micro-foncier or real regime), flat tax (PFU)
 * on financial income, and social levies on both.
 */
import type { Rules } from '../rules.ts';
import type { HouseholdInput } from './input.ts';

export interface CapitalResult {
  /** Net rental income added to the income taxed on the barème. */
  rentalTaxableIncome: number;
  /** Dividends, interest and realised gains, taxed at the flat rate. */
  financialIncome: number;
  /** Income tax part of the PFU. */
  flatTaxIncomePart: number;
  socialLeviesFinancial: number;
  socialLeviesRental: number;
  /** Part of the CSG on rental income deductible from income taxed on the barème. */
  deductibleCsg: number;
}

export function rentalTaxableIncome(
  rents: number,
  deductibleCharges: number,
  rules: Rules,
): number {
  const { microFoncierAllowance, microFoncierCeiling } = rules.propertyIncome;
  if (rents <= microFoncierCeiling) return rents * (1 - microFoncierAllowance);
  // Real regime; a rental deficit is ignored (no carry-over in this simplified model).
  return Math.max(0, rents - deductibleCharges);
}

export function capitalIncome(input: HouseholdInput, rules: Rules): CapitalResult {
  const rental = rentalTaxableIncome(input.rentalIncome, input.rentalDeductibleCharges, rules);
  const financialIncome = input.dividends + input.interest + input.realizedCapitalGains;
  const { flatTaxIncomeRate, socialLeviesRate, socialLeviesRatePropertyIncome } =
    rules.capitalIncome;
  return {
    rentalTaxableIncome: rental,
    financialIncome,
    flatTaxIncomePart: financialIncome * flatTaxIncomeRate,
    socialLeviesFinancial: financialIncome * socialLeviesRate,
    socialLeviesRental: rental * socialLeviesRatePropertyIncome,
    deductibleCsg: rental * rules.csg.capital.deductibleRate,
  };
}
