// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  formatBillions,
  formatField,
  formatLeverValue,
  formatPercent,
  parseField,
  signed,
  formatBillionsChange,
} from '../../src/ui/format.ts';

// French formatting uses narrow no-break spaces; compare without them.
const plain = (text: string) => text.replace(new RegExp('[\\u00a0\\u202f]', 'g'), ' ');

describe('display', () => {
  it('formats billions and percentages in French', () => {
    expect(plain(formatBillions(1503.4711))).toBe('1 503,5 Md€');
    expect(plain(formatPercent(0.205))).toBe('20,5 %');
  });

  it('signs variations with a true minus sign', () => {
    expect(signed('1,2 Md€', 1.2)).toBe('+1,2 Md€');
    expect(signed('1,2 Md€', -1.2)).toBe('−1,2 Md€');
    expect(signed('0 Md€', 0)).toBe('0 Md€');
  });

  it('shows lever values in their unit', () => {
    expect(plain(formatLeverValue({ unit: 'rate' }, 0.2))).toBe('20,0 %');
    expect(plain(formatLeverValue({ unit: 'change' }, 0.05))).toBe('+5 %');
    expect(plain(formatLeverValue({ unit: 'change' }, -0.05))).toBe('−5 %');
    expect(plain(formatLeverValue({ unit: 'points' }, 0.005))).toBe('+0,5 pt');
    expect(plain(formatLeverValue({ unit: 'eur' }, 1_300_000))).toBe('1 300 000 €');
    expect(plain(formatLeverValue({ unit: 'tariff', unitLabel: '€/hl' }, 60.75))).toBe(
      '60,75 €/hl',
    );
  });

  it('fills the input field without unit', () => {
    expect(formatField({ unit: 'rate' }, 0.205)).toBe('20,5');
    expect(formatField({ unit: 'rate' }, 0.2)).toBe('20');
    expect(plain(formatField({ unit: 'eur' }, 1_300_000))).toBe('1 300 000');
  });
});

describe('input field parsing', () => {
  const vat = { unit: 'rate' as const, min: 0.16, max: 0.24 };

  it('accepts a decimal comma, a dot, spaces and units', () => {
    expect(parseField(vat, '20,5')).toEqual({ ok: true, value: 0.205, clamped: false });
    expect(parseField(vat, ' 20.5 % ')).toEqual({ ok: true, value: 0.205, clamped: false });
    expect(parseField({ unit: 'eur', min: 0, max: 2e6 }, '1 300 000 €')).toEqual({
      ok: true,
      value: 1_300_000,
      clamped: false,
    });
    expect(parseField({ unit: 'change', min: -0.2, max: 0.2 }, '−5')).toEqual({
      ok: true,
      value: -0.05,
      clamped: false,
    });
  });

  it('clamps to the slider bounds', () => {
    expect(parseField(vat, '30')).toEqual({ ok: true, value: 0.24, clamped: true });
    expect(parseField(vat, '10')).toEqual({ ok: true, value: 0.16, clamped: true });
  });

  it('goes beyond the slider bounds in extended mode, within physical limits', () => {
    expect(parseField(vat, '30', true)).toEqual({ ok: true, value: 0.3, clamped: false });
    expect(parseField(vat, '150', true)).toEqual({ ok: true, value: 1, clamped: true });
    expect(parseField({ unit: 'change', min: -0.2, max: 0.2 }, '-150', true)).toEqual({
      ok: true,
      value: -1,
      clamped: true,
    });
    expect(parseField({ unit: 'points', min: -0.02, max: 0.02 }, '3', true)).toMatchObject({
      value: 0.03,
    });
    expect(parseField({ unit: 'eur', min: 1e6, max: 2e6 }, '5000000', true)).toMatchObject({
      value: 5e6,
    });
  });

  it('reports invalid input', () => {
    for (const text of ['', 'abc', '20,5,1', '--3']) {
      const result = parseField(vat, text);
      expect(result.ok).toBe(false);
    }
  });
});

describe('changes of an amount in billions', () => {
  it('switch to M€ then € so that a small change stays readable', () => {
    expect(formatBillionsChange(15)).toMatch(/^15,0\sMd€$/);
    expect(formatBillionsChange(0.0032)).toMatch(/^3,2\sM€$/);
    expect(formatBillionsChange(0.00000075)).toMatch(/^750\s€$/);
    expect(formatBillionsChange(1e-9)).toMatch(/^1\s€$/);
  });
});

describe('fuel excise tariffs, stored in €/hl and shown in €/L', () => {
  const diesel = {
    unit: 'tariff' as const,
    unitLabel: '€/L',
    displayScale: 0.01,
    min: 48.6,
    max: 72.9,
  };

  it('shows the tariff per litre with four decimals', () => {
    expect(plain(formatLeverValue(diesel, 60.75))).toBe('0,6075 €/L');
    expect(formatField(diesel, 60.75)).toBe('0,6075');
  });

  it('reads a price per litre back into €/hl', () => {
    expect(parseField(diesel, '0,65')).toEqual({ ok: true, value: 65, clamped: false });
    expect(parseField(diesel, '0,65 €/L')).toMatchObject({ ok: true, value: 65 });
    expect(parseField(diesel, '1')).toEqual({ ok: true, value: 72.9, clamped: true });
  });
});
