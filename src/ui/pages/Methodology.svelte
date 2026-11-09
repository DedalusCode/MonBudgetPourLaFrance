<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Methodology page (PLAN.MD §8.4): every formula and assumption, partly generated from the data.
  import type { Lever } from '../../engine/levers.ts';
  import { resolve } from '../../engine/rules.ts';
  import { formatBillions, formatEuros, formatLeverValue, formatPercent } from '../format.ts';
  import { LIMITS } from '../content.ts';
  import { LEVY_LABELS } from '../labels.ts';
  import type { ScenarioStore } from '../state/scenario.svelte.ts';

  let { store }: { store: ScenarioStore } = $props();

  const data = $derived(store.model.data);
  const macro = $derived(data.macro);
  const itemCount = $derived([...store.model.levers.values()].filter((l) => l.item).length);
  const taxLevers = $derived(
    [...store.model.levers.values()].filter((l) => l.revenueEffect && !l.deprecated),
  );

  /** Effect of raising a lever by one display unit: 1 point, 1 € or 1 centime per unit, or 1 %. */
  function unitStep(lever: Lever): { step: number; label: string } {
    if (lever.unit === 'tariff' && lever.displayScale !== undefined) {
      return { step: 0.01 / lever.displayScale, label: '+1 centime' };
    }
    if (lever.unit === 'tariff') return { step: 1, label: '+1 €' };
    if (lever.unit === 'eur') return { step: lever.reference * 0.01, label: '+1 %' };
    return { step: 0.01, label: '+1 point' };
  }

  const incidence = $derived(Object.entries(data.taxRules.incidence));
  const BEARERS: Record<string, string> = {
    consumer: 'le consommateur',
    employee: 'le salarié',
    shareholder: 'l’actionnaire',
    owner: 'le propriétaire',
    notAttributed: 'non attribué aux ménages',
  };
  /** Labels of the incidence assumptions that differ from the levy labels. */
  const INCIDENCE_LABELS: Record<string, string> = {
    employerContributions: 'Cotisations patronales',
    corporateTax: 'Impôt sur les sociétés',
  };
  const incidenceLabel = (tax: string) => INCIDENCE_LABELS[tax] ?? LEVY_LABELS[tax] ?? tax;
  const longDate = (iso: string | null) =>
    iso === null
      ? ''
      : new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

  const rules = $derived(data.inKindAllocation.rules);
  const groupLabel = $derived(
    new Map(
      data.spending.divisions.flatMap((d) => d.groups.map((g) => [g.code, g.label] as const)),
    ),
  );
  const notAllocated = $derived(rules.filter((r) => r.mode === 'notAllocated'));
  const weighted = $derived(
    rules.filter((r) => r.indexByKey !== undefined || r.index !== undefined),
  );
  const keyLabel = $derived(new Map(data.inKindAllocation.keys.map((k) => [k.id, k.label])));

  const profiles = $derived(
    data.profiles.profiles.map((p) => ({
      profile: p,
      result: store.model.reference.find((r) => r.id === p.id),
    })),
  );
  const gdp = $derived(resolve(macro.gdp));
  const STAFF_COST_LABELS: Record<string, string> = {
    defense: 'défense',
    security: 'sécurité',
    justiceCourts: 'justice judiciaire',
    prisons: 'administration pénitentiaire',
    publicFinance: 'finances publiques',
    schoolEducation: 'enseignement scolaire',
    hospital: 'hôpital public',
    stateAverage: 'moyenne de l’État',
    localAverage: 'moyenne des collectivités',
    fireServices: 'incendie et secours',
  };
  const staffCosts = $derived(
    Object.entries(data.spending.staffCosts)
      .map(([key, cost]) => `${STAFF_COST_LABELS[key] ?? key} ${formatEuros(resolve(cost))}`)
      .join(', '),
  );
  const forecast = $derived(macro.forecast);
  /** The simulator's own mechanical projection for the forecast year (reference scenario). */
  const projected = $derived(
    store.reference.aggregates.debtPath.find((p) => p.year === forecast.year),
  );
  const gdpShare = (x: number) => `${formatPercent(x)} du PIB`;
  const family = $derived(data.taxRules.incomeTax.family);
  const allowances = $derived(data.taxRules.familyAllowances);
</script>

<article class="page">
  <h1 tabindex="-1">Méthodologie</h1>
  <p>
    Le simulateur montre l'<strong>effet mécanique immédiat</strong> d'une modification des prélèvements
    ou des dépenses publiques, sans tenir compte des réactions qu'elle pourrait provoquer. Toutes les
    valeurs utilisées sont listées, avec leur source et leur statut, dans la page Sources.
  </p>

  <h2>Données de référence</h2>
  <p>
    Les agrégats (recettes, impôts, dette, PIB, intérêts) sont ceux des comptes nationaux de
    {data.meta.accountsYear} (INSEE, Eurostat). La répartition des dépenses par fonction (classification
    COFOG) n'est publiée qu'avec un an de décalage : les montants {data.spending.structureYear} par fonction
    sont multipliés par {resolve(data.spending.scaling).toLocaleString('fr-FR', {
      maximumFractionDigits: 4,
    })}, l'évolution du total des dépenses entre {data.spending.structureYear} et {data.meta
      .accountsYear}, ce qui suppose une structure inchangée. Les règles fiscales et sociales sont
    celles en vigueur en {data.meta.baseYear}. PIB : {formatBillions(gdp, 0)} ; recettes :
    {formatBillions(resolve(macro.totalRevenue))} ; dépenses : {formatBillions(
      resolve(macro.totalSpending),
    )}.
  </p>

  <h2>Postes des groupes de dépense (niveau Expert)</h2>
  <p>
    Eurostat publie les dépenses par fonction et par groupe, pas en dessous. Au niveau Expert,
    {itemCount} postes détaillent {data.spending.divisions.reduce(
      (n, d) => n + d.groups.filter((g) => g.items).length,
      0,
    )} groupes : des postes concrets quand une source fiable existe (prestations : comptes de la protection
    sociale de la DREES ; soins : comptes de la santé ; crédits de l'État : projet de loi de finances
    {data.spending.structureYear}), sinon la nature de la dépense, lue dans la même source Eurostat
    que le groupe (personnel, achats, investissement, et, quand c'est utile, subventions,
    transferts, prestations et aides). Une ligne « Autres » complète chaque groupe : la somme des
    postes égale toujours le groupe. Il n'y a pas de postes sous 0,5 Md€, ni pour la charge
    d'intérêts, qui résulte de la trajectoire de la dette.
  </p>
  <ul>
    <li>
      Les postes sont des montants {data.spending.structureYear}, multipliés par le même coefficient
      que leur groupe : chacun est supposé évoluer comme le total des dépenses.
    </li>
    <li>
      Aucune table officielle ne relie les comptes de la protection sociale aux groupes COFOG : le
      rattachement d'une prestation à un groupe est une déduction, vérifiée par les totaux (par
      exemple, les prestations de santé des comptes de la protection sociale et celles des groupes
      07.1 et 07.2 diffèrent de 0,2 Md€). Les crédits du projet de loi de finances ne sont pas
      l'exécution. Ces postes sont signalés comme hypothèses ou à vérifier dans la page Sources.
    </li>
    <li>
      Modifier une fonction ou un groupe change ses postes dans la même proportion, sauf ceux réglés
      un par un ; le groupe vaut alors la somme de ses postes.
    </li>
    <li>
      Une prestation suit son poste : le RSA, la prime d'activité, le chèque énergie, les
      allocations familiales, le complément familial, l'allocation de soutien familial, la PAJE de
      base, l'allocation de rentrée scolaire, l'ARE, l'ASS, la pension d'invalidité, l'AAH, le
      minimum vieillesse, les aides au logement (APL, ALS et ALF ensemble), les bourses du supérieur
      et les retraites des anciens salariés du privé (régime général et Agirc-Arrco ensemble). Un
      poste à 0 supprime la prestation des foyers concernés. Chaque prestation est traitée
      séparément : baisser l'une ne recalcule pas les autres, alors qu'en réalité supprimer l'ARE
      augmenterait le RSA de certains foyers. Ce choix garde cohérents la dépense et l'effet sur les
      foyers.
    </li>
    <li>
      Le bouton « ? » d'un poste concret décrit ce poste. Celui d'un poste par nature reprend la
      définition de la nature dans le système européen des comptes (SEC 2010 : rémunération des
      salariés, consommation intermédiaire, formation brute de capital fixe, subventions,
      transferts, prestations sociales), appliquée au groupe, et renvoie à la fenêtre du groupe.
      Chaque fenêtre, pour tous les leviers, dit ce que change une variation à la hausse et à la
      baisse.
    </li>
  </ul>

  <h2>Bilan et équivalent en postes</h2>
  <p>
    La fenêtre « Bilan » liste chaque mesure avec l'effet qu'elle produit elle-même : un montant est
    attribué au levier qui le fixe (le poste réglé à part, sinon son groupe, sinon sa fonction). La
    somme des lignes égale donc les écarts de la synthèse.
  </p>
  <p>
    Quand une dépense comprend du personnel, le texte sous le curseur donne un ordre de grandeur en
    postes à temps plein : variation de la rémunération des salariés divisée par un coût moyen d'un
    poste. Calcul mécanique, sans calendrier ni effet sur les services rendus ou sur les
    prélèvements payés par les agents.
  </p>
  <ul>
    <li>
      Part du personnel : rémunération des salariés (D1) des administrations publiques dans la
      dépense du groupe, Eurostat {data.spending.structureYear}, à structure constante. Un groupe ou
      une fonction n'affiche des postes que si cette part atteint {formatPercent(
        resolve(data.spending.staffShareThreshold),
        0,
      )} ; une fonction additionne ses groupes. Le poste « Personnel » d'un groupe (niveau Expert) compte
      entièrement, quelle que soit cette part.
    </li>
    <li>
      Coût moyen d'un poste (rémunération et cotisations employeur, {data.spending.structureYear}) : {staffCosts}.
      Chaque administration (État, collectivités, sécurité sociale) est comptée à son coût, puis
      ramenée à {data.meta.accountsYear} par le même coefficient que les dépenses.
    </li>
    <li>
      Les services d'incendie et de secours (03.2) comptent les sapeurs-pompiers professionnels, les
      personnels administratifs et techniques et les sapeurs-pompiers militaires de Paris et de
      Marseille (hypothèse : leur solde passe par les budgets locaux). Pas de postes pour les
      prestations (familiales, chômage), dont la dépense de personnel est faible. Un poste de
      prestation donne à la place la variation de ce que reçoit chaque ménage concerné.
    </li>
  </ul>

  <h2>Recettes, dépenses, solde et dette</h2>
  <ul>
    <li>Recettes = recettes de référence + somme des effets des leviers de prélèvement.</li>
    <li>Dépenses = dépenses de référence + somme des variations des postes de dépense.</li>
    <li>Solde = recettes − dépenses.</li>
    <li>
      Projection sur {resolve(macro.projectionHorizon)} ans : le PIB croît de
      {formatPercent(resolve(macro.nominalGrowth))} par an (croissance nominale) ; le solde hors intérêts
      garde sa part du PIB ; les intérêts valent la dette de l'année précédente ×
      {formatPercent(resolve(macro.apparentInterestRate), 2)} (taux apparent prévu par le gouvernement
      pour
      {forecast.year}) ; dette(t) = dette(t − 1) − solde(t).
    </li>
  </ul>

  <h2>Et en {forecast.year} ? Les prévisions officielles</h2>
  <p>
    Le simulateur part des comptes constatés de {data.meta.accountsYear}. Pour {forecast.year},
    voici le scénario du gouvernement (projet de loi de finances pour {forecast.year + 1}), à titre
    d'information. Seuls le taux d'intérêt apparent et la croissance du PIB en valeur sont repris
    dans la projection de la dette.
  </p>
  <table>
    <caption>Prévisions pour {forecast.year}</caption>
    <thead>
      <tr
        ><th scope="col">Indicateur</th><th scope="col">Prévision du gouvernement</th><th
          scope="col">Projection mécanique du simulateur</th
        ></tr
      >
    </thead>
    <tbody>
      <tr>
        <th scope="row">Solde public</th>
        <td
          >{formatBillions(resolve(forecast.balance))} ({gdpShare(
            resolve(forecast.balanceToGdp),
          )})</td
        >
        <td>
          {#if projected}{formatBillions(projected.balance)} ({gdpShare(
              projected.balance / projected.gdp,
            )}){/if}
        </td>
      </tr>
      <tr>
        <th scope="row">Dette publique en fin d'année</th>
        <td>{gdpShare(resolve(forecast.debtToGdp))}</td>
        <td
          >{#if projected}{gdpShare(projected.debtToGdp)}{/if}</td
        >
      </tr>
      <tr>
        <th scope="row">Charge d'intérêts</th>
        <td>{formatBillions(resolve(forecast.interestCharge))}</td>
        <td
          >{#if projected}{formatBillions(projected.interest)}{/if}</td
        >
      </tr>
      <tr>
        <th scope="row">PIB</th>
        <td>{formatBillions(resolve(forecast.gdp), 0)}</td>
        <td
          >{#if projected}{formatBillions(projected.gdp, 0)}{/if}</td
        >
      </tr>
      <tr>
        <th scope="row">Dépense publique, hors crédits d'impôt</th>
        <td
          >{formatBillions(resolve(forecast.spending), 0)} ({gdpShare(
            resolve(forecast.spendingToGdp),
          )})</td
        >
        <td>—</td>
      </tr>
      <tr>
        <th scope="row">Recettes publiques</th>
        <td>{formatBillions(resolve(forecast.revenue))}</td>
        <td>—</td>
      </tr>
      <tr>
        <th scope="row">Taux de prélèvements obligatoires</th>
        <td>{gdpShare(resolve(forecast.taxToGdp))}</td>
        <td>—</td>
      </tr>
      <tr>
        <th scope="row">Croissance du PIB en volume</th>
        <td>{formatPercent(resolve(forecast.realGrowth))}</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>
  <p>
    La projection mécanique garde le solde hors intérêts de {data.meta.accountsYear} en part du PIB ;
    elle ne tient pas compte des mesures nouvelles prévues pour {forecast.year}. Prévisions de
    croissance en volume pour {forecast.year} d'autres organismes, reprises par le Haut Conseil des finances
    publiques :
    {#each forecast.otherGrowthForecasts as other, i (other.organisation)}{i > 0
        ? ' ; '
        : ''}{other.organisation}
      {formatPercent(resolve(other.value))}{/each}.
  </p>

  <h2>Effet d'un levier de prélèvement</h2>
  <p>
    Effet statique : variation du taux × assiette de référence, sans modification des comportements.
    Pour les accises, variation relative du tarif × recette du produit.
  </p>
  <table>
    <caption>Effet sur les recettes d'une hausse d'une unité</caption>
    <thead>
      <tr
        ><th scope="col">Levier</th><th scope="col">Valeur actuelle</th><th scope="col">Hausse</th
        ><th scope="col">Recettes</th></tr
      >
    </thead>
    <tbody>
      {#each taxLevers as lever (lever.id)}
        {@const { step, label } = unitStep(lever)}
        <tr>
          <th scope="row">{lever.label}</th>
          <td>{formatLeverValue(lever, lever.reference)}</td>
          <td>{label}</td>
          <td>{formatBillions(lever.revenueEffect?.(lever.reference + step) ?? 0, 2)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p>
    Les leviers de dépense s'expriment en montant annuel : un milliard de plus sur un poste ajoute
    un milliard aux dépenses. Le montant d'une fonction change dans la même proportion ses groupes
    non personnalisés.
  </p>

  <h2>Profils types</h2>
  <p>
    {profiles.length} cas types fictifs, tous des adultes seuls sans enfant. Pour chacun, le moteur calcule
    les prélèvements qu'il supporte, les prestations et les services publics qu'il reçoit :
  </p>
  <p class="formula">
    impact = (prélèvements de référence − prélèvements du scénario) + (prestations et services du
    scénario − prestations et services de référence)
  </p>
  <ul>
    <li>
      Salaires : cotisations salariales et patronales, réduction générale dégressive unique, CSG et
      CRDS ; le salaire brut est retrouvé à partir du salaire net visé. L'alternant ne paie ni
      cotisations salariales ni CSG jusqu'à la moitié du SMIC, et son salaire est exonéré d'impôt
      jusqu'au SMIC annuel ; il n'a droit à la prime d'activité qu'au-delà de 78 % du SMIC net.
    </li>
    <li>
      Impôt sur le revenu : barème, abattement de 10 %, décote, quotient familial et son
      plafonnement, abattements des pensions et des plus de 65 ans ; contributions sur les hauts
      revenus (CEHR et CDHR).
    </li>
    <li>
      Capital : prélèvement forfaitaire unique et prélèvements sociaux ; revenus fonciers au
      micro-foncier ou au réel ; IFI.
    </li>
    <li>Pensions : CSG selon le revenu fiscal de référence, CRDS, CASA, cotisation maladie.</li>
    <li>Indépendants : cotisations sur le revenu abattu de 26 % (réforme 2026).</li>
    <li>
      Consommation = revenu disponible × (1 − taux d'épargne), sauf pour l'étudiant (budget étudiant
      moyen) ; TVA par taux et accises selon la structure de consommation.
    </li>
    <li>
      Prestations : prime d'activité, pension de retraite, aide au logement et aides calculées selon
      les revenus, comme pour votre foyer (minimum vieillesse, RSA, chèque énergie…) ; chacune varie
      avec son poste de dépense (voir ci-dessus). Le loyer des profils n'étant pas décrit, leur aide
      au logement reste un montant fixe ; le revenu des parents de l'étudiant non plus, il ne reçoit
      donc pas de bourse. La complémentaire santé solidaire est un droit à une couverture, indiqué
      sans être compté.
    </li>
  </ul>
  <table>
    <caption>Bilan annuel de référence</caption>
    <thead>
      <tr
        ><th scope="col">Profil</th><th scope="col">Prélèvements</th><th scope="col">Prestations</th
        ><th scope="col">Services reçus</th></tr
      >
    </thead>
    <tbody>
      {#each profiles as { profile, result } (profile.id)}
        <tr>
          <th scope="row">{profile.label}</th>
          <td>{formatEuros(result?.totalLevies ?? 0)}</td>
          <td>{formatEuros(result?.benefits ?? 0)}</td>
          <td>{formatEuros(result?.inKind.total ?? 0)}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h2>Votre foyer</h2>
  <p>
    Le formulaire « Votre foyer » applique les mêmes règles à un foyer d'un ou deux adultes, avec ou
    sans enfants :
  </p>
  <ul>
    <li>
      Cotisations (salariés et artisans), CSG et pensions sont calculées pour chaque adulte ;
      l'impôt sur le revenu pour chaque foyer fiscal. Un couple marié ou pacsé forme un seul foyer
      fiscal ; en union libre, chaque adulte déclare seul et les enfants sont rattachés au premier.
    </li>
    <li>
      Parts : 1 par adulte (2 pour un couple marié ou pacsé), une demi-part pour chacun des deux
      premiers enfants, une part à partir du troisième, une demi-part de plus pour un parent qui vit
      seul. L'avantage de chaque demi-part liée aux enfants est plafonné à {formatEuros(
        resolve(family.halfPartCeiling),
      )} ({formatEuros(resolve(family.singleParentFirstChildCeiling))} pour la première part d'un parent
      isolé). Décote, CEHR et CDHR suivent les seuils des couples.
    </li>
    <li>
      Allocations familiales à partir de deux enfants de moins de 20 ans, en part de la base
      mensuelle ({formatEuros(resolve(allowances.bmaf))} au {longDate(allowances.bmaf.asOf)}),
      réduites de moitié puis des trois quarts au-delà des plafonds de ressources ; prime d'activité
      majorée selon la taille du foyer, avec une bonification par adulte qui travaille. Chaque
      prestation suit son poste de dépense (allocations familiales, prime d'activité…).
    </li>
    <li>
      Services publics : chaque membre du foyer en reçoit une part ; les enfants prennent l'indice
      d'âge du premier adulte. Consommation : celle du profil type dont le niveau de vie (revenu
      disponible par unité de consommation, échelle de l'INSEE) est le plus proche.
    </li>
  </ul>

  <h2>Qui supporte quel prélèvement</h2>
  <ul>
    {#each incidence as [tax, assumption] (tax)}
      <li>
        <strong>{incidenceLabel(tax)}</strong> : {BEARERS[assumption.bearer] ?? assumption.bearer}.
        {assumption.note}
      </li>
    {/each}
  </ul>
  <p>Prélèvements suivis pour chaque profil : {Object.values(LEVY_LABELS).join(', ')}.</p>

  <h2>Services publics reçus</h2>
  <p>
    Chaque groupe de dépenses est réparti par tête (montant / population), éventuellement pondéré
    selon l'âge ou le statut du profil, ou n'est pas attribué aux profils. Une baisse de dépense
    réduit donc les services reçus.
  </p>
  <details>
    <summary>Groupes pondérés ({weighted.length})</summary>
    <ul>
      {#each weighted as rule (rule.cofog)}
        <li>
          {rule.cofog}
          {groupLabel.get(rule.cofog)} :
          {#each Object.entries(rule.indexByKey ?? {}) as [key, index], i (key)}{i > 0
              ? ' ; '
              : ''}{keyLabel.get(key) ?? key}
            × {index.value?.toLocaleString('fr-FR')}{/each}{#if rule.index}× {rule.index.value?.toLocaleString(
              'fr-FR',
            )}{/if}{#if rule.note}. {rule.note}{/if}
        </li>
      {/each}
    </ul>
  </details>
  <details>
    <summary>Groupes non attribués aux profils ({notAllocated.length})</summary>
    <ul>
      {#each notAllocated as rule (rule.cofog)}
        <li>
          {rule.cofog}
          {groupLabel.get(rule.cofog)}{#if rule.note}
            : {rule.note}{/if}
        </li>
      {/each}
    </ul>
  </details>

  <h2>Limites</h2>
  <ul>
    {#each LIMITS as limit (limit)}<li>{limit}</li>{/each}
    <li>
      Simplifications du calcul : pas de prévoyance ni de mutuelle d'entreprise, IFI sans dettes ni
      plafonnement, prime d'activité mensuelle, pas d'arrondis légaux, taux de CSG des pensions
      calculé sur le revenu de l'année.
    </li>
  </ul>
</article>

<style>
  .page {
    max-width: 60rem;
  }

  h2 {
    margin-top: var(--space-4);
  }

  .formula {
    font-family: ui-monospace, monospace;
    background: var(--color-surface);
    padding: var(--space-2);
    border-radius: var(--radius);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin: var(--space-2) 0;
  }

  caption {
    text-align: left;
    font-weight: 600;
  }

  th,
  td {
    text-align: left;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    font-weight: 400;
  }

  td {
    font-variant-numeric: tabular-nums;
  }

  summary {
    cursor: pointer;
  }
</style>
