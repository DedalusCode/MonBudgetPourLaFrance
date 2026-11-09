// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Bourse sur critères sociaux (higher education, 2026-2027): points of charge of the
 * family, then the highest level whose income ceiling covers the parents' revenu brut
 * global. Metropolitan distances only.
 */
import type { Rules } from '../rules.ts';

export interface StudentGrantInput {
  /** Revenu brut global of the parents (or of the student's tax household). */
  parentsIncome: number;
  /** Distance between the family home and the place of study, in km. */
  distanceKm: number;
  /** Other dependent children of the family, not in higher education. */
  siblings: number;
  /** Other dependent children of the family in higher education. */
  siblingStudents: number;
  /** Disability recognised by the CDAPH. */
  disabled: boolean;
}

export function studentGrantPoints(input: StudentGrantInput, rules: Rules): number {
  const g = rules.socialBenefits.studentGrant;
  const distance = g.distancePoints
    .filter((d) => input.distanceKm >= d.minKm)
    .reduce((best, d) => Math.max(best, d.points), 0);
  return (
    distance +
    Math.max(0, input.siblings) * g.siblingPoints +
    Math.max(0, input.siblingStudents) * g.siblingStudentPoints +
    (input.disabled ? g.disabilityPoints : 0)
  );
}

/** Level of the grant (0 for « 0 bis », 7 at most), or null above every ceiling. */
export function studentGrantLevel(input: StudentGrantInput, rules: Rules): number | null {
  const { ceilings } = rules.socialBenefits.studentGrant;
  const row = ceilings[Math.min(studentGrantPoints(input, rules), ceilings.length - 1)] ?? [];
  for (let level = row.length - 1; level >= 0; level--) {
    if (input.parentsIncome <= (row[level] ?? -Infinity)) return level;
  }
  return null;
}

/** Annual grant (paid in ten monthly instalments). */
export function studentGrant(input: StudentGrantInput, rules: Rules): number {
  const level = studentGrantLevel(input, rules);
  return level === null ? 0 : (rules.socialBenefits.studentGrant.amounts[level] ?? 0);
}
