// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Impact texts of the levers (PLAN.MD §13.8): one short sentence drawn from the
 * simulation, under the slider and in the scenario report. Every text has an upward and a
 * downward variant built the same way, with the same weight: only the direction words
 * change. Pure functions, no UI dependency.
 */
import { BENEFIT_ITEMS } from '../engine/benefitItems.ts';
import type { Lever } from '../engine/levers.ts';
import type { Model, SimulationResult } from '../engine/simulate.ts';
import { formatBillionsChange, formatPercent, ONE_EURO_IN_BILLIONS, signed } from './format.ts';

/** Level-3 items that pay a benefit to the households (RSA, pensions, family allowances…). */
const BENEFIT_ITEM_KEYS: ReadonlySet<string> = new Set(Object.values(BENEFIT_ITEMS).flat());

/** Smallest part set apart that the report mentions: 0.5 M€, as the change texts of the panel. */
const SET_APART_MIN = 0.0005;

const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const significant = new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 2 });

/**
 * A number of posts rounded as an order of magnitude: none below 0.5, to the unit below
 * 20, else two significant figures ("4 400"). Null when it rounds to no post.
 */
export function formatPosts(posts: number): string | null {
  const size = Math.abs(posts);
  if (size < 0.5) return null;
  return size < 20 ? integer.format(size) : significant.format(size);
}

/** ", soit environ 4 400 postes à temps plein en moins", or "" when it rounds to none. */
export function postsClause(posts: number): string {
  const shown = formatPosts(posts);
  if (shown === null) return '';
  const plural = Math.abs(posts) >= 1.5;
  return `, soit environ ${shown} poste${plural ? 's' : ''} à temps plein ${posts > 0 ? 'en plus' : 'en moins'}`;
}

const direction = (change: number) => (change > 0 ? 'en hausse' : 'en baisse');

/** Share of a change in its reference amount, e.g. " (−2,3 %)"; empty without reference. */
const shareText = (change: number, reference: number) =>
  reference > 0 ? ` (${signed(formatPercent(Math.abs(change / reference)), change)})` : '';

/** A spending amount: annual change and its order of magnitude in posts. */
export function spendingText(change: number, reference: number, posts = 0): string {
  if (Math.abs(change) < ONE_EURO_IN_BILLIONS) return 'Dépense annuelle inchangée.';
  return `Dépense annuelle ${direction(change)} de ${formatBillionsChange(Math.abs(change))}${shareText(change, reference)}${postsClause(posts)}.`;
}

/** A level-3 item that pays a benefit: each household receiving it gets the same share. */
export function benefitText(change: number, reference: number): string {
  if (Math.abs(change) < ONE_EURO_IN_BILLIONS) return 'Dépense annuelle inchangée.';
  const share = reference > 0 ? formatPercent(Math.abs(change / reference)) : null;
  const households =
    share === null
      ? ''
      : ` : chaque ménage qui perçoit cette prestation en reçoit ${share} ${change > 0 ? 'de plus' : 'de moins'}, à règles d’attribution inchangées`;
  return `Dépense annuelle ${direction(change)} de ${formatBillionsChange(Math.abs(change))}${households}.`;
}

/** A tax lever: static change of revenue. */
export function revenueText(change: number): string {
  if (Math.abs(change) < ONE_EURO_IN_BILLIONS) return 'Pas d’effet sur les recettes de l’année.';
  return `Recettes ${direction(change)} d’environ ${formatBillionsChange(Math.abs(change))} par an (effet mécanique, sans changement de comportement).`;
}

/** A public employer contribution: paid by public spending to a public scheme. */
export function publicEmployerText(change: number): string {
  if (Math.abs(change) < ONE_EURO_IN_BILLIONS) return 'Pas d’effet sur les comptes de l’année.';
  return `Recettes et dépenses ${direction(change)} de ${formatBillionsChange(Math.abs(change))} chacune : le solde ne change pas.`;
}

/** A projection assumption (growth, interest rate). */
export function projectionText(change: number): string {
  if (change === 0) return 'Hypothèse de projection inchangée.';
  return `Hypothèse ${change > 0 ? 'relevée' : 'abaissée'} par rapport à la prévision : le solde de l’année ne change pas, seule la projection de la dette en tient compte.`;
}

/** Text of a spending lever for a change and its posts, by kind of lever. */
function spendingLeverText(lever: Lever, change: number, reference: number, posts: number) {
  return lever.item !== undefined && BENEFIT_ITEM_KEYS.has(lever.item)
    ? benefitText(change, reference)
    : spendingText(change, reference, posts);
}

/** Text of a tax or projection lever (the same under the slider and in the report). */
function otherLeverText(lever: Lever, value: number): string {
  if (lever.spendingEffect) return publicEmployerText(lever.spendingEffect(value));
  if (lever.revenueEffect) return revenueText(lever.revenueEffect(value));
  return projectionText(value - lever.reference);
}

const sumOf = (record: Record<string, number>, keys: string[]) =>
  keys.reduce((sum, key) => sum + (record[key] ?? 0), 0);

/**
 * Amount a spending control shows in the scenario, and its reference: a function or a
 * group is the sum of its groups (including those and the items set on their own).
 */
export function shownAmount(
  model: Model,
  result: SimulationResult,
  lever: Lever,
): { amount: number; reference: number } {
  if (lever.item !== undefined) {
    const item = model.items.get(lever.item.slice(0, 4))?.find((i) => i.key === lever.item);
    const reference = item?.reference ?? lever.reference;
    return { amount: result.itemAmounts[lever.item] ?? reference, reference };
  }
  const codes = lever.cofog ?? [];
  return {
    amount: sumOf(result.groupAmounts, codes),
    reference: sumOf(model.context.groupAmounts, codes),
  };
}

/** Text under a lever's slider: it describes the amount the control shows. */
export function sliderImpactText(
  model: Model,
  result: SimulationResult,
  lever: Lever,
  value: number,
): string {
  if (lever.unit !== 'billions') return otherLeverText(lever, value);
  const { amount, reference } = shownAmount(model, result, lever);
  const posts =
    lever.item !== undefined
      ? (result.positionsByLever[lever.id] ?? 0)
      : sumOf(result.positionsByGroup, lever.cofog ?? []);
  return spendingLeverText(lever, amount - reference, reference, posts);
}

export interface ReportLine {
  lever: Lever;
  value: number;
  /** Revenue change set by this lever (Md€). */
  revenue: number;
  /** Spending change set by this lever (Md€): its own, without the finer levers inside. */
  spending: number;
  /** Value before and after, as the control shows them. */
  before: number;
  after: number;
  /**
   * Part of the shown change set by finer levers (groups or items set on their own),
   * listed on their own lines (Md€); null when there is none.
   */
  setApart: number | null;
  text: string;
}

/**
 * One line per modified lever, with the effect it sets on its own: the lines add up to
 * the changes of the summary bar.
 */
export function reportLine(
  model: Model,
  result: SimulationResult,
  lever: Lever,
  value: number,
): ReportLine {
  const revenue = result.revenueChanges[lever.id] ?? 0;
  if (lever.unit !== 'billions') {
    return {
      lever,
      value,
      revenue,
      spending: result.spendingChanges[lever.id] ?? 0,
      before: lever.reference,
      after: value,
      setApart: null,
      text: otherLeverText(lever, value),
    };
  }
  const spending = result.spendingByLever[lever.id] ?? 0;
  const { amount, reference } = shownAmount(model, result, lever);
  const setApart = amount - reference - spending;
  return {
    lever,
    value,
    revenue,
    spending,
    before: reference,
    after: amount,
    setApart: Math.abs(setApart) >= SET_APART_MIN ? setApart : null,
    text: spendingLeverText(lever, spending, reference, result.positionsByLever[lever.id] ?? 0),
  };
}
