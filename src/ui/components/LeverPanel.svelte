<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Lever panel: detail level, search, tax levers by group, COFOG spending, advanced settings.
  import { tick, untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import type { Lever, LeverGroup } from '../../engine/levers.ts';
  import { normalizeSearch } from '../format.ts';
  import { DETAIL_LEVELS } from '../detailLevel.ts';
  import { TAX_GROUPS } from '../labels.ts';
  import { SPENDING_LAYOUTS, type DivisionView } from '../spendingLayout.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import LeverControl from './LeverControl.svelte';
  import SpendingList from './SpendingList.svelte';

  let {
    store,
    expanded = false,
  }: {
    store: ScenarioStore;
    /** Opens every accordion (used to check that every lever is reachable). */
    expanded?: boolean;
  } = $props();

  let query = $state('');
  const terms = $derived(normalizeSearch(query).split(/\s+/).filter(Boolean));
  const matches = (lever: Lever) => {
    const words = normalizeSearch(`${lever.label} ${lever.help}`).split(/[^a-z0-9]+/);
    return terms.every((t) => words.some((word) => word.startsWith(t)));
  };
  const searching = $derived(terms.length > 0);

  const levers = $derived([...store.model.levers.values()].filter((l) => !l.deprecated));
  const shownLevers = $derived(levers.filter((l) => store.isShown(l.id)));
  const hiddenMatches = $derived(
    searching ? levers.filter((l) => !store.isShown(l.id) && matches(l)).length : 0,
  );
  const hiddenModified = $derived(store.hiddenModifiedCount);
  const detailed = $derived(store.detailLevel !== 'essential');
  const expert = $derived(store.detailLevel === 'expert');
  const nextLevel = $derived(
    DETAIL_LEVELS[DETAIL_LEVELS.findIndex((l) => l.id === store.detailLevel) + 1],
  );
  const levelHint = $derived(DETAIL_LEVELS.find((l) => l.id === store.detailLevel)?.hint);
  const byGroup = (group: LeverGroup) =>
    shownLevers.filter((l) => l.group === group && (!searching || matches(l)));
  const modifiedIn = (list: Lever[]) => list.filter((l) => store.isModified(l.id)).length;

  const divisions = $derived(store.model.data.spending.divisions);
  const itemLevers = (code: string) =>
    store.itemsOf(code).map((item) => store.lever(`spending.cofog.${item.key}`));
  const visibleDivisions: DivisionView[] = $derived(
    divisions
      .map((division) => {
        const divisionLever = store.lever(`spending.cofog.${division.code}`);
        const all = division.groups.map((g) => {
          const lever = store.lever(`spending.cofog.${g.code}`);
          const items = itemLevers(g.code);
          const levelItems = expert ? items : [];
          const shownItems = searching ? levelItems.filter(matches) : levelItems;
          return { lever, items, shownItems };
        });
        const groups = all.flatMap((g) => [g.lever, ...g.items]);
        const levelGroups = detailed ? all : [];
        const shownGroups = searching
          ? levelGroups.filter((g) => matches(g.lever) || g.shownItems.length > 0)
          : levelGroups;
        const visible = !searching || matches(divisionLever) || shownGroups.length > 0;
        return { division, divisionLever, groups, shownGroups, visible };
      })
      .filter((d) => d.visible),
  );
  const spendingModified = $derived(
    shownLevers.filter((l) => l.group === 'spending' && store.isModified(l.id)).length,
  );
  const macroLevers = $derived(
    shownLevers.filter((l) => l.group === 'macro' && (!searching || matches(l))),
  );
  /** Layout of the spending levers (the functions alone at the Essential level). */
  const layout = $derived(detailed ? store.spendingLayout : 'tree');

  const nothingFound = $derived(
    searching &&
      TAX_GROUPS.every(([group]) => byGroup(group).length === 0) &&
      visibleDivisions.length === 0 &&
      macroLevers.length === 0,
  );

  // Accordions are controlled so that a lever can be revealed from elsewhere (treemap).
  // While searching, every matching group is open unless the user closes it.
  const openKeys = new SvelteSet<string>();
  const closedWhileSearching = new SvelteSet<string>();
  $effect(() => {
    void terms; // a new search reopens every matching group
    untrack(() => closedWhileSearching.clear());
  });
  const isOpen = (key: string) =>
    expanded || (searching ? !closedWhileSearching.has(key) : openKeys.has(key));
  function setOpen(key: string, open: boolean) {
    if (searching) {
      if (open) closedWhileSearching.delete(key);
      else closedWhileSearching.add(key);
    } else if (open) openKeys.add(key);
    else openKeys.delete(key);
  }

  function keysFor(lever: Lever): string[] {
    if (lever.group !== 'spending')
      return [lever.group === 'macro' ? 'macro' : `tax:${lever.group}`];
    const code = lever.id.replace('spending.cofog.', '');
    const division = code.slice(0, 2);
    return lever.item ? [`div:${division}`, `item:${code.slice(0, 4)}`] : [`div:${division}`];
  }

  $effect(() => {
    const request = store.focusRequest;
    if (!request) return;
    untrack(() => {
      query = '';
      for (const key of keysFor(store.lever(request.id))) openKeys.add(key);
    });
    void tick().then(() => {
      const field = document.getElementById(`lever-${request.id.replaceAll('.', '-')}`);
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      field?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
      field?.focus({ preventScroll: true });
    });
  });
</script>

<div class="panel">
  <fieldset class="segmented level">
    <legend>Niveau de détail</legend>
    {#each DETAIL_LEVELS as level (level.id)}
      <label>
        <input
          type="radio"
          name="detail-level"
          checked={store.detailLevel === level.id}
          onchange={() => store.chooseDetailLevel(level.id)}
        />
        {level.label}
      </label>
    {/each}
  </fieldset>
  <p class="level-hint">{shownLevers.length} curseurs : {levelHint}.</p>

  {#if detailed}
    <fieldset class="segmented level">
      <legend>Affichage des dépenses</legend>
      {#each SPENDING_LAYOUTS as option (option.id)}
        <label>
          <input
            type="radio"
            name="spending-layout"
            checked={store.spendingLayout === option.id}
            onchange={() => store.chooseSpendingLayout(option.id)}
          />
          {option.label}
        </label>
      {/each}
    </fieldset>
    <p class="level-hint">
      {SPENDING_LAYOUTS.find((l) => l.id === store.spendingLayout)?.hint}.
    </p>
  {/if}

  {#if hiddenModified > 0}
    <p class="hidden-note" role="status">
      {hiddenModified}
      {hiddenModified > 1 ? 'modifications masquées' : 'modification masquée'} à ce niveau,
      {hiddenModified > 1 ? 'toujours prises' : 'toujours prise'} en compte.
      {#if nextLevel}
        <button
          type="button"
          class="link-button"
          onclick={() => store.chooseDetailLevel(nextLevel.id)}
        >
          Passer au niveau {nextLevel.label}
        </button>
      {/if}
    </p>
  {/if}

  <div class="search">
    <label for="lever-search">Rechercher un levier</label>
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M6.8 1.5a5.3 5.3 0 0 1 4.2 8.5l3.5 3.5-1.1 1.1-3.5-3.5A5.3 5.3 0 1 1 6.8 1.5Zm0 1.6a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z"
      />
    </svg>
    <input
      id="lever-search"
      type="search"
      bind:value={query}
      placeholder="Ex. : TVA, défense, CSG"
    />
  </div>

  {#if nothingFound && hiddenMatches === 0}
    <p class="empty" role="status">Aucun levier ne correspond à « {query.trim()} ».</p>
  {/if}
  {#if hiddenMatches > 0 && nextLevel}
    <p class="hidden-note" role="status">
      {hiddenMatches}
      {hiddenMatches > 1 ? 'leviers' : 'levier'} de plus pour cette recherche au niveau {nextLevel.label}.
      <button
        type="button"
        class="link-button"
        onclick={() => store.chooseDetailLevel(nextLevel.id)}
      >
        Passer au niveau {nextLevel.label}
      </button>
    </p>
  {/if}

  <h2 class="eyebrow">Prélèvements</h2>
  {#each TAX_GROUPS as [group, title] (group)}
    {@const list = byGroup(group)}
    {#if list.length > 0}
      <details
        open={isOpen(`tax:${group}`)}
        ontoggle={(e) => setOpen(`tax:${group}`, e.currentTarget.open)}
      >
        <summary>
          {title}
          {#if modifiedIn(list) > 0}<span class="count"
              >{modifiedIn(list)} modifié{modifiedIn(list) > 1 ? 's' : ''}</span
            >{/if}
        </summary>
        <!-- Rendered only when open: keeps the page light (≈130 levers). -->
        {#if isOpen(`tax:${group}`)}
          {#each list as lever (lever.id)}
            <LeverControl {store} id={lever.id} />
          {/each}
        {/if}
      </details>
    {/if}
  {/each}

  <h2 class="eyebrow">Dépenses publiques</h2>
  {#if spendingModified > 0}<p class="count">
      {spendingModified} levier{spendingModified > 1 ? 's' : ''} modifié{spendingModified > 1
        ? 's'
        : ''}
    </p>{/if}
  <SpendingList
    {store}
    divisions={visibleDivisions}
    variant={layout}
    {detailed}
    {expert}
    {isOpen}
    {setOpen}
  />

  {#if detailed && (!searching || macroLevers.length > 0)}
    <h2 class="eyebrow">Paramètres avancés</h2>
    <details open={isOpen('macro')} ontoggle={(e) => setOpen('macro', e.currentTarget.open)}>
      <summary>Hypothèses macroéconomiques et bornes</summary>
      {#if isOpen('macro')}
        {#each macroLevers as lever (lever.id)}
          <LeverControl {store} id={lever.id} />
        {/each}
      {/if}
      <label class="checkbox">
        <input type="checkbox" bind:checked={store.extendedBounds} />
        Bornes étendues : autoriser dans les champs des valeurs au-delà des curseurs
      </label>
    </details>
  {/if}
</div>

<style>
  .panel {
    padding: var(--space-3);
  }

  h2 {
    margin: var(--space-4) 0 var(--space-2);
  }

  .level {
    margin: 0;
    font-size: 0.9rem;
  }

  .level-hint {
    margin: var(--space-1) 0 var(--space-3);
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .hidden-note {
    margin: 0 0 var(--space-3);
    padding: var(--space-2) var(--space-3);
    font-size: 0.85rem;
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface);
  }

  .search {
    position: relative;
  }

  .search label {
    display: block;
    font-weight: 600;
    margin-bottom: var(--space-1);
  }

  .search svg {
    position: absolute;
    left: 0.75rem;
    bottom: calc(var(--tap-size) / 2 - 8px);
    fill: var(--color-text-muted);
    pointer-events: none;
  }

  .search input {
    width: 100%;
    padding-left: 2.25rem;
  }

  details {
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    margin-bottom: var(--space-2);
    background: var(--color-card);
    overflow: hidden;
  }

  details[open] {
    box-shadow: var(--shadow-card);
  }

  summary {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: var(--tap-size);
    padding: var(--space-1) var(--space-3);
    font-weight: 600;
  }

  summary:hover {
    color: var(--color-accent);
  }

  details[open] > summary {
    border-bottom: 1px solid var(--color-border);
  }

  .count {
    margin-left: auto;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.1rem var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--color-highlight);
    color: var(--color-on-highlight);
  }

  p.count {
    display: inline-block;
    margin: 0 0 var(--space-2);
  }

  .empty {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: var(--space-2);
  }

  .checkbox {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    font-size: 0.9rem;
    padding: var(--space-2) var(--space-3);
  }
</style>
