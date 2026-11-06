// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { loadDataset } from '../../../src/engine/params.ts';
import { resolveRules, type Rules } from '../../../src/engine/rules.ts';
import type { HouseholdInput } from '../../../src/engine/household/input.ts';

/** Rules in force, from the bundled data. */
export const rules: Rules = resolveRules(loadDataset().taxRules);

/** Copy of the rules with some values changed, e.g. to replay an example from an older year. */
export function rulesWith(change: (r: Rules) => void): Rules {
  const copy = structuredClone(rules);
  change(copy);
  return copy;
}

export const emptyHousehold: HouseholdInput = {
  grossSalary: 0,
  hoursRatio: 1,
  apprentice: false,
  selfEmployedGrossIncome: 0,
  grossPension: 0,
  age: 45,
  rentalIncome: 0,
  rentalDeductibleCharges: 0,
  dividends: 0,
  interest: 0,
  realizedCapitalGains: 0,
  retainedEarnings: 0,
  wealth: { mainResidence: 0, rentalProperty: 0, financial: 0, business: 0 },
  consumption: {
    annualAmount: 0,
    vatShares: { standard: 0, intermediate: 0, reduced: 0, superReduced: 0, exempt: 1 },
    energyShare: 0,
  },
  propertyTax: 0,
  housingFlatRateApplies: false,
};

export { relativeGap } from '../../helpers.ts';
