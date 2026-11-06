// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Names shared by the data files, their schemas and the code that reads them
 * (kept apart from the Zod schemas so that the browser bundle does not need them).
 */
export const STATUSES = ['VERIFIE', 'A_VERIFIER', 'HYPOTHESE'] as const;

export const DATA_FILE_NAMES = [
  'meta',
  'sources',
  'macro',
  'revenues',
  'spending',
  'taxRules',
  'profiles',
  'consumption',
  'inKindAllocation',
] as const;

export type DataFileName = (typeof DATA_FILE_NAMES)[number];
