// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Economic situation of one person or household, in plain annual euros, built from
 * `profiles.json` or from the household described by the user; the functions of this
 * folder only read it.
 */
export interface HouseholdInput {
  /** Annual gross salary of a private-sector employee (0 if none). */
  grossSalary: number;
  /** Contract hours / legal full-time hours (1 for full time). */
  hoursRatio: number;
  /** Apprenticeship contract: specific exemptions on the salary. */
  apprentice: boolean;
  /** Self-employed craftsman: turnover minus business costs, before contributions. */
  selfEmployedGrossIncome: number;
  /** Annual gross retirement pension. */
  grossPension: number;
  /** Age in years (age-related tax rules). */
  age: number;
  /** Annual gross rents from unfurnished rentals. */
  rentalIncome: number;
  /** Deductible rental charges, used only under the real regime (above the micro-foncier ceiling). */
  rentalDeductibleCharges: number;
  dividends: number;
  interest: number;
  realizedCapitalGains: number;
  /** Profits retained in companies the household owns: economic income, not taxable income. */
  retainedEarnings: number;
  wealth: {
    mainResidence: number;
    rentalProperty: number;
    financial: number;
    /** Professional assets, exempt from IFI. */
    business: number;
  };
  consumption: {
    /** Annual consumption, VAT included. */
    annualAmount: number;
    /** Share of consumption at each VAT rate; the shares sum to 1 with `exempt`. */
    vatShares: {
      standard: number;
      intermediate: number;
      reduced: number;
      superReduced: number;
      exempt: number;
    };
    /** Share of consumption spent on energy (housing and fuel). */
    energyShare: number;
  };
  /** Annual property tax paid, as on the tax notice (0 for a tenant). */
  propertyTax: number;
  /** Owner without housing aid or housed free: the housing flat rate counts as a resource. */
  housingFlatRateApplies: boolean;
}
