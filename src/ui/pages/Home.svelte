<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Landing page: presents the project before the figures. Every number comes from the
  // bundled, sourced data (reference scenario), never from this file.
  import { resolve } from '../../engine/rules.ts';
  import { formatBillions, formatPercent } from '../format.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import type { Page } from '../state/url.ts';
  import { pageHash } from '../state/url.ts';

  let { store, go }: { store: ScenarioStore; go: (event: MouseEvent, target: Page) => void } =
    $props();

  const data = $derived(store.model.data);
  const ref = $derived(store.reference.aggregates);
  const start = $derived(ref.debtPath[0]);
  const accountsYear = $derived(data.meta.accountsYear);

  /** Share of each COFOG function in public spending, out of 100 €. */
  const per100 = $derived.by(() => {
    const amounts = data.spending.divisions.map((d) => ({
      label: d.label,
      amount: d.groups.reduce((s, g) => s + (store.model.context.groupAmounts[g.code] ?? 0), 0),
    }));
    const total = amounts.reduce((s, d) => s + d.amount, 0);
    const sorted = amounts
      .map((d) => ({ ...d, share: total === 0 ? 0 : (d.amount / total) * 100 }))
      .sort((a, b) => b.share - a.share);
    const top = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((s, d) => s + d.share, 0);
    return [...top, { label: 'Autres fonctions', amount: 0, share: others }];
  });
  const maxShare = $derived(Math.max(...per100.map((d) => d.share)));

  const leverCount = $derived(
    [...store.model.levers.values()].filter((l) => !l.deprecated && l.group !== 'macro').length,
  );
  const profiles = $derived(data.profiles.profiles);
  const horizon = $derived(resolve(data.macro.projectionHorizon, 'macro.projectionHorizon'));
</script>

<article class="home">
  <section class="hero" aria-labelledby="home-title">
    <div class="pitch">
      <p class="eyebrow">Simulateur citoyen, gratuit et open source</p>
      <h1 id="home-title" tabindex="-1">Le budget de la France, entre vos mains</h1>
      <p class="lead">
        Impôts, cotisations, dépenses publiques : modifiez les grands leviers du budget et voyez
        aussitôt leur effet sur le déficit, la dette, {profiles.length} ménages types et le vôtre.
      </p>
      <div class="ctas">
        <a
          class="btn btn-primary big"
          href={pageHash('simulator')}
          onclick={(e) => go(e, 'simulator')}
        >
          Lancer le simulateur
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M9 3l5 5-5 5-1.1-1.1L11 8.8H2V7.2h9L7.9 4.1 9 3Z" />
          </svg>
        </a>
        <a class="btn big" href={pageHash('methodology')} onclick={(e) => go(e, 'methodology')}>
          Découvrir la méthode
        </a>
      </div>
      <p class="reassure">
        Sans inscription. Rien n’est envoyé : tout se calcule dans votre navigateur.
      </p>
    </div>

    <figure class="per100">
      <figcaption>
        <span class="eyebrow">Répartition {data.spending.structureYear}, dernière publiée</span>
        <strong>Sur 100 € de dépense publique</strong>
      </figcaption>
      <ul>
        {#each per100 as item (item.label)}
          <li>
            <span class="label">{item.label}</span>
            <span class="bar" aria-hidden="true">
              <span style:width={`${(item.share / maxShare) * 100}%`}></span>
            </span>
            <span class="value">{Math.round(item.share)} €</span>
          </li>
        {/each}
      </ul>
      <p class="note">Montants arrondis, répartition par fonction (classification COFOG).</p>
    </figure>
  </section>

  <section class="figures" aria-labelledby="figures-title">
    <p class="eyebrow">Le point de départ</p>
    <h2 id="figures-title">Les finances publiques en {accountsYear}</h2>
    <dl>
      <div>
        <dt class="eyebrow">Recettes</dt>
        <dd class="value">{formatBillions(ref.revenue, 0)}</dd>
        <dd>{formatPercent(ref.revenueToGdp)} de la richesse nationale (PIB)</dd>
      </div>
      <div>
        <dt class="eyebrow">Dépenses</dt>
        <dd class="value">{formatBillions(ref.spending, 0)}</dd>
        <dd>{formatPercent(ref.spendingToGdp)} du PIB</dd>
      </div>
      <div>
        <dt class="eyebrow">Solde</dt>
        <dd class="value">{formatBillions(ref.balance, 0)}</dd>
        <dd>{formatPercent(ref.balanceToGdp)} du PIB</dd>
      </div>
      {#if start}
        <div>
          <dt class="eyebrow">Dette</dt>
          <dd class="value">{formatBillions(start.debt, 0)}</dd>
          <dd>{formatPercent(start.debtToGdp)} du PIB</dd>
        </div>
      {/if}
    </dl>
    <p class="source">
      Comptes nationaux des administrations publiques (INSEE, Eurostat). Le détail de chaque valeur
      est sur la page
      <a href={pageHash('sources')} onclick={(e) => go(e, 'sources')}>Sources</a>.
    </p>
  </section>

  <section class="features" aria-labelledby="features-title">
    <p class="eyebrow">Ce que vous pouvez faire</p>
    <h2 id="features-title">Trois étapes, aucun prérequis</h2>
    <ol>
      <li>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
          <path
            d="M4 6h10v2H4V6Zm14 0h2v2h-2v2h-2V4h2v2ZM4 16h4v2H4v-2Zm8 0h8v2h-8v-2Zm-2-2h2v6h-2v-2H8v-2h2v-2ZM4 11h14v2H4v-2Z"
          />
        </svg>
        <h3>Modifiez</h3>
        <p>
          {leverCount} leviers : taux de TVA, tranches de l’impôt sur le revenu, cotisations, accises,
          budget de chaque politique publique.
        </p>
      </li>
      <li>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
          <path d="M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z" />
        </svg>
        <h3>Mesurez</h3>
        <p>
          Recettes, dépenses, solde et dette sur {horizon} ans se recalculent à chaque mouvement de curseur,
          avec la carte des dépenses.
        </p>
      </li>
      <li>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
          <path
            d="M18 16a3 3 0 0 0-2.2 1l-6.9-4a3 3 0 0 0 0-2l6.9-4A3 3 0 1 0 15 5l-6.9 4a3 3 0 1 0 0 6l6.9 4A3 3 0 1 0 18 16Z"
          />
        </svg>
        <h3>Partagez</h3>
        <p>
          Votre scénario tient dans un lien : envoyez-le, comparez, débattez. Il s’exporte aussi en
          fichier.
        </p>
      </li>
    </ol>
  </section>

  <section class="profiles" aria-labelledby="profiles-title">
    <p class="eyebrow">Qui est concerné</p>
    <h2 id="profiles-title">{profiles.length} ménages types, et le vôtre</h2>
    <p>
      Pour chacun, le simulateur calcule ce qu’il paie (impôts, cotisations, TVA…) et ce qu’il
      reçoit (prestations, services publics), puis ce qu’une mesure change pour lui, en euros par
      an.
    </p>
    <ul>
      {#each profiles as profile (profile.id)}
        <li>{profile.label}</li>
      {/each}
    </ul>
  </section>

  <section class="principles" aria-labelledby="principles-title">
    <p class="eyebrow">Nos principes</p>
    <h2 id="principles-title">Un outil pour comprendre, pas pour convaincre</h2>
    <dl>
      <div>
        <dt>Neutre</dt>
        <dd>
          Les leviers sont des paramètres, pas des propositions. Les curseurs vont aussi loin à la
          hausse qu’à la baisse, et aucun scénario n’est associé à un parti.
        </dd>
      </div>
      <div>
        <dt>Sourcé</dt>
        <dd>
          Chaque chiffre renvoie à une source officielle, avec sa date et son statut ; les
          hypothèses sont signalées comme telles.
        </dd>
      </div>
      <div>
        <dt>Simplifié, et assumé</dt>
        <dd>
          L’outil montre l’effet mécanique immédiat d’une mesure, sans les réactions qu’elle
          pourrait provoquer. Il ne remplace pas les chiffrages officiels.
        </dd>
      </div>
      <div>
        <dt>Ouvert</dt>
        <dd>
          Code libre (AGPL-3.0) et données réutilisables (Licence Ouverte 2.0) : chacun peut
          vérifier, corriger, améliorer.
        </dd>
      </div>
    </dl>
  </section>

  <section class="final" aria-labelledby="final-title">
    <h2 id="final-title">À vous de jouer</h2>
    <p>Quel budget feriez-vous ? Commencez par un levier, la suite vient toute seule.</p>
    <a class="btn btn-primary big" href={pageHash('simulator')} onclick={(e) => go(e, 'simulator')}>
      Lancer le simulateur
    </a>
  </section>
</article>

<style>
  .home {
    max-width: 72rem;
    margin: 0 auto;
    padding: 0 var(--space-4) var(--space-5);
  }

  section {
    padding: var(--space-5) 0;
    border-top: var(--section-rule);
  }

  h1 {
    margin: var(--space-2) 0 var(--space-3);
    font-size: clamp(2.2rem, 5vw, 3.6rem);
    line-height: 1.05;
  }

  h2 {
    margin: var(--space-1) 0 var(--space-4);
    font-size: clamp(1.5rem, 3vw, 2.2rem);
  }

  h3 {
    margin: var(--space-2) 0 var(--space-1);
    font-size: 1.2rem;
  }

  /* ---------- Hero ---------- */

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: var(--space-5);
    align-items: center;
    border-top: none;
  }

  .lead {
    font-size: 1.2rem;
    max-width: 36rem;
    color: var(--color-text-muted);
    margin: 0 0 var(--space-4);
  }

  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
  }

  .big {
    min-height: 3.25rem;
    padding: 0 var(--space-4);
    font-size: 1.05rem;
    text-decoration: none;
  }

  .reassure {
    margin: var(--space-3) 0 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .per100 {
    margin: 0;
    padding: var(--space-4);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-card);
    box-shadow: var(--shadow-card);
  }

  figcaption {
    display: grid;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
  }

  figcaption strong {
    font-family: var(--font-display);
    font-size: 1.35rem;
    line-height: 1.2;
  }

  .per100 ul {
    display: grid;
    gap: var(--space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .per100 li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 4rem;
    grid-template-areas:
      'label value'
      'bar bar';
    gap: 0.15rem var(--space-2);
    font-size: 0.9rem;
  }

  .per100 .label {
    grid-area: label;
  }

  .per100 .value {
    grid-area: value;
    text-align: right;
    font-family: var(--font-numeric);
    font-weight: 700;
    font-variant-numeric: lining-nums tabular-nums;
  }

  .bar {
    grid-area: bar;
    height: 0.6rem;
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--color-accent);
  }

  .note {
    margin: var(--space-3) 0 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  /* ---------- Key figures ---------- */

  .figures dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: var(--space-3);
    margin: 0;
  }

  .figures dl > div {
    padding: var(--space-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-card);
    box-shadow: var(--shadow-card);
  }

  .figures dd {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .figures .value {
    font-family: var(--font-numeric);
    font-size: clamp(1.6rem, 3vw, 2.1rem);
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text);
    font-variant-numeric: lining-nums tabular-nums;
  }

  .source {
    margin: var(--space-3) 0 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  /* ---------- Features ---------- */

  .features ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--space-3);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .features li {
    padding: var(--space-4);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-card);
    box-shadow: var(--shadow-card);
  }

  .features svg {
    fill: var(--color-accent);
  }

  .features p {
    margin: 0;
    color: var(--color-text-muted);
  }

  /* ---------- Profiles ---------- */

  .profiles > p:not(.eyebrow) {
    max-width: 44rem;
    color: var(--color-text-muted);
  }

  .profiles ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
  }

  .profiles li {
    padding: var(--space-1) var(--space-3);
    border: var(--border-width) solid var(--color-border-strong);
    border-radius: var(--radius-pill);
    background: var(--color-card);
    font-size: 0.9rem;
    font-weight: 600;
  }

  /* ---------- Principles ---------- */

  .principles dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--space-4);
    margin: 0;
  }

  .principles dt {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: var(--heading-weight);
    padding-left: var(--space-3);
    border-left: 4px solid var(--color-highlight);
  }

  .principles dd {
    margin: var(--space-1) 0 0;
    padding-left: calc(var(--space-3) + 4px);
    color: var(--color-text-muted);
  }

  /* ---------- Final call ---------- */

  .final {
    text-align: center;
    padding: var(--space-5) var(--space-4);
    margin-top: var(--space-4);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .final h2 {
    margin-bottom: var(--space-2);
  }

  .final p {
    margin: 0 0 var(--space-4);
    color: var(--color-text-muted);
  }

  @media (max-width: 52rem) {
    .home {
      padding: 0 var(--space-3) var(--space-4);
    }

    .hero {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
    }

    section {
      padding: var(--space-4) 0;
    }

    .lead {
      font-size: 1.05rem;
    }

    .figures dl {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
    }

    .figures dl > div {
      padding: var(--space-2) var(--space-3);
    }
  }
</style>
