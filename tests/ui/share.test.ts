// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { createModel, simulate } from '../../src/engine/simulate.ts';
import About from '../../src/ui/pages/About.svelte';
import { formatBillions } from '../../src/ui/format.ts';
import Methodology from '../../src/ui/pages/Methodology.svelte';
import Sources from '../../src/ui/pages/Sources.svelte';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';
import {
  pageFromHash,
  pageHash,
  scenarioFromHash,
  scenarioHash,
  simulatorHash,
} from '../../src/ui/state/url.ts';

const model = createModel(loadDataset());

describe('shared link', () => {
  it('restores exactly a scenario that moves every lever', () => {
    const levers = Object.fromEntries(
      [...model.levers.values()].map((l, i) => [
        l.id,
        l.min + ((l.max - l.min) * ((i * 7) % 13)) / 13,
      ]),
    );
    const scenario = { schemaVersion: 1 as const, baseYear: 2026, levers };
    const hash = scenarioHash(scenario);
    expect(hash).toMatch(/^#s=[A-Za-z0-9_-]+$/);
    const restored = scenarioFromHash(hash, model.levers);
    expect(restored?.scenario).toEqual(scenario);
    expect(restored?.droppedLevers).toEqual([]);
    expect(simulate(model, restored?.scenario ?? scenario)).toEqual(simulate(model, scenario));
  });

  it('has no hash for the reference scenario', () => {
    expect(scenarioHash({ schemaVersion: 1, baseYear: 2026, levers: {} })).toBe('');
    expect(scenarioFromHash('', model.levers)).toBeNull();
    expect(scenarioFromHash('#/sources', model.levers)).toBeNull();
  });

  it('drops unknown levers and rejects unreadable links', () => {
    const hash = scenarioHash({
      schemaVersion: 1,
      baseYear: 2026,
      levers: { 'vat.standard': 0.21, 'old.lever': 3 },
    });
    expect(scenarioFromHash(hash, model.levers)?.droppedLevers).toEqual(['old.lever']);
    expect(() => scenarioFromHash('#s=nimporte', model.levers)).toThrow();
  });

  it('loads a scenario into the store', () => {
    const store = new ScenarioStore(model);
    expect(
      store.load({ schemaVersion: 1, baseYear: 2026, levers: { 'vat.standard': 0.22, x: 1 } }),
    ).toEqual(['x']);
    expect(store.levers).toEqual({ 'vat.standard': 0.22 });
  });
});

describe('pages', () => {
  it('route from the hash', () => {
    expect(pageFromHash('')).toBe('home');
    expect(pageFromHash('#')).toBe('home');
    expect(pageFromHash('#/inconnu')).toBe('home');
    expect(pageFromHash('#s=abc')).toBe('simulator');
    expect(pageFromHash('#/simulateur')).toBe('simulator');
    expect(pageFromHash('#/methodologie')).toBe('methodology');
    expect(pageFromHash('#/sources')).toBe('sources');
    expect(pageFromHash('#/a-propos')).toBe('about');
    expect(pageHash('sources')).toBe('#/sources');
    expect(pageHash('home')).toBe('#');
    expect(pageHash('simulator')).toBe('#/simulateur');
  });

  it('keeps the simulator in the address even without a modified lever', () => {
    expect(simulatorHash({ schemaVersion: 1, baseYear: 2026, levers: {} })).toBe('#/simulateur');
    expect(
      simulatorHash({ schemaVersion: 1, baseYear: 2026, levers: { 'vat.standard': 0.22 } }),
    ).toMatch(/^#s=/);
  });

  const store = new ScenarioStore(model);

  it('Sources lists every source with its values', () => {
    const { body } = render(Sources, { props: { store } });
    // A source appears either with the values it supports or among the documentation.
    const missing = model.data.sources.sources.filter(
      (s) => !body.includes(s.url.replaceAll('&', '&amp;')),
    );
    expect(missing.map((s) => s.id)).toEqual([]);
    expect(body).toContain('valeurs vérifiées');
    expect(body).toContain('Sources des fiches explicatives');
    expect(body).toContain('Hypothèses sans source directe');
  });

  it('Methodology documents formulas, levers, profiles and limits', () => {
    const { body } = render(Methodology, { props: { store } });
    for (const text of [
      "Effet d'un levier de prélèvement",
      'Bilan annuel de référence',
      'Qui supporte quel prélèvement',
      'Limites',
    ]) {
      expect(body).toContain(text);
    }
    expect(body).toContain('TVA : taux normal');
  });

  it('Methodology shows the official forecast next to the mechanical projection', () => {
    const { body } = render(Methodology, { props: { store } });
    const forecast = store.model.data.macro.forecast;
    expect(body).toContain(`Prévisions pour ${String(forecast.year)}`);
    expect(body).toContain(formatBillions(forecast.balance.value ?? NaN));
    for (const other of forecast.otherGrowthForecasts) expect(body).toContain(other.organisation);
    expect(body).toContain('Projection mécanique du simulateur');
  });

  it('About states the principles', () => {
    expect(render(About).body).toContain('Neutralité');
  });
});
