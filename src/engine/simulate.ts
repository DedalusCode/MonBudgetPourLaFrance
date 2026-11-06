// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Entry point of the engine: scenario → aggregates, debt path and the impact
 * on each profile (PLAN.MD §7). `createModel` does the work that does not
 * depend on the scenario once; `simulate` must stay fast (< 5 ms).
 */
import {
  computeCustomHousehold,
  type ConsumptionPattern,
  type CustomHousehold,
  type CustomHouseholdResult,
} from './customHousehold.ts';
import { buildLevers, groupAmountsFor, type LeverCatalogue } from './levers.ts';
import { aggregates, type Aggregates } from './macro.ts';
import {
  computeProfile,
  type ConsumptionData,
  type ProfileContext,
  type ProfileData,
  type ProfileResult,
  type ReferenceProfileResult,
  type ScenarioFactors,
} from './profiles.ts';
import { sum } from './math.ts';
import { referenceContext, referenceProfiles } from './reference.ts';
import { resolve, type Rules } from './rules.ts';
import type { Scenario } from './scenario.ts';
import type { Dataset } from './types.ts';

/** COFOG groups whose cash benefits are computed in the profiles. */
const ACTIVITY_BONUS_GROUP = '10.7';
const OLD_AGE_GROUP = '10.2';
const HOUSING_BENEFITS_GROUP = '10.6';
const FAMILY_GROUP = '10.4';
/** COFOG group of the interest paid on the public debt. */
const DEBT_INTEREST_GROUP = '01.7';

export interface Model {
  data: Dataset;
  levers: LeverCatalogue;
  context: ProfileContext;
  /** Profiles and their consumption structure, resolved once. */
  profiles: { profile: ProfileData; consumption: ConsumptionData }[];
  reference: ReferenceProfileResult[];
  /** Consumption patterns of the reference profiles, for a household described by the user. */
  patterns: ConsumptionPattern[];
}

export function createModel(data: Dataset): Model {
  const profiles = data.profiles.profiles.map((p) => ({
    profile: resolve(p, `profiles.${p.id}`),
    consumption: resolve(data.consumption.byProfile[p.id], `consumption.${p.id}`),
  }));
  const reference = referenceProfiles(data);
  // Single adults: their disposable income is their standard of living. Fixed budgets
  // (the student) say nothing about how income is spent, hence left out.
  const patterns = profiles.flatMap(({ profile, consumption }, i) => {
    const result = reference[i];
    return result && consumption.annualAmount === null
      ? [
          {
            standardOfLiving: result.disposableIncome,
            consumption,
            savingsRate: profile.savingsRate,
          },
        ]
      : [];
  });
  return {
    data,
    levers: buildLevers(data),
    context: referenceContext(data),
    profiles,
    reference,
    patterns,
  };
}

export interface ProfileImpact {
  id: ProfileResult['id'];
  reference: ProfileResult;
  scenario: ProfileResult;
  /** Positive = the household pays less. */
  leviesImpact: number;
  /** Positive = the household receives more cash benefits. */
  benefitsImpact: number;
  /** Positive = the household receives more public services. */
  servicesImpact: number;
  total: number;
}

export interface SimulationResult {
  aggregates: Aggregates;
  /** Revenue change of each modified tax lever, in billions of euros. */
  revenueChanges: Record<string, number>;
  /** Spending by COFOG group in the scenario, in billions of euros. */
  groupAmounts: Record<string, number>;
  profiles: ProfileImpact[];
}

interface ScenarioState {
  rules: Rules;
  revenueChanges: Record<string, number>;
  groupAmounts: Record<string, number>;
  factors: ScenarioFactors;
}

/** Rules, revenue changes, spending and benefit factors of a scenario. */
function scenarioState(model: Model, scenario: Scenario): ScenarioState {
  const { data, levers, context } = model;
  const values = scenario.levers;
  const rules = structuredClone(context.rules);
  const revenueChanges: Record<string, number> = {};
  for (const [id, leverValue] of Object.entries(values)) {
    const lever = levers.get(id);
    if (!lever) continue;
    lever.applyToRules?.(rules, leverValue);
    if (lever.revenueEffect) revenueChanges[id] = lever.revenueEffect(leverValue);
  }
  const groupAmounts = groupAmountsFor(data, context.groupAmounts, values);
  const factorOf = (code: string) => {
    const reference = context.groupAmounts[code] ?? 0;
    return reference > 0 ? (groupAmounts[code] ?? reference) / reference : 1;
  };
  return {
    rules,
    revenueChanges,
    groupAmounts,
    factors: {
      activityBonus: factorOf(ACTIVITY_BONUS_GROUP),
      pension: factorOf(OLD_AGE_GROUP),
      family: factorOf(FAMILY_GROUP),
      housingAid: factorOf(HOUSING_BENEFITS_GROUP),
      propertyTax: 1 + (values['propertyTax.change'] ?? 0),
    },
  };
}

export function simulate(model: Model, scenario: Scenario): SimulationResult {
  const { data, context } = model;
  const values = scenario.levers;
  const value = (id: string) => values[id] ?? model.levers.get(id)?.reference ?? 0;

  // Rules, revenue and spending.
  const { rules, revenueChanges, groupAmounts, factors } = scenarioState(model, scenario);
  const revenueChange = sum(Object.values(revenueChanges));
  const groupChange = (code: string) => {
    const reference = context.groupAmounts[code] ?? 0;
    return (groupAmounts[code] ?? reference) - reference;
  };
  const spendingChange = sum(Object.keys(context.groupAmounts).map(groupChange));

  const macro = data.macro;
  const totals = aggregates({
    baseYear: data.meta.accountsYear,
    gdp: resolve(macro.gdp, 'macro.gdp'),
    debt: resolve(macro.debt, 'macro.debt'),
    revenue: resolve(macro.totalRevenue, 'macro.totalRevenue') + revenueChange,
    spending: resolve(macro.totalSpending, 'macro.totalSpending') + spendingChange,
    // Public debt interest is COFOG group 01.7: a change of that line changes the
    // interest paid, not the primary balance (the projection then recomputes interest).
    interest:
      resolve(macro.interestCharge, 'macro.interestCharge') + groupChange(DEBT_INTEREST_GROUP),
    nominalGrowth: value('macro.nominalGrowth'),
    apparentInterestRate: value('macro.apparentInterestRate'),
    horizon: resolve(macro.projectionHorizon, 'macro.projectionHorizon'),
  });

  // Profiles.
  const scenarioContext: ProfileContext = { ...context, rules, groupAmounts };
  const profiles = model.reference.map((reference, i): ProfileImpact => {
    const entry = model.profiles[i];
    if (!entry) throw new Error('Profile list changed');
    const result = computeProfile(entry.profile, entry.consumption, scenarioContext, factors);
    return impactOf(reference, result);
  });

  return { aggregates: totals, revenueChanges, groupAmounts, profiles };
}

function impactOf(reference: ProfileResult, scenario: ProfileResult): ProfileImpact {
  const leviesImpact = reference.totalLevies - scenario.totalLevies;
  const benefitsImpact = scenario.benefits - reference.benefits;
  const servicesImpact = scenario.inKind.total - reference.inKind.total;
  return {
    id: reference.id,
    reference,
    scenario,
    leviesImpact,
    benefitsImpact,
    servicesImpact,
    total: leviesImpact + benefitsImpact + servicesImpact,
  };
}

export interface HouseholdImpact extends ProfileImpact {
  reference: CustomHouseholdResult;
  scenario: CustomHouseholdResult;
}

/** Balance of a household described by the user, under current law and the scenario. */
export function simulateHousehold(
  model: Model,
  scenario: Scenario,
  household: CustomHousehold,
): HouseholdImpact {
  const reference = computeCustomHousehold(household, model.context, model.patterns);
  const { rules, groupAmounts, factors } = scenarioState(model, scenario);
  const result = computeCustomHousehold(
    household,
    { ...model.context, rules, groupAmounts },
    model.patterns,
    factors,
  );
  return { ...impactOf(reference, result), reference, scenario: result };
}
