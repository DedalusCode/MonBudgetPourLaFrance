// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Dataset validation: Zod schema of each file, then cross-file consistency
 * rules, then a report of how many values are still unverified.
 *
 * Pure function of the raw JSON contents, shared by `scripts/validate-data.ts`
 * (CI) and by the tests.
 */
import { isStatus, walk } from './dataValues.ts';
import { DATA_FILE_NAMES, STATUSES, type DataFileName } from './dataFiles.ts';
import { DATA_FILES, explanationsFileSchema } from './schemas.ts';
import type { Dataset, Status } from './types.ts';

export type RawDataset = Record<DataFileName, unknown>;

export interface StatusEntry {
  file: DataFileName;
  path: string;
  status: Status;
  note?: string;
}

export interface DataReport {
  /** Number of entries per status, per file and overall. */
  counts: Record<DataFileName | 'total', Record<Status, number>>;
  /** Every entry whose status is not VERIFIE, for review. */
  pending: StatusEntry[];
}

export interface ValidationResult {
  errors: string[];
  dataset: Dataset | null;
  report: DataReport | null;
}

const VAT_SHARES_TOLERANCE = 1e-3;

export function validateDataset(raw: RawDataset): ValidationResult {
  const errors: string[] = [];
  const parsed: Partial<Record<DataFileName, unknown>> = {};

  for (const name of DATA_FILE_NAMES) {
    const result = DATA_FILES[name].safeParse(raw[name]);
    if (result.success) {
      parsed[name] = result.data;
    } else {
      for (const issue of result.error.issues) {
        errors.push(`${name}.json: ${formatPath(issue.path)}: ${issue.message}`);
      }
    }
  }
  if (errors.length > 0) return { errors, dataset: null, report: null };

  const dataset = parsed as Dataset;
  errors.push(...crossFileErrors(dataset));
  return { errors, dataset: errors.length === 0 ? dataset : null, report: buildReport(dataset) };
}

// ---------------------------------------------------------------------------
// Cross-file rules
// ---------------------------------------------------------------------------

function crossFileErrors(d: Dataset): string[] {
  const errors: string[] = [];
  const err = (file: DataFileName, path: string, message: string) =>
    errors.push(`${file}.json: ${path}: ${message}`);

  // Sources: unique ids, and every sourceId points to an existing source.
  const sourceIds = new Set(d.sources.sources.map((s) => s.id));
  findDuplicates(d.sources.sources.map((s) => s.id)).forEach((id) =>
    err('sources', 'sources', `duplicate source id "${id}"`),
  );
  for (const name of DATA_FILE_NAMES) {
    walk(d[name], '', (node, path) => {
      const sourceId = node['sourceId'];
      if (typeof sourceId === 'string' && !sourceIds.has(sourceId)) {
        err(name, path, `unknown sourceId "${sourceId}"`);
      }
    });
  }

  // Revenues: unique ids.
  findDuplicates(d.revenues.items.map((r) => r.id)).forEach((id) =>
    err('revenues', 'items', `duplicate revenue id "${id}"`),
  );

  // Spending: the 10 COFOG divisions, each group nested under its division.
  const divisionCodes = d.spending.divisions.map((div) => div.code);
  findDuplicates(divisionCodes).forEach((code) =>
    err('spending', 'divisions', `duplicate COFOG division "${code}"`),
  );
  const groupCodes: string[] = [];
  d.spending.divisions.forEach((div, i) => {
    div.groups.forEach((g, j) => {
      groupCodes.push(g.code);
      if (!g.code.startsWith(`${div.code}.`)) {
        err(
          'spending',
          `divisions[${i}].groups[${j}].code`,
          `"${g.code}" is not in division "${div.code}"`,
        );
      }
    });
  });
  findDuplicates(groupCodes).forEach((code) =>
    err('spending', 'divisions', `duplicate COFOG group "${code}"`),
  );

  // Tax brackets: thresholds strictly increasing.
  checkAscending(d.taxRules.incomeTax.brackets, 'incomeTax.brackets', err);
  checkAscending(d.taxRules.wealthTax.brackets, 'wealthTax.brackets', err);
  checkAscending(
    d.taxRules.highIncomeContribution.brackets,
    'highIncomeContribution.brackets',
    err,
  );
  checkAscending(
    d.taxRules.highIncomeContribution.coupleBrackets,
    'highIncomeContribution.coupleBrackets',
    err,
  );

  // Profiles: unique ids, known in-kind key.
  findDuplicates(d.profiles.profiles.map((p) => p.id)).forEach((id) =>
    err('profiles', 'profiles', `duplicate profile id "${id}"`),
  );
  const allocationKeys = new Set(d.inKindAllocation.keys.map((k) => k.id));
  findDuplicates(d.inKindAllocation.keys.map((k) => k.id)).forEach((id) =>
    err('inKindAllocation', 'keys', `duplicate key "${id}"`),
  );
  d.profiles.profiles.forEach((p, i) => {
    for (const key of p.inKindKeys) {
      if (!allocationKeys.has(key)) {
        err('profiles', `profiles[${i}].inKindKeys`, `unknown in-kind key "${key}"`);
      }
    }
  });

  // Consumption: VAT shares sum to 1 once all are known.
  for (const [profileId, entry] of Object.entries(d.consumption.byProfile)) {
    const shares = Object.values(entry.vatShares).map((s) => s.value);
    if (shares.every((s) => s !== null)) {
      const sum = shares.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > VAT_SHARES_TOLERANCE) {
        err('consumption', `byProfile.${profileId}.vatShares`, `shares sum to ${sum}, expected 1`);
      }
    }
  }

  // In-kind allocation: exactly one rule per COFOG group, amounts only where needed.
  const knownGroups = new Set(groupCodes);
  const ruleCodes = d.inKindAllocation.rules.map((r) => r.cofog);
  findDuplicates(ruleCodes).forEach((code) =>
    err('inKindAllocation', 'rules', `duplicate rule for COFOG "${code}"`),
  );
  d.inKindAllocation.rules.forEach((rule, i) => {
    const path = `rules[${i}]`;
    if (!knownGroups.has(rule.cofog)) {
      err(
        'inKindAllocation',
        `${path}.cofog`,
        `COFOG group "${rule.cofog}" is not in spending.json`,
      );
    }
    if (rule.mode !== 'perCapita') {
      if (rule.index !== undefined) {
        err('inKindAllocation', `${path}.index`, `only allowed with mode "perCapita"`);
      }
      if (rule.indexByKey !== undefined) {
        err('inKindAllocation', `${path}.indexByKey`, `only allowed with mode "perCapita"`);
      }
    }
    for (const key of Object.keys(rule.indexByKey ?? {})) {
      if (!allocationKeys.has(key)) {
        err('inKindAllocation', `${path}.indexByKey`, `unknown key "${key}"`);
      }
    }
  });
  const covered = new Set(ruleCodes);
  for (const code of groupCodes) {
    if (!covered.has(code)) err('inKindAllocation', 'rules', `no rule for COFOG group "${code}"`);
  }

  return errors;
}

function checkAscending(
  brackets: { threshold: { value: number | null } }[],
  path: string,
  err: (file: DataFileName, path: string, message: string) => void,
) {
  let previous = -Infinity;
  brackets.forEach((b, i) => {
    const t = b.threshold.value;
    if (t === null) return;
    if (t <= previous)
      err('taxRules', `${path}[${i}].threshold`, 'thresholds must be strictly increasing');
    previous = t;
  });
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) (seen.has(v) ? dupes : seen).add(v);
  return [...dupes];
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function emptyCounts(): Record<Status, number> {
  return Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
}

function buildReport(d: Dataset): DataReport {
  const counts = { total: emptyCounts() } as DataReport['counts'];
  const pending: StatusEntry[] = [];

  for (const name of DATA_FILE_NAMES) {
    counts[name] = emptyCounts();
    walk(d[name], '', (node, path) => {
      const status = node['status'];
      if (!isStatus(status)) return;
      counts[name][status] += 1;
      counts.total[status] += 1;
      if (status !== 'VERIFIE') {
        const note = node['note'];
        pending.push({ file: name, path, status, ...(typeof note === 'string' ? { note } : {}) });
      }
    });
  }
  return { counts, pending };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPath(path: PropertyKey[]): string {
  if (path.length === 0) return '(root)';
  return path
    .map((p, i) => (typeof p === 'number' ? `[${p}]` : `${i === 0 ? '' : '.'}${String(p)}`))
    .join('');
}

/**
 * Pop-up texts of the levers: valid shape, one entry per lever (no more, no less),
 * and every cited source registered in sources.json.
 */
export function validateExplanations(
  raw: unknown,
  sourceIds: ReadonlySet<string>,
  leverIds: readonly string[],
): string[] {
  const parsed = explanationsFileSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map(
      (issue) => `explanations.json: ${formatPath(issue.path)}: ${issue.message}`,
    );
  }
  const entries = parsed.data.entries;
  const errors = findDuplicates(entries.map((e) => e.id)).map(
    (id) => `explanations.json: duplicate entry "${id}"`,
  );
  const seen = new Set(entries.map((e) => e.id));
  const levers = new Set(leverIds);
  for (const entry of entries) {
    if (!levers.has(entry.id)) errors.push(`explanations.json: unknown lever "${entry.id}"`);
    for (const id of entry.sourceIds) {
      if (!sourceIds.has(id))
        errors.push(`explanations.json: ${entry.id}: unknown sourceId "${id}"`);
    }
  }
  for (const id of leverIds) {
    if (!seen.has(id)) errors.push(`explanations.json: missing entry for lever "${id}"`);
  }
  return errors;
}
