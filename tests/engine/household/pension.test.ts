// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { elderlyAllowance, incomeTax } from '../../../src/engine/household/incomeTax.ts';
import {
  csgBand,
  grossForNetPension,
  pensionAllowance,
  pensionLevies,
  pensionOnly,
} from '../../../src/engine/household/pension.ts';
import { loadDataset } from '../../../src/engine/params.ts';
import { createModel, simulate } from '../../../src/engine/simulate.ts';
import { rules } from './helpers.ts';

// Rates and thresholds from service-public F2971 (2026) and F415 (2025 incomes).
describe('CSG band of a pension', () => {
  it('follows the reference income thresholds for one part', () => {
    expect(csgBand(13_048, rules)).toBe('zero');
    expect(csgBand(13_049, rules)).toBe('reduced');
    expect(csgBand(17_057, rules)).toBe('reduced');
    expect(csgBand(17_058, rules)).toBe('median');
    expect(csgBand(26_473, rules)).toBe('normal');
  });
});

describe('levies on a pension', () => {
  it('charges 4.3 %, 7.4 % then 9.1 % (CSG + CRDS + CASA) plus 1 % on the complementary part', () => {
    const total = (band: 'reduced' | 'median' | 'normal') => {
      const r = pensionLevies(10_000, band, rules);
      return r.csgDeductible + r.csgNonDeductible + r.crds + r.casa;
    };
    expect(total('reduced')).toBeCloseTo(430, 6);
    expect(total('median')).toBeCloseTo(740, 6);
    expect(total('normal')).toBeCloseTo(910, 6);
    expect(pensionLevies(10_000, 'reduced', rules).complementaryHealth).toBe(0);
    expect(pensionLevies(10_000, 'normal', rules).complementaryHealth).toBeCloseTo(
      10_000 * 0.4 * 0.01,
      6,
    );
  });

  it('exempts a small pension entirely', () => {
    const r = pensionOnly(12_000, rules);
    expect(r.band).toBe('zero');
    expect(r.net).toBe(12_000);
  });

  it('deducts the deductible CSG and the health contribution from taxable income', () => {
    const r = pensionLevies(30_000, 'normal', rules);
    expect(r.taxable).toBeCloseTo(30_000 * (1 - 0.059) - 30_000 * 0.4 * 0.01, 6);
  });

  it('inverts the net pension', () => {
    const gross = grossForNetPension(30_000, rules);
    expect(pensionOnly(gross, rules).net).toBeCloseTo(30_000, 3);
  });
});

describe('income tax on pensions', () => {
  it('applies the 10 % allowance within 454 € and 4 439 €', () => {
    expect(pensionAllowance(3_000, rules)).toBe(454);
    expect(pensionAllowance(300, rules)).toBe(300);
    expect(pensionAllowance(20_000, rules)).toBeCloseTo(2_000, 6);
    expect(pensionAllowance(60_000, rules)).toBe(4_439);
    expect(pensionAllowance(0, rules)).toBe(0);
  });

  it('gives the over-65 allowance by net income band (CGI 157 bis)', () => {
    expect(elderlyAllowance(15_000, 70, rules)).toBe(2_822);
    expect(elderlyAllowance(20_000, 70, rules)).toBe(1_411);
    expect(elderlyAllowance(30_000, 70, rules)).toBe(0);
    // Aged 65 or more on 31 December, i.e. born before 1 January of N − 65 (BOFiP).
    expect(elderlyAllowance(15_000, 65, rules)).toBe(2_822);
    expect(elderlyAllowance(15_000, 64, rules)).toBe(0);
    expect(elderlyAllowance(15_000, undefined, rules)).toBe(0);
  });

  it('combines both allowances', () => {
    const r = incomeTax(
      {
        taxableSalary: 0,
        rentalTaxableIncome: 0,
        deductibleCsg: 0,
        taxablePension: 20_000,
        age: 70,
      },
      rules,
    );
    expect(r.taxableIncome).toBeCloseTo(20_000 - 2_000 - 1_411, 6);
  });
});

describe('pensions in the simulation', () => {
  it('follow old-age spending (COFOG 10.2)', () => {
    const model = createModel(loadDataset());
    const oldAge = model.levers.get('spending.cofog.10.2')?.reference ?? NaN;
    const r = simulate(model, {
      schemaVersion: 1,
      baseYear: 2026,
      levers: { 'spending.cofog.10.2': oldAge * 0.9 },
    });
    const retiree = r.profiles.find((p) => p.id === 'retiree2500');
    expect(retiree?.scenario.pension).toBeCloseTo((retiree?.reference.pension ?? NaN) * 0.9, 6);
    expect(retiree?.benefitsImpact).toBeLessThan(0);
    expect(retiree?.leviesImpact).toBeGreaterThan(0);
    expect(r.profiles.find((p) => p.id === 'cadre3k')?.benefitsImpact).toBe(0);
  });
});

describe('housing aid of the student', () => {
  it('follows housing benefits spending (COFOG 10.6)', () => {
    const model = createModel(loadDataset());
    const housing = model.levers.get('spending.cofog.10.6')?.reference ?? NaN;
    const r = simulate(model, {
      schemaVersion: 1,
      baseYear: 2026,
      levers: { 'spending.cofog.10.6': housing * 0.8 },
    });
    const student = r.profiles.find((p) => p.id === 'student');
    expect(student?.reference.housingAid).toBe(165 * 12);
    expect(student?.scenario.housingAid).toBeCloseTo(165 * 12 * 0.8, 6);
    expect(student?.benefitsImpact).toBeCloseTo(-165 * 12 * 0.2, 6);
  });
});
