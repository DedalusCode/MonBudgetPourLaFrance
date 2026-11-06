<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Three-step introduction for first-time visitors; can be hidden (kept in this browser).
  import { browser, readStored, writeStored } from '../state/storage.ts';

  const KEY = 'intro-hidden';
  let hidden = $state(browser && readStored(KEY) === '1');

  function toggle() {
    hidden = !hidden;
    writeStored(KEY, hidden ? '1' : '0');
  }

  const STEPS = [
    {
      title: 'Choisissez un levier',
      text: 'Un taux d’impôt, une cotisation ou le budget d’une politique publique, dans le panneau des leviers.',
    },
    {
      title: 'Suivez les comptes',
      text: 'Recettes, dépenses, solde et dette se mettent à jour en haut de l’écran, en milliards et en part du PIB.',
    },
    {
      title: 'Voyez qui est concerné',
      text: 'Des ménages types, et le vôtre si vous le décrivez, montrent ce que la mesure change, en euros par an.',
    },
  ];
</script>

<section class="how" aria-labelledby="how-title">
  <div class="head">
    <h2 id="how-title">Comment ça marche</h2>
    <button type="button" class="link-button" aria-expanded={!hidden} onclick={toggle}>
      {hidden ? 'Afficher' : 'Masquer'}
    </button>
  </div>
  {#if !hidden}
    <ol>
      {#each STEPS as step, i (step.title)}
        <li>
          <span class="number" aria-hidden="true">{i + 1}</span>
          <span>
            <strong>{step.title}</strong>
            <span class="text">{step.text}</span>
          </span>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .how {
    padding: var(--space-3) var(--space-4);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-card);
    box-shadow: var(--shadow-card);
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: var(--space-3) var(--space-4);
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
  }

  li {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
  }

  .number {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: var(--radius-pill);
    background: var(--color-highlight);
    color: var(--color-on-highlight);
    font-family: var(--font-display);
    font-variant-numeric: lining-nums;
    font-weight: 700;
    font-size: 1.1rem;
  }

  strong {
    display: block;
  }

  .text {
    display: block;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }
</style>
