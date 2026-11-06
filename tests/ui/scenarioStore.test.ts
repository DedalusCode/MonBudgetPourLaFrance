// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';

// The steps share one store and run in order, like a user session.
describe('scenario store', () => {
  const store = new ScenarioStore();

  it('starts from the reference', () => {
    expect(store.modifiedCount).toBe(0);
    expect(store.result.aggregates.revenue).toBeCloseTo(store.reference.aggregates.revenue, 9);
  });

  it('updates the summary on every lever change', () => {
    store.set('vat.standard', 0.21);
    expect(store.isModified('vat.standard')).toBe(true);
    // One point of standard VAT yields 7.5 Md€ (revenues.json, vat.standard base 750 Md€).
    expect(store.result.aggregates.revenue - store.reference.aggregates.revenue).toBeCloseTo(
      7.5,
      6,
    );
    store.set('spending.cofog.02', 60);
    expect(store.result.aggregates.spending).toBeGreaterThan(store.reference.aggregates.spending);
    expect(store.modifiedCount).toBe(2);
  });

  it('stores only modified levers, as absolute values', () => {
    expect(store.scenario).toEqual({
      schemaVersion: 1,
      baseYear: 2026,
      levers: { 'vat.standard': 0.21, 'spending.cofog.02': 60 },
    });
    store.set('vat.standard', 0.2);
    expect(store.isModified('vat.standard')).toBe(false);
  });

  it('keeps a customised group relative to its division', () => {
    store.setRelativeTo('spending.cofog.02.1', 0, 0.1);
    expect(store.levers['spending.cofog.02.1']).toBe(0);
    store.setRelativeTo('spending.cofog.02.1', 0.1, 0.1);
    expect(store.isModified('spending.cofog.02.1')).toBe(false);
  });

  it('resets one lever or all of them', () => {
    store.set('vat.reduced', 0.06);
    store.reset('vat.reduced');
    expect(store.isModified('vat.reduced')).toBe(false);
    store.resetAll();
    expect(store.modifiedCount).toBe(0);
    expect(() => store.lever('nope')).toThrow('Unknown lever');
  });
});

describe('division totals', () => {
  const store = new ScenarioStore();
  const ref = (code: string) => store.model.context.groupAmounts[code] ?? NaN;
  const education = () => store.divisionTotal('09');
  const educationReference = store.lever('spending.cofog.09').reference;

  it('starts from the accounts', () => {
    expect(education()).toBeCloseTo(educationReference, 6);
  });

  it('rises when one of its groups rises', () => {
    store.set('spending.cofog.09.1', ref('09.1') + 5);
    expect(education()).toBeCloseTo(educationReference + 5, 6);
  });

  it('spreads a new total over the groups that are not customised', () => {
    store.setDivisionTotal('09', educationReference + 15);
    expect(education()).toBeCloseTo(educationReference + 15, 6);
    // The customised primary group keeps its amount; the others share the remaining +10.
    expect(store.result.groupAmounts['09.1']).toBeCloseTo(ref('09.1') + 5, 6);
    const others = educationReference - ref('09.1');
    expect(store.result.groupAmounts['09.2']).toBeCloseTo(ref('09.2') * (1 + 10 / others), 6);
  });

  it('scales the customised groups when every group is customised', () => {
    const s = new ScenarioStore(store.model);
    for (const code of s.groupsOf('02')) s.set(`spending.cofog.${code}`, ref(code));
    for (const code of s.groupsOf('02')) s.setRelativeTo(`spending.cofog.${code}`, ref(code), -1);
    const total = s.divisionTotal('02');
    s.setDivisionTotal('02', total * 2);
    expect(s.divisionTotal('02')).toBeCloseTo(total * 2, 6);
  });

  it('resets a division with its groups', () => {
    store.resetDivision('09');
    expect(education()).toBeCloseTo(educationReference, 6);
    expect(store.modifiedCount).toBe(0);
  });
});
