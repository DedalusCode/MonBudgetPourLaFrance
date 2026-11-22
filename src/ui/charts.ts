// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Pie and bar layouts of the breakdown (PLAN.MD §14.1), from the same items as the
 * treemap. Pure functions: geometry in the units of the caller's SVG or CSS.
 */
import { directionOf, type Direction, type TreemapItem } from './treemap.ts';

/** Key of the slice gathering the smallest items of a pie. */
export const OTHER_KEY = 'other';

/** Most slices drawn; beyond, the smallest items are gathered in « Autres ». */
export const MAX_SLICES = 8;

/** Smallest share of the pie that carries its percentage on the slice. */
export const LABEL_SHARE = 0.05;

export interface Slice extends TreemapItem {
  /** Angles in radians, clockwise from twelve o'clock. */
  start: number;
  end: number;
  /** Share of the scenario total. */
  share: number;
  change: number;
  direction: Direction;
  /** Keys of the items gathered in « Autres » (empty for a plain item). */
  members: string[];
}

export interface Bar extends TreemapItem {
  change: number;
  direction: Direction;
  /** Lengths as a share of the longest bar (reference or scenario), 0 to 1. */
  scenarioRatio: number;
  referenceRatio: number;
}

const bySize = (a: TreemapItem, b: TreemapItem) => b.scenario - a.scenario;

/**
 * Slices of the scenario amounts, largest first from twelve o'clock. Above `maxSlices`
 * items, the smallest are gathered in one « Autres » slice, which opens no lever.
 */
export function pieSlices(items: TreemapItem[], maxSlices = MAX_SLICES): Slice[] {
  const sorted = items.filter((i) => i.scenario > 0 || i.reference > 0).sort(bySize);
  const kept = sorted.length > maxSlices ? sorted.slice(0, maxSlices - 1) : sorted;
  const rest = sorted.slice(kept.length);
  const entries: (TreemapItem & { members: string[] })[] = kept.map((i) => ({
    ...i,
    members: [],
  }));
  if (rest.length > 0) {
    entries.push({
      key: OTHER_KEY,
      label: `Autres (${rest.length})`,
      reference: rest.reduce((s, i) => s + i.reference, 0),
      scenario: rest.reduce((s, i) => s + i.scenario, 0),
      members: rest.map((i) => i.key),
    });
  }
  const total = entries.reduce((s, i) => s + Math.max(0, i.scenario), 0);
  let angle = 0;
  return entries.map((entry) => {
    const share = total > 0 ? Math.max(0, entry.scenario) / total : 0;
    const start = angle;
    angle += share * 2 * Math.PI;
    return {
      ...entry,
      start,
      end: angle,
      share,
      change: entry.scenario - entry.reference,
      direction: directionOf(entry.reference, entry.scenario),
    };
  });
}

/** Point of a circle at an angle measured clockwise from twelve o'clock. */
export function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
}

/** SVG path of a slice; a full circle when the slice covers the whole pie. */
export function slicePath(cx: number, cy: number, r: number, slice: Slice): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  if (slice.end - slice.start >= 2 * Math.PI - 1e-9) {
    return `M ${round(cx)} ${round(cy - r)} A ${r} ${r} 0 1 1 ${round(cx)} ${round(cy + r)} A ${r} ${r} 0 1 1 ${round(cx)} ${round(cy - r)} Z`;
  }
  const [x0, y0] = polar(cx, cy, r, slice.start);
  const [x1, y1] = polar(cx, cy, r, slice.end);
  const large = slice.end - slice.start > Math.PI ? 1 : 0;
  return `M ${round(cx)} ${round(cy)} L ${round(x0)} ${round(y0)} A ${r} ${r} 0 ${large} 1 ${round(x1)} ${round(y1)} Z`;
}

/** Horizontal bars, longest scenario amount first. */
export function barRows(items: TreemapItem[]): Bar[] {
  const longest = Math.max(0, ...items.flatMap((i) => [i.scenario, i.reference]));
  const ratio = (value: number) => (longest > 0 ? Math.max(0, value) / longest : 0);
  return [...items].sort(bySize).map((item) => ({
    ...item,
    change: item.scenario - item.reference,
    direction: directionOf(item.reference, item.scenario),
    scenarioRatio: ratio(item.scenario),
    referenceRatio: ratio(item.reference),
  }));
}
