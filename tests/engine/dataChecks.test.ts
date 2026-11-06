// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { validateDataset, type RawDataset } from '../../src/engine/dataChecks.ts';
import { loadDataset, rawDataset } from '../../src/engine/params.ts';
import type { Dataset, Source } from '../../src/engine/types.ts';

/** Deep copy of the bundled data, typed so that tests can tweak it. */
function cloneData(): Dataset {
  return structuredClone(rawDataset) as unknown as Dataset;
}

/** Array element that must exist, without a non-null assertion. */
function nth<T>(items: T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`No element at index ${index}`);
  return item;
}

function errorsOf(data: Dataset): string[] {
  return validateDataset(data as unknown as RawDataset).errors;
}

const testSource: Source = {
  id: 'test-source',
  title: 'Source de test',
  publisher: 'Test',
  url: 'https://example.org/',
  accessed: '2026-11-02',
};

describe('bundled data files', () => {
  it('are valid', () => {
    expect(validateDataset(rawDataset).errors).toEqual([]);
    expect(() => loadDataset()).not.toThrow();
  });

  it('cover the 11 profiles and the 10 COFOG divisions', () => {
    const data = loadDataset();
    expect(data.profiles.profiles.map((p) => p.id)).toEqual([
      'student',
      'apprentice',
      'retiree1000',
      'smic',
      'employee1800',
      'retiree2500',
      'artisan',
      'cadre3k',
      'cadre10k',
      'rentier5m',
      'fortune100m',
    ]);
    expect(data.spending.divisions.map((d) => d.code)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
    ]);
  });
});

describe('schema rules', () => {
  it('rejects a rate outside [0, 1]', () => {
    const data = cloneData();
    data.taxRules.vat.standard.value = 20;
    expect(errorsOf(data)).toEqual([
      expect.stringMatching(/^taxRules\.json: vat\.standard\.value: .*between 0 and 1/),
    ]);
  });

  it('rejects a unit that does not match the field', () => {
    const data = cloneData();
    (data.macro.gdp as { unit: string }).unit = 'eur';
    expect(errorsOf(data)[0]).toMatch(/^macro\.json: gdp\.unit:/);
  });

  it('requires value, source and date for VERIFIE', () => {
    const data = cloneData();
    data.macro.gdp = { ...data.macro.gdp, value: null, sourceId: null, asOf: null };
    const errors = errorsOf(data);
    expect(errors).toHaveLength(3);
    expect(errors.join('\n')).toMatch(/gdp\.value/);
    expect(errors.join('\n')).toMatch(/gdp\.sourceId/);
    expect(errors.join('\n')).toMatch(/gdp\.asOf/);
  });

  it('requires a note for HYPOTHESE', () => {
    const data = cloneData();
    data.macro.projectionHorizon.note = undefined;
    expect(errorsOf(data)).toEqual([expect.stringMatching(/projectionHorizon\.note/)]);
  });

  it('rejects unknown fields', () => {
    const data = cloneData();
    (data.meta as Record<string, unknown>)['extra'] = 1;
    expect(errorsOf(data)).toHaveLength(1);
  });
});

describe('cross-file rules', () => {
  it('accepts a VERIFIE value whose source is registered', () => {
    const data = cloneData();
    data.sources.sources.push(testSource);
    data.taxRules.vat.standard = {
      ...data.taxRules.vat.standard,
      value: 0.2,
      sourceId: testSource.id,
      asOf: '2026-01-01',
      status: 'VERIFIE',
    };
    expect(errorsOf(data)).toEqual([]);
  });

  it('rejects an unknown sourceId', () => {
    const data = cloneData();
    data.macro.gdp.sourceId = 'does-not-exist';
    expect(errorsOf(data)).toEqual(['macro.json: gdp: unknown sourceId "does-not-exist"']);
  });

  it('rejects duplicate source ids', () => {
    const data = cloneData();
    data.sources.sources.push(testSource, { ...testSource });
    expect(errorsOf(data)).toEqual([expect.stringMatching(/duplicate source id "test-source"/)]);
  });

  it('rejects a COFOG group outside its division', () => {
    const data = cloneData();
    nth(nth(data.spending.divisions, 0).groups, 0).code = '02.9';
    const errors = errorsOf(data);
    expect(errors).toContain(
      'spending.json: divisions[0].groups[0].code: "02.9" is not in division "01"',
    );
  });

  it('requires one allocation rule per COFOG group', () => {
    const data = cloneData();
    data.inKindAllocation.rules.pop();
    expect(errorsOf(data)).toEqual([
      'inKindAllocation.json: rules: no rule for COFOG group "10.9"',
    ]);
  });

  it('rejects an unknown in-kind key on a profile', () => {
    const data = cloneData();
    nth(data.profiles.profiles, 0).inKindKeys = ['unknownKey'];
    expect(errorsOf(data)).toEqual([
      'profiles.json: profiles[0].inKindKeys: unknown in-kind key "unknownKey"',
    ]);
  });

  it('rejects non-increasing tax brackets', () => {
    const data = cloneData();
    nth(data.taxRules.incomeTax.brackets, 0).threshold.value = 1000;
    nth(data.taxRules.incomeTax.brackets, 1).threshold.value = 1000;
    expect(errorsOf(data)).toEqual([
      'taxRules.json: incomeTax.brackets[1].threshold: thresholds must be strictly increasing',
    ]);
  });

  it('rejects VAT shares that do not sum to 1', () => {
    const data = cloneData();
    for (const share of Object.values(data.consumption.byProfile.smic.vatShares)) share.value = 0.1;
    expect(errorsOf(data)).toEqual([
      expect.stringMatching(/^consumption\.json: byProfile\.smic\.vatShares: shares sum to 0\.5/),
    ]);
  });
});

describe('report', () => {
  it('counts statuses per file and overall', () => {
    const { report } = validateDataset(rawDataset);
    if (report === null) throw new Error('Expected a report');
    const counts = report.counts;
    expect(counts.spending).toEqual({ VERIFIE: 69, A_VERIFIER: 0, HYPOTHESE: 1 });
    const total = counts.total.VERIFIE + counts.total.A_VERIFIER + counts.total.HYPOTHESE;
    expect(report.pending).toHaveLength(total - counts.total.VERIFIE);
    expect(report.pending).toContainEqual(
      expect.objectContaining({ file: 'macro', path: 'projectionHorizon', status: 'HYPOTHESE' }),
    );
  });
});

describe('in-kind allocation checks', () => {
  const index = {
    value: 1,
    unit: 'coefficient' as const,
    sourceId: null,
    asOf: null,
    status: 'A_VERIFIER' as const,
  };

  it('restricts the index fields to the per-capita mode', () => {
    const data = cloneData();
    const rule = nth(data.inKindAllocation.rules, 2);
    rule.mode = 'notAllocated';
    rule.index = index;
    rule.indexByKey = {};
    expect(errorsOf(data)).toEqual([
      'inKindAllocation.json: rules[2].index: only allowed with mode "perCapita"',
      'inKindAllocation.json: rules[2].indexByKey: only allowed with mode "perCapita"',
    ]);
  });

  it('rejects unknown keys in indices', () => {
    const data = cloneData();
    nth(data.inKindAllocation.rules, 2).indexByKey = { other: index };
    expect(errorsOf(data)).toEqual([
      'inKindAllocation.json: rules[2].indexByKey: unknown key "other"',
    ]);
  });

  it('rejects duplicate rules and rules for unknown groups', () => {
    const data = cloneData();
    nth(data.inKindAllocation.rules, 1).cofog = nth(data.inKindAllocation.rules, 0).cofog;
    nth(data.inKindAllocation.rules, 2).cofog = '01.9';
    const errors = errorsOf(data);
    expect(errors).toContain('inKindAllocation.json: rules: duplicate rule for COFOG "01.1"');
    expect(errors).toContain(
      'inKindAllocation.json: rules[2].cofog: COFOG group "01.9" is not in spending.json',
    );
  });

  it('makes loadDataset throw on invalid data', () => {
    const data = cloneData();
    data.macro.gdp.sourceId = 'does-not-exist';
    expect(() => loadDataset(data as unknown as RawDataset)).toThrow('Invalid data files');
  });
});

describe('bundled data used by the browser', () => {
  it('is the validated data, unchanged', async () => {
    const { bundledDataset } = await import('../../src/engine/bundledData.ts');
    expect(bundledDataset()).toEqual(loadDataset());
  });
});
