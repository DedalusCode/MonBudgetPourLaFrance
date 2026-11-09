// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Content of the "Bilan" window (PLAN.MD §13.7): the modified levers in the order of the
 * panel, grouped into levies, spending and projection assumptions, and the totals of the
 * summary bar. The effects of the lines add up to these totals (tested).
 */
import type { Model, SimulationResult } from '../engine/simulate.ts';
import { reportLine, type ReportLine } from './impactText.ts';

export interface ReportLines {
  levies: ReportLine[];
  spending: ReportLine[];
  projection: ReportLine[];
  count: number;
}

export function reportLines(
  model: Model,
  result: SimulationResult,
  levers: Record<string, number>,
): ReportLines {
  const lines: ReportLines = { levies: [], spending: [], projection: [], count: 0 };
  for (const lever of model.levers.values()) {
    const value = levers[lever.id];
    if (value === undefined) continue;
    const line = reportLine(model, result, lever, value);
    if (lever.group === 'spending') lines.spending.push(line);
    else if (lever.group === 'macro') lines.projection.push(line);
    else lines.levies.push(line);
    lines.count += 1;
  }
  return lines;
}

export interface ReportTotals {
  revenue: number;
  spending: number;
  balance: number;
  /** Debt at the end of the projection: change in Md€ and in points of GDP. */
  debt: { year: number; change: number; ratioChange: number } | null;
}

/** Changes of the summary bar, scenario versus current law. */
export function reportTotals(reference: SimulationResult, result: SimulationResult): ReportTotals {
  const now = result.aggregates;
  const before = reference.aggregates;
  const last = now.debtPath.at(-1);
  const lastBefore = before.debtPath.at(-1);
  return {
    revenue: now.revenue - before.revenue,
    spending: now.spending - before.spending,
    balance: now.balance - before.balance,
    debt:
      last && lastBefore
        ? {
            year: last.year,
            change: last.debt - lastBefore.debt,
            ratioChange: last.debtToGdp - lastBefore.debtToGdp,
          }
        : null,
  };
}
