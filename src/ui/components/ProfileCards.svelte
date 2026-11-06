<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // The reference profile cards, the €/% switch and the household described by the user.
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import HouseholdBuilder from './HouseholdBuilder.svelte';
  import ProfileCard from './ProfileCard.svelte';

  let { store }: { store: ScenarioStore } = $props();

  let mode = $state<'eur' | 'percent'>('eur');
  const profiles = $derived(store.model.data.profiles.profiles);
  const impactOf = (id: string) => store.result.profiles.find((p) => p.id === id);
</script>

<div class="toolbar">
  <fieldset class="segmented">
    <legend>Afficher l'impact</legend>
    <label><input type="radio" bind:group={mode} value="eur" /> en euros par an</label>
    <label><input type="radio" bind:group={mode} value="percent" /> en % du revenu fiscal</label>
  </fieldset>
  <p class="legend">
    Impact du scénario par rapport à la législation actuelle : prélèvements, prestations et services
    publics reçus.
  </p>
</div>

<div class="cards">
  {#each profiles as profile (profile.id)}
    {@const impact = impactOf(profile.id)}
    {#if impact}
      <ProfileCard
        {impact}
        label={profile.label}
        {mode}
        showDataWarning={profile.showDataWarning}
        dualRates={profile.showDualRates}
      />
    {/if}
  {/each}
</div>

<HouseholdBuilder {store} {mode} />

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: flex-end;
    margin-bottom: var(--space-3);
  }

  .legend {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    max-width: 40rem;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--space-3);
  }

  /* Phones: the cards scroll sideways (PLAN.MD §8.2). */
  @media (max-width: 52rem) {
    .cards {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: minmax(16rem, 85%);
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-bottom: var(--space-2);
    }

    .cards > :global(*) {
      scroll-snap-align: start;
    }
  }
</style>
