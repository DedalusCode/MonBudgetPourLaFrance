<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // "Your household": the user describes adults, children and housing; the engine computes
  // the tax parts, taxes, family benefits and the effect of the scenario. Kept in this
  // browser only, never sent nor added to the shared link.
  import type {
    AdultStatus,
    CustomAdult,
    CustomHousehold,
    PublicBranch,
  } from '../../engine/customHousehold.ts';
  import type { HousingZone } from '../../engine/household/housing.ts';
  import type { MicroActivity } from '../../engine/household/input.ts';
  import { simulateHousehold } from '../../engine/simulate.ts';
  import { sum } from '../../engine/math.ts';
  import { formatEuros } from '../format.ts';
  import { AID_LABELS } from '../labels.ts';
  import { healthCoverText } from '../profileView.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import { browser, readStored, writeStored } from '../state/storage.ts';
  import ProfileCard from './ProfileCard.svelte';

  let { store, mode }: { store: ScenarioStore; mode: 'eur' | 'percent' } = $props();

  interface AdultForm {
    status: AdultStatus;
    netMonthly: number | null;
    age: number | null;
    publicBranch: PublicBranch;
    /** Percentage; empty = average of the branch. */
    bonusPercent: number | null;
    liberalScheme: 'liberal' | 'cipav';
    microActivity: MicroActivity;
    microTurnover: number | null;
    microFlatTax: boolean;
    unemploymentMonthly: number | null;
    disabled: boolean;
    /** Percentage. */
    disabilityPercent: number | null;
    invalidityMonthly: number | null;
    /** Restriction of access to employment (AAH from 50 to 79 %). */
    employmentRestriction: boolean;
    /** End of unemployment insurance rights (ASS). */
    assEligible: boolean;
    /** Student grant: parents' revenu brut global (empty = not computed). */
    parentsIncome: number | null;
    distanceKm: 0 | 30 | 250;
    siblings: number | null;
    siblingStudents: number | null;
  }
  interface HouseholdForm {
    couple: boolean;
    married: boolean;
    adults: [AdultForm, AdultForm];
    children: number | null;
    /** Age of each child, in the order entered. */
    childAges: (number | null)[];
    tenure: 'tenant' | 'owner' | 'free';
    rent: number | null;
    zone: HousingZone;
    propertyTax: number | null;
    otherParentAbsent: boolean;
    maintenancePerChild: number | null;
  }

  const KEY = 'household';
  const ADULT_DEFAULTS: Omit<AdultForm, 'status' | 'netMonthly' | 'age'> = {
    publicBranch: 'state',
    bonusPercent: null,
    liberalScheme: 'liberal',
    microActivity: 'services',
    microTurnover: 30_000,
    microFlatTax: false,
    unemploymentMonthly: 1_200,
    disabled: false,
    disabilityPercent: 80,
    invalidityMonthly: null,
    employmentRestriction: false,
    assEligible: false,
    parentsIncome: null,
    distanceKm: 0,
    siblings: 0,
    siblingStudents: 0,
  };
  const DEFAULT: HouseholdForm = {
    couple: false,
    married: false,
    adults: [
      { status: 'salaried', netMonthly: 2_000, age: 40, ...ADULT_DEFAULTS },
      { status: 'salaried', netMonthly: 1_800, age: 40, ...ADULT_DEFAULTS },
    ],
    children: 0,
    childAges: [],
    tenure: 'tenant',
    rent: null,
    zone: 2,
    propertyTax: null,
    otherParentAbsent: false,
    maintenancePerChild: null,
  };
  /** Age given to a child whose age is not entered. */
  const CHILD_AGE = 10;
  const MAX_CHILDREN = 12;
  const ZONES: [HousingZone, string][] = [
    [1, 'Zone 1 : agglomération parisienne'],
    [2, 'Zone 2 : grandes villes'],
    [3, 'Zone 3 : reste du territoire'],
  ];
  const DISTANCES: [AdultForm['distanceKm'], string][] = [
    [0, 'Moins de 30 km'],
    [30, 'De 30 à 249 km'],
    [250, '250 km ou plus'],
  ];

  const STATUSES: [AdultStatus, string][] = [
    ['salaried', 'Salarié du privé'],
    ['apprentice', 'Apprenti'],
    ['publicAgent', 'Fonctionnaire'],
    ['selfEmployed', 'Artisan ou commerçant'],
    ['farmer', 'Agriculteur exploitant'],
    ['liberal', 'Profession libérale'],
    ['micro', 'Micro-entrepreneur'],
    ['student', 'Étudiant'],
    ['unemployed', 'Au chômage'],
    ['retired', 'Retraité'],
    ['none', 'Sans activité'],
  ];
  const BRANCHES: [PublicBranch, string][] = [
    ['state', 'Fonction publique d’État'],
    ['territorial', 'Fonction publique territoriale'],
    ['hospital', 'Fonction publique hospitalière'],
  ];
  const MICRO_ACTIVITIES: [MicroActivity, string][] = [
    ['sales', 'Vente de marchandises, hébergement'],
    ['services', 'Prestations de services commerciales ou artisanales'],
    ['liberal', 'Profession libérale (Sécurité sociale des indépendants)'],
    ['cipav', 'Profession libérale (Cipav)'],
  ];
  const AMOUNT_LABELS: Partial<Record<AdultStatus, string>> = {
    salaried: 'Salaire net mensuel',
    apprentice: 'Salaire net mensuel',
    publicAgent: 'Traitement et primes, net mensuel',
    student: 'Salaire net mensuel d’un emploi (0 sans emploi)',
    selfEmployed: 'Revenu mensuel de l’activité (après cotisations, avant impôt)',
    farmer: 'Revenu mensuel de l’exploitation (après cotisations, avant impôt)',
    liberal: 'Revenu mensuel de l’activité (après cotisations, avant impôt)',
    retired: 'Pension nette mensuelle',
  };
  const numberOrNull = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const pick = <T extends string>(options: [T, string][], value: unknown): T | undefined =>
    options.find(([id]) => id === value)?.[0];

  /** A stored household, field by field: anything unexpected falls back to the default. */
  function fromStorage(raw: unknown): HouseholdForm {
    const form = structuredClone(DEFAULT);
    if (typeof raw !== 'object' || raw === null) return form;
    const stored = raw as Record<string, unknown>;
    form.couple = stored['couple'] === true;
    form.married = stored['married'] === true;
    const tenure = stored['tenure'];
    form.tenure = tenure === 'owner' || tenure === 'free' ? tenure : 'tenant';
    form.rent = numberOrNull(stored['rent']);
    form.zone = ZONES.find(([z]) => z === stored['zone'])?.[0] ?? form.zone;
    form.children = numberOrNull(stored['children']);
    const count = Math.min(MAX_CHILDREN, Math.max(0, Math.floor(form.children ?? 0)));
    if (Array.isArray(stored['childAges'])) {
      form.childAges = (stored['childAges'] as unknown[]).slice(0, count).map(numberOrNull);
    } else {
      // Before v1.1: only the number of children aged 14 or more was kept.
      const from14 = Math.min(count, Math.max(0, numberOrNull(stored['childrenFrom14']) ?? 0));
      form.childAges = Array.from({ length: count }, (_, i) => (i < from14 ? 14 : null));
    }
    form.propertyTax = numberOrNull(stored['propertyTax']);
    form.otherParentAbsent = stored['otherParentAbsent'] === true;
    form.maintenancePerChild = numberOrNull(stored['maintenancePerChild']);
    const adults = Array.isArray(stored['adults']) ? (stored['adults'] as unknown[]) : [];
    form.adults.forEach((adult, i) => {
      const value = adults[i];
      if (typeof value !== 'object' || value === null) return;
      const a = value as Record<string, unknown>;
      adult.status = pick(STATUSES, a['status']) ?? adult.status;
      adult.netMonthly = numberOrNull(a['netMonthly']) ?? adult.netMonthly;
      adult.age = numberOrNull(a['age']) ?? adult.age;
      adult.publicBranch = pick(BRANCHES, a['publicBranch']) ?? adult.publicBranch;
      adult.bonusPercent = numberOrNull(a['bonusPercent']);
      adult.liberalScheme = a['liberalScheme'] === 'cipav' ? 'cipav' : 'liberal';
      adult.microActivity = pick(MICRO_ACTIVITIES, a['microActivity']) ?? adult.microActivity;
      adult.microTurnover = numberOrNull(a['microTurnover']) ?? adult.microTurnover;
      adult.microFlatTax = a['microFlatTax'] === true;
      adult.unemploymentMonthly =
        numberOrNull(a['unemploymentMonthly']) ?? adult.unemploymentMonthly;
      adult.disabled = a['disabled'] === true;
      adult.disabilityPercent = numberOrNull(a['disabilityPercent']) ?? adult.disabilityPercent;
      adult.invalidityMonthly = numberOrNull(a['invalidityMonthly']);
      adult.employmentRestriction = a['employmentRestriction'] === true;
      adult.assEligible = a['assEligible'] === true;
      adult.parentsIncome = numberOrNull(a['parentsIncome']);
      adult.distanceKm = DISTANCES.find(([d]) => d === a['distanceKm'])?.[0] ?? 0;
      adult.siblings = numberOrNull(a['siblings']) ?? 0;
      adult.siblingStudents = numberOrNull(a['siblingStudents']) ?? 0;
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
  // One age field per child.
  $effect(() => {
    const count = Math.min(MAX_CHILDREN, Math.floor(nonNegative(form.children)));
    if (form.childAges.length !== count) {
      form.childAges = Array.from({ length: count }, (_, i) => form.childAges[i] ?? null);
    }
  });

  const nonNegative = (x: number | null, max = Infinity) =>
    x === null || !Number.isFinite(x) ? 0 : Math.min(max, Math.max(0, x));

  const household = $derived.by((): CustomHousehold => {
    const adults = (form.couple ? form.adults : [form.adults[0]]).map((a): CustomAdult => ({
      status: a.status,
      netMonthly: a.status in AMOUNT_LABELS ? nonNegative(a.netMonthly) : 0,
      age: Math.max(18, nonNegative(a.age, 120) || 40),
      publicBranch: a.publicBranch,
      bonusShare: a.bonusPercent === null ? null : nonNegative(a.bonusPercent, 100) / 100,
      liberalScheme: a.liberalScheme,
      microActivity: a.microActivity,
      microTurnover: nonNegative(a.microTurnover),
      microFlatTax: a.microFlatTax,
      unemploymentMonthly: nonNegative(a.unemploymentMonthly),
      disabilityRate: a.disabled ? nonNegative(a.disabilityPercent, 100) / 100 : 0,
      invalidityMonthly:
        a.disabled && a.status !== 'retired' ? nonNegative(a.invalidityMonthly) : 0,
      employmentRestriction: a.disabled && a.employmentRestriction,
      assEligible: a.status === 'unemployed' && a.assEligible,
      studentGrant:
        a.status === 'student' && a.parentsIncome !== null
          ? {
              parentsIncome: nonNegative(a.parentsIncome),
              distanceKm: a.distanceKm,
              siblings: Math.floor(nonNegative(a.siblings, MAX_CHILDREN)),
              siblingStudents: Math.floor(nonNegative(a.siblingStudents, MAX_CHILDREN)),
              disabled: a.disabled,
            }
          : null,
    }));
    const children = Math.min(MAX_CHILDREN, Math.floor(nonNegative(form.children)));
    return {
      adults,
      married: form.couple && form.married,
      childAges: Array.from({ length: children }, (_, i) =>
        Math.floor(nonNegative(form.childAges[i] ?? CHILD_AGE, 19)),
      ),
      tenure: form.tenure,
      rent: form.tenure === 'tenant' ? nonNegative(form.rent) : 0,
      zone: form.zone,
      propertyTax: nonNegative(form.propertyTax),
      otherParentAbsent: !form.couple && form.otherParentAbsent,
      maintenancePerChild: nonNegative(form.maintenancePerChild),
    };
  });
  const impact = $derived(simulateHousehold(store.model, store.scenario, household));
  const now = $derived(impact.reference);

  const aidLines = $derived(
    Object.entries(now.aids).filter(([, amount]) => amount >= 0.5) as [
      keyof typeof AID_LABELS,
      number,
    ][],
  );
  const coverText = $derived(healthCoverText(now.healthCover));
  const partsText = (parts: number) =>
    `${parts.toLocaleString('fr-FR')} part${parts > 1 ? 's' : ''}`;
  const bonusDefault = (branch: PublicBranch) =>
    (store.model.context.rules.publicSector.bonusShare[branch] * 100).toLocaleString('fr-FR', {
      maximumFractionDigits: 1,
    });
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
          {#if adult.status === 'publicAgent'}
            <div class="row">
              <label>
                Versant
                <select bind:value={adult.publicBranch}>
                  {#each BRANCHES as [value, label] (value)}
                    <option {value}>{label}</option>
                  {/each}
                </select>
              </label>
              <label>
                Part des primes dans le brut
                <span class="money">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputmode="decimal"
                    placeholder={bonusDefault(adult.publicBranch)}
                    bind:value={adult.bonusPercent}
                  />
                  <span aria-hidden="true">%</span>
                </span>
              </label>
            </div>
            <p class="hint">
              Sans saisie, la part moyenne du versant ({bonusDefault(adult.publicBranch)} %).
            </p>
          {/if}
          {#if adult.status === 'liberal'}
            <label>
              Caisse de retraite
              <select bind:value={adult.liberalScheme}>
                <option value="liberal">Sécurité sociale des indépendants</option>
                <option value="cipav">Cipav</option>
              </select>
            </label>
          {/if}
          {#if adult.status in AMOUNT_LABELS}
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
          {#if adult.status === 'micro'}
            <label>
              Activité
              <select bind:value={adult.microActivity}>
                {#each MICRO_ACTIVITIES as [value, label] (value)}
                  <option {value}>{label}</option>
                {/each}
              </select>
            </label>
            <label>
              Chiffre d’affaires annuel
              <span class="money">
                <input
                  type="number"
                  min="0"
                  step="500"
                  inputmode="numeric"
                  bind:value={adult.microTurnover}
                />
                <span aria-hidden="true">€</span>
              </span>
            </label>
            <label class="check">
              <input type="checkbox" bind:checked={adult.microFlatTax} />
              Versement libératoire de l’impôt sur le revenu
            </label>
          {/if}
          {#if adult.status === 'unemployed'}
            <label class="check">
              <input type="checkbox" bind:checked={adult.assEligible} />
              Fin des droits à l’allocation chômage, après 5 ans d’activité sur les 10 dernières années
              (allocation de solidarité spécifique)
            </label>
          {/if}
          {#if adult.status === 'unemployed' && !adult.assEligible}
            <label>
              Allocation chômage brute mensuelle (0 si non indemnisé)
              <span class="money">
                <input
                  type="number"
                  min="0"
                  step="50"
                  inputmode="numeric"
                  bind:value={adult.unemploymentMonthly}
                />
                <span aria-hidden="true">€</span>
              </span>
            </label>
          {/if}
          {#if adult.status === 'student'}
            <label>
              Revenu brut global des parents (bourse sur critères sociaux)
              <span class="money">
                <input
                  type="number"
                  min="0"
                  step="500"
                  inputmode="numeric"
                  placeholder="Non renseigné"
                  bind:value={adult.parentsIncome}
                />
                <span aria-hidden="true">€</span>
              </span>
            </label>
            {#if adult.parentsIncome !== null}
              <div class="row">
                <label>
                  Distance entre le domicile des parents et le lieu d’études
                  <select bind:value={adult.distanceKm}>
                    {#each DISTANCES as [value, label] (value)}
                      <option {value}>{label}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  Autres enfants à charge des parents
                  <input
                    type="number"
                    min="0"
                    max="12"
                    inputmode="numeric"
                    bind:value={adult.siblings}
                  />
                </label>
                <label>
                  Dont étudiants du supérieur
                  <input
                    type="number"
                    min="0"
                    max="12"
                    inputmode="numeric"
                    bind:value={adult.siblingStudents}
                  />
                </label>
              </div>
            {:else}
              <p class="hint">Sans revenu des parents, la bourse n’est pas calculée.</p>
            {/if}
          {/if}
          <label class="check">
            <input type="checkbox" bind:checked={adult.disabled} />
            Situation de handicap ou d’invalidité
          </label>
          {#if adult.disabled}
            <div class="row">
              <label>
                Taux d’incapacité
                <span class="money">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    inputmode="numeric"
                    bind:value={adult.disabilityPercent}
                  />
                  <span aria-hidden="true">%</span>
                </span>
              </label>
              {#if adult.status !== 'retired'}
                <label>
                  Pension d’invalidité nette mensuelle
                  <span class="money">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      inputmode="numeric"
                      placeholder="0"
                      bind:value={adult.invalidityMonthly}
                    />
                    <span aria-hidden="true">€</span>
                  </span>
                </label>
              {/if}
            </div>
            {#if (adult.disabilityPercent ?? 0) >= 50 && (adult.disabilityPercent ?? 0) < 80}
              <label class="check">
                <input type="checkbox" bind:checked={adult.employmentRestriction} />
                Restriction substantielle et durable d’accès à l’emploi reconnue (AAH)
              </label>
            {/if}
            <p class="hint">
              À partir de 80 %, le calcul suppose une carte d’invalidité : demi-part et abattement
              sur le revenu imposable.
            </p>
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
        </div>
        {#if form.childAges.length > 0}
          <div class="row">
            {#each form.childAges as childAge, i (i)}
              <label>
                Âge de l’enfant {i + 1}
                <input
                  type="number"
                  min="0"
                  max="19"
                  inputmode="numeric"
                  placeholder={childAge === null ? String(CHILD_AGE) : undefined}
                  bind:value={form.childAges[i]}
                />
              </label>
            {/each}
          </div>
          {#if !form.couple}
            <label class="check">
              <input type="checkbox" bind:checked={form.otherParentAbsent} />
              L’autre parent ne verse pas de pension alimentaire, ou une pension faible
            </label>
            {#if form.otherParentAbsent}
              <label>
                Pension alimentaire reçue par enfant et par mois
                <span class="money">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    inputmode="numeric"
                    placeholder="0"
                    bind:value={form.maintenancePerChild}
                  />
                  <span aria-hidden="true">€</span>
                </span>
              </label>
            {/if}
          {/if}
        {/if}
      </fieldset>

      <fieldset>
        <legend>Logement</legend>
        <div class="choices">
          <label><input type="radio" bind:group={form.tenure} value="tenant" /> Locataire</label>
          <label><input type="radio" bind:group={form.tenure} value="owner" /> Propriétaire</label>
          <label>
            <input type="radio" bind:group={form.tenure} value="free" /> Logé gratuitement
          </label>
        </div>
        {#if form.tenure === 'tenant'}
          <div class="row">
            <label>
              Loyer mensuel hors charges
              <span class="money">
                <input
                  type="number"
                  min="0"
                  step="10"
                  inputmode="numeric"
                  placeholder="Ex. : 600"
                  bind:value={form.rent}
                />
                <span aria-hidden="true">€</span>
              </span>
            </label>
            <label>
              Zone des aides au logement
              <select bind:value={form.zone}>
                {#each ZONES as [value, label] (value)}
                  <option {value}>{label}</option>
                {/each}
              </select>
            </label>
          </div>
          <p class="hint">Sans loyer saisi, l’aide au logement n’est pas calculée.</p>
        {/if}
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
        {#if now.familyAllowances >= 0.5}
          <div>
            <dt class="eyebrow">Allocations familiales</dt>
            <dd>{formatEuros(now.familyAllowances)} par an</dd>
          </div>
        {/if}
        {#if now.housingAid >= 0.5}
          <div>
            <dt class="eyebrow">Aide au logement</dt>
            <dd>{formatEuros(now.housingAid)} par an</dd>
          </div>
        {/if}
        {#if now.activityBonus >= 0.5}
          <div>
            <dt class="eyebrow">Prime d’activité</dt>
            <dd>{formatEuros(now.activityBonus)} par an</dd>
          </div>
        {/if}
        {#each aidLines as [id, amount] (id)}
          <div>
            <dt class="eyebrow">{AID_LABELS[id]}</dt>
            <dd>{formatEuros(amount)} par an</dd>
          </div>
        {/each}
        {#if coverText}
          <div>
            <dt class="eyebrow">Complémentaire santé solidaire</dt>
            <dd class="text">{coverText}</dd>
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
        Les aides sont calculées comme si le foyer les demandait toutes, sur les revenus de l’année
        (au lieu des revenus de référence de chaque aide : trimestre, douze mois ou deux ans plus
        tôt). Le patrimoine n’est pas saisi : l’ASPA, l’ASS et le RSA peuvent être surestimés.
      </li>
      <li>
        Aide au logement : location vide en métropole, hors chambre, colocation, foyer et réduction
        de loyer de solidarité. Le RSA majoré d’un parent isolé est retenu tant qu’un enfant a moins
        de 3 ans. Ni prestation de compensation du handicap, ni allocation personnalisée
        d’autonomie, ni aide à la garde d’enfant, ni aide locale.
      </li>
      <li>
        La complémentaire santé solidaire est un droit à une couverture : elle est indiquée, sans
        être ajoutée aux prestations reçues (les soins comptent déjà dans les services publics).
      </li>
      <li>
        La CSG des retraités est calculée pour chaque adulte comme pour une personne seule ; la
        consommation suit celle du profil type au niveau de vie le plus proche.
      </li>
      <li>
        Fonctionnaire : titulaire civil, sans indemnité de résidence ni supplément familial.
        Micro-entrepreneur : l’abattement fiscal tient lieu de frais ; l’option pour le versement
        libératoire est appliquée telle que saisie. Chômage : la cotisation de retraite
        complémentaire sur l’allocation est ignorée.
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

  .hint {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-text-muted);
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

  .facts dd.text {
    font-family: inherit;
    font-size: 0.95rem;
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
