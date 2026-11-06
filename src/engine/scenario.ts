// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Scenario format (PLAN.MD §8.3): only the modified levers, as absolute values.
 * `migrateScenario` turns any stored version into the current one.
 */
import { z } from 'zod';

export const SCENARIO_SCHEMA_VERSION = 1;

export const scenarioSchema = z.strictObject({
  schemaVersion: z.literal(SCENARIO_SCHEMA_VERSION),
  baseYear: z.number().int(),
  levers: z.record(z.string().min(1), z.number().refine(Number.isFinite)),
});

export type Scenario = z.infer<typeof scenarioSchema>;

export function emptyScenario(baseYear: number): Scenario {
  return { schemaVersion: SCENARIO_SCHEMA_VERSION, baseYear, levers: {} };
}

export interface MigrationResult {
  scenario: Scenario;
  /** Lever ids dropped because they are unknown to this version. */
  droppedLevers: string[];
}

/**
 * Validates a stored scenario and upgrades it to the current schema version.
 * Unknown lever ids are dropped (and reported) rather than rejected, so that a
 * shared link keeps working when a lever is retired.
 */
export function migrateScenario(
  raw: unknown,
  knownLeverIds: { has(id: string): boolean },
): MigrationResult {
  const parsed = scenarioSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid scenario: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  const levers: Record<string, number> = {};
  const droppedLevers: string[] = [];
  for (const [id, value] of Object.entries(parsed.data.levers)) {
    if (knownLeverIds.has(id)) levers[id] = value;
    else droppedLevers.push(id);
  }
  return { scenario: { ...parsed.data, levers }, droppedLevers };
}
