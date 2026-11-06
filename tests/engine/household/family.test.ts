// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Households with several persons: quotient familial and its ceiling, couple décote,
 * CEHR and CDHR thresholds, prime d'activité by household size, allocations familiales,
 * and the apprentice exemptions. Expected amounts come from the official texts cited in
 * taxRules.json (CGI art. 194 and 197, CSS art. D843-1, DSS instruction 2026/46).
 */
import { describe, expect, it } from 'vitest';
import { householdLumpSum, housingFlatRate } from '../../../src/engine/household/benefits.ts';
import { familyAllowances } from '../../../src/engine/household/family.ts';
import {
  highIncomeContribution,
  highIncomeMinimumTax,
  householdIncomeTax,
  personTaxableIncome,
  progressiveTax,
  quotientTax,
  taxParts,
  type TaxHousehold,
} from '../../../src/engine/household/incomeTax.ts';
import { salaryContributions } from '../../../src/engine/household/socialContrib.ts';
import { rules } from './helpers.ts';

const single: TaxHousehold = { joint: false, children: 0, singleParent: false };
const couple = (children: number): TaxHousehold => ({ joint: true, children, singleParent: false });
const singleParent = (children: number): TaxHousehold => ({
  joint: false,
  children,
  singleParent: true,
});
const barème = (income: number, parts: number) =>
  parts * progressiveTax(income / parts, rules.incomeTax.brackets);

describe('quotient familial', () => {
  it('counts the parts of CGI art. 194', () => {
    expect(taxParts(single, rules)).toBe(1);
    expect(taxParts(couple(0), rules)).toBe(2);
    expect(taxParts(couple(1), rules)).toBe(2.5);
    expect(taxParts(couple(2), rules)).toBe(3);
    expect(taxParts(couple(3), rules)).toBe(4);
    expect(taxParts(couple(4), rules)).toBe(5);
    expect(taxParts(singleParent(1), rules)).toBe(2);
    expect(taxParts(singleParent(2), rules)).toBe(2.5);
    expect(taxParts(singleParent(3), rules)).toBe(3.5);
    // A single person without children gets no single-parent half-part.
    expect(taxParts(singleParent(0), rules)).toBe(1);
  });

  it('applies the parts in full when their effect stays below the ceiling', () => {
    expect(quotientTax(50_000, couple(2), rules)).toBeCloseTo(barème(50_000, 3), 6);
  });

  it('caps the effect of each child half-part at 1 807 €', () => {
    const income = 200_000;
    expect(quotientTax(income, couple(2), rules)).toBeCloseTo(barème(income, 2) - 2 * 1_807, 6);
    expect(quotientTax(income, couple(3), rules)).toBeCloseTo(barème(income, 2) - 4 * 1_807, 6);
  });

  it('caps the whole first part of a single parent at 4 262 €', () => {
    const income = 150_000;
    expect(quotientTax(income, singleParent(1), rules)).toBeCloseTo(barème(income, 1) - 4_262, 6);
    expect(quotientTax(income, singleParent(2), rules)).toBeCloseTo(
      barème(income, 1) - 4_262 - 1_807,
      6,
    );
  });

  it('uses the couple décote (1 483 € − 45.25 % of the tax) for a joint couple', () => {
    const { grossTax, decote, tax } = householdIncomeTax(50_000, couple(0), rules);
    expect(grossTax).toBeCloseTo(barème(50_000, 2), 6);
    expect(grossTax).toBeLessThan(3_277);
    expect(decote).toBeCloseTo(1_483 - 0.4525 * grossTax, 6);
    expect(tax).toBeCloseTo(grossTax - decote, 6);
    // The same tax for a single person gets the smaller décote.
    const alone = householdIncomeTax(15_000, single, rules);
    expect(alone.decote).toBeCloseTo(Math.min(alone.grossTax, 897 - 0.4525 * alone.grossTax), 6);
  });
});

describe('high-income contributions of a couple', () => {
  it('doubles the CEHR thresholds', () => {
    expect(highIncomeContribution(600_000, rules, couple(0))).toBeCloseTo(0.03 * 100_000, 6);
    expect(highIncomeContribution(1_200_000, rules, couple(0))).toBeCloseTo(
      0.03 * 500_000 + 0.04 * 200_000,
      6,
    );
    expect(highIncomeContribution(600_000, rules)).toBeCloseTo(0.03 * 250_000 + 0.04 * 100_000, 6);
  });

  it('raises the CDHR threshold and deems 12 500 € + 1 500 € per child already paid', () => {
    expect(highIncomeMinimumTax(450_000, 0, rules, couple(0))).toBe(0);
    const target = 0.2 * 1_000_000;
    expect(highIncomeMinimumTax(1_000_000, 150_000, rules, couple(2))).toBeCloseTo(
      target - 150_000 - 12_500 - 2 * 1_500,
      6,
    );
  });
});

describe('prime d’activité by household size (CSS art. D843-1)', () => {
  // Amounts of service-public F2882 from April 2026.
  it('reproduces the published lump sums', () => {
    expect(householdLumpSum(1, 0, rules)).toBeCloseTo(638.28, 2);
    expect(householdLumpSum(2, 0, rules)).toBeCloseTo(957.42, 2);
    expect(householdLumpSum(1, 1, rules)).toBeCloseTo(957.42, 2);
    expect(householdLumpSum(1, 2, rules)).toBeCloseTo(1_148.9, 1);
    expect(householdLumpSum(2, 1, rules)).toBeCloseTo(1_148.9, 1);
    expect(householdLumpSum(2, 2, rules)).toBeCloseTo(1_340.39, 1);
    expect(householdLumpSum(2, 3, rules) - householdLumpSum(2, 2, rules)).toBeCloseTo(255.31, 1);
    expect(householdLumpSum(1, 3, rules) - householdLumpSum(1, 2, rules)).toBeCloseTo(255.31, 1);
  });

  it('counts the housing flat rate of R844-3 by household size', () => {
    expect(housingFlatRate(1, rules)).toBeCloseTo(76.59, 2);
    expect(housingFlatRate(2, rules)).toBeCloseTo(153.19, 2);
    expect(housingFlatRate(4, rules)).toBeCloseTo(189.57, 2);
  });
});

describe('allocations familiales', () => {
  const af = (children: number, childrenAboveAge = 0, annualIncome = 30_000) =>
    familyAllowances({ children, childrenAboveAge, annualIncome }, rules);

  it('starts at two children (DSS instruction 2026/46, from April 2026)', () => {
    expect(af(0)).toBe(0);
    expect(af(1)).toBe(0);
    expect(af(2)).toBeCloseTo(153.01, 2);
    expect(af(3)).toBeCloseTo(349.06, 2);
    expect(af(4)).toBeCloseTo(545.1, 1);
  });

  it('adds the age increase, except for the eldest of two children', () => {
    expect(af(2, 1)).toBeCloseTo(af(2), 6);
    expect(af(2, 2)).toBeCloseTo(153.01 + 76.51, 1);
    expect(af(3, 1)).toBeCloseTo(349.06 + 76.51, 1);
  });

  it('halves then quarters the amounts above the income ceilings', () => {
    expect(af(2, 0, 79_980)).toBeCloseTo(153.01, 2);
    expect(af(2, 0, 80_000)).toBeCloseTo(76.51, 2);
    expect(af(2, 0, 106_604)).toBeCloseTo(76.51, 2);
    expect(af(2, 0, 110_000)).toBeCloseTo(38.25, 2);
    // Ceilings rise by 6 664 € per child: 86 644 € for three children.
    expect(af(3, 0, 86_644)).toBeCloseTo(349.06, 2);
  });
});

describe('apprentice (contract signed since March 2025)', () => {
  const smicAnnual = rules.minimumWage.hourlyGross * rules.minimumWage.monthlyHours * 12;

  it('owes no employee contribution nor CSG-CRDS below half the SMIC', () => {
    const gross = 0.43 * smicAnnual;
    const pay = salaryContributions(gross, rules, 1, true);
    expect(pay.employeeContributions).toBe(0);
    expect(pay.csgDeductible + pay.csgNonDeductible + pay.crds).toBe(0);
    expect(pay.netSalary).toBeCloseTo(gross, 6);
    // Employer contributions follow the common law, with the general relief.
    expect(pay.employerContributions).toBeCloseTo(
      salaryContributions(gross, rules).employerContributions,
      6,
    );
  });

  it('pays employee levies only on the pay above half the SMIC', () => {
    const gross = 0.78 * smicAnnual;
    const pay = salaryContributions(gross, rules, 1, true);
    const ordinary = salaryContributions(gross, rules);
    const liableShare = (gross - 0.5 * smicAnnual) / gross;
    expect(pay.employeeContributions).toBeCloseTo(ordinary.employeeContributions * liableShare, 6);
    expect(pay.crds).toBeGreaterThan(0);
    expect(pay.crds).toBeCloseTo(ordinary.crds * liableShare, 6);
  });

  it('is exempt of income tax up to the annual SMIC (21 622 € for 2025 income)', () => {
    const base = { rentalTaxableIncome: 0, deductibleCsg: 0 };
    expect(personTaxableIncome({ ...base, taxableSalary: 20_000, apprentice: true }, rules)).toBe(
      0,
    );
    expect(
      personTaxableIncome({ ...base, taxableSalary: 25_000, apprentice: true }, rules),
    ).toBeCloseTo(25_000 - 21_622 - 509, 6);
  });
});
