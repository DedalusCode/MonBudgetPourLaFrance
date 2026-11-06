// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Contributions of a self-employed craftsman (travailleur indépendant, entreprise
 * individuelle at the real regime) under the 2026 base reform: one base for
 * contributions and CSG-CRDS, the gross income minus a 26 % allowance.
 */
import type { Rules } from '../rules.ts';
import { invertIncreasing, slice } from '../math.ts';

export interface SelfEmployedResult {
  /** Turnover minus business costs, before contributions (revenu brut). */
  grossIncome: number;
  /** Single base of contributions and CSG-CRDS. */
  base: number;
  contributions: number;
  csgDeductible: number;
  csgNonDeductible: number;
  crds: number;
  trainingContribution: number;
  /** Income before income tax, after every contribution. */
  netIncome: number;
  /** Profit taxed on the barème (no 10 % allowance): net income + non-deductible CSG and CRDS. */
  taxableIncome: number;
}

/** Rate read on a piecewise-linear scale of (base, rate) points. */
export function interpolatedRate(
  base: number,
  points: { passMultiple: number; rate: number }[],
  pass: number,
): number {
  const x = base / pass;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b && x <= b.passMultiple) {
      if (x <= a.passMultiple) return a.rate;
      return (
        a.rate + ((b.rate - a.rate) * (x - a.passMultiple)) / (b.passMultiple - a.passMultiple)
      );
    }
  }
  return points.at(-1)?.rate ?? 0;
}

export function selfEmployedContributions(grossIncome: number, rules: Rules): SelfEmployedResult {
  const se = rules.selfEmployed;
  const pass = rules.socialSecurityCeiling;
  if (grossIncome <= 0) {
    return {
      grossIncome: 0,
      base: 0,
      contributions: 0,
      csgDeductible: 0,
      csgNonDeductible: 0,
      crds: 0,
      trainingContribution: 0,
      netIncome: 0,
      taxableIncome: 0,
    };
  }
  const allowance = Math.min(
    se.baseAllowanceMaxPassMultiple * pass,
    Math.max(se.baseAllowanceMinPassMultiple * pass, se.baseAllowance * grossIncome),
  );
  const base = Math.max(0, grossIncome - allowance);

  // Health: the scale rate applies to the base up to its last point, the flat rate above.
  const lastPoint = (se.healthScale.at(-1)?.passMultiple ?? 0) * pass;
  const health =
    Math.min(base, lastPoint) * interpolatedRate(Math.min(base, lastPoint), se.healthScale, pass) +
    Math.max(0, base - lastPoint) * se.healthRateAbove;
  const daily =
    Math.min(
      Math.max(base, se.dailyAllowances.minBasePassMultiple * pass),
      se.dailyAllowances.capPassMultiple * pass,
    ) * se.dailyAllowances.rate;
  const pensionBase = Math.max(base, se.basePension.minBase);
  const basePension =
    Math.min(pensionBase, pass) * se.basePension.rateCapped +
    Math.max(0, pensionBase - pass) * se.basePension.rateUncapped;
  const supplementary =
    Math.min(base, pass) * se.supplementaryPension.rateFirstCeiling +
    slice(base, pass, se.supplementaryPension.capPassMultiple * pass) *
      se.supplementaryPension.rateAbove;
  const disability =
    Math.min(
      Math.max(base, se.disability.minBasePassMultiple * pass),
      se.disability.capPassMultiple * pass,
    ) * se.disability.rate;
  const familyRate = interpolatedRate(
    base,
    [
      { passMultiple: se.family.startPassMultiple, rate: 0 },
      { passMultiple: se.family.fullPassMultiple, rate: se.family.rate },
    ],
    pass,
  );
  const contributions =
    health + daily + basePension + supplementary + disability + base * familyRate;

  const { rate, deductibleRate } = rules.csg.activity;
  const csgDeductible = base * deductibleRate;
  const csgNonDeductible = base * (rate - deductibleRate);
  const crds = base * rules.crds.rate;
  const trainingContribution = se.trainingContribution;
  const netIncome =
    grossIncome - contributions - csgDeductible - csgNonDeductible - crds - trainingContribution;
  return {
    grossIncome,
    base,
    contributions,
    csgDeductible,
    csgNonDeductible,
    crds,
    trainingContribution,
    netIncome,
    taxableIncome: netIncome + csgNonDeductible + crds,
  };
}

/** Gross income whose taxable professional income is `target`. */
export function grossForProfessionalIncome(target: number, rules: Rules): number {
  return invertIncreasing((gross) => selfEmployedContributions(gross, rules).taxableIncome, target);
}
