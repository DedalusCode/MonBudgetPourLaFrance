// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Consistency of the reference data (PLAN.MD step 3): the detailed
 * breakdowns must add up to the published totals.
 */
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import type { DataValue } from '../../src/engine/types.ts';
import { relativeGap } from '../helpers.ts';

const TOLERANCE = 0.005; // 0.5 %

const data = loadDataset();
const accountsYear = data.meta.accountsYear;

function known(v: DataValue): number {
  if (v.value === null) throw new Error('Expected a known value');
  return v.value;
}

describe('reference year', () => {
  it('is set, and every aggregate refers to it', () => {
    const year = data.meta.accountsYear;
    const yearEnd = `${String(year)}-12-31`;
    const aggregates = [
      data.macro.gdp,
      data.macro.debt,
      data.macro.totalRevenue,
      data.macro.totalSpending,
      data.macro.interestCharge,
      ...data.revenues.items.map((r) => r.amount),
      data.spending.scaling,
    ];
    for (const v of aggregates) expect(v.asOf).toBe(yearEnd);
  });

  it('COFOG amounts refer to the latest published breakdown, at most one year older', () => {
    const year = data.spending.structureYear;
    expect(known(data.spending.scaling)).toBeGreaterThan(0);
    expect(accountsYear - year).toBeGreaterThanOrEqual(0);
    expect(accountsYear - year).toBeLessThanOrEqual(1);
    for (const g of data.spending.divisions.flatMap((d) => d.groups)) {
      expect(g.amount.asOf, g.code).toBe(`${String(year)}-12-31`);
    }
    if (year === data.meta.accountsYear) expect(data.spending.scaling.value).toBe(1);
  });
});

describe('spending', () => {
  it('scaled COFOG groups add up to total spending (±0.5 %)', () => {
    const cofogTotal =
      data.spending.divisions
        .flatMap((d) => d.groups)
        .reduce((sum, g) => sum + known(g.amount), 0) * known(data.spending.scaling);
    expect(relativeGap(cofogTotal, known(data.macro.totalSpending))).toBeLessThanOrEqual(TOLERANCE);
  });

  it('every COFOG amount is verified', () => {
    for (const g of data.spending.divisions.flatMap((d) => d.groups)) {
      expect(g.amount.status, g.code).toBe('VERIFIE');
    }
  });
});

describe('revenues', () => {
  it('revenue items add up to total revenue (±0.5 %)', () => {
    const itemsTotal = data.revenues.items.reduce((sum, r) => sum + known(r.amount), 0);
    expect(relativeGap(itemsTotal, known(data.macro.totalRevenue))).toBeLessThanOrEqual(TOLERANCE);
  });
});

describe('macro', () => {
  it('has every value needed by the debt projection', () => {
    const { forecast, ...values } = data.macro;
    for (const [key, v] of Object.entries(values)) {
      expect(v.value, key).not.toBeNull();
    }
    expect(forecast.year).toBe(accountsYear + 1);
  });

  it('the apparent rate matches the forecast interest charge on the accounts year debt (±2 %)', () => {
    // Interest of year t+1 = debt at the end of year t × apparent rate of year t+1.
    const implied = known(data.macro.forecast.interestCharge) / known(data.macro.debt);
    expect(relativeGap(implied, known(data.macro.apparentInterestRate))).toBeLessThan(0.02);
  });
});
