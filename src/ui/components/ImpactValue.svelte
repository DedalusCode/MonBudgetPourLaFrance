<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // An impact for a household: green gain / red loss, always with a sign and an arrow.
  import { NEUTRAL_AMOUNT, type Tone } from '../profileView.ts';
  import { signed } from '../format.ts';
  import Arrow from './Arrow.svelte';

  let {
    value,
    tone,
    text,
  }: { value: number; tone: Tone; /** Formatted absolute value. */ text: string } = $props();

  const zero = $derived(Math.abs(value) < NEUTRAL_AMOUNT);
</script>

<span class="impact tone-{tone}" data-tone={tone}>
  {#if !zero}<Arrow direction={value > 0 ? 'up' : 'down'} />{/if}
  {zero ? text : signed(text, value)}
</span>

<style>
  .impact {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .tone-gain {
    color: var(--color-gain);
  }

  .tone-loss {
    color: var(--color-loss);
  }
</style>
