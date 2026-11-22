<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Pie chart of the breakdown (PLAN.MD §14.1). The pie is drawn for the eye (mouse
  // clicks and hover); the legend beside it is the keyboard and screen-reader path:
  // one button per slice, in the order of the slices from twelve o'clock.
  import { formatBillions, formatPercent } from '../format.ts';
  import { LABEL_SHARE, OTHER_KEY, polar, slicePath, type Slice } from '../charts.ts';
  import Arrow from './Arrow.svelte';

  let {
    slices,
    amountDigits,
    active = $bindable(),
    describe,
    onActivate,
  }: {
    slices: Slice[];
    amountDigits: number;
    active: string | null;
    describe: (slice: Slice) => string;
    onActivate: (slice: Slice) => void;
  } = $props();

  const SIZE = 240;
  const R = SIZE / 2 - 2;
  const C = SIZE / 2;
  const clickable = (slice: Slice) =>
    slice.key === OTHER_KEY || slice.zoomable === true || slice.leverId !== undefined;
</script>

<div class="pie">
  <!-- Mouse only: the legend buttons below give the same actions to the keyboard. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
    {#each slices as slice (slice.key)}
      <path
        class={['slice', `dir-${slice.direction}`, { active: active === slice.key }]}
        class:clickable={clickable(slice)}
        d={slicePath(C, C, R, slice)}
        onclick={() => onActivate(slice)}
        onmouseenter={() => (active = slice.key)}
        onmouseleave={() => (active = null)}
      />
    {/each}
    {#each slices as slice (slice.key)}
      {#if slice.share >= LABEL_SHARE}
        {@const [x, y] = polar(C, C, R * 0.66, (slice.start + slice.end) / 2)}
        <text {x} {y} class="share" text-anchor="middle" dominant-baseline="middle"
          >{formatPercent(slice.share, 0)}</text
        >
      {/if}
    {/each}
  </svg>

  <ol class="legend">
    {#each slices as slice (slice.key)}
      <li>
        <button
          type="button"
          class={['entry', { active: active === slice.key }]}
          data-key={slice.key}
          aria-label={describe(slice)}
          onclick={() => onActivate(slice)}
          onmouseenter={() => (active = slice.key)}
          onmouseleave={() => (active = null)}
          onfocus={() => (active = slice.key)}
          onblur={() => (active = null)}
        >
          <span class={['swatch', `dir-${slice.direction}`]} aria-hidden="true"></span>
          <span class="name">{slice.label}</span>
          <span class="figures">
            {formatBillions(slice.scenario, amountDigits)}
            {#if slice.direction !== 'none'}<Arrow direction={slice.direction} />{/if}
            <span class="muted">{formatPercent(slice.share)}</span>
          </span>
        </button>
      </li>
    {/each}
  </ol>
</div>

<style>
  .pie {
    display: grid;
    grid-template-columns: minmax(12rem, 18rem) 1fr;
    gap: var(--space-4);
    align-items: center;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .slice {
    fill: var(--color-tile);
    /* Surface-coloured gap between neighbouring slices. */
    stroke: var(--color-bg);
    stroke-width: 2;
    stroke-linejoin: round;
    transition: filter var(--transition);
  }

  .slice.clickable {
    cursor: pointer;
  }

  .slice.dir-up {
    fill: var(--color-up-fill);
  }

  .slice.dir-down {
    fill: var(--color-down-fill);
  }

  .slice.active {
    filter: brightness(0.9);
    stroke: var(--color-text);
  }

  :global([data-theme='dark']) .slice.active {
    filter: brightness(1.3);
  }

  .share {
    font-size: 11px;
    font-weight: 700;
    fill: var(--color-text);
    pointer-events: none;
  }

  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }

  .entry {
    display: grid;
    grid-template-columns: auto 1fr auto;
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

  .entry:hover,
  .entry.active {
    border-color: var(--color-border-strong);
    background: var(--color-surface);
  }

  .swatch {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 3px;
    border: 2px solid var(--color-border);
    background: var(--color-tile);
  }

  .swatch.dir-up {
    background: var(--color-up-fill);
    border-color: var(--color-up);
  }

  .swatch.dir-down {
    background: var(--color-down-fill);
    border-color: var(--color-down);
  }

  .name {
    font-weight: 600;
  }

  .figures {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .muted {
    color: var(--color-text-muted);
    min-width: 3.2rem;
    text-align: right;
  }

  @media (max-width: 40rem) {
    .pie {
      grid-template-columns: 1fr;
    }

    svg {
      max-width: 16rem;
      margin: 0 auto;
    }
  }
</style>
