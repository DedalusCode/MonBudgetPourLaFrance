<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // About page (PLAN.MD §8.4).
  const repository = import.meta.env['VITE_REPOSITORY_URL'] as string | undefined;
</script>

<article class="page">
  <h1 tabindex="-1">À propos</h1>
  <p>
    « Mon budget pour la France » est un simulateur citoyen, gratuit et open source. Il aide chacun
    à comprendre comment les principaux prélèvements et dépenses publiques pèsent sur le solde, la
    dette et des ménages types.
  </p>
  <h2>Principes</h2>
  <ul>
    <li>
      <strong>Neutralité</strong> : les leviers sont des paramètres, pas des propositions. Les bornes
      des curseurs sont symétriques et aucun scénario n'est associé à un parti.
    </li>
    <li>
      <strong>Transparence</strong> : chaque valeur indique sa source, sa date et son statut ; les calculs
      sont décrits dans la page Méthodologie.
    </li>
    <li>
      <strong>Simplicité assumée</strong> : l'outil montre l'effet mécanique immédiat, sans les réactions
      des acteurs ; il ne remplace pas les chiffrages officiels.
    </li>
    <li>
      <strong>Confidentialité</strong> : aucune donnée n'est envoyée ; le scénario n'est stocké que dans
      l'adresse de la page, et la description de votre foyer reste dans votre navigateur.
    </li>
  </ul>
  <h2>Contribuer</h2>
  <p>
    Une erreur dans une donnée, une source plus récente, une idée de levier ? Les contributions sont
    les bienvenues{#if repository}
      sur <a href={repository} rel="external noopener">le dépôt du projet</a>{/if}.
  </p>
  <h2>Licence</h2>
  <p>
    Le code est publié sous licence
    <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="external noopener"
      >GNU Affero General Public License v3.0</a
    > : chacun peut le réutiliser et le modifier, à condition de publier le code source de toute version
    mise en ligne.
  </p>
  <p>
    Les données et la documentation sont publiées sous
    <a href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/" rel="external noopener"
      >Licence Ouverte / Open Licence 2.0</a
    > d'Etalab : elles sont réutilisables librement, en citant la source et sa date de mise à jour. Les
    données publiques reprises restent soumises aux conditions de leurs producteurs, cités dans la page
    Sources.
  </p>
</article>

<style>
  .page {
    max-width: 60rem;
  }
</style>
