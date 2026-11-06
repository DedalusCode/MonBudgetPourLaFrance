<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Treemap of public spending (COFOG) or revenue, coloured by the scenario's
  // change (blue up / orange down / grey unchanged, always with sign and arrow).
  // Tiles are positioned buttons: keyboard and screen-reader friendly.
  import { tick } from 'svelte';
  import { formatBillions, formatPercent, signed } from '../format.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import { directionOf, layoutTiles, revenueItems, spendingItems, type Tile } from '../treemap.ts';
  import Arrow from './Arrow.svelte';

  let { store }: { store: ScenarioStore } = $props();

  let view = $state<'spending' | 'revenue'>('spending');
  let zoom = $state<string | null>(null);
  let width = $state(0);
  let active = $state<string | null>(null);
  let showTable = $state(false);
  let backButton = $state<HTMLButtonElement | undefined>();

  // Before the first measure (and in server rendering), lay out for a typical width.
  const layoutWidth = $derived(width > 0 ? width : 720);
  const height = $derived(Math.round(Math.max(300, Math.min(560, layoutWidth * 0.62))));
  const items = $derived(
    view === 'spending'
      ? spendingItems(store.model, store.result, zoom)
      : revenueItems(store.model, store.result),
  );
  const tiles = $derived(layoutTiles(items, layoutWidth, height));
  const activeTile = $derived(tiles.find((t) => t.key === active));
  const zoomedDivision = $derived(
    zoom === null ? undefined : store.model.data.spending.divisions.find((d) => d.code === zoom),
  );
  const amountDigits = $derived(view === 'spending' && zoom !== null ? 2 : 1);

  function variation(tile: Pick<Tile, 'change' | 'reference' | 'direction'>): string {
    if (tile.direction === 'none') return 'inchangé';
    const share = tile.reference === 0 ? 0 : tile.change / tile.reference;
    return `${signed(formatBillions(Math.abs(tile.change), amountDigits), tile.change)} (${signed(formatPercent(Math.abs(share)), tile.change)})`;
  }

  function describe(tile: Tile): string {
    const action = tile.zoomable
      ? 'Entrée pour voir le détail.'
      : tile.leverId
        ? 'Entrée pour modifier ce poste.'
        : '';
    return `${tile.label} : ${formatBillions(tile.scenario, amountDigits)}, ${variation(tile)}. ${action}`;
  }

  async function activate(tile: Tile) {
    if (tile.zoomable) {
      zoom = tile.key;
      active = null;
      await tick();
      backButton?.focus();
    } else if (tile.leverId) {
      store.focusLever(tile.leverId);
    }
  }

  /** Back to all the functions, the focus on the tile of the function just left. */
  async function zoomOut() {
    const left = zoom;
    zoom = null;
    await tick();
    document.querySelector<HTMLElement>(`.tile[data-key="${String(left)}"]`)?.focus();
  }

  function setView(next: 'spending' | 'revenue') {
    view = next;
    zoom = null;
    active = null;
  }

  const fits = (tile: Tile) => tile.width >= 72 && tile.height >= 36;
  const fitsAmount = (tile: Tile) => tile.width >= 72 && tile.height >= 56;
</script>

<div class="toolbar">
  <fieldset class="segmented">
    <legend>Afficher</legend>
    <label>
      <input
        type="radio"
        name="treemap-view"
        checked={view === 'spending'}
        onchange={() => setView('spending')}
      />
      les dépenses
    </label>
    <label>
      <input
        type="radio"
        name="treemap-view"
        checked={view === 'revenue'}
        onchange={() => setView('revenue')}
      />
      les recettes
    </label>
  </fieldset>
  {#if zoomedDivision}
    <nav class="breadcrumb" aria-label="Niveau affiché">
      <button type="button" class="link-button" bind:this={backButton} onclick={zoomOut}>
        Toutes les fonctions
      </button>
      <span aria-hidden="true">›</span>
      <span aria-current="location">{zoomedDivision.label}</span>
      <button
        type="button"
        class="btn edit"
        onclick={() => store.focusLever(`spending.cofog.${zoomedDivision.code}`)}
      >
        Modifier ce poste
      </button>
    </nav>
  {/if}
</div>

<div
  class="map"
  role="group"
  aria-label={view === 'spending' ? 'Carte des dépenses publiques' : 'Carte des recettes publiques'}
  bind:clientWidth={width}
  style:height={`${height}px`}
>
  {#each tiles as tile (tile.key)}
    {@const style = `left:${tile.x}px;top:${tile.y}px;width:${tile.width}px;height:${tile.height}px`}
    {#if tile.zoomable || tile.leverId}
      <button
        type="button"
        class="tile dir-{tile.direction}"
        data-direction={tile.direction}
        data-key={tile.key}
        {style}
        aria-label={describe(tile)}
        onclick={() => activate(tile)}
        onmouseenter={() => (active = tile.key)}
        onmouseleave={() => (active = null)}
        onfocus={() => (active = tile.key)}
        onblur={() => (active = null)}
      >
        {#if fits(tile)}
          <span class="label">{tile.label}</span>
          {#if fitsAmount(tile)}
            <span class="amount">
              {formatBillions(tile.scenario, amountDigits)}
              {#if tile.direction !== 'none'}<Arrow direction={tile.direction} />{/if}
            </span>
          {/if}
        {/if}
      </button>
    {:else}
      <div
        class="tile static dir-{tile.direction}"
        data-direction={tile.direction}
        {style}
        role="img"
        aria-label={describe(tile)}
        onmouseenter={() => (active = tile.key)}
        onmouseleave={() => (active = null)}
      >
        {#if fits(tile)}
          <span class="label">{tile.label}</span>
          {#if fitsAmount(tile)}<span class="amount"
              >{formatBillions(tile.scenario, amountDigits)}</span
            >{/if}
        {/if}
      </div>
    {/if}
  {/each}
</div>

<p class="readout">
  {#if activeTile}
    <strong>{activeTile.label}</strong> : {formatBillions(activeTile.scenario, amountDigits)}
    (référence {formatBillions(activeTile.reference, amountDigits)}), {variation(activeTile)}
  {:else}
    Survolez une case ou parcourez-les au clavier pour le détail ; cliquez pour
    {view === 'spending' && zoom === null
      ? 'voir les groupes d’une fonction'
      : 'ouvrir le levier correspondant'}.
  {/if}
</p>
<p class="legend">
  <span class="swatch dir-up" aria-hidden="true"></span> en hausse (+)
  <span class="swatch dir-down" aria-hidden="true"></span> en baisse (−)
  <span class="swatch dir-none" aria-hidden="true"></span> inchangé · surface proportionnelle au montant
  du scénario
</p>

<button
  type="button"
  class="link-button"
  aria-expanded={showTable}
  onclick={() => (showTable = !showTable)}
>
  {showTable ? 'Masquer le tableau' : 'Afficher le tableau équivalent'}
</button>
{#if showTable}
  <table>
    <caption>
      {view === 'spending'
        ? (zoomedDivision?.label ?? 'Dépenses publiques par fonction')
        : 'Recettes publiques'}
    </caption>
    <thead>
      <tr>
        <th scope="col">Poste</th>
        <th scope="col">Référence</th>
        <th scope="col">Scénario</th>
        <th scope="col">Variation</th>
      </tr>
    </thead>
    <tbody>
      {#each items as item (item.key)}
        {@const direction = directionOf(item.reference, item.scenario)}
        <tr>
          <th scope="row">{item.label}</th>
          <td>{formatBillions(item.reference, amountDigits)}</td>
          <td>{formatBillions(item.scenario, amountDigits)}</td>
          <td
            >{variation({
              change: item.scenario - item.reference,
              reference: item.reference,
              direction,
            })}</td
          >
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    font-size: 0.9rem;
  }

  .edit {
    font-size: 0.85rem;
  }

  .map {
    position: relative;
    width: 100%;
  }

  .tile {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 2px;
    padding: 4px 6px;
    overflow: hidden;
    text-align: left;
    font: inherit;
    font-size: 0.8rem;
    line-height: 1.2;
    color: var(--color-text);
    border: 2px solid var(--color-bg);
    border-radius: var(--radius);
    cursor: pointer;
    transition: filter var(--transition);
  }

  .tile.static {
    cursor: default;
  }

  .tile:hover {
    filter: brightness(0.93);
  }

  :global([data-theme='dark']) .tile:hover {
    filter: brightness(1.25);
  }

  .dir-none {
    background: var(--color-tile);
  }

  .dir-up {
    background: var(--color-up-fill);
    border-color: var(--color-up);
  }

  .dir-down {
    background: var(--color-down-fill);
    border-color: var(--color-down);
  }

  .label {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-weight: 600;
  }

  .amount {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }

  .readout,
  .legend {
    font-size: 0.85rem;
    margin: var(--space-2) 0;
  }

  .legend {
    color: var(--color-text-muted);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-2);
    align-items: center;
  }

  .swatch {
    display: inline-block;
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 3px;
    border: 2px solid transparent;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: var(--space-2);
    font-size: 0.85rem;
  }

  caption {
    text-align: left;
    font-weight: 600;
    padding-bottom: var(--space-1);
  }

  th,
  td {
    text-align: left;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  td {
    font-variant-numeric: tabular-nums;
  }
</style>
