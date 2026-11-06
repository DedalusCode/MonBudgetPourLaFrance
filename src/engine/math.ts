// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Small numeric helpers shared by the engine. */

export function sum(values: readonly number[]): number {
  return values.reduce((total, x) => total + x, 0);
}

/** Part of `value` that lies between `floor` and `cap`. */
export function slice(value: number, floor: number, cap: number): number {
  return Math.max(0, Math.min(value, cap) - floor);
}

/** `rate × amount` kept between `min` and `max`, never above the amount itself. */
export function cappedAllowance(
  amount: number,
  { rate, min, max }: { rate: number; min: number; max: number },
): number {
  if (amount <= 0) return 0;
  return Math.min(amount, Math.max(min, Math.min(max, amount * rate)));
}

/**
 * The x ≥ target such that f(x) = target, for an increasing f with f(x) ≤ x (a net amount
 * as a function of the gross one), by bisection. The upper bound doubles until it brackets
 * the target, so fixed minimum contributions on small incomes cannot make it fall short.
 */
export function invertIncreasing(f: (x: number) => number, target: number): number {
  if (target <= 0) return 0;
  let low = target;
  let high = target * 2;
  for (let i = 0; i < 60 && f(high) < target; i++) high *= 2;
  for (let i = 0; i < 100 && high - low > 1e-6; i++) {
    const mid = (low + high) / 2;
    if (f(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
