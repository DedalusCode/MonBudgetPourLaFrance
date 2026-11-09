// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Who made each spending change, and its order of magnitude in posts (PLAN.MD §13.7, §13.8).
 *
 * Every amount of the scenario is set by exactly one lever: an item by its own lever, a
 * group by its lever, else by its division's, else nobody (reference). Attributing each
 * change to that lever makes the effects listed in the scenario report add up to the
 * spending change of the summary bar.
 *
 * Posts: change of compensation of employees ÷ average cost of a full-time post. A
 * compensation item (Expert level) is all staff; a group or a function keeps its share of
 * staff (Eurostat D1, constant structure) and shows posts only above
 * `spending.staffShareThreshold`. A function is the sum of its groups. Mechanical order of
 * magnitude: no calendar, no effect on services or on the taxes paid by the staff.
 */
import type { CofogItem } from './cofog.ts';
import { resolve } from './rules.ts';
import type { Dataset } from './types.ts';

/** Id of the level-3 item holding the compensation of employees of a group. */
export const COMPENSATION_ITEM = 'compensation';

/** 1 € in Md€: smaller changes are float rounding, not a change. */
const MIN_CHANGE = 1e-9;

export interface GroupStaff {
  /** Compensation of employees / spending of the group (structure year). */
  share: number;
  /** The group (and its function) show posts: share at or above the threshold. */
  showsPosts: boolean;
  /** Full-time posts per Md€ of compensation, in the accounts year euros. */
  postsPerBillion: number;
  /** Key of the group's compensation item, if it has one ("09.1.compensation"). */
  compensationItem?: string;
}

/** Staff data of the COFOG groups that have an average cost. */
export function groupStaff(data: Dataset): Map<string, GroupStaff> {
  const spending = data.spending;
  const scaling = resolve(spending.scaling, 'spending.scaling');
  const threshold = resolve(spending.staffShareThreshold, 'spending.staffShareThreshold');
  const result = new Map<string, GroupStaff>();
  for (const division of spending.divisions) {
    for (const group of division.groups) {
      if (!group.staff) continue;
      const parts = group.staff.map((s) => {
        const cost = spending.staffCosts[s.cost];
        if (!cost) throw new Error(`Unknown staff cost ${s.cost} in ${group.code}`);
        return {
          compensation: resolve(s.compensation, `spending.${group.code}.staff.${s.sector}`),
          cost: resolve(cost, `spending.staffCosts.${s.cost}`),
        };
      });
      const compensation = parts.reduce((sum, p) => sum + p.compensation, 0);
      const amount = resolve(group.amount, `spending.${group.code}`);
      if (compensation <= 0 || amount <= 0) continue;
      // Each sector's posts at its own cost: Σ (share of the sector / its cost).
      const postsPerEuro = parts.reduce(
        (sum, p) => sum + p.compensation / compensation / p.cost,
        0,
      );
      const share = compensation / amount;
      const hasItem = group.items?.some((item) => item.id === COMPENSATION_ITEM) ?? false;
      result.set(group.code, {
        share,
        showsPosts: share >= threshold,
        postsPerBillion: (1e9 * postsPerEuro) / scaling,
        ...(hasItem ? { compensationItem: `${group.code}.${COMPENSATION_ITEM}` } : {}),
      });
    }
  }
  return result;
}

export interface SpendingAttribution {
  /** Spending change set by each spending lever, in Md€ (only levers with a change). */
  byLever: Record<string, number>;
  /** Full-time posts (signed: positive = more posts) set by each spending lever. */
  postsByLever: Record<string, number>;
  /** Full-time posts of the whole change of each group, whatever lever set it. */
  postsByGroup: Record<string, number>;
}

/**
 * Attribution of the scenario's spending changes (same rules as `spendingAmountsFor`).
 * `levers` holds the scenario's modified levers.
 */
export function attributeSpending(
  data: Dataset,
  references: Record<string, number>,
  items: ReadonlyMap<string, CofogItem[]>,
  staff: ReadonlyMap<string, GroupStaff>,
  levers: Record<string, number>,
): SpendingAttribution {
  const byLever: Record<string, number> = {};
  const postsByLever: Record<string, number> = {};
  const postsByGroup: Record<string, number> = {};
  const add = (target: Record<string, number>, key: string, x: number) => {
    target[key] = (target[key] ?? 0) + x;
  };
  /** A change of `change` Md€ set by `lever`, of which `staffShare` is compensation. */
  const record = (lever: string | undefined, code: string, change: number, staffShare = 0) => {
    // Below 1 € (rounding of a lever set back to its reference): no change.
    if (lever === undefined || Math.abs(change) < MIN_CHANGE) return;
    add(byLever, lever, change);
    const info = staff.get(code);
    if (!info || staffShare === 0) return;
    const posts = change * staffShare * info.postsPerBillion;
    add(postsByLever, lever, posts);
    add(postsByGroup, code, posts);
  };
  for (const division of data.spending.divisions) {
    const codes = division.groups.map((g) => g.code);
    const divisionId = `spending.cofog.${division.code}`;
    const divisionAmount = levers[divisionId];
    const divisionReference = codes.reduce((sum, c) => sum + (references[c] ?? 0), 0);
    const factor =
      divisionAmount === undefined || divisionReference === 0
        ? 1
        : divisionAmount / divisionReference;
    for (const code of codes) {
      const reference = references[code] ?? 0;
      const groupId = `spending.cofog.${code}`;
      const own = levers[groupId];
      const owner =
        own !== undefined ? groupId : divisionAmount !== undefined ? divisionId : undefined;
      if (owner === undefined && !hasItemLever(items.get(code), levers)) continue;
      const amount = own ?? reference * factor;
      const groupFactor = reference === 0 ? 0 : amount / reference;
      const info = staff.get(code);
      const groupShare = info?.showsPosts ? info.share : 0;
      const list = items.get(code) ?? [];
      if (!hasItemLever(list, levers)) {
        record(owner, code, amount - reference, groupShare);
        continue;
      }
      for (const item of list) {
        const itemId = `spending.cofog.${item.key}`;
        const itemValue = levers[itemId];
        const change = (itemValue ?? item.reference * groupFactor) - item.reference;
        let share = 0;
        if (info && item.key === info.compensationItem) {
          // All staff; a compensation item set on its own shows posts in any group.
          share = itemValue !== undefined || info.showsPosts ? 1 : 0;
        } else if (info && info.compensationItem === undefined && itemValue === undefined) {
          // No compensation line: the items that follow the group keep its staff share. A
          // concrete item set on its own (a benefit, an investment) shows no posts.
          share = groupShare;
        }
        record(itemValue !== undefined ? itemId : owner, code, change, share);
      }
    }
  }
  return { byLever, postsByLever, postsByGroup };
}

function hasItemLever(list: CofogItem[] | undefined, levers: Record<string, number>): boolean {
  return (list ?? []).some((item) => `spending.cofog.${item.key}` in levers);
}
