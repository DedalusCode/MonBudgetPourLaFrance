<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Lever panel: search, tax levers by group, COFOG spending, advanced settings.
  import { tick, untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import type { Lever, LeverGroup } from '../../engine/levers.ts';
  import { formatBillions, formatPercent, normalizeSearch, signed } from '../format.ts';
  import { TAX_GROUPS } from '../labels.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import LeverControl from './LeverControl.svelte';

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
    const text = normalizeSearch(`${lever.label} ${lever.help}`);
    return terms.every((t) => text.includes(t));
  };
  const searching = $derived(terms.length > 0);

  const levers = $derived([...store.model.levers.values()].filter((l) => !l.deprecated));
  const byGroup = (group: LeverGroup) =>
    levers.filter((l) => l.group === group && (!searching || matches(l)));
  const modifiedIn = (list: Lever[]) => list.filter((l) => store.isModified(l.id)).length;

  const divisions = $derived(store.model.data.spending.divisions);
  /** Scenario amount of a COFOG group or division, and its change versus the accounts. */
  const scenarioAmount = (codes: string[]) =>
    codes.reduce((s, c) => s + (store.result.groupAmounts[c] ?? 0), 0);
  const referenceAmount = (codes: string[]) =>
    codes.reduce((s, c) => s + (store.model.context.groupAmounts[c] ?? 0), 0);
  function changeText(codes: string[]): string | undefined {
    const before = referenceAmount(codes);
    const change = scenarioAmount(codes) - before;
    if (Math.abs(change) < 0.0005) return undefined;
    const digits = Math.abs(change) >= 1 ? 1 : 3;
    const share =
      before === 0 ? '' : ` (${signed(formatPercent(Math.abs(change / before)), change)})`;
    return `écart : ${signed(formatBillions(Math.abs(change), digits), change)}${share}`;
  }
  /** Amount a group follows when not customised: its share of the division's amount. */
  function inheritedAmount(groupCode: string, divisionId: string, codes: string[]): number {
    const reference = store.model.context.groupAmounts[groupCode] ?? 0;
    const divisionReference = referenceAmount(codes);
    return divisionReference === 0
      ? reference
      : (reference * store.value(divisionId)) / divisionReference;
  }
  const visibleDivisions = $derived(
    divisions
      .map((division) => {
        const divisionLever = store.lever(`spending.cofog.${division.code}`);
        const groups = division.groups.map((g) => store.lever(`spending.cofog.${g.code}`));
        const shownGroups = searching ? groups.filter(matches) : groups;
        const visible = !searching || matches(divisionLever) || shownGroups.length > 0;
        return { division, divisionLever, groups, shownGroups, visible };
      })
      .filter((d) => d.visible),
  );
  const spendingModified = $derived(
    levers.filter((l) => l.group === 'spending' && store.isModified(l.id)).length,
  );
  const macroLevers = $derived(
    levers.filter((l) => l.group === 'macro' && (!searching || matches(l))),
  );
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
    return code.length > 2 ? [`div:${division}`, `grp:${division}`] : [`div:${division}`];
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

  {#if nothingFound}
    <p class="empty" role="status">Aucun levier ne correspond à « {query.trim()} ».</p>
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
  {#each visibleDivisions as { division, divisionLever, groups, shownGroups } (division.code)}
    {@const codes = divisionLever.cofog ?? []}
    <details
      open={isOpen(`div:${division.code}`)}
      ontoggle={(e) => setOpen(`div:${division.code}`, e.currentTarget.open)}
    >
      <summary>
        {division.label}
        {#if modifiedIn([divisionLever, ...groups]) > 0}<span class="count">modifié</span>{/if}
      </summary>
      {#if isOpen(`div:${division.code}`)}
        <LeverControl
          {store}
          id={divisionLever.id}
          value={store.divisionTotal(division.code)}
          modified={modifiedIn([divisionLever, ...groups]) > 0}
          onCommit={(total) => store.setDivisionTotal(division.code, total)}
          onReset={() => store.resetDivision(division.code)}
          detail={changeText(codes)}
        />
        <details
          class="groups"
          open={isOpen(`grp:${division.code}`)}
          ontoggle={(e) => setOpen(`grp:${division.code}`, e.currentTarget.open)}
        >
          <summary>Détail par groupe ({groups.length})</summary>
          {#if isOpen(`grp:${division.code}`)}
            {#each shownGroups as lever (lever.id)}
              {@const code = lever.cofog?.[0] ?? ''}
              {#if lever.reference > 0}
                <LeverControl
                  {store}
                  id={lever.id}
                  inherited={inheritedAmount(code, divisionLever.id, codes)}
                  badge="personnalisé"
                  detail={changeText([code])}
                />
              {:else}
                <p class="empty">
                  {lever.label} : aucune dépense dans les comptes {store.model.data.spending
                    .structureYear}.
                </p>
              {/if}
            {/each}
          {/if}
        </details>
      {/if}
    </details>
  {/each}

  {#if !searching || macroLevers.length > 0}
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

  details.groups {
    margin: var(--space-2);
    background: var(--color-surface);
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
