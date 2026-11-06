// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  csgBase,
  employerReliefRate,
  salaryContributions,
} from '../../../src/engine/household/socialContrib.ts';
import urssaf from '../../fixtures/urssaf-salaries-2026.json';
import { relativeGap, rules, rulesWith } from './helpers.ts';

const TOLERANCE = 0.01;

describe('salary contributions vs the official Urssaf simulator (2026)', () => {
  for (const c of urssaf.cases) {
    describe(`case ${c.id}: ${c.label}`, () => {
      const result = salaryContributions(c.grossMonthly * 12, rules);
      const monthly = (annual: number) => annual / 12;

      it('net salary (±1 %)', () => {
        expect(relativeGap(monthly(result.netSalary), c.expectedMonthly.netSalary)).toBeLessThan(
          TOLERANCE,
        );
      });

      it('employer contributions after relief (±1 %)', () => {
        expect(
          relativeGap(
            monthly(result.employerContributions),
            c.expectedMonthly.employerContributions,
          ),
        ).toBeLessThan(TOLERANCE);
      });

      it('general employer relief (RGDU)', () => {
        expect(monthly(result.employerRelief)).toBeCloseTo(c.expectedMonthly.employerRelief, 0);
        if (c.rgduCoefficient !== null && c.rgduCoefficient !== undefined) {
          expect(employerReliefRate(c.grossMonthly * 12, rules)).toBeCloseTo(c.rgduCoefficient, 4);
        }
      });
    });
  }
});

describe('salary contribution rules', () => {
  it('applies the CSG allowance only below 4 ceilings', () => {
    const cap = 4 * rules.socialSecurityCeiling;
    expect(csgBase(cap, rules)).toBeCloseTo(cap * 0.9825, 6);
    expect(csgBase(cap + 1000, rules)).toBeCloseTo(cap * 0.9825 + 1000, 6);
  });

  it('charges the CET only above one ceiling, from the first euro', () => {
    const cet = (gross: number) =>
      salaryContributions(gross, rules).lines.find((l) => l.id === 'employeeCet')?.amount;
    const pass = rules.socialSecurityCeiling;
    expect(cet(pass)).toBe(0);
    expect(cet(pass * 2)).toBeCloseTo(pass * 2 * 0.0014, 6);
  });

  it('has no relief at or above 3 SMIC, nor for a zero salary', () => {
    const r = rules.socialContributions.employerRelief;
    const end = r.endSmicMultiple * r.annualHours * r.smicHourlyReference;
    expect(employerReliefRate(end, rules)).toBe(0);
    expect(employerReliefRate(0, rules)).toBe(0);
  });

  it('caps the relief coefficient at its value for one SMIC (part-time pay)', () => {
    const r = rules.socialContributions.employerRelief;
    expect(employerReliefRate(1000, rules)).toBe(r.tMin + r.tDelta);
  });

  it('never makes the relief exceed the employer contributions', () => {
    const low = rulesWith((r) => {
      for (const item of r.socialContributions.items) item.rate = 0.001;
    });
    const result = salaryContributions(20_000, low);
    expect(result.employerRelief).toBeCloseTo(result.employerContributionsGross, 6);
    expect(result.employerContributions).toBeCloseTo(0, 6);
  });

  it('keeps the accounting identities', () => {
    const r = salaryContributions(50_000, rules);
    expect(r.taxableSalary).toBeCloseTo(r.netSalary + r.csgNonDeductible + r.crds, 6);
    expect(r.employerCost).toBeCloseTo(r.gross + r.employerContributions, 6);
  });
});
