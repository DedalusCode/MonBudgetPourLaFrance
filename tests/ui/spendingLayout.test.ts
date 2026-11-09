// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Layouts of the spending levers: tree, cards (display preference). */
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { createModel } from '../../src/engine/simulate.ts';
import LeverPanel from '../../src/ui/components/LeverPanel.svelte';
import {
  DEFAULT_SPENDING_LAYOUT,
  isSpendingLayout,
  SPENDING_LAYOUTS,
} from '../../src/ui/spendingLayout.ts';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';

const model = createModel(loadDataset());
const spendingLevers = [...model.levers.values()].filter(
  (l) => l.group === 'spending' && !l.deprecated && l.reference > 0,
);
const sliders = (body: string) => body.match(/type="range"/g)?.length ?? 0;

function panel(layout: 'tree' | 'cards', level: 'detailed' | 'expert' = 'expert') {
  const store = new ScenarioStore(model);
  store.detailLevel = level;
  store.chooseSpendingLayout(layout);
  return { store, body: render(LeverPanel, { props: { store, expanded: true } }).body };
}

describe('spending layout switch', () => {
  it('offers two layouts from the Detailed level on, the tree by default', () => {
    expect(SPENDING_LAYOUTS.map((l) => l.label)).toEqual(['Arbre', 'Cartes']);
    expect(DEFAULT_SPENDING_LAYOUT).toBe('tree');
    expect(new ScenarioStore(model).spendingLayout).toBe('tree');
    expect(isSpendingLayout('cards')).toBe(true);
    // A layout stored by an earlier version falls back to the default.
    expect(isSpendingLayout('screens')).toBe(false);
    const essential = render(LeverPanel, { props: { store: new ScenarioStore(model) } }).body;
    expect(essential).not.toContain('Affichage des dépenses');
    const { body } = panel('tree', 'detailed');
    expect(body).toContain('Affichage des dépenses');
    for (const layout of SPENDING_LAYOUTS) expect(body).toContain(layout.label);
  });

  it('never changes the scenario', () => {
    const { store } = panel('cards');
    expect(store.levers).toEqual({});
    expect(store.spendingLayout).toBe('cards');
  });
});

describe('tree and cards', () => {
  it.each(['tree', 'cards'] as const)('%s: every spending lever reachable', (layout) => {
    const { body } = panel(layout);
    expect(body).toContain(`groups ${layout}`);
    // The items open from a button on their group, not from a nested accordion.
    expect(body).toMatch(
      /aria-controls="items-10\.7"[^>]*>[^<]*<span[^>]*>▾<\/span>\s*Postes du groupe \(6\)/,
    );
    expect(body).not.toContain('Détail par groupe');
    const taxes = [...model.levers.values()].filter(
      (l) => l.group !== 'spending' && !l.deprecated,
    ).length;
    expect(sliders(body)).toBe(spendingLevers.length + taxes);
  });
});
