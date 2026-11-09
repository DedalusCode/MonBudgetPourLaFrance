// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Text of a lever's pop-up (PLAN.MD §13.6): its own entry, or for a level-3 item described
 * by its nature (Personnel, Achats…), the nature's template completed with the group's name.
 */
import { natureOf } from '../engine/natures.ts';
import type { Explanation, ExplanationsFile } from '../engine/schemas.ts';

const fill = (text: string, group: string) => text.replaceAll('{groupe}', group);

export interface LeverExplanation {
  entry: Explanation;
  /** True when the text is the template of the item's nature. */
  fromNature: boolean;
}

export function explanationFor(
  file: Pick<ExplanationsFile, 'natures'>,
  entries: ReadonlyMap<string, Explanation>,
  leverId: string,
  groupLabel: string | null,
): LeverExplanation | undefined {
  const own = entries.get(leverId);
  if (own) return { entry: own, fromNature: false };
  const nature = natureOf(leverId);
  if (nature === null) return undefined;
  const template = file.natures[nature];
  const group = groupLabel ?? '';
  return {
    fromNature: true,
    entry: {
      id: leverId,
      summary: fill(template.summary, group),
      sections: template.sections.map((s) => ({
        heading: s.heading,
        ...(s.text === undefined ? {} : { text: fill(s.text, group) }),
        ...(s.items === undefined ? {} : { items: s.items.map((i) => fill(i, group)) }),
      })),
      sourceIds: template.sourceIds,
    },
  };
}
