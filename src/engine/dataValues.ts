// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Walks the data files and lists their numeric values with their provenance
 * (no schema dependency, used by the Sources page and the data checks).
 */
import { DATA_FILE_NAMES, STATUSES, type DataFileName } from './dataFiles.ts';
import type { Dataset, Status } from './types.ts';

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

/** Depth-first walk calling `visit` on every plain object, with a readable path. */
export function walk(
  node: unknown,
  path: string,
  visit: (node: Record<string, unknown>, path: string) => void,
): void {
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, `${path}[${i}]`, visit));
  } else if (node !== null && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    visit(record, path || '(root)');
    for (const [key, child] of Object.entries(record)) {
      walk(child, path ? `${path}.${key}` : key, visit);
    }
  }
}

/** One numeric value of the data files, with its provenance. */
export interface ValueEntry {
  file: DataFileName;
  path: string;
  value: number | null;
  unit: string;
  status: Status;
  sourceId: string | null;
  note?: string;
}

/** Every data value of the dataset (objects with value, unit and status). */
export function collectValues(d: Dataset): ValueEntry[] {
  const entries: ValueEntry[] = [];
  for (const name of DATA_FILE_NAMES) {
    walk(d[name], '', (node, path) => {
      const { value, unit, status, sourceId, note } = node;
      if (typeof unit !== 'string' || !isStatus(status)) return;
      if (value !== null && typeof value !== 'number') return;
      entries.push({
        file: name,
        path,
        value,
        unit,
        status,
        sourceId: typeof sourceId === 'string' ? sourceId : null,
        ...(typeof note === 'string' ? { note } : {}),
      });
    });
  }
  return entries;
}
