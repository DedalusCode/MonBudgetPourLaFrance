// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Reference balance of the profiles, computed from the bundled data with the
 * legislation in force and the reference spending (no lever applied).
 */
import { referenceGroupAmounts } from './cofog.ts';
import { computeProfile, type ProfileContext, type ReferenceProfileResult } from './profiles.ts';
import { resolve, resolveRules } from './rules.ts';
import type { Dataset } from './types.ts';

export function referenceContext(data: Dataset): ProfileContext {
  const groupAmounts = referenceGroupAmounts(data);
  return {
    rules: resolveRules(data.taxRules),
    allocation: resolve(data.inKindAllocation, 'inKindAllocation'),
    groupAmounts,
    population: resolve(data.macro.population, 'macro.population'),
  };
}

export function referenceProfiles(data: Dataset): ReferenceProfileResult[] {
  const context = referenceContext(data);
  return data.profiles.profiles.map((profile) =>
    computeProfile(
      resolve(profile, `profiles.${profile.id}`),
      resolve(data.consumption.byProfile[profile.id], `consumption.${profile.id}`),
      context,
    ),
  );
}
