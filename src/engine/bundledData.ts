// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Data files bundled in the build. They are validated in CI (`npm run
 * validate:data` and the tests), so the browser uses them without running the
 * Zod schemas again; `params.ts#loadDataset` keeps the validated path.
 */
import consumption from '../data/consumption.json';
import inKindAllocation from '../data/inKindAllocation.json';
import macro from '../data/macro.json';
import meta from '../data/meta.json';
import profiles from '../data/profiles.json';
import revenues from '../data/revenues.json';
import sources from '../data/sources.json';
import spending from '../data/spending.json';
import taxRules from '../data/taxRules.json';
import type { DataFileName } from './dataFiles.ts';
import type { Dataset } from './types.ts';

export const rawDataset: Record<DataFileName, unknown> = {
  meta,
  sources,
  macro,
  revenues,
  spending,
  taxRules,
  profiles,
  consumption,
  inKindAllocation,
};

/** The bundled data, trusted because CI validates it. */
export function bundledDataset(): Dataset {
  return rawDataset as unknown as Dataset;
}
