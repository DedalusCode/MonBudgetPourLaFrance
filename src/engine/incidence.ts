// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Incidence assumptions (PLAN.MD §5.6): which levies a household is deemed to
 * bear. Each assumption is a data parameter (`taxRules.incidence`); a levy whose
 * bearer is `notAttributed` is left out of household balances.
 */
import type { HouseholdInput, HouseholdLevies } from './household/index.ts';
import type { Rules } from './rules.ts';

export interface BorneLevy {
  id: string;
  amount: number;
}

/**
 * Corporate tax borne by a shareholder: each euro of after-tax profit (paid out
 * or retained) was taxed at the statutory rate before, i.e. rate / (1 − rate).
 */
export function corporateTaxBorne(afterTaxProfits: number, rules: Rules): number {
  const rate = rules.corporateTax.standardRate;
  return (afterTaxProfits * rate) / (1 - rate);
}

/** Levies borne by the household, line by line (employee side first). */
/** Whether the incidence assumption of `tax` puts it on `bearer`. */
export function bears(rules: Rules, tax: keyof Rules['incidence'], bearer: string): boolean {
  return rules.incidence[tax].bearer === bearer;
}

export function borneLevies(
  input: HouseholdInput,
  levies: HouseholdLevies,
  rules: Rules,
): BorneLevy[] {
  const bornBy = (tax: keyof Rules['incidence'], bearer: string) => bears(rules, tax, bearer);
  const { salary, capital } = levies;
  const lines: BorneLevy[] = [
    { id: 'employeeContributions', amount: salary.employeeContributions },
    { id: 'csgCrdsSalary', amount: salary.csgDeductible + salary.csgNonDeductible + salary.crds },
    {
      id: 'employerContributions',
      amount: bornBy('employerContributions', 'employee') ? salary.employerContributions : 0,
    },
    {
      id: levies.selfEmployed.micro ? 'microContributions' : 'selfEmployedContributions',
      amount: levies.selfEmployed.contributions + levies.selfEmployed.trainingContribution,
    },
    {
      id: 'csgCrdsSelfEmployed',
      amount:
        levies.selfEmployed.csgDeductible +
        levies.selfEmployed.csgNonDeductible +
        levies.selfEmployed.crds,
    },
    {
      id: 'csgCrdsPension',
      amount:
        levies.pension.csgDeductible +
        levies.pension.csgNonDeductible +
        levies.pension.crds +
        levies.pension.casa +
        levies.pension.complementaryHealth,
    },
    {
      id: 'csgCrdsReplacement',
      amount:
        levies.unemployment.csgDeductible +
        levies.unemployment.csgNonDeductible +
        levies.unemployment.crds +
        levies.invalidity.csgDeductible +
        levies.invalidity.csgNonDeductible +
        levies.invalidity.crds +
        levies.invalidity.casa,
    },
    { id: 'incomeTax', amount: levies.incomeTax.tax },
    { id: 'microFlatIncomeTax', amount: levies.selfEmployed.flatIncomeTax },
    { id: 'highIncomeContribution', amount: levies.highIncomeContribution },
    { id: 'highIncomeMinimumTax', amount: levies.highIncomeMinimumTax },
    { id: 'flatTax', amount: capital.flatTaxIncomePart },
    {
      id: 'capitalSocialLevies',
      amount: capital.socialLeviesFinancial + capital.socialLeviesRental,
    },
    { id: 'wealthTax', amount: levies.wealthTax },
    { id: 'vat', amount: bornBy('vat', 'consumer') ? levies.vat : 0 },
    { id: 'energyExcise', amount: bornBy('energyExcise', 'consumer') ? levies.energyExcise : 0 },
    { id: 'propertyTax', amount: bornBy('propertyTax', 'owner') ? levies.propertyTax : 0 },
    {
      id: 'corporateTax',
      amount: bornBy('corporateTax', 'shareholder')
        ? corporateTaxBorne(input.dividends + input.retainedEarnings, rules)
        : 0,
    },
  ];
  return lines;
}
