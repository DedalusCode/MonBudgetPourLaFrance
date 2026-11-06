// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Turns the sourced data files into plain numbers for the calculation code.
 *
 * Data files wrap every number in `{ value, unit, sourceId, ... }`. The engine
 * only needs the values, and must never run on a missing one: `resolve` throws
 * with the path of the first null value it meets.
 */
import type { TaxRules } from './types.ts';

interface WrappedValue {
  value: number | null;
  unit: string;
  status: string;
}

/** Same shape as T, with every data value replaced by its number. */
export type Resolved<T> = T extends WrappedValue
  ? number
  : T extends readonly (infer E)[]
    ? Resolved<E>[]
    : T extends object
      ? { [K in keyof T]: Resolved<T[K]> }
      : T;

export type Rules = Resolved<TaxRules>;

function isWrappedValue(node: object): node is WrappedValue {
  return 'value' in node && 'unit' in node && 'status' in node;
}

export function resolve<T>(node: T, path = '(root)'): Resolved<T> {
  if (Array.isArray(node)) {
    return node.map((child, i) => resolve(child, `${path}[${i}]`)) as Resolved<T>;
  }
  if (node !== null && typeof node === 'object') {
    if (isWrappedValue(node)) {
      if (node.value === null) throw new Error(`Missing value at ${path}`);
      return node.value as Resolved<T>;
    }
    return Object.fromEntries(
      Object.entries(node).map(([key, child]) => [key, resolve(child, `${path}.${key}`)]),
    ) as Resolved<T>;
  }
  return node as Resolved<T>;
}

export function resolveRules(taxRules: TaxRules): Rules {
  return resolve(taxRules, 'taxRules');
}
