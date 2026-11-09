// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Data and layout of the spending / revenue treemap (PLAN.MD step 9).
 * Pure functions: tiles in pixels, ready to be drawn as positioned buttons.
 */
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import type { Lever } from '../engine/levers.ts';
import type { Model, SimulationResult } from '../engine/simulate.ts';
import { resolve } from '../engine/rules.ts';
import { ONE_EURO_IN_BILLIONS } from './format.ts';

export type Direction = 'up' | 'down' | 'none';

export interface TreemapItem {
  /** COFOG code or revenue item id. */
  key: string;
  label: string;
  reference: number;
  scenario: number;
  /** Lever opened by a click, if any. */
  leverId?: string;
  /** True when a click zooms into the item instead of opening its lever. */
  zoomable?: boolean;
}

export interface Tile extends TreemapItem {
  x: number;
  y: number;
  width: number;
  height: number;
  change: number;
  direction: Direction;
}

export function directionOf(reference: number, scenario: number): Direction {
  const change = scenario - reference;
  // Coloured from one euro of change, like the rest of the interface.
  if (Math.abs(change) < ONE_EURO_IN_BILLIONS) return 'none';
  return change > 0 ? 'up' : 'down';
}

/**
 * COFOG divisions; the groups of one division when zoomed on it ("07"); the level-3
 * items of one group when zoomed on it ("07.1", Expert level).
 */
export function spendingItems(
  model: Model,
  result: SimulationResult,
  zoom: string | null,
  /** Whether a function opens onto its groups. */
  detailed = true,
  /** Whether a group opens onto its items. */
  expert = false,
): TreemapItem[] {
  const reference = model.context.groupAmounts;
  const scenario = result.groupAmounts;
  const sum = (codes: string[], amounts: Record<string, number>) =>
    codes.reduce((s, c) => s + (amounts[c] ?? 0), 0);
  if (zoom === null) {
    return model.data.spending.divisions.map((d) => {
      const codes = d.groups.map((g) => g.code);
      return {
        key: d.code,
        label: d.label,
        reference: sum(codes, reference),
        scenario: sum(codes, scenario),
        leverId: `spending.cofog.${d.code}`,
        zoomable: detailed,
      };
    });
  }
  if (zoom.length > 2) {
    return (model.items.get(zoom) ?? []).map((item) => ({
      key: item.key,
      label: item.label,
      reference: item.reference,
      scenario: result.itemAmounts[item.key] ?? item.reference,
      leverId: `spending.cofog.${item.key}`,
    }));
  }
  const selected = model.data.spending.divisions.find((d) => d.code === zoom);
  return (selected?.groups ?? []).map((g) => ({
    key: g.code,
    label: g.label,
    reference: reference[g.code] ?? 0,
    scenario: scenario[g.code] ?? 0,
    leverId: `spending.cofog.${g.code}`,
    zoomable: expert && (model.items.get(g.code)?.length ?? 0) > 0,
  }));
}

/**
 * Revenue items, with the static effect of the tax levers that change them. A click
 * opens the first lever that `isShown` accepts, else the first lever of the item.
 */
export function revenueItems(
  model: Model,
  result: SimulationResult,
  isShown: (lever: Lever) => boolean = () => true,
): TreemapItem[] {
  const levers = [...model.levers.values()];
  return model.data.revenues.items.map((item) => {
    const reference = resolve(item.amount);
    const related = levers.filter((l) => l.revenueItem === item.id);
    const change = related.reduce((s, l) => s + (result.revenueChanges[l.id] ?? 0), 0);
    return {
      key: item.id,
      label: item.label,
      reference,
      scenario: reference + change,
      leverId: (related.find(isShown) ?? related[0])?.id,
    };
  });
}

/** Squarified treemap of the items' scenario amounts in a width × height box. */
export function layoutTiles(items: TreemapItem[], width: number, height: number): Tile[] {
  const root = hierarchy<{ children?: TreemapItem[] } | TreemapItem>({ children: items })
    .sum((d) => ('scenario' in d ? Math.max(0, d.scenario) : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const laid = treemap<{ children?: TreemapItem[] } | TreemapItem>()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingInner(2)
    .round(true)(root);
  return laid.leaves().flatMap((leaf) => {
    const item = leaf.data;
    if (!('key' in item)) return [];
    return [
      {
        ...item,
        x: leaf.x0,
        y: leaf.y0,
        width: leaf.x1 - leaf.x0,
        height: leaf.y1 - leaf.y0,
        change: item.scenario - item.reference,
        direction: directionOf(item.reference, item.scenario),
      },
    ];
  });
}
