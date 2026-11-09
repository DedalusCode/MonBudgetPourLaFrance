<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Pages (simulator, methodology, sources, about), scenario kept in the URL hash,
  // and the phone layout of PLAN.MD §8.2 (levers in a bottom sheet).
  import { tick } from 'svelte';
  import Delta from './components/Delta.svelte';
  import LeverInfo from './components/LeverInfo.svelte';
  import LeverPanel from './components/LeverPanel.svelte';
  import LimitsBox from './components/LimitsBox.svelte';
  import ProfileCards from './components/ProfileCards.svelte';
  import SummaryBar from './components/SummaryBar.svelte';
  import HowItWorks from './components/HowItWorks.svelte';
  import ThemePicker from './components/ThemePicker.svelte';
  import Treemap from './components/Treemap.svelte';
  import WarningBanner from './components/WarningBanner.svelte';
  import About from './pages/About.svelte';
  import Changes from './pages/Changes.svelte';
  import Home from './pages/Home.svelte';
  import Methodology from './pages/Methodology.svelte';
  import Sources from './pages/Sources.svelte';
  import { formatBillions, formatBillionsChange } from './format.ts';
  import { ScenarioStore } from './state/scenario.svelte.ts';
  import { APP_VERSION } from './version.ts';
  import { browser, PHONE_QUERY } from './state/storage.ts';
  import {
    pageFromHash,
    pageHash,
    scenarioFromHash,
    simulatorHash,
    type Page,
  } from './state/url.ts';

  const store = new ScenarioStore();
  const knownLevers = store.model.levers;

  let page = $state<Page>(browser ? pageFromHash(window.location.hash) : 'simulator');
  let notice = $state('');
  let leversOpen = $state(false);
  let closeButton = $state<HTMLButtonElement | undefined>();
  let openButton = $state<HTMLButtonElement | undefined>();

  // On phones the levers live in a bottom sheet over the page.
  const phoneQuery = browser ? matchMedia(PHONE_QUERY) : null;
  let isPhone = $state(phoneQuery?.matches ?? false);
  $effect(() => {
    if (!phoneQuery) return;
    const update = () => (isPhone = phoneQuery.matches);
    phoneQuery.addEventListener('change', update);
    return () => phoneQuery.removeEventListener('change', update);
  });

  function loadFromHash(hash: string) {
    try {
      const loaded = scenarioFromHash(hash, knownLevers);
      if (!loaded) return;
      store.restore(loaded.scenario.levers);
      notice =
        loaded.droppedLevers.length > 0
          ? `Scénario partagé chargé ; leviers inconnus ignorés : ${loaded.droppedLevers.join(', ')}.`
          : '';
    } catch {
      notice = 'Ce lien de scénario est illisible : le scénario de référence est affiché.';
    }
  }

  if (browser) loadFromHash(window.location.hash);

  function onHashChange() {
    page = pageFromHash(window.location.hash);
    loadFromHash(window.location.hash);
  }

  // Keep the scenario in the address while on the simulator, without adding history entries.
  $effect(() => {
    if (page !== 'simulator') return;
    const hash = simulatorHash(store.scenario);
    if (window.location.hash !== hash) {
      const { pathname, search } = window.location;
      history.replaceState(null, '', `${pathname}${search}${hash}`);
    }
  });

  // Opening a lever from the treemap opens the bottom sheet on phones.
  $effect(() => {
    if (store.focusRequest) leversOpen = true;
  });

  async function openLevers() {
    leversOpen = true;
    await tick();
    closeButton?.focus();
  }

  /** Closes the sheet and gives the focus back to the button that opens it. */
  function closeLevers() {
    leversOpen = false;
    openButton?.focus();
  }

  const PAGES: [Page, string][] = [
    ['home', 'Accueil'],
    ['simulator', 'Simulateur'],
    ['methodology', 'Méthodologie'],
    ['sources', 'Sources'],
    ['about', 'À propos'],
  ];

  async function goTo(event: MouseEvent, target: Page) {
    event.preventDefault();
    if (target === 'simulator') {
      const { pathname, search } = window.location;
      history.pushState(null, '', `${pathname}${search}${simulatorHash(store.scenario)}`);
    } else {
      history.pushState(null, '', pageHash(target));
    }
    page = target;
    window.scrollTo(0, 0);
    // Move the focus to the new page title, so that screen readers announce the change.
    await tick();
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  }
</script>

<!-- popstate also fires on a change of the hash typed in the address bar. -->
<svelte:window
  onpopstate={onHashChange}
  onkeydown={(e) => {
    // Escape closes the explanation pop-up first (the dialog handles it), then the lever sheet.
    if (e.key === 'Escape' && store.infoLeverId === null && leversOpen) closeLevers();
  }}
/>

{#if page === 'simulator'}
  <a
    class="skip-link"
    href="#leviers"
    onclick={(e) => {
      e.preventDefault();
      if (isPhone) void openLevers();
      else document.getElementById('leviers')?.focus();
    }}>Aller aux leviers</a
  >
{/if}
<WarningBanner />
<header class="site-header">
  <a class="brand" href={pageHash('home')} onclick={(e) => goTo(e, 'home')}>
    <svg class="logo" viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
      <rect width="32" height="32" rx="7" />
      <path d="M8 23V13h4v10zm6 0V8h4v15zm6 0v-7h4v7z" />
    </svg>
    <span class="brand-text">
      <span class="brand-name">Mon budget pour la France</span>
      <span class="brand-tagline">Simulateur citoyen des finances publiques</span>
    </span>
  </a>
  <nav aria-label="Pages">
    <ul>
      {#each PAGES as [target, label] (target)}
        <li>
          <a
            href={pageHash(target)}
            aria-current={page === target ? 'page' : undefined}
            onclick={(e) => goTo(e, target)}>{label}</a
          >
        </li>
      {/each}
    </ul>
  </nav>
  <ThemePicker />
</header>

{#if page === 'simulator'}
  <h1 class="visually-hidden" tabindex="-1">Simulateur budgétaire</h1>
  <SummaryBar {store} />
  {#if notice}<p class="notice" role="status">{notice}</p>{/if}
  <div class="layout" class:levers-open={leversOpen}>
    <aside id="leviers" class="levers" aria-label="Leviers budgétaires" tabindex="-1">
      <div class="sheet-header">
        <div>
          <h2>Leviers</h2>
          <p class="sheet-balance">
            Solde : <strong>{formatBillions(store.result.aggregates.balance)}</strong>
            <Delta
              value={store.result.aggregates.balance - store.reference.aggregates.balance}
              format={formatBillionsChange}
              better="up"
            />
          </p>
        </div>
        <button type="button" class="btn" bind:this={closeButton} onclick={closeLevers}>
          Fermer
        </button>
      </div>
      <LeverPanel {store} />
    </aside>
    <!-- While the sheet covers it on a phone, the page behind is out of the tab order. -->
    <main inert={isPhone && leversOpen}>
      <div class="intro">
        <HowItWorks />
        <LimitsBox />
      </div>
      <section class="profiles" aria-labelledby="profiles-title">
        <p class="eyebrow">Qui paie, qui reçoit</p>
        <h2 id="profiles-title">Effet sur les profils types</h2>
        <ProfileCards {store} />
      </section>
      <section class="map" aria-labelledby="map-title">
        <p class="eyebrow">Où va l’argent public</p>
        <h2 id="map-title">Répartition des dépenses et des recettes publiques</h2>
        <Treemap {store} />
      </section>
    </main>
  </div>
  <button
    type="button"
    class="open-levers btn btn-primary"
    bind:this={openButton}
    aria-controls="leviers"
    aria-expanded={leversOpen}
    onclick={openLevers}
  >
    Modifier les leviers{store.modifiedCount > 0 ? ` (${store.modifiedCount})` : ''}
  </button>
  <LeverInfo {store} />
{:else if page === 'home'}
  <main class="home-main">
    <Home {store} go={goTo} />
  </main>
{:else}
  <main class="page-main">
    {#if page === 'methodology'}
      <Methodology {store} />
    {:else if page === 'sources'}
      <Sources {store} />
    {:else if page === 'changes'}
      <Changes />
    {:else}
      <About />
    {/if}
  </main>
{/if}

<footer class="site-footer" class:floating={page === 'simulator'}>
  <span>Mon budget pour la France, version {APP_VERSION}</span>
  <a
    href={pageHash('changes')}
    aria-current={page === 'changes' ? 'page' : undefined}
    onclick={(e) => goTo(e, 'changes')}>Nouveautés</a
  >
</footer>

<style>
  .site-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: var(--color-header-bg);
    color: var(--color-header-text);
    border-bottom: var(--header-rule);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: inherit;
    text-decoration: none;
  }

  .logo rect {
    fill: var(--color-header-accent);
  }

  .logo path {
    fill: var(--color-header-bg);
  }

  .brand-text {
    display: grid;
    line-height: 1.15;
  }

  .brand-name {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: var(--heading-weight);
    letter-spacing: var(--heading-tracking);
  }

  .brand-tagline {
    font-size: 0.75rem;
    letter-spacing: var(--eyebrow-tracking);
    text-transform: var(--eyebrow-transform);
    opacity: 0.8;
  }

  nav ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  nav a {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-size);
    padding: 0 var(--space-2);
    border-radius: var(--radius-pill);
    color: var(--color-header-text);
    text-decoration: none;
    font-weight: 500;
  }

  nav a:hover {
    text-decoration: underline;
    text-underline-offset: 0.3em;
  }

  nav a[aria-current='page'] {
    font-weight: 700;
    color: var(--color-header-accent);
    box-shadow: inset 0 -3px 0 var(--color-header-accent);
    border-radius: 0;
  }

  .notice {
    margin: var(--space-2) var(--space-4);
    padding: var(--space-2) var(--space-3);
    background: var(--color-warning-bg);
    border-left: 4px solid var(--color-warning-border);
    border-radius: var(--radius);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(20rem, 27rem) 1fr;
    align-items: start;
  }

  .levers {
    position: sticky;
    top: var(--summary-height, 7rem);
    max-height: calc(100vh - var(--summary-height, 7rem));
    overflow-y: auto;
    border-right: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
  }

  .sheet-header,
  .open-levers {
    display: none;
  }

  main {
    padding: var(--space-4);
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
    min-width: 0;
  }

  main h2 {
    margin: var(--space-1) 0 var(--space-3);
    font-size: 1.75rem;
  }

  .profiles,
  .map {
    border-top: var(--section-rule);
    padding-top: var(--space-2);
  }

  .intro {
    display: grid;
    gap: var(--space-3);
  }

  /* Desktop: spending map above the profiles (PLAN.MD §8.1). */
  .map {
    order: 1;
  }

  .profiles {
    order: 2;
  }

  .home-main {
    display: block;
    padding: 0;
  }

  .site-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: var(--space-1) var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--color-border);
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .site-footer a {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-size);
    color: var(--color-accent);
  }

  .site-footer a[aria-current='page'] {
    font-weight: 700;
  }

  .page-main {
    display: block;
    max-width: 60rem;
    margin: 0 auto;
    padding: var(--space-4);
  }

  /* Phones (PLAN.MD §8.2): profiles first, levers in a sheet rising from the bottom. */
  @media (max-width: 52rem) {
    .site-header {
      padding: var(--space-2) var(--space-3);
    }

    .brand-tagline {
      display: none;
    }

    .brand-name {
      font-size: 1.15rem;
    }

    .logo {
      width: 28px;
      height: 28px;
    }

    /* One scrolling row of pages. */
    nav {
      order: 3;
      width: 100%;
      overflow-x: auto;
    }

    nav ul {
      flex-wrap: nowrap;
    }

    nav a {
      white-space: nowrap;
    }

    .layout {
      grid-template-columns: minmax(0, 1fr);
    }

    main {
      padding: var(--space-3);
      gap: var(--space-4);
    }

    main h2 {
      font-size: 1.4rem;
    }

    .profiles {
      order: 1;
    }

    .map {
      order: 2;
    }

    .levers {
      position: fixed;
      inset: auto 0 0 0;
      top: auto;
      height: 85vh;
      max-height: 85vh;
      z-index: 50;
      border-right: none;
      border-top: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      transform: translateY(100%);
      visibility: hidden;
      transition:
        transform 0.2s ease,
        visibility 0.2s;
      box-shadow: var(--shadow-float);
    }

    .levers-open .levers {
      transform: none;
      visibility: visible;
    }

    .sheet-header {
      display: flex;
      position: sticky;
      top: 0;
      z-index: 1;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-2) var(--space-3);
      background: var(--color-surface);
      border-bottom: var(--border-width) solid var(--color-border);
    }

    .sheet-header h2 {
      margin: 0;
      font-size: 1.2rem;
    }

    .sheet-balance {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 var(--space-2);
      margin: 0;
      font-size: 0.85rem;
    }

    .open-levers {
      display: inline-flex;
      position: fixed;
      bottom: var(--space-3);
      left: 50%;
      transform: translateX(-50%);
      z-index: 40;
      padding: 0 var(--space-4);
      border-radius: var(--radius-pill);
      box-shadow: var(--shadow-float);
      white-space: nowrap;
    }

    /* Room for the floating lever button below the footer. */
    .site-footer.floating {
      padding-bottom: 5.5rem;
    }
  }
</style>
