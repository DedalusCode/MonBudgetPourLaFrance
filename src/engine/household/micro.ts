// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Micro-entrepreneur: social contributions as one flat share of turnover (CSG and CRDS
 * included, not split), income tax on turnover minus a flat allowance, or the versement
 * libératoire. The flat allowance stands for the business costs, which the user does not
 * give: the income left to the household is turnover − allowance − contributions.
 */
import type { Rules } from '../rules.ts';
import type { MicroBusiness } from './input.ts';
import type { SelfEmployedResult } from './selfEmployed.ts';

/** Turnover minus the micro-fiscal allowance (within its minimum). */
export function microProfit(micro: MicroBusiness, rules: Rules): number {
  const turnover = Math.max(0, micro.turnover);
  const allowance = Math.min(
    turnover,
    Math.max(
      rules.micro.minTaxAllowance,
      turnover * rules.micro.activities[micro.activity].taxAllowance,
    ),
  );
  return turnover - allowance;
}

export function microContributions(micro: MicroBusiness, rules: Rules): SelfEmployedResult {
  const activity = rules.micro.activities[micro.activity];
  const turnover = Math.max(0, micro.turnover);
  const profit = microProfit(micro, rules);
  const contributions = turnover * activity.contributionRate;
  const trainingContribution = turnover * activity.trainingRate;
  return {
    grossIncome: profit,
    base: turnover,
    contributions,
    csgDeductible: 0,
    csgNonDeductible: 0,
    crds: 0,
    trainingContribution,
    netIncome: profit - contributions - trainingContribution,
    taxableIncome: micro.flatTax ? 0 : profit,
    flatIncomeTax: micro.flatTax ? turnover * activity.flatTaxRate : 0,
    flatTaxedIncome: micro.flatTax ? profit : 0,
    micro: true,
  };
}
