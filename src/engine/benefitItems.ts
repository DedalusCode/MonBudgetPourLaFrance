// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Benefits paid to the households and the level-3 spending items that finance them
 * (PLAN.MD §13.3). A scenario scales each benefit by the change of its items: setting
 * the RSA item to 0 removes the RSA of every household, and moving a whole group or
 * function moves its items, hence its benefits, in the same proportion.
 *
 * Each benefit is scaled on its own: the others are not recomputed (removing the ARE
 * would in reality raise the RSA of some households). The link of a benefit to its item
 * follows the step 13 audit (the CPS to COFOG mapping is a deduction, see Methodology).
 */
import type { CofogItem } from './cofog.ts';

export const BENEFIT_ITEMS = {
  /** Prime d'activité. */
  activityBonus: ['10.7.prime-activite'],
  rsa: ['10.7.rsa'],
  energyCheck: ['10.7.energy-voucher'],
  /** Retirement pensions of former private sector employees (basic and complementary). */
  pension: ['10.2.pensions-cnav', '10.2.pensions-agirc-arrco'],
  aspa: ['10.2.minimum-old-age'],
  /** Allocations familiales, age increase included. */
  family: ['10.4.family-allowances'],
  familySupplement: ['10.4.family-supplement'],
  /** Allocation de soutien familial. */
  supportAllowance: ['10.4.asf'],
  /** Allocation de base de la PAJE. */
  youngChild: ['10.4.paje-base'],
  backToSchool: ['10.4.ars'],
  /** Unemployment insurance benefit (ARE). */
  unemployment: ['10.5.are'],
  ass: ['10.5.ass'],
  /** Invalidity pension. */
  disability: ['10.1.disability-pensions'],
  aah: ['10.1.aah'],
  /** APL, ALS and ALF: the households do not say which one they receive. */
  housingAid: ['10.6.apl', '10.6.als', '10.6.alf'],
  /** Higher education grants (bourses sur critères sociaux). */
  studentGrant: ['09.6.higher-education-grants'],
} as const satisfies Record<string, readonly string[]>;

export type BenefitFactor = keyof typeof BENEFIT_ITEMS;

/**
 * Scenario / reference amount of each benefit's items (1 if they have no reference
 * amount). The items exist in the data: a test checks every link.
 */
export function benefitFactors(
  items: ReadonlyMap<string, CofogItem[]>,
  itemAmounts: Record<string, number>,
): Record<BenefitFactor, number> {
  const references = new Map<string, number>();
  for (const list of items.values())
    for (const item of list) references.set(item.key, item.reference);
  const total = (keys: readonly string[], amount: (key: string) => number) =>
    keys.reduce((sum, key) => sum + amount(key), 0);
  const factors = {} as Record<BenefitFactor, number>;
  for (const benefit of Object.keys(BENEFIT_ITEMS) as BenefitFactor[]) {
    const keys = BENEFIT_ITEMS[benefit];
    const reference = total(keys, (key) => references.get(key) ?? 0);
    factors[benefit] = reference > 0 ? total(keys, (key) => itemAmounts[key] ?? 0) / reference : 1;
  }
  return factors;
}
