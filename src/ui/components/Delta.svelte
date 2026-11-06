<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Variation versus the reference, always with a sign and an arrow. With `better`, the
  // colour tells whether it improves the public accounts (green) or worsens them (red).
  import Arrow from './Arrow.svelte';
  import { ONE_EURO_IN_BILLIONS, signed } from '../format.ts';

  let {
    value,
    format,
    threshold = ONE_EURO_IN_BILLIONS,
    better,
  }: {
    value: number;
    format: (absolute: number) => string;
    threshold?: number;
    /** Direction that improves the public accounts; no colour when absent. */
    better?: 'up' | 'down';
  } = $props();

  const changed = $derived(Math.abs(value) >= threshold);
  // Green when the change goes the way that improves the accounts, red otherwise.
  const improves = $derived(better === 'up' ? value > 0 : value < 0);
  const tone = $derived(better === undefined ? 'none' : improves ? 'gain' : 'loss');
</script>

{#if changed}
  <span class="delta tone-{tone}" data-tone={tone}>
    <Arrow direction={value > 0 ? 'up' : 'down'} />
    {signed(format(Math.abs(value)), value)}
  </span>
{:else}
  <span class="delta unchanged">inchangé</span>
{/if}

<style>
  .delta {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }

  .tone-gain {
    color: var(--color-gain);
    font-weight: 700;
  }

  .tone-loss {
    color: var(--color-loss);
    font-weight: 700;
  }

  .unchanged {
    color: var(--color-text-muted);
  }
</style>
