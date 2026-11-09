// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * CHANGELOG.md (Keep a Changelog, in French) read at build time for the "Nouveautés"
 * page: `## [x.y.z] - YYYY-MM-DD` opens a release, `### Rubrique` a section, `- ` an item
 * and a line indented by two spaces continues it. The text before the first release is
 * the file's preamble and is not shown.
 */

/** Section headings allowed in a release, in the order they must appear. */
export const CHANGELOG_SECTIONS = [
  'Ajouté',
  'Modifié',
  'Données',
  'Méthode',
  'Corrigé',
  'Retiré',
] as const;

export interface ChangelogSection {
  heading: string;
  items: string[];
}

export interface Release {
  version: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  sections: ChangelogSection[];
}

const RELEASE = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/;

/** Releases of the changelog, in file order (newest first). Throws on a malformed line. */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let section: ChangelogSection | null = null;
  for (const [index, raw] of markdown.split(/\r?\n/).entries()) {
    const line = raw.trimEnd();
    const fail = (why: string) => new Error(`CHANGELOG.md, ligne ${index + 1} : ${why}`);
    const release = RELEASE.exec(line);
    if (release) {
      releases.push({ version: release[1] ?? '', date: release[2] ?? '', sections: [] });
      section = null;
      continue;
    }
    const current = releases.at(-1);
    if (!current) {
      if (line.startsWith('## '))
        throw fail('titre de version attendu « ## [x.y.z] - AAAA-MM-JJ ».');
      continue; // preamble
    }
    if (line === '') continue;
    if (line.startsWith('### ')) {
      section = { heading: line.slice(4), items: [] };
      current.sections.push(section);
    } else if (line.startsWith('- ')) {
      if (!section) throw fail('élément hors rubrique.');
      section.items.push(line.slice(2));
    } else if (line.startsWith('  ') && section && section.items.length > 0) {
      section.items[section.items.length - 1] += ` ${line.trim()}`;
    } else {
      throw fail('ligne non reconnue.');
    }
  }
  return releases;
}

/** Problems of a parsed changelog against the project rules (empty when it is valid). */
export function changelogErrors(releases: Release[], appVersion: string): string[] {
  const errors: string[] = [];
  if (releases[0]?.version !== appVersion) {
    errors.push(`La version ${appVersion} de package.json doit être la première du CHANGELOG.`);
  }
  const key = (v: string) => v.split('.').map(Number);
  releases.forEach((release, i) => {
    const previous = releases[i + 1];
    if (previous) {
      const [a, b] = [key(release.version), key(previous.version)];
      const newer = a.findIndex((n, k) => n !== b[k]);
      if (newer === -1 || (a[newer] ?? 0) < (b[newer] ?? 0)) {
        errors.push(`${release.version} doit être plus récente que ${previous.version}.`);
      }
      if (release.date < previous.date) errors.push(`${release.version} : date antérieure.`);
    }
    if (Number.isNaN(Date.parse(release.date))) errors.push(`${release.version} : date invalide.`);
    if (release.sections.length === 0) errors.push(`${release.version} : aucune rubrique.`);
    const order = release.sections.map((s) =>
      (CHANGELOG_SECTIONS as readonly string[]).indexOf(s.heading),
    );
    release.sections.forEach((s, k) => {
      if (order[k] === -1) errors.push(`${release.version} : rubrique inconnue « ${s.heading} ».`);
      if (s.items.length === 0) errors.push(`${release.version} : rubrique « ${s.heading} » vide.`);
    });
    if (order.some((o, k) => k > 0 && o <= (order[k - 1] ?? -1) && o !== -1)) {
      errors.push(`${release.version} : rubriques dans le désordre ou en double.`);
    }
  });
  return errors;
}

/** "9 novembre 2026" from an ISO date. */
export function formatReleaseDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}
