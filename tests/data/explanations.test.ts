// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Pop-up texts of the levers (src/data/explanations.json). */
import { describe, expect, it } from 'vitest';
import explanations from '../../src/data/explanations.json';
import { validateExplanations } from '../../src/engine/dataChecks.ts';
import { buildLevers } from '../../src/engine/levers.ts';
import { loadDataset } from '../../src/engine/params.ts';

const data = loadDataset();
const leverIds = [...buildLevers(data).values()].filter((l) => !l.deprecated).map((l) => l.id);
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
    };
    const errors = validateExplanations(broken, sourceIds, ['vat.standard']);
    expect(errors).toContain('explanations.json: unknown lever "vat.unknown"');
    expect(errors).toContain('explanations.json: vat.unknown: unknown sourceId "no-such-source"');
    expect(errors).toContain('explanations.json: missing entry for lever "vat.standard"');
  });

  it('never put amounts in Md€ in the texts (the app shows them live)', () => {
    for (const entry of explanations.entries) {
      expect(JSON.stringify(entry), entry.id).not.toMatch(/\d\s?(Md€|milliards)/);
    }
  });
});
