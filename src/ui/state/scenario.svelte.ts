// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Scenario state of the simulator: modified levers only (absolute values),
 * and the simulation result derived from them on every change.
 */
import { bundledDataset } from '../../engine/bundledData.ts';
import type { Lever } from '../../engine/levers.ts';
import { migrateScenario, type Scenario } from '../../engine/scenario.ts';
import { createModel, simulate, type Model, type SimulationResult } from '../../engine/simulate.ts';

/** Values closer than this to the reference count as unmodified. */
const EPSILON = 1e-9;

function without(levers: Record<string, number>, id: string): Record<string, number> {
  return Object.fromEntries(Object.entries(levers).filter(([key]) => key !== id));
}

export class ScenarioStore {
  readonly model: Model;
  readonly reference: SimulationResult;
  levers = $state<Record<string, number>>({});
  /** Lets the input fields go beyond the slider bounds (advanced settings). */
  extendedBounds = $state(false);
  /** Last request to reveal a lever in the panel (e.g. from the treemap). */
  focusRequest = $state<{ id: string; seq: number } | null>(null);
  /** Lever whose explanation pop-up is open. */
  infoLeverId = $state<string | null>(null);

  readonly scenario: Scenario = $derived.by(() => ({
    schemaVersion: 1,
    baseYear: this.baseYear,
    levers: this.levers,
  }));
  readonly result: SimulationResult = $derived.by(() => simulate(this.model, this.scenario));

  constructor(model: Model = createModel(bundledDataset())) {
    this.model = model;
    this.reference = simulate(model, { schemaVersion: 1, baseYear: this.baseYear, levers: {} });
  }

  get baseYear(): number {
    return this.model.data.meta.baseYear;
  }

  lever(id: string): Lever {
    const lever = this.model.levers.get(id);
    if (!lever) throw new Error(`Unknown lever ${id}`);
    return lever;
  }

  value(id: string): number {
    return this.levers[id] ?? this.lever(id).reference;
  }

  isModified(id: string): boolean {
    return id in this.levers;
  }

  set(id: string, value: number): void {
    this.setRelativeTo(id, value, this.lever(id).reference);
  }

  /**
   * Stores `value` unless it equals `inherited` (e.g. a COFOG group following
   * its division), in which case the lever goes back to unmodified.
   */
  setRelativeTo(id: string, value: number, inherited: number): void {
    const others = without(this.levers, id);
    this.levers = Math.abs(value - inherited) < EPSILON ? others : { ...others, [id]: value };
  }

  reset(id: string): void {
    this.levers = without(this.levers, id);
  }

  resetAll(): void {
    this.levers = {};
  }

  /** COFOG group codes of a division ("07" → ["07.1", ...]). */
  groupsOf(division: string): string[] {
    return (
      this.model.data.spending.divisions
        .find((d) => d.code === division)
        ?.groups.map((g) => g.code) ?? []
    );
  }

  /** Spending of a division in the scenario: the sum of its groups (Md€). */
  divisionTotal(division: string): number {
    return this.groupsOf(division).reduce((sum, c) => sum + (this.result.groupAmounts[c] ?? 0), 0);
  }

  /**
   * Sets a division's total spending: the gap is spread over its groups that
   * are not customised, in proportion to their amount (or over the customised
   * groups when all of them are).
   */
  setDivisionTotal(division: string, target: number): void {
    const codes = this.groupsOf(division);
    const references = this.model.context.groupAmounts;
    const groupId = (code: string) => `spending.cofog.${code}`;
    const custom = codes.filter((c) => this.isModified(groupId(c)));
    const customSum = custom.reduce((s, c) => s + (this.levers[groupId(c)] ?? 0), 0);
    const freeReference = codes
      .filter((c) => !custom.includes(c))
      .reduce((s, c) => s + (references[c] ?? 0), 0);
    const divisionId = `spending.cofog.${division}`;
    const divisionReference = this.lever(divisionId).reference;
    if (freeReference > 0) {
      const factor = Math.max(0, target - customSum) / freeReference;
      this.setRelativeTo(divisionId, factor * divisionReference, divisionReference);
      return;
    }
    const scale = customSum > 0 ? target / customSum : 0;
    let next = { ...this.levers };
    for (const code of custom)
      next = { ...next, [groupId(code)]: (this.levers[groupId(code)] ?? 0) * scale };
    this.levers = next;
  }

  /** Resets a division and all its groups. */
  resetDivision(division: string): void {
    const ids = [division, ...this.groupsOf(division)].map((c) => `spending.cofog.${c}`);
    this.levers = Object.fromEntries(
      Object.entries(this.levers).filter(([id]) => !ids.includes(id)),
    );
  }

  /** Opens the explanation pop-up of a lever (throws on an unknown id). */
  openInfo(id: string): void {
    this.lever(id);
    this.infoLeverId = id;
  }

  closeInfo(): void {
    this.infoLeverId = null;
  }

  /** Asks the lever panel to open, scroll to and focus a lever. */
  focusLever(id: string): void {
    this.lever(id);
    this.focusRequest = { id, seq: (this.focusRequest?.seq ?? 0) + 1 };
  }

  /**
   * Replaces the scenario with a stored one (link, file). Returns the lever ids
   * that were dropped because this version does not know them.
   */
  load(raw: unknown): string[] {
    const { scenario, droppedLevers } = migrateScenario(raw, this.model.levers);
    this.levers = { ...scenario.levers };
    return droppedLevers;
  }

  get modifiedCount(): number {
    return Object.keys(this.levers).length;
  }
}
