// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Level-3 items described by their nature (Eurostat na_item) rather than by their own text:
 * one pop-up template each, completed with the group's name (PLAN.MD §13.6). No dependency,
 * so that the browser can use it without the data schemas.
 */
export const NATURE_ITEMS = [
  'compensation',
  'purchases',
  'investment',
  'subsidies',
  'transfers',
  'benefits',
  'other',
] as const;
export type NatureItem = (typeof NATURE_ITEMS)[number];

/** Mandatory section of every pop-up (PLAN.MD §13.6): an upward and a downward change. */
export const VARIATION_HEADING = 'Ce que change une variation';

const ITEM_LEVER = /^spending\.cofog\.\d{2}\.\d\.([a-z][a-z0-9-]*)$/;

/** Nature of a level-3 item lever ("spending.cofog.02.1.compensation"), if it has one. */
export function natureOf(leverId: string): NatureItem | null {
  const item = ITEM_LEVER.exec(leverId)?.[1];
  return item !== undefined && (NATURE_ITEMS as readonly string[]).includes(item)
    ? (item as NatureItem)
    : null;
}
