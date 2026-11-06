// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Reference spending by COFOG group for the accounts year. The breakdown by function
 * is published about a year after the totals: until then, the latest published amounts
 * (`spending.structureYear`) are scaled to the accounts year total by `spending.scaling`.
 */
import { resolve } from './rules.ts';
import type { Dataset } from './types.ts';

export function referenceGroupAmounts(data: Dataset): Record<string, number> {
  const scaling = resolve(data.spending.scaling, 'spending.scaling');
  const amounts: Record<string, number> = {};
  for (const division of data.spending.divisions) {
    for (const group of division.groups) {
      const amount = resolve(group.amount, `spending.${group.code}`) * scaling;
      amounts[group.code] = Math.round(amount * 1e4) / 1e4;
    }
  }
  return amounts;
}
