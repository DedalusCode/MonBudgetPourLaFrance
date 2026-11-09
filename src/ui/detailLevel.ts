// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Detail levels of the lever panel (PLAN.MD §13.1). A level only hides levers: it is a
 * display preference kept in this browser, never part of a scenario.
 */
import { isItemLeverId, type Lever } from '../engine/levers.ts';

export type DetailLevel = 'essential' | 'detailed' | 'expert';

/** From the shortest list to the longest. */
export const DETAIL_LEVELS: { id: DetailLevel; label: string; hint: string }[] = [
  {
    id: 'essential',
    label: 'Essentiel',
    hint: 'les grandes fonctions de dépense et les principaux prélèvements',
  },
  { id: 'detailed', label: 'Détaillé', hint: 'les dépenses par groupe et tous les prélèvements' },
  {
    id: 'expert',
    label: 'Expert',
    hint: 'les postes de chaque groupe de dépense, dont les prestations, et tous les prélèvements',
  },
];

export const DEFAULT_DETAIL_LEVEL: DetailLevel = 'essential';
export const DETAIL_LEVEL_KEY = 'detailLevel';

export const isDetailLevel = (value: unknown): value is DetailLevel =>
  DETAIL_LEVELS.some((level) => level.id === value);

/** Main levies shown at the Essential level (list validated at step 13). */
export const ESSENTIAL_TAX_LEVERS: ReadonlySet<string> = new Set([
  'vat.standard',
  'csg.activity.rate',
  'csg.capital.rate',
  'capitalIncome.flatTaxIncomeRate',
  'incomeTax.bracket2.rate',
  'incomeTax.bracket3.rate',
  'incomeTax.bracket4.rate',
  'incomeTax.bracket5.rate',
  'corporateTax.standardRate',
  'propertyTax.change',
  'energyExcise.diesel.rate',
  'socialContributions.employerHealth.rate',
  'socialContributions.employeeOldAgeCapped.rate',
]);

/** Lowest level at which a lever is shown. */
export function leverLevel(lever: Pick<Lever, 'id' | 'group'>): DetailLevel {
  if (lever.group === 'spending') {
    if (/^spending\.cofog\.\d{2}$/.test(lever.id)) return 'essential';
    return isItemLeverId(lever.id) ? 'expert' : 'detailed';
  }
  return ESSENTIAL_TAX_LEVERS.has(lever.id) ? 'essential' : 'detailed';
}

const rank = (level: DetailLevel) => DETAIL_LEVELS.findIndex((l) => l.id === level);

export function isShownAt(lever: Pick<Lever, 'id' | 'group'>, level: DetailLevel): boolean {
  return rank(leverLevel(lever)) <= rank(level);
}

/** `level`, raised as far as needed to show all these levers. */
export function levelShowing(
  level: DetailLevel,
  levers: Iterable<Pick<Lever, 'id' | 'group'>>,
): DetailLevel {
  let required = level;
  for (const lever of levers) {
    const needed = leverLevel(lever);
    if (rank(needed) > rank(required)) required = needed;
  }
  return required;
}
