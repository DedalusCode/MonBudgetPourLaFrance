// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Chèque énergie: one per home, by revenu fiscal de référence per consumption unit. Its
 * units are not the INSEE scale: 1 for the first person, 0.5 for the second and 0.3 for
 * each further one, whatever their age.
 */
import type { Rules } from '../rules.ts';

export function energyCheckUnits(persons: number, rules: Rules): number {
  const u = rules.socialBenefits.energyCheck.units;
  if (persons <= 0) return 0;
  return u.first + (persons >= 2 ? u.second : 0) + Math.max(0, persons - 2) * u.further;
}

/** Annual amount of the chèque énergie. */
export function energyCheck(
  input: { persons: number; referenceIncome: number },
  rules: Rules,
): number {
  const e = rules.socialBenefits.energyCheck;
  const units = energyCheckUnits(input.persons, rules);
  if (units <= 0) return 0;
  const perUnit = Math.max(0, input.referenceIncome) / units;
  if (perUnit >= e.incomeCeiling) return 0;
  const bracket = e.brackets.findIndex((upper) => perUnit < upper);
  const index = bracket === -1 ? e.brackets.length : bracket;
  const scale =
    units <= 1 ? e.amounts.oneUnit : units < 2 ? e.amounts.belowTwo : e.amounts.twoOrMore;
  return scale[index] ?? 0;
}
