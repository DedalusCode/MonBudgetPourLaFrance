<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // "Your household": the user describes adults, children and housing; the engine computes
  // the tax parts, taxes, family benefits and the effect of the scenario. Kept in this
  // browser only, never sent nor added to the shared link.
  import type { AdultStatus, CustomHousehold } from '../../engine/customHousehold.ts';
  import { simulateHousehold } from '../../engine/simulate.ts';
  import { sum } from '../../engine/math.ts';
  import { formatEuros } from '../format.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import { browser, readStored, writeStored } from '../state/storage.ts';
  import ProfileCard from './ProfileCard.svelte';

  let { store, mode }: { store: ScenarioStore; mode: 'eur' | 'percent' } = $props();

  interface AdultForm {
    status: AdultStatus;
    netMonthly: number | null;
    age: number | null;
  }
  interface HouseholdForm {
    couple: boolean;
    married: boolean;
    adults: [AdultForm, AdultForm];
    children: number | null;
    childrenFrom14: number | null;
    tenure: 'tenant' | 'owner';
    propertyTax: number | null;
  }

  const KEY = 'household';
  const DEFAULT: HouseholdForm = {
    couple: false,
    married: false,
    adults: [
      { status: 'salaried', netMonthly: 2_000, age: 40 },
      { status: 'salaried', netMonthly: 1_800, age: 40 },
    ],
    children: 0,
    childrenFrom14: 0,
    tenure: 'tenant',
    propertyTax: null,
  };

  const STATUS_IDS: readonly AdultStatus[] = ['salaried', 'selfEmployed', 'retired', 'none'];
  const numberOrNull = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

  /** A stored household, field by field: anything unexpected falls back to the default. */
  function fromStorage(raw: unknown): HouseholdForm {
    const form = structuredClone(DEFAULT);
    if (typeof raw !== 'object' || raw === null) return form;
    const stored = raw as Record<string, unknown>;
    form.couple = stored['couple'] === true;
    form.married = stored['married'] === true;
    form.tenure = stored['tenure'] === 'owner' ? 'owner' : 'tenant';
    form.children = numberOrNull(stored['children']);
    form.childrenFrom14 = numberOrNull(stored['childrenFrom14']);
    form.propertyTax = numberOrNull(stored['propertyTax']);
    const adults = Array.isArray(stored['adults']) ? (stored['adults'] as unknown[]) : [];
    form.adults.forEach((adult, i) => {
      const value = adults[i];
      if (typeof value !== 'object' || value === null) return;
      const a = value as Record<string, unknown>;
      const status = STATUS_IDS.find((s) => s === a['status']);
      if (status) adult.status = status;
      adult.netMonthly = numberOrNull(a['netMonthly']) ?? adult.netMonthly;
      adult.age = numberOrNull(a['age']) ?? adult.age;
    });
    return form;
  }

  function load(): HouseholdForm {
    if (!browser) return structuredClone(DEFAULT);
    try {
      return fromStorage(JSON.parse(readStored(KEY) ?? 'null'));
    } catch {
      return structuredClone(DEFAULT);
    }
  }

  let form = $state<HouseholdForm>(load());
  $effect(() => writeStored(KEY, JSON.stringify(form)));

  const nonNegative = (x: number | null, max = Infinity) =>
    x === null || !Number.isFinite(x) ? 0 : Math.min(max, Math.max(0, x));

  const household = $derived.by((): CustomHousehold => {
    const adults = (form.couple ? form.adults : [form.adults[0]]).map((a) => ({
      status: a.status,
      netMonthly: a.status === 'none' ? 0 : nonNegative(a.netMonthly),
      age: Math.max(18, nonNegative(a.age, 120) || 40),
    }));
    const children = Math.floor(nonNegative(form.children, 12));
    return {
      adults,
      married: form.couple && form.married,
      children,
      childrenFrom14: Math.min(children, Math.floor(nonNegative(form.childrenFrom14, 12))),
      tenure: form.tenure,
      propertyTax: nonNegative(form.propertyTax),
    };
  });
  const impact = $derived(simulateHousehold(store.model, store.scenario, household));
  const now = $derived(impact.reference);

  const partsText = (parts: number) =>
    `${parts.toLocaleString('fr-FR')} part${parts > 1 ? 's' : ''}`;
  const AMOUNT_LABELS: Record<AdultStatus, string> = {
    salaried: 'Salaire net mensuel',
    selfEmployed: 'Revenu mensuel de l’activité (après cotisations, avant impôt)',
    retired: 'Pension nette mensuelle',
    none: '',
  };
  const STATUSES: [AdultStatus, string][] = [
    ['salaried', 'Salarié'],
    ['selfEmployed', 'Artisan ou commerçant'],
    ['retired', 'Retraité'],
    ['none', 'Sans revenu'],
  ];
</script>

<section class="builder" aria-labelledby="builder-title">
  <div class="intro">
    <h3 id="builder-title">Votre foyer</h3>
    <p>
      Décrivez votre foyer pour estimer vos impôts, vos prestations et l’effet du scénario. Rien
      n’est envoyé : la saisie reste dans ce navigateur et n’entre pas dans le lien de partage.
    </p>
  </div>

  <div class="grid">
    <form class="form" onsubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend>Composition</legend>
        <div class="choices">
          <label><input type="radio" bind:group={form.couple} value={false} /> Seul(e)</label>
          <label><input type="radio" bind:group={form.couple} value={true} /> En couple</label>
        </div>
        {#if form.couple}
          <label class="check">
            <input type="checkbox" bind:checked={form.married} />
            Mariés ou pacsés (imposition commune)
          </label>
        {/if}
      </fieldset>

      {#each form.couple ? [0, 1] : [0] as i (i)}
        {@const adult = form.adults[i as 0 | 1]}
        <fieldset>
          <legend>{form.couple ? `Adulte ${i + 1}` : 'Vous'}</legend>
          <div class="row">
            <label>
              Situation
              <select bind:value={adult.status}>
                {#each STATUSES as [value, label] (value)}
                  <option {value}>{label}</option>
                {/each}
              </select>
            </label>
            <label>
              Âge
              <input type="number" min="18" max="120" inputmode="numeric" bind:value={adult.age} />
            </label>
          </div>
          {#if adult.status !== 'none'}
            <label>
              {AMOUNT_LABELS[adult.status]}
              <span class="money">
                <input
                  type="number"
                  min="0"
                  step="50"
                  inputmode="numeric"
                  bind:value={adult.netMonthly}
                />
                <span aria-hidden="true">€</span>
              </span>
            </label>
          {/if}
        </fieldset>
      {/each}

      <fieldset>
        <legend>Enfants à charge (moins de 20 ans)</legend>
        <div class="row">
          <label>
            Nombre
            <input type="number" min="0" max="12" inputmode="numeric" bind:value={form.children} />
          </label>
          <label>
            Dont 14 ans ou plus
            <input
              type="number"
              min="0"
              max={form.children ?? 0}
              inputmode="numeric"
              bind:value={form.childrenFrom14}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Logement</legend>
        <div class="choices">
          <label><input type="radio" bind:group={form.tenure} value="tenant" /> Locataire</label>
          <label><input type="radio" bind:group={form.tenure} value="owner" /> Propriétaire</label>
        </div>
        {#if form.tenure === 'owner'}
          <label>
            Taxe foncière annuelle (montant de l’avis)
            <span class="money">
              <input
                type="number"
                min="0"
                step="10"
                inputmode="numeric"
                placeholder="Ex. : 1200"
                bind:value={form.propertyTax}
              />
              <span aria-hidden="true">€</span>
            </span>
          </label>
        {/if}
      </fieldset>
    </form>

    <div class="result">
      <dl class="facts" aria-live="polite">
        <div>
          <dt class="eyebrow">
            {now.taxParts.length > 1 ? 'Deux foyers fiscaux' : 'Foyer fiscal'}
          </dt>
          <dd>{now.taxParts.map(partsText).join(' et ')}</dd>
        </div>
        <div>
          <dt class="eyebrow">Impôt sur le revenu aujourd’hui</dt>
          <dd>{formatEuros(sum(now.incomeTaxes))} par an</dd>
        </div>
        {#if now.familyAllowances > 0}
          <div>
            <dt class="eyebrow">Allocations familiales</dt>
            <dd>{formatEuros(now.familyAllowances)} par an</dd>
          </div>
        {/if}
        {#if now.activityBonus > 0}
          <div>
            <dt class="eyebrow">Prime d’activité</dt>
            <dd>{formatEuros(now.activityBonus)} par an</dd>
          </div>
        {/if}
      </dl>
      <ProfileCard
        {impact}
        label="Effet sur votre foyer"
        headingLevel={4}
        {mode}
        showDataWarning={false}
        dualRates={false}
      />
    </div>
  </div>

  <details class="limits">
    <summary>Simplifications de ce calcul</summary>
    <ul>
      <li>
        Les enfants ont moins de 20 ans ; en union libre, ils sont rattachés au premier adulte.
      </li>
      <li>
        Ni aide au logement, ni allocation de rentrée scolaire, ni complément familial, ni
        allocation de soutien familial, ni majoration temporaire de parent isolé ; les allocations
        familiales sont calculées sur les revenus de l’année.
      </li>
      <li>
        La CSG des retraités est calculée pour chaque adulte comme pour une personne seule ; la
        consommation suit celle du profil type au niveau de vie le plus proche.
      </li>
    </ul>
  </details>
</section>

<style>
  .builder {
    margin-top: var(--space-5);
    padding: var(--space-4);
    border: var(--border-width) solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  h3 {
    margin: 0 0 var(--space-1);
    font-size: 1.4rem;
  }

  .intro p {
    margin: 0;
    max-width: 48rem;
    color: var(--color-text-muted);
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-4);
    margin-top: var(--space-4);
    align-items: start;
  }

  .form {
    display: grid;
    gap: var(--space-3);
  }

  fieldset {
    margin: 0;
    padding: var(--space-2) var(--space-3) var(--space-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-card);
    display: grid;
    gap: var(--space-2);
  }

  legend {
    padding: 0 var(--space-1);
    font-weight: 700;
  }

  label {
    display: grid;
    gap: var(--space-1);
    font-size: 0.9rem;
  }

  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .choices label,
  .check {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.95rem;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: var(--space-2);
  }

  select,
  input[type='number'] {
    width: 100%;
  }

  .money {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .money input {
    max-width: 10rem;
  }

  .result {
    display: grid;
    gap: var(--space-3);
    position: sticky;
    top: calc(var(--summary-height, 7rem) + var(--space-3));
  }

  .facts {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-2);
  }

  .facts div {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--color-card);
    border: var(--border-width) solid var(--color-border);
  }

  .facts dd {
    margin: 0;
    font-family: var(--font-numeric);
    font-size: 1.15rem;
    font-weight: 700;
    font-variant-numeric: lining-nums tabular-nums;
  }

  .limits {
    margin-top: var(--space-3);
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .limits summary {
    font-weight: 600;
  }

  @media (max-width: 52rem) {
    .builder {
      padding: var(--space-3);
    }

    .grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .result {
      position: static;
    }
  }
</style>
