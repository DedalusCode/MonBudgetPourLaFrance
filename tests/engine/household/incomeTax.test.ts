// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  highIncomeContribution,
  highIncomeMinimumTax,
  incomeTax,
  professionalExpensesAllowance,
  progressiveTax,
} from '../../../src/engine/household/incomeTax.ts';
import { rules } from './helpers.ts';

// Expected values below are computed by hand from the 2026 barème (CGI art. 197):
// 0 % up to 11 600 €, 11 % up to 29 579 €, 30 % up to 84 577 €, 41 % up to 181 917 €, 45 % above.
const tax = (taxableIncome: number) =>
  incomeTax({ taxableSalary: 0, rentalTaxableIncome: taxableIncome, deductibleCsg: 0 }, rules);

describe('income tax barème', () => {
  it('applies each bracket to its slice of income', () => {
    expect(progressiveTax(30_000, rules.incomeTax.brackets)).toBeCloseTo(
      0.11 * (29_579 - 11_600) + 0.3 * (30_000 - 29_579),
      6,
    );
    expect(progressiveTax(11_600, rules.incomeTax.brackets)).toBe(0);
  });

  it('has no décote once the tax is high enough', () => {
    const r = tax(30_000);
    expect(r.decote).toBe(0);
    expect(r.tax).toBeCloseTo(2_103.99, 2);
  });

  it('reduces small taxes with the décote (897 € − 45.25 % of the tax)', () => {
    const r = tax(20_000);
    expect(r.grossTax).toBeCloseTo(924, 6);
    expect(r.decote).toBeCloseTo(897 - 0.4525 * 924, 6);
    expect(r.tax).toBeCloseTo(445.11, 2);
  });

  it('cancels very small taxes entirely', () => {
    const r = tax(15_000);
    expect(r.grossTax).toBeCloseTo(374, 6);
    expect(r.tax).toBe(0);
  });

  it('deducts the 10 % allowance on salaries and the deductible CSG', () => {
    const r = incomeTax(
      { taxableSalary: 40_000, rentalTaxableIncome: 5_000, deductibleCsg: 340 },
      rules,
    );
    expect(r.taxableIncome).toBeCloseTo(40_000 - 4_000 + 5_000 - 340, 6);
  });
});

describe('professional expenses allowance', () => {
  it('is 10 % within its floor and ceiling', () => {
    expect(professionalExpensesAllowance(20_000, rules)).toBeCloseTo(2_000, 6);
    expect(professionalExpensesAllowance(3_000, rules)).toBe(509);
    expect(professionalExpensesAllowance(200_000, rules)).toBe(14_555);
  });

  it('never exceeds the salary itself', () => {
    expect(professionalExpensesAllowance(300, rules)).toBe(300);
    expect(professionalExpensesAllowance(0, rules)).toBe(0);
  });
});

describe('high-income contributions', () => {
  it('CEHR: 3 % from 250 000 € and 4 % from 500 000 €', () => {
    expect(highIncomeContribution(200_000, rules)).toBe(0);
    expect(highIncomeContribution(600_000, rules)).toBeCloseTo(0.03 * 250_000 + 0.04 * 100_000, 6);
  });

  it('CDHR: nothing up to 250 000 €', () => {
    expect(highIncomeMinimumTax(250_000, 0, rules)).toBe(0);
  });

  it('CDHR: smoothed target between 250 000 and 330 000 €', () => {
    // Target = min(20 % × 300 000, 82.5 % × 50 000) = 41 250 €.
    expect(highIncomeMinimumTax(300_000, 40_000, rules)).toBeCloseTo(1_250, 6);
  });

  it('CDHR: tops taxes up to 20 % above 330 000 €', () => {
    expect(highIncomeMinimumTax(1_000_000, 150_000, rules)).toBeCloseTo(50_000, 6);
    expect(highIncomeMinimumTax(1_000_000, 250_000, rules)).toBe(0);
  });
});
