<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Sticky summary of the aggregates (PLAN.MD §8.1), updated on every lever input.
  import {
    formatBillions,
    formatBillionsChange,
    formatPercent,
    ONE_EURO_IN_BILLIONS,
  } from '../format.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import Delta from './Delta.svelte';
  import ScenarioActions from './ScenarioActions.svelte';

  let { store }: { store: ScenarioStore } = $props();

  const now = $derived(store.result.aggregates);
  const ref = $derived(store.reference.aggregates);
  const last = $derived(now.debtPath.at(-1));
  const lastRef = $derived(ref.debtPath.at(-1));
  // The sticky lever panel sits just below this bar (App.svelte reads --summary-height).
  let height = $state(0);
  $effect(() => {
    if (height <= 0) return;
    const style = document.documentElement.style;
    style.setProperty('--summary-height', `${height}px`);
    return () => style.removeProperty('--summary-height');
  });

  const points = (x: number) => `${formatPercent(x).replace(' %', '')} pt de PIB`;

  interface Item {
    label: string;
    key?: boolean;
    value: string;
    ratio: string;
    before: string;
    change: number;
    better: 'up' | 'down';
    format?: (absolute: number) => string;
  }
  // Green when the change improves the public accounts: more revenue, less spending,
  // a higher balance, less debt; red otherwise (always with a sign and an arrow).
  const items = $derived.by((): Item[] => {
    const list: Item[] = [
      {
        label: 'Recettes',
        value: formatBillions(now.revenue),
        ratio: `${formatPercent(now.revenueToGdp)} du PIB`,
        before: formatBillions(ref.revenue),
        change: now.revenue - ref.revenue,
        better: 'up',
      },
      {
        label: 'Dépenses',
        value: formatBillions(now.spending),
        ratio: `${formatPercent(now.spendingToGdp)} du PIB`,
        before: formatBillions(ref.spending),
        change: now.spending - ref.spending,
        better: 'down',
      },
      {
        label: 'Solde',
        key: true,
        value: formatBillions(now.balance),
        ratio: `${formatPercent(now.balanceToGdp)} du PIB`,
        before: formatBillions(ref.balance),
        change: now.balance - ref.balance,
        better: 'up',
      },
    ];
    if (last && lastRef) {
      const ratioChange = last.debtToGdp - lastRef.debtToGdp;
      list.push({
        label: `Dette en ${String(last.year)}`,
        value: `${formatPercent(last.debtToGdp)} du PIB`,
        ratio: formatBillions(last.debt, 0),
        before: `${formatPercent(lastRef.debtToGdp)} du PIB`,
        change: last.debt - lastRef.debt,
        better: 'down',
        format: (abs) =>
          Math.abs(ratioChange) >= 0.0005
            ? `${formatBillionsChange(abs)} (${points(Math.abs(ratioChange))})`
            : formatBillionsChange(abs),
      });
    }
    return list;
  });
</script>

<section class="summary" aria-label="Synthèse des finances publiques" bind:clientHeight={height}>
  <dl>
    {#each items as item (item.label)}
      <div class:key={item.key}>
        <dt class="eyebrow">{item.label}</dt>
        <dd class="value">{item.value}</dd>
        <dd class="ratio">{item.ratio}</dd>
        <dd class="change">
          <Delta
            value={item.change}
            format={item.format ?? formatBillionsChange}
            better={item.better}
          />
          {#if Math.abs(item.change) >= ONE_EURO_IN_BILLIONS}
            <span class="before">aujourd’hui : {item.before}</span>
          {/if}
        </dd>
      </div>
    {/each}
  </dl>
  <div class="actions">
    <button
      type="button"
      class="btn"
      disabled={store.modifiedCount === 0}
      onclick={() => store.resetAll()}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <path
          d="M8 2.5A5.5 5.5 0 1 1 2.6 9h1.6A4 4 0 1 0 5.4 5.1L7 6.7H2.5V2.2l1.8 1.8A5.5 5.5 0 0 1 8 2.5Z"
        />
      </svg>
      Réinitialiser{store.modifiedCount > 0 ? ` (${store.modifiedCount})` : ''}
    </button>
    <ScenarioActions {store} />
  </div>
  <p class="note">
    Comptes publics {now.debtPath[0]?.year}, législation {store.baseYear}. Dette projetée à
    {now.debtPath.length - 1} ans, solde primaire constant en part du PIB. Écarts en vert quand ils améliorent
    les comptes publics, en rouge quand ils les dégradent.
  </p>
</section>

<style>
  .summary {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--color-summary-bg);
    border-bottom: var(--border-width) solid var(--color-border);
    padding: var(--space-3) var(--space-4) var(--space-2);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2) var(--space-4);
    align-items: center;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-2);
    margin: 0;
  }

  dl > div {
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-card);
    box-shadow: var(--shadow-card);
  }

  dl > .key {
    border-color: var(--color-accent);
    box-shadow:
      inset 0 3px 0 var(--color-accent),
      var(--shadow-card);
  }

  dd {
    margin: 0;
  }

  .value {
    font-family: var(--font-numeric);
    font-size: clamp(1.15rem, 1.55vw, 1.6rem);
    font-weight: 700;
    line-height: 1.15;
    font-variant-numeric: lining-nums tabular-nums;
  }

  .ratio {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .change {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--space-2);
  }

  .before {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: flex-end;
  }

  .note {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  /* Phones: compact two-by-two grid, actions below. */
  @media (max-width: 52rem) {
    /* Not sticky on phones: the lever sheet shows the balance instead. */
    .summary {
      position: static;
      grid-template-columns: 1fr;
      padding: var(--space-2) var(--space-3);
    }

    dl {
      grid-template-columns: 1fr 1fr;
    }

    dl > div {
      padding: var(--space-1) var(--space-2);
    }

    .value {
      font-size: 1.2rem;
    }

    .actions {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
    }

    .actions :global(.actions) {
      justify-content: flex-start;
    }
  }
</style>
