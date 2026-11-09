<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // One profile: levies paid per year, scenario impact, effective rates, detailed table.
  import { untrack } from 'svelte';
  import type { ProfileImpact } from '../../engine/simulate.ts';
  import { formatEuros, formatPercent, signed } from '../format.ts';
  import { NEUTRAL_AMOUNT, profileView, toneOf, type Tone } from '../profileView.ts';
  import ImpactValue from './ImpactValue.svelte';

  let {
    impact,
    label,
    mode,
    showDataWarning,
    dualRates,
    detailInitiallyOpen = false,
    headingLevel = 3,
  }: {
    impact: ProfileImpact;
    label: string;
    mode: 'eur' | 'percent';
    showDataWarning: boolean;
    /** Show the rates on fiscal and on economic income (very large fortune). */
    dualRates: boolean;
    detailInitiallyOpen?: boolean;
    /** Level of the card title in the page outline. */
    headingLevel?: 3 | 4;
  } = $props();

  const view = $derived(profileView(impact));
  const titleId = $derived(`profile-${impact.id}`);
  const percent = (share: number) => formatPercent(Math.abs(share), 2);
  const rate = (value: number | null) => (value === null ? '—' : formatPercent(value));
  const changed = (before: number | null, after: number | null) =>
    before !== null && after !== null && Math.abs(after - before) >= 0.00005;
  // Without fiscal income (a student), "%" mode compares with the annual budget instead.
  const share = $derived(mode === 'percent' ? view.share : null);
  /** A change in € per year, or in % of the income shown in "%" mode. */
  const changeText = (change: number) =>
    share === null
      ? `${formatEuros(Math.abs(change))} par an`
      : `${percent(change / share.baseAmount)} ${share.base === 'budget' ? 'de son budget' : 'du revenu'}`;
  const noChange = (change: number) => Math.abs(change) < NEUTRAL_AMOUNT;
  let explainOpen = $state(false);
  let detailOpen = $state(untrack(() => detailInitiallyOpen));
</script>

<article class="card" aria-labelledby={titleId}>
  <svelte:element this={`h${String(headingLevel)}`} id={titleId} class="title"
    >{label}</svelte:element
  >

  <div class="paid">
    <p class="eyebrow">Prélèvements payés (estimation)</p>
    <p class="paid-amount">
      {formatEuros(view.leviesAfter)} <span class="per-year">par an</span>
    </p>
    {#if !noChange(view.leviesAfter - view.leviesBefore)}
      <p class="secondary">aujourd’hui : {formatEuros(view.leviesBefore)}</p>
    {/if}
    {#if view.hasEmployerPart}
      <p class="secondary">
        dont {formatEuros(view.leviesAfter - view.employerAfter)} payés par le foyer et {formatEuros(
          view.employerAfter,
        )} de part patronale
      </p>
    {/if}
  </div>

  <div class="impact">
    <p class="eyebrow">Effet du scénario</p>
    {#if noChange(view.leviesChange) && noChange(view.receivedChange)}
      <p class="no-change">Aucun changement par rapport à aujourd’hui</p>
    {:else}
      <div class="effects">
        {#if view.hasEmployerPart}
          {@render effect('Payé par le foyer', view.ownLeviesChange, view.ownLeviesTone, false)}
          {@render effect('Part patronale', view.employerChange, view.employerTone, true)}
        {:else}
          {@render effect('Prélèvements payés', view.leviesChange, view.leviesTone, false)}
        {/if}
        {@render effect(
          'Prestations et services reçus',
          view.receivedChange,
          view.receivedTone,
          false,
        )}
      </div>
      {#if share?.base === 'budget'}
        <p class="secondary">
          Sans revenu imposable : écarts rapportés à son budget annuel ({formatEuros(
            share.baseAmount,
          )}).
        </p>
      {/if}
      {#if dualRates && !noChange(view.leviesChange) && impact.reference.economicIncome > 0}
        <p class="secondary">
          Prélèvements : {signed(
            percent(view.leviesChange / impact.reference.economicIncome),
            view.leviesChange,
          )} du revenu économique
        </p>
      {/if}
    {/if}
  </div>

  <dl class="rates">
    <div>
      <dt>Taux de prélèvement effectif{dualRates ? ' (revenu économique)' : ''}</dt>
      <dd>
        {rate(view.rateBefore)}{#if changed(view.rateBefore, view.rateAfter)}
          → {rate(view.rateAfter)}{/if}
      </dd>
    </div>
    {#if dualRates}
      <div>
        <dt>Impôts personnels sur le revenu (revenu fiscal)</dt>
        <dd>
          {rate(
            view.personalRateBefore,
          )}{#if changed(view.personalRateBefore, view.personalRateAfter)}
            → {rate(view.personalRateAfter)}{/if}
        </dd>
      </div>
    {/if}
  </dl>
  {#if dualRates}
    <button
      type="button"
      class="link-button"
      aria-expanded={explainOpen}
      aria-controls={`${titleId}-explain`}
      onclick={() => (explainOpen = !explainOpen)}
    >
      Revenu fiscal ou économique ?
    </button>
    <p class="explain" id={`${titleId}-explain`} hidden={!explainOpen}>
      Le revenu fiscal ne compte que ce que le ménage déclare, ici surtout les dividendes
      distribués. Le revenu économique ajoute les bénéfices laissés dans les sociétés qu'il détient
      et l'impôt sur les sociétés qu'elles paient. Les deux taux mesurent donc des choses
      différentes.
    </p>
  {/if}

  <details open={detailOpen} ontoggle={(e) => (detailOpen = e.currentTarget.open)}>
    <summary>Détail des prélèvements et de ce qui est reçu</summary>
    {#if detailOpen}
      <table class="lines">
        <caption class="visually-hidden">Montants annuels pour {label}</caption>
        <thead>
          <tr>
            <th scope="col">Prélèvement</th>
            <th scope="col">Par an</th>
            <th scope="col">Écart</th>
          </tr>
        </thead>
        <tbody>
          {#each view.levies as line (line.label)}
            <tr>
              <th scope="row">{line.label}</th>
              <td>{formatEuros(line.after)}</td>
              <td>{@render change(line.impact)}</td>
            </tr>
          {/each}
          <tr class="sum">
            <th scope="row">Total payé</th>
            <td>{formatEuros(view.leviesAfter)}</td>
            <td>{@render change(view.leviesBefore - view.leviesAfter)}</td>
          </tr>
        </tbody>
        {#if view.received.length > 0}
          <tbody>
            <tr>
              <th scope="rowgroup" colspan="3" class="group">Reçu</th>
            </tr>
            {#each view.received as line (line.label)}
              <tr>
                <th scope="row">{line.label}</th>
                <td>{formatEuros(line.after)}</td>
                <td>{@render change(line.impact)}</td>
              </tr>
            {/each}
          </tbody>
        {/if}
      </table>
      {#if view.healthCover}
        <p class="secondary">Complémentaire santé solidaire : {view.healthCover.toLowerCase()}.</p>
      {/if}
    {/if}
  </details>

  {#if showDataWarning}
    <p class="data-warning">
      Les données publiques sur les très hauts patrimoines sont limitées. Ce profil repose en partie
      sur des hypothèses, signalées et modifiables.
    </p>
  {/if}
</article>

{#snippet effect(title: string, change: number, tone: Tone, feminine: boolean)}
  <div class="effect">
    <p class="effect-label">{title}</p>
    {#if noChange(change)}
      <p class="unchanged">{feminine ? 'inchangée' : 'inchangés'}</p>
    {:else}
      <p class="total">
        <ImpactValue value={change} {tone} text={changeText(change)} />
      </p>
    {/if}
  </div>
{/snippet}

{#snippet change(impact: number)}
  {#if !noChange(impact)}
    <ImpactValue value={impact} tone={toneOf(impact)} text={formatEuros(Math.abs(impact))} />
  {:else}
    <span class="none">—</span>
  {/if}
{/snippet}

<style>
  .card {
    background: var(--color-card);
    border: var(--border-width) solid var(--color-border);
    border-top: max(var(--card-border-top), var(--border-width)) solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .title {
    margin: 0;
    font-size: 1.15rem;
  }

  .paid-amount {
    margin: 0;
    font-family: var(--font-numeric);
    font-size: 1.9rem;
    font-weight: 700;
    line-height: 1.15;
    font-variant-numeric: lining-nums tabular-nums;
  }

  .per-year {
    font-family: var(--font-sans);
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .impact {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--color-surface);
  }

  .no-change {
    margin: 0;
    font-size: 0.95rem;
  }

  .effects {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  .effect {
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--color-card);
    border: var(--border-width) solid var(--color-border);
  }

  .effect-label {
    margin: 0 0 var(--space-1);
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .unchanged {
    margin: 0;
    font-size: 0.95rem;
    color: var(--color-text-muted);
  }

  .total {
    margin: 0;
    font-size: 1.05rem;
  }

  .secondary,
  .explain,
  .data-warning {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .rates {
    margin: 0;
    font-size: 0.85rem;
  }

  .rates dt {
    color: var(--color-text-muted);
  }

  .rates dd {
    margin: 0 0 var(--space-1);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .link-button {
    align-self: flex-start;
    font-size: 0.85rem;
  }

  details {
    margin-top: auto;
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-2);
  }

  summary {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .lines {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-2) 0 0;
    font-size: 0.85rem;
  }

  .lines th,
  .lines td {
    text-align: left;
    padding: 3px var(--space-1);
    font-weight: 400;
    vertical-align: top;
    border-bottom: 1px solid var(--color-border);
  }

  .lines td {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .lines thead th {
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }

  .lines thead th:not(:first-child) {
    text-align: right;
  }

  .lines .sum th,
  .lines .sum td {
    font-weight: 700;
    border-top: 2px solid var(--color-border-strong);
  }

  .lines .group {
    padding-top: var(--space-3);
    font-weight: 700;
    color: var(--color-text-muted);
  }

  .none {
    color: var(--color-text-muted);
  }

  .data-warning {
    border-left: 3px solid var(--color-warning-border);
    padding-left: var(--space-2);
  }
</style>
