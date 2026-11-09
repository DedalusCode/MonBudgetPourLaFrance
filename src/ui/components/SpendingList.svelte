<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Spending levers as a list of functions, each opening on its slider then its groups:
  // "tree" links the groups and items to their parent with rails, "cards" puts each group
  // and its items in one card. The items of a group open from a button on the group.
  import type { Lever } from '../../engine/levers.ts';
  import type { DivisionView } from '../spendingLayout.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import GroupLever from './GroupLever.svelte';
  import LeverControl from './LeverControl.svelte';

  let {
    store,
    divisions,
    variant,
    detailed,
    expert,
    isOpen,
    setOpen,
  }: {
    store: ScenarioStore;
    divisions: DivisionView[];
    variant: 'tree' | 'cards';
    detailed: boolean;
    expert: boolean;
    isOpen: (key: string) => boolean;
    setOpen: (key: string, open: boolean) => void;
  } = $props();

  const modifiedIn = (list: Lever[]) => list.filter((l) => store.isModified(l.id)).length;
</script>

{#each divisions as { division, divisionLever, groups, shownGroups } (division.code)}
  <details
    class="division"
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
      />
      {#if detailed && shownGroups.length > 0}
        <p class="sub-heading" id={`groups-${division.code}`}>
          Groupes de la fonction ({shownGroups.length})
        </p>
        <ul class={['groups', variant]} aria-labelledby={`groups-${division.code}`}>
          {#each shownGroups as { lever, items, shownItems } (lever.id)}
            {@const code = lever.cofog?.[0] ?? ''}
            {@const itemsOpen = isOpen(`item:${code}`)}
            <li class="group">
              <GroupLever {store} {lever} />
              {#if expert && items.length > 0 && lever.reference > 0}
                <button
                  type="button"
                  class="items-toggle"
                  aria-expanded={itemsOpen}
                  aria-controls={`items-${code}`}
                  onclick={() => setOpen(`item:${code}`, !itemsOpen)}
                >
                  <span class="chevron" aria-hidden="true">{itemsOpen ? '▾' : '▸'}</span>
                  Postes du groupe ({items.length})
                  {#if modifiedIn(items) > 0}<span class="count">modifié</span>{/if}
                </button>
                {#if itemsOpen}
                  <ul class="items" id={`items-${code}`} aria-label={`Postes : ${lever.label}`}>
                    {#each shownItems as item (item.id)}
                      <li>
                        <LeverControl
                          {store}
                          id={item.id}
                          inherited={store.itemInherited(item.item ?? '')}
                          badge="personnalisé"
                        />
                      </li>
                    {/each}
                  </ul>
                {/if}
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </details>
{/each}

<style>
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

  .sub-heading {
    margin: var(--space-3) var(--space-3) var(--space-1);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .items-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    width: 100%;
    min-height: var(--tap-size);
    padding: var(--space-1) var(--space-2);
    border: 0;
    background: none;
    color: var(--color-accent);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .items-toggle:hover {
    text-decoration: underline;
  }

  .chevron {
    width: 1rem;
  }

  /* Tree: a rail from the function to its groups, a dashed one from a group to its items. */
  .groups.tree {
    margin: 0 var(--space-2) var(--space-2) var(--space-3);
    border-left: 2px solid var(--color-border-strong);
  }

  /* A group's separator sits below its items button, not between its slider and that
     button, so the button reads as part of the group above it. */
  .group > :global(.lever) {
    border-bottom: 0;
  }

  .tree .group {
    position: relative;
    padding-left: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  .tree .items-toggle {
    padding-top: 0;
  }

  /* Branch from the rail to each group's name. */
  .tree .group::before {
    content: '';
    position: absolute;
    left: 0;
    top: 1.5rem;
    width: var(--space-2);
    border-top: 2px solid var(--color-border-strong);
  }

  .tree .items {
    margin: 0 0 var(--space-2) var(--space-3);
    border-left: 2px dashed var(--color-border-strong);
    padding-left: var(--space-2);
  }

  /* Cards: each group and its items in one card. */
  .groups.cards {
    display: grid;
    gap: var(--space-2);
    padding: 0 var(--space-2) var(--space-2);
  }

  .cards .group {
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-card);
    overflow: hidden;
  }

  .cards .items-toggle {
    border-top: 1px dashed var(--color-border);
    padding-inline: var(--space-3);
  }

  .cards .items {
    background: var(--color-surface);
    padding-left: var(--space-3);
    border-top: 1px solid var(--color-border);
  }
</style>
