<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Horizontal bars of the breakdown, longest first (PLAN.MD §14.1): the full bar is the
  // scenario amount, the thin mark the current amount. Each row is a button.
  import { formatBillions } from '../format.ts';
  import type { Bar } from '../charts.ts';
  import Arrow from './Arrow.svelte';

  let {
    bars,
    amountDigits,
    active = $bindable(),
    describe,
    onActivate,
  }: {
    bars: Bar[];
    amountDigits: number;
    active: string | null;
    describe: (bar: Bar) => string;
    onActivate: (bar: Bar) => void;
  } = $props();

  const percent = (ratio: number) => `${(ratio * 100).toFixed(2)}%`;
</script>

<ol class="bars">
  {#each bars as bar (bar.key)}
    {@const interactive = bar.zoomable === true || bar.leverId !== undefined}
    <li>
      {#if interactive}
        <button
          type="button"
          class={['row', { active: active === bar.key }]}
          data-key={bar.key}
          aria-label={describe(bar)}
          onclick={() => onActivate(bar)}
          onmouseenter={() => (active = bar.key)}
          onmouseleave={() => (active = null)}
          onfocus={() => (active = bar.key)}
          onblur={() => (active = null)}
        >
          {@render content(bar)}
        </button>
      {:else}
        <div
          class={['row', 'static', { active: active === bar.key }]}
          role="img"
          aria-label={describe(bar)}
          onmouseenter={() => (active = bar.key)}
          onmouseleave={() => (active = null)}
        >
          {@render content(bar)}
        </div>
      {/if}
    </li>
  {/each}
</ol>

{#snippet content(bar: Bar)}
  <span class="name">{bar.label}</span>
  <span class="track" aria-hidden="true">
    <span class={['fill', `dir-${bar.direction}`]} style:width={percent(bar.scenarioRatio)}></span>
    {#if bar.direction !== 'none'}
      <span class="reference" style:left={percent(bar.referenceRatio)}></span>
    {/if}
  </span>
  <span class="figures">
    {formatBillions(bar.scenario, amountDigits)}
    {#if bar.direction !== 'none'}<Arrow direction={bar.direction} />{/if}
  </span>
{/snippet}

<style>
  .bars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(8rem, 15rem) 1fr 6.5rem;
    gap: var(--space-2);
    align-items: center;
    width: 100%;
    min-height: var(--tap-size);
    padding: var(--space-1) var(--space-2);
    border: var(--border-width) solid transparent;
    border-radius: var(--radius);
    background: none;
    color: var(--color-text);
    font: inherit;
    font-size: 0.85rem;
    text-align: left;
    cursor: pointer;
  }

  .row.static {
    cursor: default;
  }

  .row:hover,
  .row.active {
    border-color: var(--color-border-strong);
    background: var(--color-surface);
  }

  .name {
    font-weight: 600;
  }

  .track {
    position: relative;
    height: 1.1rem;
  }

  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    min-width: 2px;
    /* Rounded end at the data side, square at the baseline. */
    border-radius: 0 4px 4px 0;
    background: var(--color-tile);
    border: 2px solid var(--color-border);
    border-left: 0;
  }

  .fill.dir-up {
    background: var(--color-up-fill);
    border-color: var(--color-up);
  }

  .fill.dir-down {
    background: var(--color-down-fill);
    border-color: var(--color-down);
  }

  /* Current amount: a thin mark across the bar. */
  .reference {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: var(--color-text);
  }

  .figures {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 40rem) {
    .row {
      grid-template-columns: 1fr auto;
      grid-template-areas:
        'name figures'
        'track track';
      row-gap: 4px;
    }

    .name {
      grid-area: name;
    }

    .figures {
      grid-area: figures;
    }

    .track {
      grid-area: track;
    }
  }
</style>
