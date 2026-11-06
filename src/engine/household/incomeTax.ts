// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Income tax on the progressive scale (barème), with the 10 % professional-expenses
 * allowance, the quotient familial and its ceiling, and the décote, plus the two
 * high-income contributions (CEHR and CDHR). A tax household (foyer fiscal) is a
 * single person by default, or a couple taxed jointly and its dependent children.
 */
import type { Rules } from '../rules.ts';
import { cappedAllowance, slice } from '../math.ts';
import { pensionAllowance } from './pension.ts';

interface Bracket {
  threshold: number;
  rate: number;
}

/** Tax of a progressive scale whose brackets are given by their lower bound. */
export function progressiveTax(income: number, brackets: Bracket[]): number {
  return brackets.reduce((tax, bracket, i) => {
    const upper = brackets[i + 1]?.threshold ?? Infinity;
    return tax + slice(income, bracket.threshold, upper) * bracket.rate;
  }, 0);
}

/** 10 % allowance for professional expenses, within its floor and ceiling. */
export function professionalExpensesAllowance(taxableSalary: number, rules: Rules): number {
  return cappedAllowance(taxableSalary, rules.incomeTax.professionalExpenses);
}

/** Composition of a tax household, for the quotient familial and the couple thresholds. */
export interface TaxHousehold {
  /** Married or PACS couple taxed jointly. */
  joint: boolean;
  /** Dependent children. */
  children: number;
  /** Parent living alone with the children (case T); never in a couple. */
  singleParent: boolean;
}

export const SINGLE_PERSON: TaxHousehold = { joint: false, children: 0, singleParent: false };

/** Number of parts of the quotient familial (CGI art. 194). */
export function taxParts(household: TaxHousehold, rules: Rules): number {
  const f = rules.incomeTax.family;
  const adults = household.joint ? f.coupleParts : rules.incomeTax.singleParts;
  const children =
    Math.min(household.children, 2) * f.firstChildrenParts +
    Math.max(0, household.children - 2) * f.furtherChildParts;
  const singleParent = household.singleParent && household.children > 0 ? f.singleParentParts : 0;
  return adults + children + singleParent;
}

/**
 * Tax of the barème for a tax household, the effect of the extra parts being capped
 * (CGI art. 197, I-2): `singleParentFirstChildCeiling` for the whole first part of a single
 * parent, `halfPartCeiling` for every other half-part.
 */
export function quotientTax(taxableIncome: number, household: TaxHousehold, rules: Rules): number {
  const f = rules.incomeTax.family;
  const brackets = rules.incomeTax.brackets;
  const parts = taxParts(household, rules);
  const baseParts = household.joint ? f.coupleParts : rules.incomeTax.singleParts;
  const withParts = parts * progressiveTax(taxableIncome / parts, brackets);
  if (parts === baseParts) return withParts;
  const withoutExtraParts = baseParts * progressiveTax(taxableIncome / baseParts, brackets);
  const extraHalfParts = (parts - baseParts) * 2;
  const ceiling =
    household.singleParent && household.children > 0
      ? f.singleParentFirstChildCeiling + f.halfPartCeiling * Math.max(0, extraHalfParts - 2)
      : f.halfPartCeiling * extraHalfParts;
  return Math.max(withParts, withoutExtraParts - ceiling);
}

/** Tax on the barème after the décote, for a household's taxable income. */
export function householdIncomeTax(
  taxableIncome: number,
  household: TaxHousehold,
  rules: Rules,
): Omit<IncomeTaxResult, 'taxableIncome'> {
  const grossTax = quotientTax(taxableIncome, household, rules);
  const { singleCeiling, coupleCeiling, rate } = rules.incomeTax.decote;
  const ceiling = household.joint ? coupleCeiling : singleCeiling;
  const decote = Math.min(grossTax, Math.max(0, ceiling - rate * grossTax));
  return { grossTax, decote, tax: grossTax - decote };
}

export interface IncomeTaxInput {
  taxableSalary: number;
  /** Apprenticeship salary, exempt up to the annual SMIC (CGI art. 81 bis). */
  apprentice?: boolean;
  /** Self-employed profit (BIC), taxed without the 10 % allowance. */
  selfEmployedIncome?: number;
  /** Taxable pension, before its own 10 % allowance. */
  taxablePension?: number;
  /** Age of the taxpayer, for the allowance of people over 65. */
  age?: number;
  rentalTaxableIncome: number;
  /** Deductible CSG on income taxed on the barème (rental income). */
  deductibleCsg: number;
}

export interface IncomeTaxResult {
  /** Revenu net imposable. */
  taxableIncome: number;
  /** Tax from the barème, before the décote. */
  grossTax: number;
  decote: number;
  /** Tax on the barème after the décote. */
  tax: number;
}

export function incomeTax(
  input: IncomeTaxInput,
  rules: Rules,
  household: TaxHousehold = SINGLE_PERSON,
): IncomeTaxResult {
  const taxableIncome = personTaxableIncome(input, rules);
  return { taxableIncome, ...householdIncomeTax(taxableIncome, household, rules) };
}

/** Revenu net imposable of one person, after the allowances. */
export function personTaxableIncome(input: IncomeTaxInput, rules: Rules): number {
  const salaryIncome = input.apprentice
    ? Math.max(0, input.taxableSalary - rules.incomeTax.apprenticeExemption)
    : input.taxableSalary;
  const salary = salaryIncome - professionalExpensesAllowance(salaryIncome, rules);
  const pension = (input.taxablePension ?? 0) - pensionAllowance(input.taxablePension ?? 0, rules);
  const netIncome = Math.max(
    0,
    salary +
      (input.selfEmployedIncome ?? 0) +
      pension +
      input.rentalTaxableIncome -
      input.deductibleCsg,
  );
  return Math.max(0, netIncome - elderlyAllowance(netIncome, input.age, rules));
}

/** Allowance on net income for taxpayers over 65 (CGI art. 157 bis). */
export function elderlyAllowance(netIncome: number, age: number | undefined, rules: Rules): number {
  const a = rules.pension.elderlyAllowance;
  // Taxpayers aged 65 or more on 31 December (BOFiP BOI-IR-BASE-40).
  if (age === undefined || age < a.minAge) return 0;
  if (netIncome <= a.fullIncomeCeiling) return a.full;
  if (netIncome <= a.halfIncomeCeiling) return a.half;
  return 0;
}

/** Contribution exceptionnelle sur les hauts revenus, on the reference tax income. */
export function highIncomeContribution(
  referenceIncome: number,
  rules: Rules,
  household: TaxHousehold = SINGLE_PERSON,
): number {
  const c = rules.highIncomeContribution;
  return progressiveTax(referenceIncome, household.joint ? c.coupleBrackets : c.brackets);
}

/**
 * Contribution différentielle sur les hauts revenus: tops up the taxes already
 * paid to a minimum average rate, with a smoothing just above the threshold.
 */
export function highIncomeMinimumTax(
  referenceIncome: number,
  taxesPaid: number,
  rules: Rules,
  household: TaxHousehold = SINGLE_PERSON,
): number {
  const m = rules.highIncomeMinimumTax;
  const threshold = household.joint ? m.coupleThreshold : m.singleThreshold;
  const upper = household.joint ? m.coupleSmoothingUpperBound : m.smoothingUpperBound;
  if (referenceIncome <= threshold) return 0;
  const target =
    referenceIncome <= upper
      ? Math.min(m.rate * referenceIncome, m.smoothingRate * (referenceIncome - threshold))
      : m.rate * referenceIncome;
  // Dependants and a joint couple raise the taxes deemed paid (BOFiP BOI-IR-CDHR-10).
  const additions =
    household.children * m.dependantAddition + (household.joint ? m.coupleAddition : 0);
  return Math.max(0, target - taxesPaid - additions);
}
