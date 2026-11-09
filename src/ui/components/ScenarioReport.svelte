<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // "Bilan" window (PLAN.MD §13.7): the measures of the scenario with the effect each one
  // sets, the totals of the summary bar and the effect on the profiles. No score.
  import { formatBillionsChange, formatEuros, formatLeverValue, formatPercent } from '../format.ts';
  import { reportLines, reportTotals } from '../report.ts';
  import { profileView } from '../profileView.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import Delta from './Delta.svelte';
  import ImpactValue from './ImpactValue.svelte';

  let { store, open, onClose }: { store: ScenarioStore; open: boolean; onClose: () => void } =
    $props();

  let dialog = $state<HTMLDialogElement | undefined>();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });

  // Computed only while the window is open (not on every slider input).
  const lines = $derived(open ? reportLines(store.model, store.result, store.levers) : null);
  const totals = $derived(open ? reportTotals(store.reference, store.result) : null);
  const labels = $derived(
    new Map<string, string>(store.model.data.profiles.profiles.map((p) => [p.id, p.label])),
  );
  const sections = $derived(
    lines === null
      ? []
      : [
          { title: 'Prélèvements', lines: lines.levies, kind: 'revenue' as const },
          { title: 'Dépenses', lines: lines.spending, kind: 'spending' as const },
          {
            title: 'Hypothèses de projection',
            lines: lines.projection,
            kind: 'projection' as const,
          },
        ].filter((s) => s.lines.length > 0),
  );
  const perYear = (abs: number) => `${formatEuros(abs)}/an`;
  const points = (x: number) => `${formatPercent(x).replace(' %', '')} pt de PIB`;
</script>

<dialog
  bind:this={dialog}
  class="report"
  aria-labelledby="scenario-report-title"
  onclose={onClose}
  onclick={(e) => {
    // A click on the backdrop closes the window.
    if (e.target === dialog) onClose();
  }}
>
  {#if open && lines && totals}
    <div class="inner">
      <header>
        <h2 id="scenario-report-title">Bilan de votre scénario</h2>
        <button type="button" class="icon-button close" onclick={onClose}>
          <span aria-hidden="true">×</span><span class="visually-hidden">Fermer</span>
        </button>
      </header>

      {#if lines.count === 0}
        <p class="empty">
          Aucune mesure pour l’instant : le scénario reproduit la législation et les comptes
          actuels. Modifiez un levier pour voir ici son effet, mesure par mesure.
        </p>
      {:else}
        <p class="intro">
          {lines.count} mesure{lines.count > 1 ? 's' : ''}. Effets statiques et mécaniques sur une
          année, sans changement de comportement ni effet sur l’activité.
        </p>

        {#each sections as section (section.title)}
          <section>
            <h3 class="eyebrow">{section.title}</h3>
            <ul class="lines">
              {#each section.lines as line (line.lever.id)}
                <li>
                  <div class="line-head">
                    <span class="label">{line.lever.label}</span>
                    <span class="values">
                      {formatLeverValue(line.lever, line.before)}
                      <span aria-hidden="true">→</span><span class="visually-hidden">devient</span>
                      {formatLeverValue(line.lever, line.after)}
                    </span>
                  </div>
                  {#if section.kind !== 'projection'}
                    <p class="effects">
                      {#if section.kind === 'revenue' || line.revenue !== 0}
                        <span
                          >Recettes : <Delta
                            value={line.revenue}
                            format={formatBillionsChange}
                            better="up"
                          /></span
                        >
                      {/if}
                      {#if section.kind === 'spending' || line.spending !== 0}
                        <span
                          >Dépenses : <Delta
                            value={line.spending}
                            format={formatBillionsChange}
                            better="down"
                          /></span
                        >
                      {/if}
                    </p>
                  {/if}
                  <p class="text">{line.text}</p>
                  {#if line.setApart !== null}
                    <p class="note">
                      Dont {formatBillionsChange(Math.abs(line.setApart))}
                      {line.setApart > 0 ? 'de hausse' : 'de baisse'} réglés par des leviers plus fins,
                      comptés sur leur propre ligne.
                    </p>
                  {/if}
                </li>
              {/each}
            </ul>
          </section>
        {/each}

        <section>
          <h3 class="eyebrow">Total</h3>
          <dl class="totals">
            <div>
              <dt>Recettes</dt>
              <dd>
                <Delta value={totals.revenue} format={formatBillionsChange} better="up" />
              </dd>
            </div>
            <div>
              <dt>Dépenses</dt>
              <dd>
                <Delta value={totals.spending} format={formatBillionsChange} better="down" />
              </dd>
            </div>
            <div>
              <dt>Solde</dt>
              <dd>
                <Delta value={totals.balance} format={formatBillionsChange} better="up" />
              </dd>
            </div>
            {#if totals.debt}
              <div>
                <dt>Dette en {totals.debt.year}</dt>
                <dd>
                  <Delta
                    value={totals.debt.change}
                    format={(abs) =>
                      Math.abs(totals.debt?.ratioChange ?? 0) >= 0.0005
                        ? `${formatBillionsChange(abs)} (${points(Math.abs(totals.debt?.ratioChange ?? 0))})`
                        : formatBillionsChange(abs)}
                    better="down"
                  />
                </dd>
              </div>
            {/if}
          </dl>
        </section>

        <section>
          <h3 class="eyebrow">Effet sur les profils</h3>
          <div class="table-wrap">
            <table>
              <caption class="visually-hidden">
                Variation par an, par rapport à la législation actuelle
              </caption>
              <thead>
                <tr>
                  <th scope="col">Profil</th>
                  <th scope="col">Prélèvements payés</th>
                  <th scope="col">Prestations et services reçus</th>
                </tr>
              </thead>
              <tbody>
                {#each store.result.profiles as impact (impact.id)}
                  {@const view = profileView(impact)}
                  <tr>
                    <th scope="row">{labels.get(impact.id) ?? impact.id}</th>
                    <td>
                      {#if view.leviesTone === 'neutral'}<span class="none">inchangés</span>
                      {:else}<ImpactValue
                          value={view.leviesChange}
                          tone={view.leviesTone}
                          text={perYear(Math.abs(view.leviesChange))}
                        />{/if}
                    </td>
                    <td>
                      {#if view.receivedTone === 'neutral'}<span class="none">inchangés</span>
                      {:else}<ImpactValue
                          value={view.receivedChange}
                          tone={view.receivedTone}
                          text={perYear(Math.abs(view.receivedChange))}
                        />{/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="note">
            Le détail par profil et votre propre foyer figurent sur les fiches, sous la carte des
            dépenses.
          </p>
        </section>
      {/if}

      <footer>
        <button type="button" class="btn" onclick={onClose}>Fermer</button>
      </footer>
    </div>
  {/if}
</dialog>

<style>
  .report {
    width: min(48rem, calc(100vw - 2rem));
    max-height: min(88vh, 60rem);
    padding: 0;
    border: var(--border-width) solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    background: var(--color-card);
    color: var(--color-text);
    box-shadow: var(--shadow-float);
    text-align: left;
  }

  .report::backdrop {
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

  .intro,
  .empty {
    margin: var(--space-2) 0 0;
    color: var(--color-text-muted);
  }

  section {
    margin-top: var(--space-4);
  }

  h3 {
    margin: 0 0 var(--space-2);
  }

  .lines {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .lines li {
    padding: var(--space-2) 0;
    border-top: 1px solid var(--color-border);
  }

  .line-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-1) var(--space-3);
  }

  .label {
    font-weight: 600;
  }

  .values {
    font-variant-numeric: tabular-nums;
    color: var(--color-text-muted);
  }

  .effects {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-4);
    margin: var(--space-1) 0 0;
    font-size: 0.9rem;
  }

  .text {
    margin: var(--space-1) 0 0;
    font-size: 0.9rem;
  }

  .note {
    margin: var(--space-1) 0 0;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .totals {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--space-2) var(--space-3);
    margin: 0;
  }

  .totals dt {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .totals dd {
    margin: 0;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th,
  td {
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    vertical-align: top;
  }

  thead th {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  tbody th {
    font-weight: 600;
  }

  .none {
    color: var(--color-text-muted);
  }

  footer {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-4);
  }
</style>
