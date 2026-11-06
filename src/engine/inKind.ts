// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Public services received in kind (PLAN.MD §5.5). Each COFOG group is either
 * shared per capita, weighted by an index that may depend on the profile (age
 * group, student...), or not allocated to the profiles (cash transfers, debt
 * interest...). A spending cut therefore lowers the services received.
 */
import type { Resolved } from './rules.ts';
import type { InKindAllocationFile } from './types.ts';

export type Allocation = Resolved<InKindAllocationFile>;

export interface InKindResult {
  /** € per year received by one person, by COFOG group code. */
  byGroup: Record<string, number>;
  /** Same, summed by COFOG division ("01".."10"). */
  byDivision: Record<string, number>;
  total: number;
}

/**
 * @param groupAmounts spending by COFOG group code, in billions of euros.
 * @param population number of inhabitants.
 * @param keys the profile's keys (age group, student...), by priority.
 */
export function inKindReceived(
  groupAmounts: Record<string, number>,
  allocation: Allocation,
  population: number,
  keys: readonly string[],
): InKindResult {
  const byGroup: Record<string, number> = {};
  const byDivision: Record<string, number> = {};
  let total = 0;
  for (const rule of allocation.rules) {
    const perCapita = ((groupAmounts[rule.cofog] ?? 0) * 1e9) / population;
    let amount = 0;
    if (rule.mode === 'perCapita') {
      const byKey = keys.map((k) => rule.indexByKey?.[k]).find((i) => i !== undefined);
      amount = perCapita * (byKey ?? rule.index ?? 1);
    }
    byGroup[rule.cofog] = amount;
    const division = rule.cofog.slice(0, 2);
    byDivision[division] = (byDivision[division] ?? 0) + amount;
    total += amount;
  }
  return { byGroup, byDivision, total };
}
