<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Slider of a COFOG group: it follows its function unless set on its own, and it is the
  // sum of its items once one of them is set. A group with no spending has no slider.
  import type { Lever } from '../../engine/levers.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import LeverControl from './LeverControl.svelte';

  let { store, lever }: { store: ScenarioStore; lever: Lever } = $props();

  const code = $derived(lever.cofog?.[0] ?? '');
</script>

{#if lever.reference > 0}
  <LeverControl
    {store}
    id={lever.id}
    value={store.groupTotal(code)}
    inherited={store.groupInherited(code)}
    modified={store.groupModified(code)}
    onCommit={(total) => store.setGroupTotal(code, total)}
    onReset={() => store.resetGroup(code)}
    badge="personnalisé"
  />
{:else}
  <p class="empty">
    {lever.label} : aucune dépense dans les comptes {store.model.data.spending.structureYear}.
  </p>
{/if}

<style>
  .empty {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: var(--space-2);
  }
</style>
