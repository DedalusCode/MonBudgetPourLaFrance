// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { createModel } from '../../src/engine/simulate.ts';
import LeverPanel from '../../src/ui/components/LeverPanel.svelte';
import Treemap from '../../src/ui/components/Treemap.svelte';
import {
  ESSENTIAL_TAX_LEVERS,
  isDetailLevel,
  leverLevel,
  levelShowing,
} from '../../src/ui/detailLevel.ts';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';
import { scenarioFromHash, scenarioHash } from '../../src/ui/state/url.ts';
import { revenueItems, spendingItems } from '../../src/ui/treemap.ts';

const model = createModel(loadDataset());
const levers = [...model.levers.values()];
const essential = levers.filter((l) => leverLevel(l) === 'essential');
const lever = (id: string) => {
  const found = model.levers.get(id);
  if (!found) throw new Error(id);
  return found;
};

describe('lever levels', () => {
  it('keeps 10 functions and 13 main levies at the Essential level', () => {
    expect(essential.filter((l) => l.group === 'spending')).toHaveLength(10);
    expect(essential.filter((l) => l.group !== 'spending')).toHaveLength(13);
  });

  it('names existing levers only', () => {
    for (const id of ESSENTIAL_TAX_LEVERS) expect(model.levers.has(id), id).toBe(true);
  });

  it('keeps the four taxed income tax brackets and leaves the rest in Detailed', () => {
    const brackets = essential.filter((l) => l.group === 'incomeTax').map((l) => l.id);
    expect(brackets).toEqual([2, 3, 4, 5].map((n) => `incomeTax.bracket${String(n)}.rate`));
    expect(essential.some((l) => l.group === 'wealthTax' || l.group === 'macro')).toBe(false);
    expect(leverLevel(lever('spending.cofog.07.3'))).toBe('detailed');
  });

  it('raises a level only as far as needed', () => {
    expect(levelShowing('essential', [])).toBe('essential');
    expect(levelShowing('essential', [lever('vat.standard')])).toBe('essential');
    expect(levelShowing('essential', [lever('vat.reduced')])).toBe('detailed');
    expect(levelShowing('detailed', [lever('vat.standard')])).toBe('detailed');
  });

  it('puts the 314 level-3 items, and only them, at the Expert level', () => {
    const expert = levers.filter((l) => leverLevel(l) === 'expert');
    expect(expert).toHaveLength(314);
    expect(expert.every((l) => l.item !== undefined)).toBe(true);
    expect(leverLevel(lever('spending.cofog.10.7.rsa'))).toBe('expert');
    expect(levelShowing('detailed', [lever('spending.cofog.10.7.rsa')])).toBe('expert');
  });

  it('recognises stored levels', () => {
    expect(isDetailLevel('detailed')).toBe(true);
    expect(isDetailLevel('expert')).toBe(true);
    expect(isDetailLevel('expertise')).toBe(false);
    expect(isDetailLevel(null)).toBe(false);
  });
});

describe('changing level', () => {
  const scenarioLevers = { 'vat.reduced': 0.06, 'spending.cofog.07.3': 40, 'vat.standard': 0.21 };

  it('never changes the result', () => {
    const store = new ScenarioStore(model);
    store.restore(scenarioLevers);
    const before = store.result;
    store.detailLevel = 'essential';
    expect(store.levers).toEqual(scenarioLevers);
    expect(store.result).toEqual(before);
    store.chooseDetailLevel('detailed');
    expect(store.result).toEqual(before);
  });

  it('counts the modifications hidden by the level', () => {
    const store = new ScenarioStore(model);
    store.restore(scenarioLevers);
    expect(store.hiddenModifiedCount).toBe(0);
    store.detailLevel = 'essential';
    expect(store.hiddenModifiedCount).toBe(2);
    const { body } = render(LeverPanel, { props: { store } });
    expect(body).toContain('modifications masquées');
    expect(body).toContain('Passer au niveau Détaillé');
  });

  it('opens a shared scenario at the level that shows all its levers', () => {
    const store = new ScenarioStore(model);
    expect(store.detailLevel).toBe('essential');
    const hash = scenarioHash({ schemaVersion: 1, baseYear: 2026, levers: scenarioLevers });
    const loaded = scenarioFromHash(hash, model.levers);
    store.restore(loaded?.scenario.levers ?? {});
    expect(store.detailLevel).toBe('detailed');
    expect(store.hiddenModifiedCount).toBe(0);
  });

  it('keeps the Essential level for a scenario that does not need more', () => {
    const store = new ScenarioStore(model);
    store.load({ schemaVersion: 1, baseYear: 2026, levers: { 'vat.standard': 0.21 } });
    expect(store.detailLevel).toBe('essential');
  });

  it('shows a lever requested from elsewhere', () => {
    const store = new ScenarioStore(model);
    store.focusLever('wealthTax.bracket2.rate');
    expect(store.detailLevel).toBe('detailed');
  });
});

describe('level display', () => {
  it('shows only the Essential sliders', () => {
    const { body } = render(LeverPanel, {
      props: { store: new ScenarioStore(model), expanded: true },
    });
    expect(body.match(/type="range"/g)).toHaveLength(essential.length);
    expect(body).toContain('Niveau de détail');
    expect(body).toContain(`${String(essential.length)} curseurs`);
    expect(body).not.toContain('Détail par groupe');
    expect(body).not.toContain('Bornes étendues');
  });

  it('stops the treemap at the functions at the Essential level', () => {
    const result = new ScenarioStore(model).result;
    expect(spendingItems(model, result, null, false).every((i) => !i.zoomable)).toBe(true);
    const { body } = render(Treemap, { props: { store: new ScenarioStore(model) } });
    expect(body).not.toContain('Entrée pour voir le détail');
    expect(body).toContain('Entrée pour modifier ce poste');
  });

  it('shows the items of a group at the Expert level only', () => {
    const store = new ScenarioStore(model);
    store.detailLevel = 'detailed';
    const detailed = render(LeverPanel, { props: { store, expanded: true } }).body;
    expect(detailed).not.toContain('Postes du groupe');
    store.detailLevel = 'expert';
    const expert = render(LeverPanel, { props: { store, expanded: true } }).body;
    expect(expert).toContain('Postes du groupe (6)');
    expect(expert).toContain('id="lever-spending-cofog-10-7-rsa"');
  });

  it('zooms the treemap from a group to its items at the Expert level', () => {
    const result = new ScenarioStore(model).result;
    const groups = spendingItems(model, result, '10', true, true);
    expect(groups.find((g) => g.key === '10.7')?.zoomable).toBe(true);
    expect(spendingItems(model, result, '10', true, false).some((g) => g.zoomable)).toBe(false);
    const items = spendingItems(model, result, '10.7', true, true);
    expect(items.map((i) => i.key)).toContain('10.7.rsa');
    expect(items.find((i) => i.key === '10.7.rsa')?.leverId).toBe('spending.cofog.10.7.rsa');
  });

  it('opens the first shown lever of a revenue item', () => {
    const result = new ScenarioStore(model).result;
    const contributions = revenueItems(model, result, (l) => leverLevel(l) === 'essential');
    expect(contributions.find((i) => i.key === 'employerContributions')?.leverId).toBe(
      'socialContributions.employerHealth.rate',
    );
    // No Essential lever on the wealth tax: the tile still opens one, raising the level.
    expect(contributions.find((i) => i.key === 'wealthTax')?.leverId).toBeDefined();
  });
});
