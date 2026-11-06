// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Helpers shared by the test files. */

/** Relative gap between two amounts (the absolute value when the expected amount is 0). */
export function relativeGap(actual: number, expected: number): number {
  return expected === 0 ? Math.abs(actual) : Math.abs(actual - expected) / Math.abs(expected);
}
