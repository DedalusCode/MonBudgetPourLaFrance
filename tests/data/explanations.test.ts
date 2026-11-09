// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Pop-up texts of the levers (src/data/explanations.json). */
import { describe, expect, it } from 'vitest';
import explanations from '../../src/data/explanations.json';
import { validateExplanations } from '../../src/engine/dataChecks.ts';
import { natureOf } from '../../src/engine/natures.ts';
import type { Explanation, ExplanationsFile } from '../../src/engine/schemas.ts';
import { explanationFor } from '../../src/ui/explanation.ts';
import { buildLevers } from '../../src/engine/levers.ts';
import { loadDataset } from '../../src/engine/params.ts';

const data = loadDataset();
const leverIds = [...buildLevers(data).values()].filter((l) => !l.deprecated).map((l) => l.id);
/** The JSON import types headings as plain strings: the schema check above validates them. */
const file = explanations as unknown as ExplanationsFile;
const sourceIds = new Set(data.sources.sources.map((s) => s.id));

describe('lever explanations', () => {
  it('cover every lever once, with registered sources', () => {
    expect(validateExplanations(explanations, sourceIds, leverIds)).toEqual([]);
  });

  it('report a missing entry, an unknown lever and an unknown source', () => {
    const broken = {
      entries: [
        {
          id: 'vat.unknown',
          summary: 'Texte.',
          sections: [{ heading: 'Bon à savoir', text: 'Texte.' }],
          sourceIds: ['no-such-source'],
        },
      ],
      natures: explanations.natures,
    };
    const errors = validateExplanations(broken, sourceIds, [
      'vat.standard',
      'spending.cofog.02.1.compensation',
      'spending.cofog.10.7.rsa',
    ]);
    expect(errors).toContain('explanations.json: unknown lever "vat.unknown"');
    expect(errors).toContain('explanations.json: vat.unknown: unknown sourceId "no-such-source"');
    expect(errors).toContain('explanations.json: missing entry for lever "vat.standard"');
    expect(errors).toContain(
      'explanations.json: vat.unknown: needs one "Ce que change une variation" section',
    );
    // A nature item uses its template; a concrete item needs its own text.
    expect(errors).not.toContain(
      'explanations.json: missing entry for lever "spending.cofog.02.1.compensation"',
    );
    expect(errors).toContain(
      'explanations.json: missing entry for lever "spending.cofog.10.7.rsa"',
    );
  });

  it('give every text an upward then a downward variant', () => {
    const variation = (items: string[]) => ({
      entries: [
        {
          id: 'vat.standard',
          summary: 'Texte.',
          sections: [{ heading: 'Ce que change une variation', items }],
          sourceIds: [...sourceIds].slice(0, 1),
        },
      ],
      natures: explanations.natures,
    });
    const ok = validateExplanations(
      variation(['À la hausse : texte.', 'À la baisse : texte.']),
      sourceIds,
      ['vat.standard'],
    );
    expect(ok).toEqual([]);
    const reversed = validateExplanations(
      variation(['À la baisse : texte.', 'À la hausse : texte.']),
      sourceIds,
      ['vat.standard'],
    );
    expect(reversed).toEqual([
      'explanations.json: vat.standard: "Ce que change une variation" needs "À la hausse" then "À la baisse"',
    ]);
  });

  it('give the nature items their template, completed with the group', () => {
    const entries = new Map<string, Explanation>(file.entries.map((e) => [e.id, e] as const));
    const own = explanationFor(file, entries, 'spending.cofog.10.7.rsa', 'RSA');
    expect(own?.fromNature).toBe(false);
    const nature = explanationFor(
      file,
      entries,
      'spending.cofog.02.1.compensation',
      'Défense militaire',
    );
    expect(nature?.fromNature).toBe(true);
    expect(nature?.entry.summary).toContain('« Défense militaire »');
    expect(JSON.stringify(nature?.entry)).not.toContain('{groupe}');
    expect(explanationFor(file, entries, 'vat.unknown', null)).toBeUndefined();
  });

  it('cover every item of the spending data: own text or nature template', () => {
    for (const division of data.spending.divisions)
      for (const group of division.groups)
        for (const item of group.items ?? []) {
          const id = `spending.cofog.${group.code}.${item.id}`;
          const has = explanations.entries.some((e) => e.id === id) || natureOf(id) !== null;
          expect(has, id).toBe(true);
        }
  });

  it('never put amounts in Md€ in the texts (the app shows them live)', () => {
    for (const entry of explanations.entries) {
      expect(JSON.stringify(entry), entry.id).not.toMatch(/\d\s?(Md€|milliards)/);
    }
  });
});
