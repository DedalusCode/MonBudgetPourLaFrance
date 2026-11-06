<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Sources page (PLAN.MD §8.4): generated from sources.json and the status of every value.
  import { collectValues, type ValueEntry } from '../../engine/dataValues.ts';
  import type { Status } from '../../engine/types.ts';
  import { formatDataValue, normalizeSearch } from '../format.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';

  let { store }: { store: ScenarioStore } = $props();

  const STATUS_LABELS: Record<Status, string> = {
    VERIFIE: 'Vérifié',
    A_VERIFIER: 'À vérifier',
    HYPOTHESE: 'Hypothèse',
  };
  const FILE_LABELS: Record<string, string> = {
    macro: 'Agrégats',
    revenues: 'Recettes',
    spending: 'Dépenses',
    taxRules: 'Règles fiscales et sociales',
    profiles: 'Profils',
    consumption: 'Consommation',
    inKindAllocation: 'Services publics',
  };

  const data = $derived(store.model.data);
  const values = $derived(collectValues(data));
  const counts = (status: Status) => values.filter((v) => v.status === status).length;

  let status = $state<Status | 'all'>('all');
  let query = $state('');
  const visible = (v: ValueEntry) =>
    (status === 'all' || v.status === status) &&
    (query.trim() === '' ||
      normalizeSearch(`${v.path} ${v.note ?? ''} ${FILE_LABELS[v.file] ?? ''}`).includes(
        normalizeSearch(query.trim()),
      ));

  const sources = $derived(
    data.sources.sources
      .map((source) => ({
        source,
        entries: values.filter((v) => v.sourceId === source.id && visible(v)),
      }))
      .filter((s) => s.entries.length > 0),
  );
  const unsourced = $derived(values.filter((v) => v.sourceId === null && visible(v)));
  const shown = $derived(values.filter(visible).length);
  // Sources cited only by the explanation pop-ups of the levers (no value attached).
  const documentation = $derived(
    status === 'all'
      ? data.sources.sources.filter(
          (s) =>
            !values.some((v) => v.sourceId === s.id) &&
            (query.trim() === '' ||
              normalizeSearch(`${s.title} ${s.publisher}`).includes(normalizeSearch(query.trim()))),
        )
      : [],
  );
  const date = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR');
</script>

<article class="page">
  <h1 tabindex="-1">Sources</h1>
  <p>
    Chaque valeur chiffrée du simulateur indique sa source, sa date et son statut. Cette page est
    générée automatiquement à partir des fichiers de données (version {data.meta.dataVersion}, mise
    à jour le {date(data.meta.updated)}).
  </p>
  <ul class="counts">
    <li>
      <strong>{counts('VERIFIE')}</strong> valeurs vérifiées : lues dans une source officielle.
    </li>
    <li>
      <strong>{counts('HYPOTHESE')}</strong> hypothèses : choix de modélisation, déduits d'une source
      quand c'est possible, expliqués dans leur note.
    </li>
    <li><strong>{counts('A_VERIFIER')}</strong> valeurs à vérifier.</li>
  </ul>

  <div class="filters">
    <label>
      Statut
      <select bind:value={status}>
        <option value="all">Tous</option>
        <option value="VERIFIE">Vérifié</option>
        <option value="HYPOTHESE">Hypothèse</option>
        <option value="A_VERIFIER">À vérifier</option>
      </select>
    </label>
    <label>
      Rechercher
      <input type="search" bind:value={query} placeholder="Ex. : TVA, SMIC, santé" />
    </label>
  </div>
  <p class="meta" role="status">
    {#if shown === 0}
      Aucune valeur ne correspond à ces critères.
    {:else}
      {shown} valeur{shown > 1 ? 's' : ''} affichée{shown > 1 ? 's' : ''}.
    {/if}
  </p>

  {#each sources as { source, entries } (source.id)}
    <section class="source">
      <h2><a href={source.url} rel="external noopener">{source.title}</a></h2>
      <p class="meta">{source.publisher} · consulté le {date(source.accessed)}</p>
      {@render valueList(entries)}
    </section>
  {/each}

  {#if unsourced.length > 0}
    <section class="source">
      <h2>Hypothèses sans source directe</h2>
      <p class="meta">Valeurs qui définissent les profils ou relèvent d'un choix du projet.</p>
      {@render valueList(unsourced)}
    </section>
  {/if}

  {#if documentation.length > 0}
    <section class="source documentation">
      <h2>Sources des fiches explicatives</h2>
      <p class="meta">
        Textes officiels et pages de référence cités dans les fenêtres « ? » des leviers
        (définitions, exemples, règles), sans valeur chiffrée utilisée dans les calculs.
      </p>
      <details>
        <summary>{documentation.length} source{documentation.length > 1 ? 's' : ''}</summary>
        <ul class="docs">
          {#each documentation as source (source.id)}
            <li>
              <a href={source.url} rel="external noopener">{source.title}</a>
              <span class="meta">— {source.publisher}, consulté le {date(source.accessed)}</span>
            </li>
          {/each}
        </ul>
      </details>
    </section>
  {/if}
</article>

{#snippet valueList(entries: ValueEntry[])}
  <details>
    <summary>{entries.length} valeur{entries.length > 1 ? 's' : ''}</summary>
    <ul class="values">
      {#each entries as v (`${v.file}:${v.path}`)}
        <li>
          <span class="status status-{v.status}">{STATUS_LABELS[v.status]}</span>
          <span class="where">{FILE_LABELS[v.file] ?? v.file} › {v.path}</span>
          <strong>{formatDataValue(v.value, v.unit)}</strong>
          {#if v.note}<span class="note">{v.note}</span>{/if}
        </li>
      {/each}
    </ul>
  </details>
{/snippet}

<style>
  .page {
    max-width: 60rem;
  }

  .counts {
    font-size: 0.95rem;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin: var(--space-3) 0;
  }

  .filters label {
    display: flex;
    flex-direction: column;
    font-size: 0.85rem;
    gap: var(--space-1);
  }

  select,
  input {
    font: inherit;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius);
    background: var(--color-bg);
    color: var(--color-text);
  }

  .source {
    border-top: 1px solid var(--color-border);
    padding: var(--space-2) 0;
  }

  h2 {
    font-size: 1rem;
    margin: 0;
  }

  .meta {
    margin: var(--space-1) 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  summary {
    cursor: pointer;
    font-size: 0.9rem;
  }

  .docs {
    font-size: 0.9rem;
    padding-left: 1.2rem;
  }

  .docs li + li {
    margin-top: var(--space-1);
  }

  .values {
    list-style: none;
    padding: 0;
    font-size: 0.85rem;
  }

  .values li {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-2);
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .where {
    color: var(--color-text-muted);
    word-break: break-word;
  }

  .note {
    flex-basis: 100%;
    color: var(--color-text-muted);
  }

  .status {
    font-size: 0.75rem;
    padding: 0 var(--space-1);
    border-radius: var(--radius);
    border: 1px solid var(--color-border-strong);
  }

  .status-HYPOTHESE {
    background: var(--color-accent-soft);
  }

  .status-A_VERIFIER {
    background: var(--color-warning-bg);
  }
</style>
