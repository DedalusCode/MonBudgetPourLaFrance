// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Reference spending by COFOG group for the accounts year. The breakdown by function
 * is published about a year after the totals: until then, the latest published amounts
 * (`spending.structureYear`) are scaled to the accounts year total by `spending.scaling`.
 */
import { resolve } from './rules.ts';
import type { Dataset } from './types.ts';

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

/** Id of the computed item holding the rest of a group. */
export const OTHER_ITEM = 'other';

export function referenceGroupAmounts(data: Dataset): Record<string, number> {
  const scaling = resolve(data.spending.scaling, 'spending.scaling');
  const amounts: Record<string, number> = {};
  for (const division of data.spending.divisions) {
    for (const group of division.groups) {
      amounts[group.code] = round4(resolve(group.amount, `spending.${group.code}`) * scaling);
    }
  }
  return amounts;
}

/** A level-3 item of a COFOG group, with its reference amount for the accounts year. */
export interface CofogItem {
  /** "<group>.<id>", e.g. "10.7.rsa"; the lever id is "spending.cofog." + key. */
  key: string;
  group: string;
  label: string;
  reference: number;
}

/**
 * Level-3 items of every group that has some (PLAN.MD §13.2), scaled like their group.
 * The last item of a group, "other", is the rest of the group: the items always add up
 * exactly to the group amount.
 */
export function referenceItems(
  data: Dataset,
  groupAmounts: Record<string, number> = referenceGroupAmounts(data),
): Map<string, CofogItem[]> {
  const scaling = resolve(data.spending.scaling, 'spending.scaling');
  const byGroup = new Map<string, CofogItem[]>();
  for (const division of data.spending.divisions) {
    for (const group of division.groups) {
      if (!group.items) continue;
      const items: CofogItem[] = group.items.map((item) => ({
        key: `${group.code}.${item.id}`,
        group: group.code,
        label: item.label,
        reference: round4(resolve(item.amount, `spending.${group.code}.${item.id}`) * scaling),
      }));
      const listed = items.reduce((sum, item) => sum + item.reference, 0);
      items.push({
        key: `${group.code}.${OTHER_ITEM}`,
        group: group.code,
        label: group.otherLabel ?? 'Autres',
        reference: round4((groupAmounts[group.code] ?? 0) - listed),
      });
      byGroup.set(group.code, items);
    }
  }
  return byGroup;
}
