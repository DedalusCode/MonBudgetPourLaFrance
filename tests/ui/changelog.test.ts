// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** CHANGELOG.md: format, version of package.json, "Nouveautés" page and footer. */
import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import App from '../../src/ui/App.svelte';
import { changelogErrors, formatReleaseDate, parseChangelog } from '../../src/ui/changelog.ts';
import Changes from '../../src/ui/pages/Changes.svelte';
import { pageFromHash, pageHash } from '../../src/ui/state/url.ts';
import { APP_VERSION } from '../../src/ui/version.ts';

const markdown = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');

describe('CHANGELOG.md', () => {
  it('follows the project rules and starts with the version of package.json', () => {
    const releases = parseChangelog(markdown);
    expect(APP_VERSION).toBe(pkg.version);
    expect(releases[0]?.version).toBe(pkg.version);
    expect(changelogErrors(releases, pkg.version)).toEqual([]);
  });

  it('has no amount in Md€', () => {
    const items = parseChangelog(markdown).flatMap((r) => r.sections.flatMap((s) => s.items));
    expect(items.filter((item) => item.includes('Md€'))).toEqual([]);
  });
});

describe('parseChangelog', () => {
  const sample = [
    '# Nouveautés',
    '- une règle du préambule',
    '## [1.1.0] - 2026-11-09',
    '### Ajouté',
    '- Une ligne',
    '  qui continue.',
    '- Une autre.',
    '### Corrigé',
    '- Un correctif.',
    '',
    '## [1.0.0] - 2026-11-06',
    '### Ajouté',
    '- Première version.',
  ].join('\n');

  it('reads releases, sections and continued items', () => {
    expect(parseChangelog(sample)).toEqual([
      {
        version: '1.1.0',
        date: '2026-11-09',
        sections: [
          { heading: 'Ajouté', items: ['Une ligne qui continue.', 'Une autre.'] },
          { heading: 'Corrigé', items: ['Un correctif.'] },
        ],
      },
      {
        version: '1.0.0',
        date: '2026-11-06',
        sections: [{ heading: 'Ajouté', items: ['Première version.'] }],
      },
    ]);
  });

  it('rejects malformed lines', () => {
    expect(() => parseChangelog('## 1.0.0')).toThrow(/ligne 1/);
    expect(() => parseChangelog('## [1.0.0] - 2026-11-06\n- sans rubrique')).toThrow(
      /hors rubrique/,
    );
    expect(() => parseChangelog('## [1.0.0] - 2026-11-06\n### Ajouté\ntexte')).toThrow(
      /non reconnue/,
    );
  });

  it('reports versions, dates and sections that break the rules', () => {
    const release = (version: string, date: string, ...headings: string[]) => ({
      version,
      date,
      sections: headings.map((heading) => ({ heading, items: heading === 'Vide' ? [] : ['x'] })),
    });
    expect(changelogErrors([release('1.0.0', '2026-11-06', 'Ajouté')], '1.1.0')).toEqual([
      'La version 1.1.0 de package.json doit être la première du CHANGELOG.',
    ]);
    const errors = changelogErrors(
      [
        release('1.0.0', '2026-11-01', 'Méthode', 'Ajouté', 'Bilan'),
        release('1.0.0', '2026-11-06'),
      ],
      '1.0.0',
    );
    expect(errors).toEqual([
      '1.0.0 doit être plus récente que 1.0.0.',
      '1.0.0 : date antérieure.',
      '1.0.0 : rubrique inconnue « Bilan ».',
      '1.0.0 : rubriques dans le désordre ou en double.',
      '1.0.0 : aucune rubrique.',
    ]);
    expect(
      changelogErrors(
        [release('1.10.0', '2026-12-01', 'Ajouté'), release('1.9.0', '2026-11-01', 'Ajouté')],
        '1.10.0',
      ),
    ).toEqual([]);
  });

  it('formats dates in French', () => {
    expect(formatReleaseDate('2026-11-09')).toBe('9 novembre 2026');
  });
});

describe('Nouveautés page and footer', () => {
  it('has its own address', () => {
    expect(pageHash('changes')).toBe('#/nouveautes');
    expect(pageFromHash('#/nouveautes')).toBe('changes');
  });

  it('lists every release, newest first', () => {
    const { body } = render(Changes);
    const releases = parseChangelog(markdown);
    for (const r of releases) expect(body).toContain(`Version ${r.version}`);
    expect(body.indexOf(`Version ${releases[0]?.version}`)).toBeLessThan(
      body.indexOf(`Version ${releases.at(-1)?.version}`),
    );
    expect(body).toContain('9 novembre 2026');
  });

  it('shows the version and a link to the page in the footer', () => {
    const { body } = render(App);
    expect(body).toMatch(
      new RegExp(`<footer[^>]*>[\\s\\S]*version ${APP_VERSION.replace(/\./g, '\\.')}`),
    );
    expect(body).toContain('href="#/nouveautes"');
  });
});
