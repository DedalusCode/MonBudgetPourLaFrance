// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { createModel, simulate } from '../../src/engine/simulate.ts';
import Treemap from '../../src/ui/components/Treemap.svelte';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';
import {
  directionOf,
  layoutTiles,
  revenueItems,
  spendingItems,
  type Tile,
} from '../../src/ui/treemap.ts';

const model = createModel(loadDataset());
const run = (levers: Record<string, number>) =>
  simulate(model, { schemaVersion: 1, baseYear: 2026, levers });
const base = run({});

describe('treemap data', () => {
  it('shows the 10 COFOG divisions, adding up to COFOG spending', () => {
    const items = spendingItems(model, base, null);
    expect(items).toHaveLength(10);
    // 2024 COFOG total (1 671.794 Md€) scaled to the 2025 total spending.
    expect(items.reduce((s, i) => s + i.scenario, 0)).toBeCloseTo(1_713.2546, 2);
    expect(items.every((i) => i.zoomable)).toBe(true);
  });

  it('zooms into the groups of a division', () => {
    const health = spendingItems(
      model,
      run({ 'spending.cofog.07': (model.levers.get('spending.cofog.07')?.reference ?? NaN) * 1.1 }),
      '07',
    );
    expect(health.map((i) => i.key)).toEqual(['07.1', '07.2', '07.3', '07.4', '07.5', '07.6']);
    expect(health[2]?.scenario).toBeCloseTo((health[2]?.reference ?? NaN) * 1.1, 6);
    expect(health[2]?.leverId).toBe('spending.cofog.07.3');
  });

  it('applies tax levers to their revenue item', () => {
    const items = revenueItems(model, run({ 'vat.standard': 0.21 }));
    const vat = items.find((i) => i.key === 'vat');
    // One point of standard VAT: base of 750 Md€ (revenues.json).
    expect((vat?.scenario ?? NaN) - (vat?.reference ?? NaN)).toBeCloseTo(7.5, 6);
    expect(vat?.leverId).toBe('vat.standard');
    expect(items.find((i) => i.key === 'nonTaxRevenue')?.leverId).toBeUndefined();
  });

  it('links every tax lever to an existing revenue item', () => {
    const ids = new Set(model.data.revenues.items.map((i) => i.id));
    for (const lever of model.levers.values()) {
      if (lever.group === 'spending' || lever.group === 'macro') continue;
      expect(ids.has(lever.revenueItem ?? ''), lever.id).toBe(true);
    }
  });

  it('marks changes beyond 0.1 % as up or down', () => {
    // From one euro of change (amounts in Md€).
    expect(directionOf(100, 100 + 1e-10)).toBe('none');
    expect(directionOf(100, 100 + 1e-9)).toBe('up');
    expect(directionOf(100, 101)).toBe('up');
    expect(directionOf(100, 99)).toBe('down');
  });
});

describe('treemap layout', () => {
  const area = (t: Tile) => t.width * t.height;

  it('fills the box with areas proportional to amounts', () => {
    const tiles = layoutTiles(spendingItems(model, base, null), 800, 500);
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + t.width).toBeLessThanOrEqual(800);
      expect(t.y + t.height).toBeLessThanOrEqual(500);
    }
    const social = tiles.find((t) => t.key === '10');
    const defence = tiles.find((t) => t.key === '02');
    const ratio = (social?.scenario ?? 0) / (defence?.scenario ?? 1);
    expect(area(social as Tile) / area(defence as Tile)).toBeGreaterThan(ratio * 0.8);
    expect(area(social as Tile) / area(defence as Tile)).toBeLessThan(ratio * 1.25);
  });

  it('keeps readable labels on the main functions at 360 px wide', () => {
    const tiles = layoutTiles(spendingItems(model, base, null), 360, 300);
    const labelled = tiles.filter((t) => t.width >= 72 && t.height >= 36);
    expect(labelled.length).toBeGreaterThanOrEqual(5);
    expect(labelled.map((t) => t.key)).toEqual(
      expect.arrayContaining(['10', '07', '01', '04', '09']),
    );
  });
});

describe('treemap rendering', () => {
  const store = new ScenarioStore(model);
  store.set('spending.cofog.02', (model.levers.get('spending.cofog.02')?.reference ?? NaN) * 1.1);
  store.set('spending.cofog.09', (model.levers.get('spending.cofog.09')?.reference ?? NaN) * 0.9);
  const { body } = render(Treemap, { props: { store } });

  it('renders every division as a keyboard-reachable button with a description', () => {
    expect(body.match(/<button type="button" class="tile/g)).toHaveLength(10);
    expect(body).toMatch(/aria-label="Défense : [^"]*\+[^"]*Entrée pour voir le détail\."/);
  });

  it('colours changes with a direction, never by colour alone', () => {
    expect(body).toContain('data-direction="up"');
    expect(body).toContain('data-direction="down"');
    expect(body).toContain('en hausse (+)');
    expect(body).toContain('Afficher le tableau équivalent');
  });

  it('asks the lever panel to reveal a lever', () => {
    store.focusLever('spending.cofog.07.3');
    expect(store.focusRequest?.id).toBe('spending.cofog.07.3');
    expect(() => store.focusLever('nope')).toThrow('Unknown lever');
  });
});
