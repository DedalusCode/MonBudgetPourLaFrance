// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Economic situation of one person or household, in plain annual euros, built from
 * `profiles.json` or from the household described by the user; the functions of this
 * folder only read it.
 */
/** Pension regime of a public servant: the State (CAS Pensions) or the CNRACL (local and hospital). */
export type PublicRegime = 'state' | 'local';

export interface PublicAgent {
  regime: PublicRegime;
  /** Territorial civil service (collectivités); false for the State and the hospitals. */
  territorial?: boolean;
  /** Share of bonuses (primes, indemnités) in gross pay; the rest is the indexed salary. */
  bonusShare: number;
}

/**
 * Real-regime self-employed: `craft` (artisans and traders, SSI), `liberal` (non-regulated
 * liberal professions, SSI), `cipav` (liberal professions of the Cipav), `farmer` (MSA).
 */
export type SelfEmployedScheme = 'craft' | 'liberal' | 'cipav' | 'farmer';

export type MicroActivity = 'sales' | 'services' | 'liberal' | 'cipav';

export interface MicroBusiness {
  activity: MicroActivity;
  /** Annual turnover. */
  turnover: number;
  /** Versement libératoire: income tax paid as a share of turnover. */
  flatTax: boolean;
}

export interface HouseholdInput {
  /** Annual gross salary of an employee (0 if none), or gross pay of a public servant. */
  grossSalary: number;
  /** Public servant (fonctionnaire): the salary follows the public-sector rules. */
  publicAgent?: PublicAgent;
  /** Student with a job: eligible to the prime d'activité only above a level of earnings. */
  student?: boolean;
  /** Contract hours / legal full-time hours (1 for full time). */
  hoursRatio: number;
  /** Apprenticeship contract: specific exemptions on the salary. */
  apprentice: boolean;
  /** Self-employed (real regime): turnover minus business costs, before contributions. */
  selfEmployedGrossIncome: number;
  /** Scheme of the self-employed income; a craftsman or trader by default. */
  selfEmployedScheme?: SelfEmployedScheme;
  /** Micro-entrepreneur: turnover and options; replaces the self-employed income. */
  micro?: MicroBusiness;
  /** Annual gross unemployment insurance benefit (ARE). */
  unemploymentBenefit?: number;
  /** Annual gross invalidity pension. */
  invalidityPension?: number;
  /** Disability card (taux d'incapacité ≥ 80 %): extra half-part and income tax allowance. */
  disabilityCard?: boolean;
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
