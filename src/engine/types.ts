// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Static types of the engine, derived from the Zod schemas so that the
 * runtime validation and the compile-time types can never drift apart.
 */
import type { z } from 'zod';
import type {
  consumptionEntrySchema,
  dataValue,
  DATA_FILES,
  inKindAllocationFileSchema,
  profileSchema,
  sourceSchema,
  statusSchema,
  taxRulesFileSchema,
  Unit,
} from './schemas.ts';

export type { Unit };
export type Status = z.infer<typeof statusSchema>;
export type DataValue<U extends Unit = Unit> = z.infer<ReturnType<typeof dataValue<U>>>;

export type Source = z.infer<typeof sourceSchema>;
export type TaxRules = z.infer<typeof taxRulesFileSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type ConsumptionEntry = z.infer<typeof consumptionEntrySchema>;
export type InKindAllocationFile = z.infer<typeof inKindAllocationFileSchema>;

/** All data files, parsed and validated. */
export type Dataset = { [K in keyof typeof DATA_FILES]: z.infer<(typeof DATA_FILES)[K]> };
