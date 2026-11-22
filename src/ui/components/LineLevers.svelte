<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Pop-up of a card line (PLAN.MD §14.3): the modified levers that move it with the
  // effect of each, the part no single lever explains, then the other levers that can
  // move it. A lever opens in the panel, at the level that shows it.
  import {
    LEVY_LINES,
    leversOfLine,
    lineEffects,
    type IndirectPath,
    type LeverEffect,
  } from '../../engine/lineLevers.ts';
  import type { Lever } from '../../engine/levers.ts';
  import { emptyScenario } from '../../engine/scenario.ts';
  import { subjectResult } from '../../engine/simulate.ts';
  import { DETAIL_LEVELS, isShownAt } from '../detailLevel.ts';
  import { formatEuros, formatLeverValue } from '../format.ts';
  import { NEUTRAL_AMOUNT, toneOf } from '../profileView.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import ImpactValue from './ImpactValue.svelte';

  let { store }: { store: ScenarioStore } = $props();

  let dialog = $state<HTMLDialogElement | undefined>();

  const request = $derived(store.lineRequest);
  const table = $derived(request ? leversOfLine(store.model, request.line) : null);
  /** A levy is favourable to the household when it falls, a benefit when it rises. */
  const levy = $derived(
    request !== null && (LEVY_LINES as readonly string[]).includes(request.line),
  );
  const favourable = (change: number) => (levy ? -change : change);
  // Computed on opening only, never on a slider move while closed.
  const result = $derived.by(() => {
    if (!request) return null;
    const { subject } = request;
    const reference =
      subject.kind === 'profile'
        ? store.model.reference.find((r) => r.id === subject.id)
        : subjectResult(store.model, emptyScenario(store.baseYear), subject);
    if (!reference) return null;
    return lineEffects(store.model, store.scenario, subject, request.line, reference);
  });
  const directIds = $derived(new Set(table?.direct.map((l) => l.id)));
  const groups = $derived.by(() => {
    if (!result || !table) return [];
    const direct = result.effects.filter((e) => directIds.has(e.lever.id));
    const indirect = result.effects.filter((e) => !directIds.has(e.lever.id));
    return [
      { title: directTitle(table.path), effects: direct },
      { title: indirectTitle(table.path), effects: indirect },
    ].filter((g) => g.effects.length > 0);
  });
  const others = $derived.by(() => {
    if (!table) return [];
    const modified = new Set(result?.effects.map((e) => e.lever.id));
    return [
      { title: directTitle(table.path), levers: table.direct },
      { title: indirectTitle(table.path), levers: table.indirect },
    ]
      .map((g) => ({ ...g, levers: g.levers.filter((l) => !modified.has(l.id)) }))
      .filter((g) => g.levers.length > 0);
  });
  const otherCount = $derived(others.reduce((s, g) => s + g.levers.length, 0));

  function directTitle(path: IndirectPath | undefined): string {
    return path === 'consumption' ? 'Par les taux' : 'Directement';
  }

  function indirectTitle(path: IndirectPath | undefined): string {
    switch (path) {
      case 'gross':
        return 'Par le salaire';
      case 'income':
        return 'Par les revenus';
      case 'resources':
        return 'Par les ressources du foyer';
      case 'consumption':
        return 'Par la consommation (revenu disponible)';
      default:
        return 'Indirectement';
    }
  }

  /** Text of the level that shows a lever hidden at the current level. */
  function levelNote(lever: Lever): string | null {
    if (store.isShown(lever.id)) return null;
    const level = DETAIL_LEVELS.find((l) => isShownAt(lever, l.id));
    return level ? `niveau ${level.label}` : null;
  }

  function open(lever: Lever) {
    store.closeLine();
    store.focusLever(lever.id);
  }

  const sumOf = (effects: LeverEffect[]) => effects.reduce((s, e) => s + e.effect, 0);

  /** Lines whose levers act in a way worth a sentence. */
  const NOTES: Partial<Record<string, string>> = {
    employerContributions:
      'Pour les salariés dont le salaire net est fixé, une hausse des cotisations salariales ou de la CSG augmente le salaire brut, donc la part patronale.',
    incomeTax:
      'La décote réduit ou annule les petits impôts : un même changement de barème peut avoir un effet différent selon le revenu.',
    vat: 'La consommation suit le revenu disponible : tout curseur qui change ce revenu change aussi la TVA payée.',
    energyExcise:
      'La consommation suit le revenu disponible : tout curseur qui change ce revenu change aussi les accises payées.',
  };

  $effect(() => {
    if (request === null) {
      if (dialog?.open) dialog.close();
      return;
    }
    if (dialog && !dialog.open) dialog.showModal();
  });
</script>

<dialog
  bind:this={dialog}
  class="line-levers"
  aria-labelledby="line-levers-title"
  onclose={() => store.closeLine()}
  onclick={(e) => {
    if (e.target === dialog) store.closeLine();
  }}
>
  {#if request && result && table}
    <div class="inner">
      <header>
        <div>
          <h2 id="line-levers-title">{request.label}</h2>
          <p class="subtitle">{request.cardLabel}</p>
        </div>
        <button type="button" class="icon-button close" onclick={() => store.closeLine()}>
          <span aria-hidden="true">×</span><span class="visually-hidden">Fermer</span>
        </button>
      </header>

      <p class="amounts">
        Aujourd’hui : <strong>{formatEuros(result.before)}</strong> par an
        {#if Math.abs(result.after - result.before) >= NEUTRAL_AMOUNT}
          · avec le scénario : <strong>{formatEuros(result.after)}</strong>
          ({@render impact(result.after - result.before)})
        {:else}
          · le scénario ne change pas cette ligne.
        {/if}
      </p>

      {#if groups.length > 0}
        <h3>Curseurs modifiés</h3>
        {#each groups as group (group.title)}
          <div class="group">
            <p class="group-title">
              {group.title}
              {#if groups.length > 1}<span class="subtotal"
                  >{@render impact(sumOf(group.effects))}</span
                >{/if}
            </p>
            <ul>
              {#each group.effects as { lever, effect } (lever.id)}
                <li class="row">
                  <span class="name">
                    {lever.label}
                    <span class="value">{formatLeverValue(lever, store.value(lever.id))}</span>
                  </span>
                  <span class="effect">
                    {#if Math.abs(effect) >= NEUTRAL_AMOUNT}
                      {@render impact(effect)}
                    {:else}
                      <span class="muted">sans effet sur cette ligne pour ce foyer</span>
                    {/if}
                  </span>
                  {@render openButton(lever)}
                </li>
              {/each}
            </ul>
          </div>
        {/each}
        {#if Math.abs(result.combined) >= NEUTRAL_AMOUNT}
          <div class="row combined">
            <span class="name">
              Effets combinés
              <span class="value"
                >Les curseurs agissent ensemble, par exemple par la décote ou les seuils des aides ;
                cet écart n’est attribué à aucun d’eux.</span
              >
            </span>
            <span class="effect">{@render impact(result.combined)}</span>
          </div>
        {/if}
      {:else if Math.abs(result.after - result.before) < NEUTRAL_AMOUNT}
        <p class="muted">Aucun curseur modifié n’agit sur cette ligne.</p>
      {/if}

      {#if NOTES[request.line]}<p class="note">{NOTES[request.line]}</p>{/if}

      {#if otherCount > 0}
        <details class="others" open={groups.length === 0 && otherCount <= 12}>
          <summary>
            {groups.length > 0 ? 'Autres curseurs' : 'Curseurs'} qui peuvent agir sur cette ligne ({otherCount})
          </summary>
          {#each others as group (group.title)}
            <p class="group-title">{group.title}</p>
            <ul>
              {#each group.levers as lever (lever.id)}
                <li class="row">
                  <span class="name">
                    {lever.label}
                    {#if levelNote(lever)}<span class="value">{levelNote(lever)}</span>{/if}
                  </span>
                  {@render openButton(lever)}
                </li>
              {/each}
            </ul>
          {/each}
        </details>
      {/if}
    </div>
  {/if}
</dialog>

{#snippet impact(change: number)}
  <ImpactValue
    value={favourable(change)}
    tone={toneOf(favourable(change))}
    text={formatEuros(Math.abs(change))}
  />
{/snippet}

{#snippet openButton(lever: Lever)}
  {#if !lever.deprecated}
    <button
      type="button"
      class="btn open"
      aria-label={`Ouvrir le curseur ${lever.label}`}
      onclick={() => open(lever)}>Ouvrir</button
    >
  {/if}
{/snippet}

<style>
  .line-levers {
    width: min(46rem, calc(100vw - 2rem));
    max-height: min(85vh, 52rem);
    padding: 0;
    border: var(--border-width) solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    background: var(--color-card);
    color: var(--color-text);
    box-shadow: var(--shadow-float);
  }

  .line-levers::backdrop {
    background: var(--color-backdrop);
  }

  .inner {
    padding: var(--space-4);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
  }

  h2 {
    margin: 0;
    font-size: 1.3rem;
  }

  h3 {
    margin: var(--space-4) 0 var(--space-2);
    font-size: 1rem;
  }

  .subtitle,
  .muted,
  .value {
    color: var(--color-text-muted);
  }

  .subtitle {
    margin: var(--space-1) 0 0;
    font-size: 0.9rem;
  }

  .amounts {
    margin: var(--space-3) 0 0;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .group-title {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin: var(--space-3) 0 var(--space-1);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .subtotal {
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.85rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.9rem;
  }

  .row.combined {
    grid-template-columns: 1fr auto;
  }

  .name {
    display: grid;
    gap: 2px;
    font-weight: 600;
  }

  .value {
    font-weight: 400;
    font-size: 0.8rem;
  }

  .effect {
    white-space: nowrap;
    text-align: right;
  }

  .open {
    font-size: 0.85rem;
  }

  .note {
    margin: var(--space-3) 0 0;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-left: 3px solid var(--color-border-strong);
    font-size: 0.85rem;
  }

  .others {
    margin-top: var(--space-4);
  }

  .others summary {
    min-height: var(--tap-size);
    display: flex;
    align-items: center;
    font-weight: 600;
    cursor: pointer;
  }

  .others .row {
    grid-template-columns: 1fr auto;
  }

  @media (max-width: 40rem) {
    .row {
      grid-template-columns: 1fr auto;
    }

    .row .open {
      grid-column: 1 / -1;
      justify-self: start;
    }
  }
</style>
