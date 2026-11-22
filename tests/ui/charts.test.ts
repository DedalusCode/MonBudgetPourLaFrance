// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Breakdown views: pie, bars and squares (PLAN.MD §14.1). */
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { createModel, simulate } from '../../src/engine/simulate.ts';
import { barRows, MAX_SLICES, OTHER_KEY, pieSlices, slicePath } from '../../src/ui/charts.ts';
import { CHART_VIEWS, DEFAULT_CHART_VIEW, isChartView } from '../../src/ui/chartView.ts';
import Treemap from '../../src/ui/components/Treemap.svelte';
import { formatBillions } from '../../src/ui/format.ts';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';
import { revenueItems, spendingItems } from '../../src/ui/treemap.ts';

const model = createModel(loadDataset());
const base = simulate(model, { schemaVersion: 1, baseYear: 2026, levers: {} });
const total = (list: { scenario: number }[]) => list.reduce((s, i) => s + i.scenario, 0);

describe('pie slices', () => {
  const items = spendingItems(model, base, null);
  const slices = pieSlices(items);

  it('keeps the largest items and gathers the others, without losing any amount', () => {
    expect(slices).toHaveLength(MAX_SLICES);
    const other = slices.at(-1);
    expect(other?.key).toBe(OTHER_KEY);
    expect(other?.members).toHaveLength(items.length - (MAX_SLICES - 1));
    expect(other?.label).toBe(`Autres (${items.length - (MAX_SLICES - 1)})`);
    expect(other?.leverId).toBeUndefined();
    expect(total(slices)).toBeCloseTo(total(items), 9);
    const sizes = slices.slice(0, -1).map((s) => s.scenario);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it('covers the whole circle, angles in proportion to the amounts', () => {
    expect(slices[0]?.start).toBe(0);
    expect(slices.at(-1)?.end).toBeCloseTo(2 * Math.PI, 9);
    expect(slices.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 9);
    for (const s of slices) expect(s.end - s.start).toBeCloseTo(s.share * 2 * Math.PI, 9);
  });

  it('draws no « Autres » slice up to the limit, and a full circle for one item', () => {
    const groups = spendingItems(model, base, '02');
    expect(pieSlices(groups).some((s) => s.key === OTHER_KEY)).toBe(false);
    const [only] = pieSlices(groups.slice(0, 1));
    expect(only && slicePath(100, 100, 90, only)).toMatch(/A 90 90 0 1 1 .* A 90 90 0 1 1/);
  });

  it('gathers revenue items beyond the limit too', () => {
    const revenue = revenueItems(model, base);
    expect(revenue.length).toBeGreaterThan(MAX_SLICES);
    expect(total(pieSlices(revenue))).toBeCloseTo(total(revenue), 9);
  });
});

describe('bars', () => {
  it('sorts by amount and scales to the longest bar', () => {
    const items = spendingItems(model, base, null);
    const bars = barRows(items);
    expect(bars[0]?.scenarioRatio).toBe(1);
    expect(bars.map((b) => b.scenario)).toEqual(items.map((i) => i.scenario).sort((a, b) => b - a));
    expect(bars.every((b) => b.referenceRatio === b.scenarioRatio)).toBe(true);
  });

  it('keeps the current amount as a mark when the scenario changes', () => {
    const doubled = items2x();
    const bars = barRows(doubled);
    const health = bars.find((b) => b.key === '07');
    expect(health?.direction).toBe('up');
    expect(health?.referenceRatio).toBeCloseTo((health?.scenarioRatio ?? NaN) / 2, 9);
  });
});

function items2x() {
  return spendingItems(model, base, null).map((i) =>
    i.key === '07' ? { ...i, scenario: i.scenario * 2 } : i,
  );
}

describe('view switch', () => {
  it('offers three views, the pie by default, without changing the scenario', () => {
    expect(CHART_VIEWS.map((v) => v.label)).toEqual(['Camembert', 'Barres', 'Carrés']);
    expect(DEFAULT_CHART_VIEW).toBe('pie');
    expect(isChartView('squares')).toBe(true);
    expect(isChartView('donut')).toBe(false);
    const store = new ScenarioStore(model);
    expect(store.chartView).toBe('pie');
    store.chooseChartView('bars');
    expect(store.chartView).toBe('bars');
    expect(store.levers).toEqual({});
  });

  it.each(['pie', 'bars', 'squares'] as const)(
    '%s: every item reachable from the keyboard, same amounts as the table',
    (view) => {
      const store = new ScenarioStore(model);
      store.detailLevel = 'detailed';
      store.chooseChartView(view);
      store.set(
        'spending.cofog.02',
        (model.levers.get('spending.cofog.02')?.reference ?? NaN) * 1.1,
      );
      const { body } = render(Treemap, { props: { store } });
      expect(body).toContain('Vue');
      const items = spendingItems(model, store.result, null);
      const buttons = body.match(/<button[^>]*data-key="/g) ?? [];
      expect(buttons).toHaveLength(view === 'pie' ? MAX_SLICES : items.length);
      expect(body).toMatch(/aria-label="Défense : [^"]*\+[^"]*Entrée pour voir le détail\."/);
      for (const item of view === 'pie' ? pieSlices(items) : items) {
        expect(body).toContain(formatBillions(item.scenario));
      }
      if (view === 'pie') expect(body).toContain('Entrée pour afficher le tableau détaillé.');
    },
  );
});
