// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Loads the bundled data files and validates them. Data is imported
 * statically, so it ships inside the build and no network call is made.
 */
import { rawDataset } from './bundledData.ts';
import { validateDataset, type RawDataset } from './dataChecks.ts';
import type { Dataset } from './types.ts';

export { rawDataset };

/** Validated dataset; throws with every validation error if the data is invalid. */
export function loadDataset(raw: RawDataset = rawDataset): Dataset {
  const { errors, dataset } = validateDataset(raw);
  if (dataset === null) {
    throw new Error(`Invalid data files:\n${errors.join('\n')}`);
  }
  return dataset;
}
