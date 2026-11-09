// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * How the lever panel lays out the spending levers below the functions: a tree with rails
 * or one card per group. A display preference kept in this browser,
 * never part of a scenario.
 */
import type { Lever } from '../engine/levers.ts';
import type { Dataset } from '../engine/types.ts';
export type SpendingLayout = 'tree' | 'cards';

export const SPENDING_LAYOUTS: { id: SpendingLayout; label: string; hint: string }[] = [
  { id: 'tree', label: 'Arbre', hint: 'groupes et postes reliés à leur fonction par un filet' },
  { id: 'cards', label: 'Cartes', hint: 'une carte par groupe, avec ses postes à l’intérieur' },
];

export const DEFAULT_SPENDING_LAYOUT: SpendingLayout = 'tree';
export const SPENDING_LAYOUT_KEY = 'spendingLayout';

export const isSpendingLayout = (value: unknown): value is SpendingLayout =>
  SPENDING_LAYOUTS.some((layout) => layout.id === value);

/** A COFOG group as the panel shows it: its lever, its items, those matching the search. */
export interface GroupView {
  lever: Lever;
  items: Lever[];
  shownItems: Lever[];
}

/** A COFOG function as the panel shows it. */
export interface DivisionView {
  division: Dataset['spending']['divisions'][number];
  divisionLever: Lever;
  /** Every group and item lever of the function (for its "modified" badge). */
  groups: Lever[];
  shownGroups: GroupView[];
}
