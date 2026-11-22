// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Reste à vivre (PLAN.MD §14.5): disposable income minus pre-committed spending, after
 * the INSEE definition of the revenu arbitrable (survey version: no imputed rent, no
 * loan repayment), with one addition for the user's household: an owner's monthly loan
 * repayment, deducted like a tenant's rent (a departure from the INSEE definition).
 *
 * Pre-committed spending (rent, water and charges, housing energy, telecoms, canteens,
 * insurance, financial services) comes from the household's consumption pattern
 * (Budget de famille 2017, same group as its consumption, recalibrated to current
 * prices). Rent is gross: the housing aid stays in the disposable income, so a change of
 * the aid moves the reste à vivre. A scenario keeps the volumes: it moves pre-committed
 * spending only through the price of housing energy (standard VAT rate, electricity and
 * natural gas excises). Rents, insurance and financial services have no lever.
 */
import type { ProfileResult } from './profiles.ts';
import type { Rules } from './rules.ts';

/** Shares of a consumption pattern (see consumption.json `preCommitted`). */
export interface PreCommittedShares {
  /** Rent net of housing aid / consumption. */
  rentShare: number;
  /** Other pre-committed spending / consumption excluding rent (housing energy included). */
  nonRentShare: number;
  /** Housing energy (electricity, gas, other fuels) / consumption excluding rent. */
  housingEnergyShare: number;
}

/** What the user says of the housing costs (annual euros); absent for a reference profile. */
export interface HousingCosts {
  /** Rent charges excluded, before housing aid (tenant). */
  rent: number;
  /** Repayment of a loan for the main home (owner). */
  housingLoan: number;
}

export interface PreCommitted {
  /** Rent before housing aid. */
  rent: number;
  housingLoan: number;
  /** Housing energy, included in `other`. */
  energy: number;
  /** Every other pre-committed item (water, charges, energy, telecoms, canteens, insurance, banks). */
  other: number;
  total: number;
}

export interface RemainingIncome {
  disposable: number;
  preCommitted: PreCommitted;
  /** Disposable income − pre-committed spending (€ per year, may be negative). */
  remaining: number;
}

/** Excise products of housing energy; heating oil is not borne by households in the model. */
const HOUSING_ENERGY_PRODUCTS = new Set(['electricity', 'naturalGas']);

/** Pre-committed spending of a result under current law. */
export function referencePreCommitted(
  result: ProfileResult,
  shares: PreCommittedShares,
  housing?: HousingCosts,
): PreCommitted {
  const consumption = result.consumption;
  // A profile's rent is that of its group, net of aid as in the survey; the user's is typed in.
  const netRent = housing
    ? Math.max(0, housing.rent - result.housingAid)
    : shares.rentShare * consumption;
  const rent = housing ? housing.rent : netRent + result.housingAid;
  const housingLoan = housing?.housingLoan ?? 0;
  const base = Math.max(0, consumption - netRent);
  const other = shares.nonRentShare * base;
  const energy = shares.housingEnergyShare * base;
  return { rent, housingLoan, energy, other, total: rent + housingLoan + other };
}

/**
 * The same spending at the scenario's prices, for the same volumes: housing energy follows
 * the standard VAT rate and the electricity and gas excises.
 */
export function scenarioPreCommitted(
  reference: PreCommitted,
  referenceResult: ProfileResult,
  referenceRules: Rules,
  scenarioRules: Rules,
): PreCommitted {
  const vatBefore = referenceRules.vat.standard;
  const vatAfter = scenarioRules.vat.standard;
  // Excise on the household's electricity and gas, as the model counts it (consumption ×
  // energy share × excise share × product weight), moved by each tariff's relative change.
  const { annualAmount, energyShare } = referenceResult.input.consumption;
  const exciseShare = referenceRules.energyExcise.shareOfEnergySpending;
  const exciseChange = referenceRules.energyExcise.products
    .filter((p) => HOUSING_ENERGY_PRODUCTS.has(p.id) && p.rate > 0)
    .reduce((sum, product) => {
      const after = scenarioRules.energyExcise.products.find((p) => p.id === product.id);
      const change = (after?.rate ?? product.rate) / product.rate - 1;
      return sum + annualAmount * energyShare * exciseShare * product.householdWeight * change;
    }, 0);
  const energy =
    reference.energy * ((1 + vatAfter) / (1 + vatBefore)) + exciseChange * (1 + vatAfter);
  const other = reference.other - reference.energy + energy;
  return {
    ...reference,
    energy,
    other,
    total: reference.rent + reference.housingLoan + other,
  };
}

export function remainingOf(disposable: number, preCommitted: PreCommitted): RemainingIncome {
  return { disposable, preCommitted, remaining: disposable - preCommitted.total };
}

/** Reste à vivre under current law and under the scenario. */
export function remainingIncome(
  reference: ProfileResult,
  scenario: ProfileResult,
  shares: PreCommittedShares,
  referenceRules: Rules,
  scenarioRules: Rules,
  housing?: HousingCosts,
): { reference: RemainingIncome; scenario: RemainingIncome } {
  const before = referencePreCommitted(reference, shares, housing);
  const after = scenarioPreCommitted(before, reference, referenceRules, scenarioRules);
  return {
    reference: remainingOf(reference.disposableIncome, before),
    scenario: remainingOf(scenario.disposableIncome, after),
  };
}
