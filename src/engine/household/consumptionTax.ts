// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Taxes on consumption borne by the household: VAT by rate and excise duties
 * on energy. Consumption amounts include VAT.
 */
import type { Rules } from '../rules.ts';
import type { HouseholdInput } from './input.ts';

export interface ConsumptionTaxResult {
  vat: number;
  energyExcise: number;
}

/** VAT contained in an amount that includes it. */
export function vatIncluded(amountWithVat: number, rate: number): number {
  return (amountWithVat * rate) / (1 + rate);
}

export function consumptionTax(
  consumption: HouseholdInput['consumption'],
  rules: Rules,
): ConsumptionTaxResult {
  const { annualAmount, vatShares, energyShare } = consumption;
  const rates = rules.vat;
  const vat =
    vatIncluded(annualAmount * vatShares.standard, rates.standard) +
    vatIncluded(annualAmount * vatShares.intermediate, rates.intermediate) +
    vatIncluded(annualAmount * vatShares.reduced, rates.reduced) +
    vatIncluded(annualAmount * vatShares.superReduced, rates.superReduced);
  const energyExcise = annualAmount * energyShare * rules.energyExcise.shareOfEnergySpending;
  return { vat, energyExcise };
}
