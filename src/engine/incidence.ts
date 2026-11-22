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
  /**
   * The same amount one levy at a time (each contribution, CSG, CRDS, décote...), for
   * the detail of a profile card; the parts add up to `amount`.
   */
  parts?: LevyPart[];
}

export interface LevyPart {
  id: string;
  amount: number;
}

/** Parts kept when not zero, so that a card lists only what the household pays. */
const nonZero = (parts: LevyPart[]) => parts.filter((p) => p.amount !== 0);

/** A levy line made of its parts. */
function fromParts(id: string, parts: LevyPart[]): BorneLevy {
  return { id, amount: parts.reduce((s, p) => s + p.amount, 0), parts: nonZero(parts) };
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
  const { salary, capital, selfEmployed, pension, unemployment, invalidity } = levies;
  const ofPayer = (payer: 'employee' | 'employer') =>
    salary.lines.filter((l) => l.payer === payer).map(({ id, amount }) => ({ id, amount }));
  const employerBorne = bornBy('employerContributions', 'employee');
  const lines: BorneLevy[] = [
    fromParts('employeeContributions', ofPayer('employee')),
    fromParts('csgCrdsSalary', [
      { id: 'csgDeductible', amount: salary.csgDeductible },
      { id: 'csgNonDeductible', amount: salary.csgNonDeductible },
      { id: 'crds', amount: salary.crds },
    ]),
    employerBorne
      ? fromParts('employerContributions', [
          ...ofPayer('employer'),
          { id: 'employerRelief', amount: -salary.employerRelief },
        ])
      : { id: 'employerContributions', amount: 0 },
    fromParts(selfEmployed.micro ? 'microContributions' : 'selfEmployedContributions', [
      ...selfEmployed.contributionLines,
      { id: 'training', amount: selfEmployed.trainingContribution },
    ]),
    fromParts('csgCrdsSelfEmployed', [
      { id: 'csgDeductible', amount: selfEmployed.csgDeductible },
      { id: 'csgNonDeductible', amount: selfEmployed.csgNonDeductible },
      { id: 'crds', amount: selfEmployed.crds },
    ]),
    fromParts('csgCrdsPension', [
      { id: 'csgDeductible', amount: pension.csgDeductible },
      { id: 'csgNonDeductible', amount: pension.csgNonDeductible },
      { id: 'crds', amount: pension.crds },
      { id: 'casa', amount: pension.casa },
      { id: 'complementaryHealth', amount: pension.complementaryHealth },
    ]),
    fromParts('csgCrdsReplacement', [
      {
        id: 'csgDeductible',
        amount: unemployment.csgDeductible + invalidity.csgDeductible,
      },
      {
        id: 'csgNonDeductible',
        amount: unemployment.csgNonDeductible + invalidity.csgNonDeductible,
      },
      { id: 'crds', amount: unemployment.crds + invalidity.crds },
      { id: 'casa', amount: invalidity.casa },
    ]),
    fromParts('incomeTax', [
      { id: 'grossTax', amount: levies.incomeTax.grossTax },
      { id: 'decote', amount: -levies.incomeTax.decote },
    ]),
    { id: 'microFlatIncomeTax', amount: levies.selfEmployed.flatIncomeTax },
    { id: 'highIncomeContribution', amount: levies.highIncomeContribution },
    { id: 'highIncomeMinimumTax', amount: levies.highIncomeMinimumTax },
    { id: 'flatTax', amount: capital.flatTaxIncomePart },
    fromParts('capitalSocialLevies', [
      { id: 'financial', amount: capital.socialLeviesFinancial },
      { id: 'rental', amount: capital.socialLeviesRental },
    ]),
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
