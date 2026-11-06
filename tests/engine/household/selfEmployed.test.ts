// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  grossForProfessionalIncome,
  interpolatedRate,
  selfEmployedContributions,
} from '../../../src/engine/household/selfEmployed.ts';
import {
  employerReliefRate,
  salaryContributions,
} from '../../../src/engine/household/socialContrib.ts';
import independants from '../../fixtures/urssaf-independants-2026.json';
import partTime from '../../fixtures/urssaf-temps-partiel-2026.json';
import { relativeGap, rules } from './helpers.ts';

describe('self-employed craftsman vs the official Urssaf model (2026 reform)', () => {
  for (const c of independants.cases) {
    it(`gross income ${String(c.grossIncome)} €`, () => {
      const r = selfEmployedContributions(c.grossIncome, rules);
      expect(relativeGap(r.contributions, c.contributions)).toBeLessThan(0.01);
      expect(relativeGap(r.csgDeductible + r.csgNonDeductible + r.crds, c.csgCrds)).toBeLessThan(
        0.01,
      );
      expect(r.trainingContribution).toBe(c.trainingContribution);
      expect(relativeGap(r.netIncome, c.netIncome)).toBeLessThan(0.01);
      expect(relativeGap(r.taxableIncome, c.taxableIncome)).toBeLessThan(0.01);
    });
  }

  it('finds the gross income of a target professional income', () => {
    const gross = grossForProfessionalIncome(31_440, rules);
    expect(selfEmployedContributions(gross, rules).taxableIncome).toBeCloseTo(31_440, 3);
    expect(relativeGap(gross, 44_384)).toBeLessThan(0.01);
  });

  it('pays nothing without income, and minimum contributions on a small one', () => {
    expect(selfEmployedContributions(0, rules).contributions).toBe(0);
    const small = selfEmployedContributions(2_000, rules);
    // Minimum bases: base pension 5 409 €, disability 11.5 % and daily allowances 40 % of the ceiling.
    expect(small.contributions).toBeGreaterThan(5_409 * 0.1787);
  });

  it('interpolates progressive rates and caps them at the last point', () => {
    const scale = [
      { passMultiple: 0, rate: 0 },
      { passMultiple: 1, rate: 0.1 },
    ];
    expect(interpolatedRate(500, scale, 1_000)).toBeCloseTo(0.05, 9);
    expect(interpolatedRate(5_000, scale, 1_000)).toBe(0.1);
  });
});

describe('part-time salary at the SMIC vs the official Urssaf simulator', () => {
  const ratio = partTime.weeklyHours / 35;
  const r = salaryContributions(partTime.grossMonthly * 12, rules, ratio);
  const monthly = (x: number) => x / 12;

  it('prorates the RGDU SMIC to the contract hours', () => {
    expect(employerReliefRate(partTime.grossMonthly * 12, rules, ratio)).toBeCloseTo(
      partTime.rgduCoefficient,
      4,
    );
    expect(employerReliefRate(partTime.grossMonthly * 12, rules)).toBe(
      rules.socialContributions.employerRelief.tMin +
        rules.socialContributions.employerRelief.tDelta,
    );
  });

  it('matches net, taxable salary and employer contributions (±1 %)', () => {
    const e = partTime.expectedMonthly;
    expect(relativeGap(monthly(r.netSalary), e.netSalary)).toBeLessThan(0.01);
    expect(relativeGap(monthly(r.taxableSalary), e.taxableSalary)).toBeLessThan(0.01);
    expect(relativeGap(monthly(r.employerContributions), e.employerContributions)).toBeLessThan(
      0.01,
    );
    expect(relativeGap(monthly(r.employerRelief), e.employerRelief)).toBeLessThan(0.01);
  });
});
