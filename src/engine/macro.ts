// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Public-finance aggregates and debt path (PLAN.MD §7.1). Static: levers move
 * revenue and spending mechanically, with no behavioural or growth feedback.
 *
 * Projection: GDP grows at the nominal growth rate; the primary balance (balance
 * before interest) keeps its share of GDP; interest = debt at the start of the
 * year × apparent interest rate; debt(t) = debt(t − 1) − balance(t).
 */

export interface MacroInput {
  baseYear: number;
  gdp: number;
  /** Debt at the end of the base year. */
  debt: number;
  revenue: number;
  /** Total spending, interest included. */
  spending: number;
  interest: number;
  nominalGrowth: number;
  apparentInterestRate: number;
  horizon: number;
}

export interface DebtPathPoint {
  year: number;
  gdp: number;
  balance: number;
  interest: number;
  debt: number;
  debtToGdp: number;
}

export interface Aggregates {
  revenue: number;
  spending: number;
  balance: number;
  gdp: number;
  revenueToGdp: number;
  spendingToGdp: number;
  balanceToGdp: number;
  debt: number;
  debtToGdp: number;
  /** Base year first, then one point per projected year. */
  debtPath: DebtPathPoint[];
}

export function aggregates(input: MacroInput): Aggregates {
  const balance = input.revenue - input.spending;
  const primaryToGdp = (balance + input.interest) / input.gdp;
  let previous: DebtPathPoint = {
    year: input.baseYear,
    gdp: input.gdp,
    balance,
    interest: input.interest,
    debt: input.debt,
    debtToGdp: input.debt / input.gdp,
  };
  const debtPath = [previous];
  for (let t = 1; t <= input.horizon; t++) {
    const gdp = previous.gdp * (1 + input.nominalGrowth);
    const interest = previous.debt * input.apparentInterestRate;
    const yearBalance = primaryToGdp * gdp - interest;
    const debt = previous.debt - yearBalance;
    previous = {
      year: input.baseYear + t,
      gdp,
      balance: yearBalance,
      interest,
      debt,
      debtToGdp: debt / gdp,
    };
    debtPath.push(previous);
  }
  return {
    revenue: input.revenue,
    spending: input.spending,
    balance,
    gdp: input.gdp,
    revenueToGdp: input.revenue / input.gdp,
    spendingToGdp: input.spending / input.gdp,
    balanceToGdp: balance / input.gdp,
    debt: input.debt,
    debtToGdp: input.debt / input.gdp,
    debtPath,
  };
}
