// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { createModel } from '../../src/engine/simulate.ts';
import App from '../../src/ui/App.svelte';
import SummaryBar from '../../src/ui/components/SummaryBar.svelte';
import { formatBillions } from '../../src/ui/format.ts';
import Home from '../../src/ui/pages/Home.svelte';
import LeverPanel from '../../src/ui/components/LeverPanel.svelte';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';

describe('simulator page (server render)', () => {
  const { body } = render(App);

  it('shows the warning banner and the limits box', () => {
    expect(body).toContain('version volontairement simplifiée');
    expect(body).toContain("Ce que l'outil ne prend pas en compte");
  });

  it('shows the summary bar', () => {
    for (const label of ['Recettes', 'Dépenses', 'Solde', 'Dette en 2030', 'Réinitialiser']) {
      expect(body).toContain(label);
    }
  });

  it('shows a slider and a labelled field for every lever', () => {
    const store = new ScenarioStore();
    store.detailLevel = 'expert';
    const panel = render(LeverPanel, { props: { store, expanded: true } }).body;
    const model = createModel(loadDataset());
    const sliders = panel.match(/type="range"/g) ?? [];
    // Every lever, minus the COFOG groups with no spending in the accounts (no slider).
    const empty = [...model.levers.values()].filter(
      (l) => l.group === 'spending' && l.reference === 0,
    ).length;
    expect(sliders.length).toBe(model.levers.size - empty);
    const year = String(model.data.spending.structureYear);
    expect(panel.match(new RegExp(`aucune dépense dans les comptes ${year}`, 'g'))).toHaveLength(
      empty,
    );
    expect(panel).toContain('Montant actuel');
    expect(panel).toContain('for="lever-vat-standard"');
    expect(panel).toContain('id="lever-vat-standard"');
    expect(body).toContain('Rechercher un levier');
    expect(panel).toContain('Bornes étendues');
  });
});

describe('landing page (server render)', () => {
  const { body } = render(Home, { props: { store: new ScenarioStore(), go: () => {} } });

  it('presents the project and leads to the simulator', () => {
    expect(body).toContain('Le budget de la France, entre vos mains');
    expect(body.match(/href="#\/simulateur"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('shows figures from the data, never hard-coded ones', () => {
    const store = new ScenarioStore();
    const accounts = store.reference.aggregates;
    expect(body).toContain(formatBillions(accounts.spending, 0));
    expect(body).toContain(formatBillions(accounts.revenue, 0));
    for (const profile of store.model.data.profiles.profiles) expect(body).toContain(profile.label);
  });

  it('splits 100 € of spending across functions', () => {
    const values = [...body.matchAll(/<span class="value[^"]*">(\d+) €<\/span>/g)].map((m) =>
      Number(m[1]),
    );
    expect(values).toHaveLength(6);
    const total = values.reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThanOrEqual(97);
    expect(total).toBeLessThanOrEqual(103);
  });
});

describe('summary bar colours', () => {
  it('shows the current value and colours a change by its effect on the public accounts', () => {
    const store = new ScenarioStore();
    store.levers = { 'vat.standard': 0.21 };
    const { body } = render(SummaryBar, { props: { store } });
    // More revenue and a better balance: green; debt falls: green too.
    expect(body.match(/data-tone="gain"/g)?.length).toBe(3);
    expect(body).toContain('aujourd’hui :');
    store.levers = { 'vat.standard': 0.19 };
    const worse = render(SummaryBar, { props: { store } }).body;
    expect(worse.match(/data-tone="loss"/g)?.length).toBe(3);
  });

  it('colours a change of a single euro', () => {
    const store = new ScenarioStore();
    const reference = store.lever('spending.cofog.02.1').reference;
    store.levers = { 'spending.cofog.02.1': reference + 1e-9 };
    const { body } = render(SummaryBar, { props: { store } });
    expect(body).toContain('data-tone="loss"');
    expect(body).toMatch(/\+1\s€/);
  });
});
