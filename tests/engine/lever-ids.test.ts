// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Lever ids are part of the public scenario format (shared links, future party
 * programmes): an id must never disappear nor change meaning. Retire a lever
 * with `deprecated: true` instead. To publish a new lever, add its id below.
 */
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { buildLevers } from '../../src/engine/levers.ts';
import published from '../fixtures/lever-ids.json';

const levers = buildLevers(loadDataset());

describe('lever ids', () => {
  it('keeps every published id', () => {
    const missing = published.ids.filter((id) => !levers.has(id));
    expect(missing).toEqual([]);
  });

  it('lists every lever in the published ids', () => {
    const unpublished = [...levers.keys()].filter((id) => !published.ids.includes(id));
    expect(unpublished).toEqual([]);
  });
});
