<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Pop-up explaining a lever: what it covers, examples, who pays or benefits, sources.
  // The texts (explanations.json) are bundled apart and loaded on the first opening.
  import { untrack } from 'svelte';
  import type { Explanation, ExplanationsFile } from '../../engine/schemas.ts';
  import { explanationFor } from '../explanation.ts';
  import { formatLeverValue } from '../format.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';

  let { store }: { store: ScenarioStore } = $props();

  let dialog = $state<HTMLDialogElement | undefined>();
  let entries = $state<Map<string, Explanation> | null>(null);
  let natures = $state<ExplanationsFile['natures'] | null>(null);
  let loadError = $state(false);

  const id = $derived(store.infoLeverId);
  const lever = $derived(id === null ? null : store.lever(id));
  /** Group of a level-3 item: a nature item's text names it and links to its window. */
  const groupId = $derived(lever?.item ? `spending.cofog.${lever.item.slice(0, 4)}` : null);
  const groupLabel = $derived(groupId === null ? null : store.lever(groupId).label);
  const explanation = $derived(
    id === null || entries === null || natures === null
      ? undefined
      : explanationFor({ natures }, entries, id, groupLabel),
  );
  const entry = $derived(explanation?.entry);
  const sources = $derived(
    (entry?.sourceIds ?? [])
      .map((sid) => store.model.data.sources.sources.find((s) => s.id === sid))
      .filter((s) => s !== undefined),
  );

  async function load() {
    if (entries !== null) return;
    try {
      const module = await import('../../data/explanations.json');
      const file = module.default as ExplanationsFile;
      natures = file.natures;
      entries = new Map(file.entries.map((e) => [e.id, e] as const));
    } catch {
      loadError = true;
    }
  }

  $effect(() => {
    if (id === null) {
      if (dialog?.open) dialog.close();
      return;
    }
    // Loading reads `entries`: keep it out of this effect's dependencies.
    untrack(() => void load());
    if (dialog && !dialog.open) dialog.showModal();
  });
</script>

<dialog
  bind:this={dialog}
  class="info"
  aria-labelledby="lever-info-title"
  onclose={() => store.closeInfo()}
  onclick={(e) => {
    // A click on the backdrop closes the pop-up.
    if (e.target === dialog) store.closeInfo();
  }}
>
  {#if lever}
    <div class="inner">
      <header>
        <h2 id="lever-info-title">{lever.label}</h2>
        <button type="button" class="icon-button close" onclick={() => store.closeInfo()}>
          <span aria-hidden="true">×</span><span class="visually-hidden">Fermer</span>
        </button>
      </header>
      <p class="values">
        {lever.unit === 'billions' ? 'Montant actuel' : 'Valeur actuelle'} :
        <strong>{formatLeverValue(lever, lever.reference)}</strong>
        {#if store.isModified(lever.id)}
          · dans votre scénario : <strong>{formatLeverValue(lever, store.value(lever.id))}</strong>
        {/if}
      </p>

      {#if entry}
        {#if explanation?.fromNature && groupId !== null}
          <p class="secondary">
            Ce poste fait partie du groupe « {groupLabel} ».
            <button type="button" class="link-button" onclick={() => store.openInfo(groupId)}
              >Voir ce que finance le groupe</button
            >
          </p>
        {/if}
        <p class="summary">{entry.summary}</p>
        {#each entry.sections as section (section.heading)}
          <section>
            <h3 class="eyebrow">{section.heading}</h3>
            {#if section.text}<p>{section.text}</p>{/if}
            {#if section.items}
              <ul>
                {#each section.items as item (item)}<li>{item}</li>{/each}
              </ul>
            {/if}
          </section>
        {/each}
        {#if sources.length > 0}
          <section class="sources">
            <h3 class="eyebrow">Sources</h3>
            <ul>
              {#each sources as source (source.id)}
                <li>
                  <a href={source.url} rel="external noopener" target="_blank"
                    >{source.title}<span class="visually-hidden"> (nouvel onglet)</span></a
                  >
                  <span class="publisher">({source.publisher})</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {:else if loadError || entries !== null}
        <p class="summary">{lever.help}</p>
      {:else}
        <p class="summary" aria-busy="true">{lever.help}</p>
      {/if}

      <footer>
        <button type="button" class="btn" onclick={() => store.closeInfo()}>Fermer</button>
      </footer>
    </div>
  {/if}
</dialog>

<style>
  .info {
    width: min(44rem, calc(100vw - 2rem));
    max-height: min(85vh, 50rem);
    padding: 0;
    border: var(--border-width) solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    background: var(--color-card);
    color: var(--color-text);
    box-shadow: var(--shadow-float);
  }

  .info::backdrop {
    background: var(--color-backdrop);
  }

  .inner {
    padding: var(--space-4);
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  h2 {
    margin: 0;
    font-size: 1.4rem;
  }

  .values {
    margin: var(--space-2) 0 var(--space-3);
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .values strong {
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .summary {
    font-size: 1.05rem;
    margin: 0 0 var(--space-3);
  }

  section {
    margin-top: var(--space-3);
  }

  h3 {
    margin: 0 0 var(--space-1);
  }

  section p,
  section ul {
    margin: 0;
  }

  ul {
    padding-left: 1.2rem;
  }

  li + li {
    margin-top: var(--space-1);
  }

  .sources {
    font-size: 0.85rem;
  }

  .publisher {
    color: var(--color-text-muted);
  }

  footer {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-4);
  }
</style>
