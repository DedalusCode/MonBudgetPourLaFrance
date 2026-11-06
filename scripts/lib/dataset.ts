// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Reads the data files of src/data/ from disk, for the scripts run by Node. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateDataset, type RawDataset } from '../../src/engine/dataChecks.ts';
import { DATA_FILE_NAMES } from '../../src/engine/dataFiles.ts';
import type { Dataset } from '../../src/engine/types.ts';

const DATA_DIR = new URL('../../src/data/', import.meta.url);

/** Path of a file of src/data/. */
export function dataFile(name: string): string {
  return fileURLToPath(new URL(name, DATA_DIR));
}

/** The raw contents of every data file, with an error for each file that is not valid JSON. */
export function readRawDataset(): { raw: RawDataset; errors: string[] } {
  const raw = {} as RawDataset;
  const errors: string[] = [];
  for (const name of DATA_FILE_NAMES) {
    try {
      raw[name] = JSON.parse(readFileSync(dataFile(`${name}.json`), 'utf8')) as unknown;
    } catch (e) {
      errors.push(`${name}.json: cannot be read as JSON (${(e as Error).message})`);
    }
  }
  return { raw, errors };
}

/** The validated dataset; throws with every error when the data is invalid. */
export function loadDatasetFromDisk(): Dataset {
  const { raw, errors: readErrors } = readRawDataset();
  if (readErrors.length > 0) throw new Error(readErrors.join('\n'));
  const { dataset, errors } = validateDataset(raw);
  if (dataset === null) throw new Error(`Invalid data files:\n${errors.join('\n')}`);
  return dataset;
}
