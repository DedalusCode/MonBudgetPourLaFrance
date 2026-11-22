// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Which levers can move each line of a profile card (PLAN.MD §14.3, audit
 * docs/audit-v1.2/lignes-profils.md), and the effect of each modified lever on a line.
 *
 * The table is written with lever-id patterns ("incomeTax.*"), resolved against the
 * catalogue: new levers of a family join their lines on their own. "Direct" levers enter
 * the formula of the line; "indirect" ones move it through the gross salary recomputed
 * from a fixed net, the reference income, the resources of an aid or the consumption.
 * A test moves every lever and checks that a line never moves without it in the table.
 */
import { BENEFIT_ITEMS, type BenefitFactor } from './benefitItems.ts';
import type { Lever } from './levers.ts';
import type { ProfileResult } from './profiles.ts';
import type { Scenario } from './scenario.ts';
import { subjectResult, type Model, type Subject } from './simulate.ts';

/** Lines of the levies borne (`BorneLevy.id`). */
export const LEVY_LINES = [
  'employeeContributions',
  'csgCrdsSalary',
  'employerContributions',
  'selfEmployedContributions',
  'microContributions',
  'csgCrdsSelfEmployed',
  'csgCrdsPension',
  'csgCrdsReplacement',
  'incomeTax',
  'microFlatIncomeTax',
  'highIncomeContribution',
  'highIncomeMinimumTax',
  'flatTax',
  'capitalSocialLevies',
  'wealthTax',
  'vat',
  'energyExcise',
  'propertyTax',
  'corporateTax',
] as const;

/** Lines of the cash benefits and services received. */
export const RECEIVED_LINES = [
  'aids.studentGrant',
  'invalidityPension',
  'aids.aah',
  'pension',
  'aids.aspa',
  'familyAllowances',
  'aids.supportAllowance',
  'aids.familySupplement',
  'aids.backToSchool',
  'aids.youngChild',
  'unemploymentBenefit',
  'aids.ass',
  'housingAid',
  'activityBonus',
  'aids.rsa',
  'aids.energyCheck',
  'inKind',
] as const;

export type LevyLineId = (typeof LEVY_LINES)[number];
export type ReceivedLineId = (typeof RECEIVED_LINES)[number];
/** A card line, or the public services of one COFOG function ("inKind.07"). */
export type LineId = LevyLineId | ReceivedLineId | `inKind.${string}`;

/** Lines that no lever of this version can move (self-employed and micro schemes). */
export const LINES_WITHOUT_LEVER: readonly LineId[] = [
  'selfEmployedContributions',
  'microContributions',
  'microFlatIncomeTax',
];

/** How an indirect lever reaches the line, as the dialog titles its group. */
export type IndirectPath = 'gross' | 'income' | 'resources' | 'consumption';

export interface LinePatterns {
  direct: string[];
  indirect: string[];
  /** Path of the indirect levers, for the dialog. */
  path?: IndirectPath;
}

/** The function, group and item levers of a level-3 spending item ("10.7.rsa"). */
const chain = (item: string): string[] => {
  const [division, group] = [item.slice(0, 2), item.slice(0, 4)];
  return [`spending.cofog.${division}`, `spending.cofog.${group}`, `spending.cofog.${item}`];
};
const benefit = (...ids: BenefitFactor[]) => ids.flatMap((id) => BENEFIT_ITEMS[id].flatMap(chain));

const EMPLOYEE = ['socialContributions.employee*'];
const PUBLIC_EMPLOYEE = ['socialContributions.publicEmployeePension.rate'];
const ACTIVITY_CSG = ['csg.activity.rate'];
/** Net activity income: CSG and employee contributions. */
const ACTIVITY = [...ACTIVITY_CSG, ...EMPLOYEE, ...PUBLIC_EMPLOYEE];
/** Replacement income: pensions, unemployment and invalidity benefits. */
const REPLACEMENT = benefit('pension', 'unemployment', 'disability');
/** Reference income (revenu fiscal de référence). */
const REFERENCE_INCOME = [...ACTIVITY, ...REPLACEMENT];
/** Family benefits counted in the resources of the means-tested aids. */
const FAMILY_RESOURCES = benefit('family', 'familySupplement', 'youngChild', 'supportAllowance');
const HOUSING = benefit('housingAid');
/** Every benefit paid to the households. */
const BENEFITS = (Object.keys(BENEFIT_ITEMS) as BenefitFactor[]).flatMap((id) => benefit(id));
/** Disposable income, hence consumption, hence VAT and excises. */
const DISPOSABLE = [
  'incomeTax.*',
  ...ACTIVITY,
  'csg.capital.rate',
  'capitalIncome.flatTaxIncomeRate',
  'wealthTax.*',
  'propertyTax.change',
  ...BENEFITS,
];
const AID_RESOURCES = [
  ...ACTIVITY,
  ...REPLACEMENT,
  ...FAMILY_RESOURCES,
  ...benefit('ass', 'aah', 'aspa'),
  ...HOUSING,
];

export const LINE_LEVERS: Record<LevyLineId | ReceivedLineId, LinePatterns> = {
  employeeContributions: {
    direct: [...EMPLOYEE, ...PUBLIC_EMPLOYEE],
    indirect: ACTIVITY_CSG,
    path: 'gross',
  },
  csgCrdsSalary: {
    direct: ACTIVITY_CSG,
    indirect: [...EMPLOYEE, ...PUBLIC_EMPLOYEE],
    path: 'gross',
  },
  employerContributions: {
    direct: ['socialContributions.employer*', 'socialContributions.publicEmployer*'],
    indirect: ACTIVITY,
    path: 'gross',
  },
  selfEmployedContributions: { direct: [], indirect: [] },
  microContributions: { direct: [], indirect: [] },
  csgCrdsSelfEmployed: { direct: ACTIVITY_CSG, indirect: [] },
  csgCrdsPension: { direct: [], indirect: benefit('pension'), path: 'income' },
  csgCrdsReplacement: {
    direct: [],
    indirect: [...benefit('unemployment', 'disability'), ...ACTIVITY],
    path: 'income',
  },
  incomeTax: { direct: ['incomeTax.*'], indirect: [...ACTIVITY, ...REPLACEMENT], path: 'income' },
  microFlatIncomeTax: { direct: [], indirect: [] },
  highIncomeContribution: { direct: [], indirect: REFERENCE_INCOME, path: 'income' },
  highIncomeMinimumTax: {
    direct: [],
    indirect: [...REFERENCE_INCOME, 'incomeTax.*', 'capitalIncome.flatTaxIncomeRate'],
    path: 'income',
  },
  flatTax: { direct: ['capitalIncome.flatTaxIncomeRate'], indirect: [] },
  capitalSocialLevies: { direct: ['csg.capital.rate'], indirect: [] },
  wealthTax: { direct: ['wealthTax.*'], indirect: [] },
  vat: { direct: ['vat.*'], indirect: DISPOSABLE, path: 'consumption' },
  energyExcise: { direct: ['energyExcise.*'], indirect: DISPOSABLE, path: 'consumption' },
  propertyTax: { direct: ['propertyTax.change'], indirect: [] },
  corporateTax: { direct: ['corporateTax.standardRate'], indirect: [] },

  'aids.studentGrant': { direct: benefit('studentGrant'), indirect: [] },
  invalidityPension: { direct: benefit('disability'), indirect: [] },
  'aids.aah': {
    direct: benefit('aah'),
    indirect: [...ACTIVITY, ...REPLACEMENT, ...benefit('ass')],
    path: 'resources',
  },
  pension: { direct: benefit('pension'), indirect: [] },
  'aids.aspa': {
    direct: benefit('aspa'),
    indirect: [...ACTIVITY, ...REPLACEMENT],
    path: 'resources',
  },
  familyAllowances: { direct: benefit('family'), indirect: REFERENCE_INCOME, path: 'resources' },
  'aids.supportAllowance': { direct: benefit('supportAllowance'), indirect: [] },
  'aids.familySupplement': {
    direct: benefit('familySupplement'),
    indirect: REFERENCE_INCOME,
    path: 'resources',
  },
  'aids.backToSchool': {
    direct: benefit('backToSchool'),
    indirect: REFERENCE_INCOME,
    path: 'resources',
  },
  'aids.youngChild': {
    direct: benefit('youngChild'),
    indirect: REFERENCE_INCOME,
    path: 'resources',
  },
  unemploymentBenefit: { direct: benefit('unemployment'), indirect: [] },
  'aids.ass': {
    direct: benefit('ass'),
    indirect: [...ACTIVITY, ...REPLACEMENT, ...benefit('aah')],
    path: 'resources',
  },
  housingAid: {
    direct: HOUSING,
    indirect: [...REFERENCE_INCOME, ...benefit('aah', 'studentGrant')],
    path: 'resources',
  },
  activityBonus: { direct: benefit('activityBonus'), indirect: AID_RESOURCES, path: 'resources' },
  'aids.rsa': {
    direct: benefit('rsa'),
    indirect: [...AID_RESOURCES, ...benefit('activityBonus')],
    path: 'resources',
  },
  'aids.energyCheck': {
    direct: benefit('energyCheck'),
    indirect: REFERENCE_INCOME,
    path: 'resources',
  },
  // Resolved from the in-kind allocation (see `inKindLevers`).
  inKind: { direct: [], indirect: [] },
};

/** Levers of one line, resolved against the catalogue (no duplicate, direct first). */
export interface LineLevers {
  direct: Lever[];
  indirect: Lever[];
  path?: IndirectPath;
}

const matcher = (patterns: string[]) => {
  const exact = new Set(patterns.filter((p) => !p.endsWith('*')));
  const prefixes = patterns.filter((p) => p.endsWith('*')).map((p) => p.slice(0, -1));
  return (id: string) => exact.has(id) || prefixes.some((p) => id.startsWith(p));
};

/**
 * A lever that can move a household: not deprecated, with a range, and for an excise,
 * borne by households (heating oil has no household weight).
 */
function activeIn(model: Model): (lever: Lever) => boolean {
  const unborne = new Set(
    model.context.rules.energyExcise.products
      .filter((p) => p.householdWeight === 0)
      .map((p) => `energyExcise.${p.id}.rate`),
  );
  return (lever) => !lever.deprecated && lever.max > lever.min && !unborne.has(lever.id);
}

/**
 * Spending levers of the public services received: the groups shared out per capita,
 * their items and their function (all of them, or those of one function).
 */
function inKindLevers(model: Model, division?: string): Lever[] {
  const groups = model.context.allocation.rules
    .filter((r) => r.mode !== 'notAllocated')
    .map((r) => r.cofog)
    .filter((code) => division === undefined || code.startsWith(`${division}.`));
  const ids = new Set(
    groups.flatMap((g) => [`spending.cofog.${g.slice(0, 2)}`, `spending.cofog.${g}`]),
  );
  const prefixes = groups.map((g) => `spending.cofog.${g}.`);
  const active = activeIn(model);
  return [...model.levers.values()].filter(
    (l) => active(l) && (ids.has(l.id) || prefixes.some((p) => l.id.startsWith(p))),
  );
}

/** Levers that can move a line, in the order of the catalogue (the lever panel's). */
export function leversOfLine(model: Model, line: LineId): LineLevers {
  if (line === 'inKind' || line.startsWith('inKind.')) {
    const division = line === 'inKind' ? undefined : line.slice('inKind.'.length);
    return { direct: inKindLevers(model, division), indirect: [] };
  }
  const patterns = LINE_LEVERS[line as LevyLineId | ReceivedLineId];
  const all = [...model.levers.values()].filter(activeIn(model));
  const isDirect = matcher(patterns.direct);
  const isIndirect = matcher(patterns.indirect);
  const direct = all.filter((l) => isDirect(l.id));
  const indirect = all.filter((l) => !isDirect(l.id) && isIndirect(l.id));
  return patterns.path ? { direct, indirect, path: patterns.path } : { direct, indirect };
}

/** Amount of a line in a result (€ per year), 0 when the household has none. */
export function lineValue(result: ProfileResult, line: LineId): number {
  if (line === 'inKind') return result.inKind.total;
  if (line.startsWith('inKind.')) return result.inKind.byDivision[line.slice(7)] ?? 0;
  if (line.startsWith('aids.')) {
    return result.aids[line.slice(5) as keyof ProfileResult['aids']] ?? 0;
  }
  switch (line) {
    case 'invalidityPension':
      return result.invalidityPension ?? 0;
    case 'pension':
      return result.pension;
    case 'familyAllowances':
      return result.familyAllowances ?? 0;
    case 'unemploymentBenefit':
      return result.unemploymentBenefit ?? 0;
    case 'housingAid':
      return result.housingAid;
    case 'activityBonus':
      return result.activityBonus;
    default:
      return result.borne.find((l) => l.id === line)?.amount ?? 0;
  }
}

export interface LeverEffect {
  lever: Lever;
  /** Change of the line due to this lever, € per year (same sign as the line). */
  effect: number;
}

export interface LineEffects {
  before: number;
  after: number;
  /** Modified levers of the line, largest effect first. */
  effects: LeverEffect[];
  /** Part of the change that no single lever explains (décote, thresholds...). */
  combined: number;
}

/**
 * Effect of each modified lever on a line: the line with every lever as set, minus the
 * line with this lever back to its reference value (kept in the scenario, so that a
 * group set to its reference still overrides its function). The rest is `combined`.
 */
export function lineEffects(
  model: Model,
  scenario: Scenario,
  subject: Subject,
  line: LineId,
  reference: ProfileResult,
): LineEffects {
  const { direct, indirect } = leversOfLine(model, line);
  const modified = [...direct, ...indirect].filter((l) => l.id in scenario.levers);
  const before = lineValue(reference, line);
  const after = lineValue(subjectResult(model, scenario, subject), line);
  const effects = modified
    .map((lever) => {
      const without = subjectResult(
        model,
        { ...scenario, levers: { ...scenario.levers, [lever.id]: lever.reference } },
        subject,
      );
      return { lever, effect: after - lineValue(without, line) };
    })
    .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
  const explained = effects.reduce((s, e) => s + e.effect, 0);
  return { before, after, effects, combined: after - before - explained };
}
