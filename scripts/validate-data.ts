// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * CI data check (PLAN.MD step 2).
 *
 * Fails when a data file does not match its schema or references an unknown
 * sourceId, then prints how many values are still A_VERIFIER or HYPOTHESE.
 *
 * Usage: node scripts/validate-data.ts [--list]
 *   --list  also prints every value that is not VERIFIE.
 * On GitHub Actions the report is appended to the job summary.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import {
  validateDataset,
  validateExplanations,
  type DataReport,
} from '../src/engine/dataChecks.ts';
import { buildLevers } from '../src/engine/levers.ts';
import { DATA_FILE_NAMES, STATUSES } from '../src/engine/dataFiles.ts';
import { dataFile, readRawDataset } from './lib/dataset.ts';

const listPending = process.argv.includes('--list');

function reportTable(report: DataReport): string {
  const header = `| Fichier | ${STATUSES.join(' | ')} |`;
  const separator = `|---|${STATUSES.map(() => '---:').join('|')}|`;
  const rows = [...DATA_FILE_NAMES, 'total' as const].map((name) => {
    const label = name === 'total' ? '**Total**' : `${name}.json`;
    return `| ${label} | ${STATUSES.map((s) => report.counts[name][s]).join(' | ')} |`;
  });
  return [header, separator, ...rows].join('\n');
}

function main(): number {
  const { raw, errors: readErrors } = readRawDataset();
  if (readErrors.length > 0) {
    console.error(readErrors.join('\n'));
    return 1;
  }

  const { errors, report, dataset } = validateDataset(raw);
  // Pop-up texts: one per lever, sources registered.
  if (dataset) {
    let explanations: unknown;
    try {
      explanations = JSON.parse(readFileSync(dataFile('explanations.json'), 'utf8'));
    } catch (e) {
      errors.push(`explanations.json: cannot be read as JSON (${(e as Error).message})`);
    }
    if (explanations !== undefined) {
      const leverIds = [...buildLevers(dataset).values()]
        .filter((l) => !l.deprecated)
        .map((l) => l.id);
      const sourceIds = new Set(dataset.sources.sources.map((s) => s.id));
      errors.push(...validateExplanations(explanations, sourceIds, leverIds));
    }
  }
  if (errors.length > 0) {
    console.error(`✗ ${errors.length} erreur(s) dans les données :\n`);
    console.error(errors.map((e) => `  - ${e}`).join('\n'));
  } else {
    console.log('✓ Données valides (schémas et références aux sources).');
  }

  if (report) {
    const table = reportTable(report);
    console.log(`\nStatut des valeurs :\n\n${table}\n`);
    if (listPending) {
      for (const entry of report.pending) {
        console.log(
          `  [${entry.status}] ${entry.file}.json ${entry.path}${entry.note ? ` — ${entry.note}` : ''}`,
        );
      }
    }
    const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
    if (summaryFile) {
      appendFileSync(summaryFile, `## Validation des données\n\n${table}\n`);
    }
  }

  return errors.length > 0 ? 1 : 0;
}

process.exitCode = main();
