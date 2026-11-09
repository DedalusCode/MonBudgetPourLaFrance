// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { activityBonus, individualBonus } from '../../../src/engine/household/benefits.ts';
import { capitalIncome, rentalTaxableIncome } from '../../../src/engine/household/capitalTax.ts';
import { consumptionTax, vatIncluded } from '../../../src/engine/household/consumptionTax.ts';
import { householdLevies } from '../../../src/engine/household/index.ts';
import { propertyTax } from '../../../src/engine/household/propertyTax.ts';
import {
  grossForProfessionalIncome,
  selfEmployedContributions,
} from '../../../src/engine/household/selfEmployed.ts';
import { taxableRealEstate, wealthTax } from '../../../src/engine/household/wealthTax.ts';
import { resolve } from '../../../src/engine/rules.ts';
import { emptyHousehold, rules } from './helpers.ts';

const noWealth = emptyHousehold.wealth;

describe('capital income', () => {
  it('uses the micro-foncier allowance up to 15 000 € of rents', () => {
    expect(rentalTaxableIncome(12_000, 0, rules)).toBeCloseTo(8_400, 6);
  });

  it('uses actual charges above the ceiling, without deficit', () => {
    expect(rentalTaxableIncome(120_000, 30_000, rules)).toBe(90_000);
    expect(rentalTaxableIncome(20_000, 30_000, rules)).toBe(0);
  });

  it('applies the PFU and social levies at their 2026 rates', () => {
    const r = capitalIncome(
      {
        ...emptyHousehold,
        dividends: 6_000,
        interest: 3_000,
        realizedCapitalGains: 1_000,
        rentalIncome: 12_000,
      },
      rules,
    );
    expect(r.flatTaxIncomePart).toBeCloseTo(1_280, 6);
    expect(r.socialLeviesFinancial).toBeCloseTo(1_860, 6);
    expect(r.socialLeviesRental).toBeCloseTo(8_400 * 0.172, 6);
    expect(r.deductibleCsg).toBeCloseTo(8_400 * 0.068, 6);
  });
});

describe('IFI', () => {
  it('is zero below 1.3 M€ of taxable real estate (30 % off the main residence)', () => {
    const wealth = { ...noWealth, mainResidence: 1_800_000 };
    expect(taxableRealEstate(wealth, rules)).toBeCloseTo(1_260_000, 6);
    expect(wealthTax(wealth, rules)).toBe(0);
  });

  it('applies the décote between 1.3 and 1.4 M€', () => {
    // Barème: 0.5 % × 500 000 + 0.7 % × 50 000 = 2 850 €; décote 17 500 − 1.25 % × 1 350 000 = 625 €.
    expect(wealthTax({ ...noWealth, rentalProperty: 1_350_000 }, rules)).toBeCloseTo(2_225, 6);
  });

  it('applies the barème above', () => {
    // 2 500 + 0.7 % × 1 270 000 + 1 % × 430 000 = 15 690 €.
    expect(wealthTax({ ...noWealth, rentalProperty: 3_000_000 }, rules)).toBeCloseTo(15_690, 6);
  });

  it('exempts financial and professional assets', () => {
    expect(wealthTax({ ...noWealth, financial: 50e6, business: 50e6 }, rules)).toBe(0);
  });
});

describe('consumption taxes', () => {
  it('extracts the VAT included in prices', () => {
    expect(vatIncluded(1_200, 0.2)).toBeCloseTo(200, 6);
  });

  it('applies each VAT rate to its share and the excise to energy', () => {
    const r = consumptionTax(
      {
        annualAmount: 12_000,
        vatShares: {
          standard: 0.5,
          intermediate: 0.1,
          reduced: 0.2,
          superReduced: 0.05,
          exempt: 0.15,
        },
        energyShare: 0.1,
      },
      rules,
    );
    const expectedVat =
      (6_000 * 0.2) / 1.2 + (1_200 * 0.1) / 1.1 + (2_400 * 0.055) / 1.055 + (600 * 0.021) / 1.021;
    expect(r.vat).toBeCloseTo(expectedVat, 6);
    expect(r.energyExcise).toBeCloseTo(12_000 * 0.1 * 0.216, 6);
  });
});

describe('property tax', () => {
  it('is the notice amount, scaled by the lever', () => {
    expect(propertyTax({ propertyTax: 1_000 })).toBe(1_000);
    expect(propertyTax({ propertyTax: -5 })).toBe(0);
  });
});

describe('prime d’activité (single, no child)', () => {
  const smic = rules.minimumWage.hourlyGross;
  const start = 59 * smic;
  const full = 138 * smic;

  it('has an individual bonus rising linearly from 59 to 138 hourly SMICs', () => {
    expect(individualBonus(start, rules)).toBe(0);
    expect(individualBonus(full, rules)).toBe(240.63);
    expect(individualBonus((start + full) / 2, rules)).toBeCloseTo(240.63 / 2, 6);
  });

  it('matches the formula at the net SMIC', () => {
    // 638.28 + 59.85 % × 1 477.93 + bonus − 1 477.93, bonus = 240.63 × (1 477.93 − 59 × 12.31) / (79 × 12.31).
    const bonus = (240.63 * (1_477.93 - start)) / (full - start);
    const expected = 638.28 + 0.5985 * 1_477.93 + bonus - 1_477.93;
    expect(
      activityBonus(
        { monthlyEarnings: 1_477.93, otherMonthlyResources: 0, housingFlatRateApplies: false },
        rules,
      ),
    ).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(230.87, 1);
  });

  it('uses the lump sum as minimum resources for low earnings', () => {
    expect(
      activityBonus(
        { monthlyEarnings: 500, otherMonthlyResources: 0, housingFlatRateApplies: false },
        rules,
      ),
    ).toBeCloseTo(0.5985 * 500, 6);
  });

  it('counts the housing flat rate as a resource', () => {
    const base = { monthlyEarnings: 1_000, otherMonthlyResources: 0 };
    const without = activityBonus({ ...base, housingFlatRateApplies: false }, rules);
    const withFlat = activityBonus({ ...base, housingFlatRateApplies: true }, rules);
    expect(without - withFlat).toBeCloseTo(638.28 * 0.12, 6);
  });

  it('is not paid below 15 € a month (CSS art. D846-2)', () => {
    const bonus = (monthlyEarnings: number) =>
      activityBonus(
        { monthlyEarnings, otherMonthlyResources: 0, housingFlatRateApplies: false },
        rules,
      );
    // 59.85 % of 20 € = 11.97 €, below the threshold; 59.85 % of 30 € = 17.96 €, paid.
    expect(bonus(20)).toBe(0);
    expect(bonus(30)).toBeCloseTo(0.5985 * 30, 6);
  });

  it('is zero without earnings or with high earnings', () => {
    expect(
      activityBonus(
        { monthlyEarnings: 0, otherMonthlyResources: 0, housingFlatRateApplies: false },
        rules,
      ),
    ).toBe(0);
    expect(
      activityBonus(
        { monthlyEarnings: 3_000, otherMonthlyResources: 0, housingFlatRateApplies: false },
        rules,
      ),
    ).toBe(0);
  });
});

describe('household levies', () => {
  it('chains salary, income tax, capital and consumption taxes', () => {
    const r = householdLevies(
      {
        ...emptyHousehold,
        grossSalary: 60_000,
        dividends: 400_000,
        rentalIncome: 12_000,
        wealth: { ...noWealth, rentalProperty: 3_000_000 },
        consumption: {
          ...emptyHousehold.consumption,
          annualAmount: 1_200,
          vatShares: { ...emptyHousehold.consumption.vatShares, standard: 1, exempt: 0 },
        },
        propertyTax: 900,
      },
      rules,
    );
    expect(r.referenceIncome).toBeCloseTo(r.incomeTax.taxableIncome + 400_000, 6);
    expect(r.highIncomeContribution).toBeGreaterThan(0);
    expect(r.highIncomeMinimumTax).toBeGreaterThanOrEqual(0);
    expect(r.wealthTax).toBeCloseTo(15_690, 6);
    expect(r.vat).toBeCloseTo(200, 6);
    expect(r.propertyTax).toBe(900);
    expect(r.activityBonus).toBe(0);
  });

  it('pays the prime d’activité yearly at the SMIC', () => {
    const r = householdLevies({ ...emptyHousehold, grossSalary: 1_867.02 * 12 }, rules);
    expect(r.activityBonus / 12).toBeCloseTo(230.87, 0);
    expect(r.incomeTax.tax).toBe(0);
  });
});

describe('rules resolution', () => {
  it('refuses to run on a missing value', () => {
    expect(() =>
      resolve({ rate: { value: null, unit: 'rate', status: 'A_VERIFIER' } }, 'taxRules'),
    ).toThrow('Missing value at taxRules.rate');
  });
});

describe('review fixes', () => {
  it('owes no IFI on a patrimony exactly at the threshold (due only above it)', () => {
    const atThreshold = { ...emptyHousehold.wealth, rentalProperty: rules.wealthTax.threshold };
    expect(wealthTax(atThreshold, rules)).toBe(0);
  });

  it('inverts small incomes despite fixed minimum contributions', () => {
    const gross = grossForProfessionalIncome(1_000, rules);
    expect(selfEmployedContributions(gross, rules).taxableIncome).toBeCloseTo(1_000, 3);
  });
});
