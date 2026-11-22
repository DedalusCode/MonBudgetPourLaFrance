// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Names of the parts of a card line: contributions as named in the data, then fixed labels. */
import type { Dataset } from '../engine/types.ts';
import { PART_LABELS } from './labels.ts';
import type { PartNames } from './profileView.ts';

export function partNames(data: Dataset): PartNames {
  const { socialContributions, publicSector } = data.taxRules;
  const contributions = new Map<string, string>([
    ...socialContributions.items.map((i) => [i.id, i.label] as const),
    ...Object.values(publicSector.employer).flatMap((items) =>
      items.map((i) => [i.id, i.label] as const),
    ),
  ]);
  const divisions = new Map(data.spending.divisions.map((d) => [d.code, d.label]));
  return {
    part: (id) => PART_LABELS[id] ?? contributions.get(id) ?? id,
    division: (code) => divisions.get(code) ?? code,
  };
}
