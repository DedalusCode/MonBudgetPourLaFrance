// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Contributions of a self-employed craftsman (travailleur indépendant, entreprise
 * individuelle at the real regime) under the 2026 base reform: one base for
 * contributions and CSG-CRDS, the gross income minus a 26 % allowance.
 */
import type { Rules } from '../rules.ts';
import { invertIncreasing, slice } from '../math.ts';
import type { SelfEmployedScheme } from './input.ts';

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
  /** Micro-entrepreneur: income tax paid through the versement libératoire. */
  flatIncomeTax: number;
  /** Micro-entrepreneur: profit taxed by the versement libératoire, counted in the reference income. */
  flatTaxedIncome: number;
  /** Micro-entrepreneur: contributions are one flat rate, CSG and CRDS included. */
  micro: boolean;
}

const MICRO_FIELDS = { flatIncomeTax: 0, flatTaxedIncome: 0, micro: false } as const;

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

export function selfEmployedContributions(
  grossIncome: number,
  rules: Rules,
  scheme: SelfEmployedScheme = 'craft',
): SelfEmployedResult {
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
      ...MICRO_FIELDS,
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
  const familyRate = interpolatedRate(
    base,
    [
      { passMultiple: se.family.startPassMultiple, rate: 0 },
      { passMultiple: se.family.fullPassMultiple, rate: se.family.rate },
    ],
    pass,
  );
  const own = schemeContributions(base, rules, scheme);
  const contributions = health + base * familyRate + own.contributions;

  const { rate, deductibleRate } = rules.csg.activity;
  const csgDeductible = base * deductibleRate;
  const csgNonDeductible = base * (rate - deductibleRate);
  const crds = base * rules.crds.rate;
  const trainingContribution = own.training;
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
    ...MICRO_FIELDS,
  };
}

const between = (x: number, min: number, max: number) => Math.min(Math.max(x, min), max);

/**
 * Contributions that differ between schemes (pensions, disability, daily allowances, work
 * accidents) and the training contribution; health and family follow the same scales.
 */
function schemeContributions(
  base: number,
  rules: Rules,
  scheme: SelfEmployedScheme,
): { contributions: number; training: number } {
  const se = rules.selfEmployed;
  const pass = rules.socialSecurityCeiling;
  if (scheme === 'farmer') {
    const f = se.farmer;
    const pensionBase = Math.max(base, f.basePension.minBase);
    const contributions =
      Math.max(base, f.disability.minBasePassMultiple * pass) * f.disability.rate +
      f.dailyAllowances +
      Math.min(pensionBase, pass) * f.basePension.rateCapped +
      pensionBase * f.basePension.rateUncapped +
      Math.max(base, f.supplementaryPension.minBase) * f.supplementaryPension.rate +
      base * interpolatedRate(base, f.additionalPensionScale, pass) +
      f.workAccidents;
    const training = between(
      base * f.training.rate,
      f.training.minPassShare * pass,
      f.training.maxPassShare * pass,
    );
    return { contributions, training };
  }
  if (scheme === 'cipav') {
    const c = se.cipav;
    const daily =
      between(
        base,
        c.dailyAllowances.minBasePassMultiple * pass,
        c.dailyAllowances.capPassMultiple * pass,
      ) * c.dailyAllowances.rate;
    const pensionBase = Math.max(base, c.basePension.minBase);
    const basePension =
      Math.min(pensionBase, pass) * c.basePension.rateFirstCeiling +
      Math.min(pensionBase, c.basePension.capPassMultiple * pass) * c.basePension.rateUpToCap;
    const supplementary =
      Math.min(base, pass) * c.supplementaryPension.rateFirstCeiling +
      slice(base, pass, c.supplementaryPension.capPassMultiple * pass) *
        c.supplementaryPension.rateAbove;
    const disability =
      between(base, c.disability.minBasePassMultiple * pass, c.disability.capPassMultiple * pass) *
      c.disability.rate;
    return {
      contributions: daily + basePension + supplementary + disability,
      training: se.liberalTrainingPassShare * pass,
    };
  }
  // Artisans, traders and non-regulated liberal professions (SSI).
  const daily =
    between(
      base,
      se.dailyAllowances.minBasePassMultiple * pass,
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
    between(base, se.disability.minBasePassMultiple * pass, se.disability.capPassMultiple * pass) *
    se.disability.rate;
  return {
    contributions: daily + basePension + supplementary + disability,
    training: scheme === 'liberal' ? se.liberalTrainingPassShare * pass : se.trainingContribution,
  };
}

/** Gross income whose taxable professional income is `target`. */
export function grossForProfessionalIncome(
  target: number,
  rules: Rules,
  scheme: SelfEmployedScheme = 'craft',
): number {
  return invertIncreasing(
    (gross) => selfEmployedContributions(gross, rules, scheme).taxableIncome,
    target,
  );
}
