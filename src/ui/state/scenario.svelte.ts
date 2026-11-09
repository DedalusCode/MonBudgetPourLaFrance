// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Scenario state of the simulator: modified levers only (absolute values),
 * and the simulation result derived from them on every change.
 */
import { bundledDataset } from '../../engine/bundledData.ts';
import type { CofogItem } from '../../engine/cofog.ts';
import type { Lever } from '../../engine/levers.ts';
import { migrateScenario, type Scenario } from '../../engine/scenario.ts';
import { createModel, simulate, type Model, type SimulationResult } from '../../engine/simulate.ts';
import {
  DEFAULT_DETAIL_LEVEL,
  DETAIL_LEVEL_KEY,
  isDetailLevel,
  isShownAt,
  levelShowing,
  type DetailLevel,
} from '../detailLevel.ts';
import {
  DEFAULT_SPENDING_LAYOUT,
  isSpendingLayout,
  SPENDING_LAYOUT_KEY,
  type SpendingLayout,
} from '../spendingLayout.ts';
import { browser, readStored, writeStored } from './storage.ts';

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
  /** Levers on display; hiding one never changes the scenario. */
  detailLevel = $state<DetailLevel>(DEFAULT_DETAIL_LEVEL);
  /** Layout of the spending levers below the functions (display preference). */
  spendingLayout = $state<SpendingLayout>(DEFAULT_SPENDING_LAYOUT);

  readonly scenario: Scenario = $derived.by(() => ({
    schemaVersion: 1,
    baseYear: this.baseYear,
    levers: this.levers,
  }));
  readonly result: SimulationResult = $derived.by(() => simulate(this.model, this.scenario));

  constructor(model: Model = createModel(bundledDataset())) {
    this.model = model;
    const storedLevel = browser ? readStored(DETAIL_LEVEL_KEY) : null;
    if (isDetailLevel(storedLevel)) this.detailLevel = storedLevel;
    const storedLayout = browser ? readStored(SPENDING_LAYOUT_KEY) : null;
    if (isSpendingLayout(storedLayout)) this.spendingLayout = storedLayout;
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

  /** Level-3 items of a COFOG group (empty for a group without items). */
  itemsOf(group: string): CofogItem[] {
    return this.model.items.get(group) ?? [];
  }

  /** Spending of a division in the scenario: the sum of its groups (Md€). */
  divisionTotal(division: string): number {
    return this.groupsOf(division).reduce((sum, c) => sum + (this.result.groupAmounts[c] ?? 0), 0);
  }

  /** Spending of a group in the scenario: the sum of its items, if any (Md€). */
  groupTotal(group: string): number {
    return this.result.groupAmounts[group] ?? 0;
  }

  /** Amount a group follows when its own lever is not set: its share of the division. */
  groupInherited(group: string): number {
    const division = group.slice(0, 2);
    const reference = this.model.context.groupAmounts[group] ?? 0;
    const divisionReference = this.groupsOf(division).reduce(
      (sum, c) => sum + (this.model.context.groupAmounts[c] ?? 0),
      0,
    );
    return divisionReference === 0
      ? reference
      : (reference * this.value(`spending.cofog.${division}`)) / divisionReference;
  }

  /** Amount an item follows when its own lever is not set: its share of the group. */
  itemInherited(key: string): number {
    const group = key.slice(0, 4);
    const item = this.itemsOf(group).find((i) => i.key === key);
    const reference = this.model.context.groupAmounts[group] ?? 0;
    if (!item || reference === 0) return item?.reference ?? 0;
    const groupAmount = this.levers[`spending.cofog.${group}`] ?? this.groupInherited(group);
    return (item.reference * groupAmount) / reference;
  }

  /** Whether a group, or one of its items, is customised. */
  groupModified(group: string): boolean {
    return (
      this.isModified(`spending.cofog.${group}`) ||
      this.itemsOf(group).some((i) => this.isModified(`spending.cofog.${i.key}`))
    );
  }

  /**
   * Leaves of a division or a group (items, or groups without items): the reference of
   * those that follow the parent's lever, and the amount of those set by their own lever
   * or by a customised level in between.
   */
  private leaves(groups: string[], parentIsGroup: boolean): { free: number; fixed: number } {
    let free = 0;
    let fixed = 0;
    for (const code of groups) {
      const groupSet = !parentIsGroup && this.isModified(`spending.cofog.${code}`);
      const items = this.itemsOf(code);
      if (items.length === 0) {
        if (groupSet) fixed += this.result.groupAmounts[code] ?? 0;
        else free += this.model.context.groupAmounts[code] ?? 0;
        continue;
      }
      for (const item of items) {
        if (groupSet || this.isModified(`spending.cofog.${item.key}`))
          fixed += this.result.itemAmounts[item.key] ?? 0;
        else free += item.reference;
      }
    }
    return { free, fixed };
  }

  /** Multiplies every set lever among `ids` by `scale` (when nothing follows the parent). */
  private scaleSet(ids: string[], scale: number): void {
    let next = { ...this.levers };
    for (const id of ids) {
      const current = this.levers[id];
      if (current !== undefined) next = { ...next, [id]: current * scale };
    }
    this.levers = next;
  }

  /**
   * Sets a division's total spending: the gap is spread over its groups and items that
   * are not customised, in proportion to their amount (or over the customised ones when
   * all of them are).
   */
  setDivisionTotal(division: string, target: number): void {
    const codes = this.groupsOf(division);
    const { free, fixed } = this.leaves(codes, false);
    const divisionId = `spending.cofog.${division}`;
    const divisionReference = this.lever(divisionId).reference;
    if (free > 0) {
      const factor = Math.max(0, target - fixed) / free;
      this.setRelativeTo(divisionId, factor * divisionReference, divisionReference);
      return;
    }
    const ids = codes.flatMap((c) => [
      `spending.cofog.${c}`,
      ...this.itemsOf(c).map((i) => `spending.cofog.${i.key}`),
    ]);
    this.scaleSet(ids, fixed > 0 ? target / fixed : 0);
  }

  /**
   * Sets a group's total spending: the gap is spread over its items that are not
   * customised (or over the customised ones when all of them are).
   */
  setGroupTotal(group: string, target: number): void {
    const groupId = `spending.cofog.${group}`;
    const inherited = this.groupInherited(group);
    if (this.itemsOf(group).length === 0) {
      this.setRelativeTo(groupId, target, inherited);
      return;
    }
    const { free, fixed } = this.leaves([group], true);
    const reference = this.model.context.groupAmounts[group] ?? 0;
    if (free > 0) {
      const factor = Math.max(0, target - fixed) / free;
      this.setRelativeTo(groupId, factor * reference, inherited);
      return;
    }
    this.scaleSet(
      this.itemsOf(group).map((i) => `spending.cofog.${i.key}`),
      fixed > 0 ? target / fixed : 0,
    );
  }

  /** Resets a group and its items. */
  resetGroup(group: string): void {
    const ids = [group, ...this.itemsOf(group).map((i) => i.key)].map((c) => `spending.cofog.${c}`);
    this.levers = Object.fromEntries(
      Object.entries(this.levers).filter(([id]) => !ids.includes(id)),
    );
  }

  /** Resets a division, its groups and their items. */
  resetDivision(division: string): void {
    const codes = [division, ...this.groupsOf(division)];
    const ids = codes.flatMap((c) => [
      `spending.cofog.${c}`,
      ...this.itemsOf(c).map((i) => `spending.cofog.${i.key}`),
    ]);
    this.levers = Object.fromEntries(
      Object.entries(this.levers).filter(([id]) => !ids.includes(id)),
    );
  }

  isShown(id: string): boolean {
    return isShownAt(this.lever(id), this.detailLevel);
  }

  /** The visitor's choice of level, kept in this browser. */
  chooseDetailLevel(level: DetailLevel): void {
    this.detailLevel = level;
    writeStored(DETAIL_LEVEL_KEY, level);
  }

  /** The visitor's choice of spending layout, kept in this browser. */
  chooseSpendingLayout(layout: SpendingLayout): void {
    this.spendingLayout = layout;
    writeStored(SPENDING_LAYOUT_KEY, layout);
  }

  /** Raises the level for this visit only, so that these levers can be seen. */
  private show(ids: string[]): void {
    this.detailLevel = levelShowing(
      this.detailLevel,
      ids.map((id) => this.lever(id)),
    );
  }

  /** Modified levers that the current level hides. */
  get hiddenModifiedCount(): number {
    return Object.keys(this.levers).filter((id) => !this.isShown(id)).length;
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
    this.show([id]);
    this.focusRequest = { id, seq: (this.focusRequest?.seq ?? 0) + 1 };
  }

  /**
   * Replaces the scenario with a stored one (link, file). Returns the lever ids
   * that were dropped because this version does not know them.
   */
  load(raw: unknown): string[] {
    const { scenario, droppedLevers } = migrateScenario(raw, this.model.levers);
    this.restore(scenario.levers);
    return droppedLevers;
  }

  /** Replaces the modified levers with validated ones, all of them visible. */
  restore(levers: Record<string, number>): void {
    this.levers = { ...levers };
    this.show(Object.keys(levers));
  }

  get modifiedCount(): number {
    return Object.keys(this.levers).length;
  }
}
