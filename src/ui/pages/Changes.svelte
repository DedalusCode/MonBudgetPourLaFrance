<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // "Nouveautés" page: CHANGELOG.md, read at build time.
  import changelog from '../../../CHANGELOG.md?raw';
  import { formatReleaseDate, parseChangelog } from '../changelog.ts';
  import { APP_VERSION } from '../version.ts';

  const releases = parseChangelog(changelog);
</script>

<article class="page">
  <h1 tabindex="-1">Nouveautés</h1>
  <p>
    Les évolutions du simulateur, de la plus récente à la plus ancienne. Vous utilisez la version
    {APP_VERSION}. Les rubriques « Données » et « Méthode » signalent les changements qui font
    varier les chiffres affichés : un scénario partagé avant une mise à jour peut donner d'autres
    résultats après.
  </p>
  {#each releases as release (release.version)}
    <section aria-labelledby={`version-${release.version}`}>
      <h2 id={`version-${release.version}`}>
        Version {release.version}
        <span class="date">— {formatReleaseDate(release.date)}</span>
      </h2>
      {#each release.sections as section (section.heading)}
        <h3>{section.heading}</h3>
        <ul>
          {#each section.items as item, i (i)}
            <li>{item}</li>
          {/each}
        </ul>
      {/each}
    </section>
  {/each}
</article>

<style>
  .page {
    max-width: 60rem;
  }

  .date {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  h3 {
    margin-bottom: var(--space-1);
  }
</style>
