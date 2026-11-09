// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Social levies on the unemployment insurance benefit (ARE): CSG at a rate set by the
 * revenu fiscal de référence (exempt, reduced or normal), CRDS, on the same base as wages,
 * without bringing the daily benefit below a floor. The 3 % pension contribution on the
 * reference daily wage is ignored: the user gives the benefit, not the former wage.
 */
import type { Rules } from '../rules.ts';
import { professionalExpensesAllowance } from './incomeTax.ts';
import { csgBand, type CsgBand } from './pension.ts';
import { csgBase } from './socialContrib.ts';

export interface ReplacementResult {
  gross: number;
  band: CsgBand;
  csgDeductible: number;
  csgNonDeductible: number;
  crds: number;
  /** Benefit after social levies, before income tax. */
  net: number;
  /** Taxable benefit, taxed with wages (10 % allowance). */
  taxable: number;
}

const DAYS_PER_YEAR = 365;

export function unemploymentLevies(gross: number, band: CsgBand, rules: Rules): ReplacementResult {
  const u = rules.unemployment;
  const amount = Math.max(0, gross);
  const reduced = band === 'reduced';
  const rate = band === 'zero' ? 0 : reduced ? u.reducedCsgRate : u.csgRate;
  const deductibleRate = band === 'zero' ? 0 : reduced ? u.reducedCsgRate : u.csgDeductibleRate;
  const crdsRate = band === 'zero' ? 0 : rules.crds.rate;
  const base = csgBase(amount, rules);
  const full = base * (rate + crdsRate);
  // The levies stop at the daily floor: a smaller benefit pays nothing.
  const room = Math.max(0, amount - u.dailyFloor * DAYS_PER_YEAR);
  const scale = full > 0 ? Math.min(full, room) / full : 0;
  const csgDeductible = base * deductibleRate * scale;
  const csgNonDeductible = base * (rate - deductibleRate) * scale;
  const crds = base * crdsRate * scale;
  return {
    gross: amount,
    band,
    csgDeductible,
    csgNonDeductible,
    crds,
    net: amount - csgDeductible - csgNonDeductible - crds,
    taxable: amount - csgDeductible,
  };
}

/** Levies of a benefit, the CSG band being set by the reference income it produces. */
export function unemploymentOnly(
  gross: number,
  rules: Rules,
  otherReferenceIncome = 0,
): ReplacementResult {
  let band: CsgBand = 'normal';
  for (let i = 0; i < 4; i++) {
    const result = unemploymentLevies(gross, band, rules);
    const reference =
      result.taxable - professionalExpensesAllowance(result.taxable, rules) + otherReferenceIncome;
    const next = csgBand(reference, rules);
    if (next === band || (next === 'median' && band === 'normal')) return result;
    band = next;
  }
  return unemploymentLevies(gross, band, rules);
}
