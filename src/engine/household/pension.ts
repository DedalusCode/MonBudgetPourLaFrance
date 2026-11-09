// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Social levies on a retirement pension (former private-sector employee): CSG
 * at a rate set by the revenu fiscal de référence, CRDS, CASA and the health
 * contribution on the complementary pension. The engine uses the reference
 * income of the simulated year (in law: the year N−2), and no smoothing. The band
 * is computed for one person with a single part: a retiree's other household income
 * (a working spouse, capital income) and extra parts are not taken into account.
 */
import { cappedAllowance, invertIncreasing } from '../math.ts';
import type { Rules } from '../rules.ts';

export type CsgBand = 'zero' | 'reduced' | 'median' | 'normal';

export interface PensionResult {
  gross: number;
  band: CsgBand;
  csgDeductible: number;
  csgNonDeductible: number;
  crds: number;
  casa: number;
  complementaryHealth: number;
  /** Pension after social levies, before income tax. */
  net: number;
  /** Pension income before the 10 % allowance. */
  taxable: number;
}

export function csgBand(referenceIncome: number, rules: Rules): CsgBand {
  const p = rules.pension;
  if (referenceIncome <= p.zeroRateCeiling) return 'zero';
  if (referenceIncome <= p.reducedRateCeiling) return 'reduced';
  if (referenceIncome <= p.medianRateCeiling) return 'median';
  return 'normal';
}

/** 10 % allowance on pensions, within its floor and ceiling. */
export function pensionAllowance(taxablePension: number, rules: Rules): number {
  return cappedAllowance(taxablePension, rules.pension.allowance);
}

/**
 * `complementary`: whether part of the pension is a complementary retirement pension,
 * subject to the health contribution (false for an invalidity pension).
 */
export function pensionLevies(
  gross: number,
  band: CsgBand,
  rules: Rules,
  complementary = true,
): PensionResult {
  const p = rules.pension;
  const rate = band === 'zero' ? 0 : p.csgRates[band];
  const deductible = band === 'zero' ? 0 : p.csgDeductibleRates[band];
  const highBand = band === 'median' || band === 'normal';
  const csgDeductible = gross * deductible;
  const csgNonDeductible = gross * (rate - deductible);
  const crds = band === 'zero' ? 0 : gross * rules.crds.rate;
  const casa = highBand ? gross * p.casaRate : 0;
  const complementaryHealth =
    highBand && complementary ? gross * p.complementaryShare * p.complementaryHealthRate : 0;
  const net = gross - csgDeductible - csgNonDeductible - crds - casa - complementaryHealth;
  return {
    gross,
    band,
    csgDeductible,
    csgNonDeductible,
    crds,
    casa,
    complementaryHealth,
    net,
    // Deductible CSG and the health contribution are deducted from taxable income.
    taxable: gross - csgDeductible - complementaryHealth,
  };
}

/**
 * Levies of a pension alone, the CSG band being set by the reference income it
 * produces (fixed point over the four bands).
 */
export function pensionOnly(
  gross: number,
  rules: Rules,
  otherReferenceIncome = 0,
  complementary = true,
): PensionResult {
  let band: CsgBand = 'normal';
  for (let i = 0; i < 4; i++) {
    const result = pensionLevies(gross, band, rules, complementary);
    const reference =
      result.taxable - pensionAllowance(result.taxable, rules) + otherReferenceIncome;
    const next = csgBand(reference, rules);
    if (next === band) return result;
    band = next;
  }
  return pensionLevies(gross, band, rules, complementary);
}

/** Gross pension whose net pension is `annualNet` (bisection). */
export function grossForNetPension(annualNet: number, rules: Rules, complementary = true): number {
  return invertIncreasing((gross) => pensionOnly(gross, rules, 0, complementary).net, annualNet);
}
