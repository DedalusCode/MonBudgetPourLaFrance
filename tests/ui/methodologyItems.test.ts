// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Methodology from '../../src/ui/pages/Methodology.svelte';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';

describe('methodology of the level-3 items', () => {
  it('counts the items and explains how a benefit follows its item', () => {
    const { body } = render(Methodology, { props: { store: new ScenarioStore() } });
    const text = body.replace(/\s+/g, ' ');
    expect(text).toContain('314 postes détaillent 59 groupes');
    expect(text).toContain('Chaque prestation est traitée séparément');
  });
});
