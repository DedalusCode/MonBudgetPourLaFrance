// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Display helpers (French formatting) and parsing of the lever input fields.
 * Pure functions, no UI dependency.
 */
import type { Lever, LeverUnit } from '../engine/levers.ts';

// Formatters are built once per set of options: they run on every slider input.
const formatters = new Map<string, Intl.NumberFormat>();
function formatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat('fr-FR', options);
    formatters.set(key, cached);
  }
  return cached;
}

/** French number with exactly `digits` decimals. */
const number = (digits: number) =>
  formatter({ minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Billions of euros, e.g. "1 503,5 Md€". */
export function formatBillions(value: number, digits = 1): string {
  return `${number(digits).format(value)} Md€`;
}

/** Smallest change shown, in billions of euros: anything that rounds to 1 € or more. */
export const ONE_EURO_IN_BILLIONS = 0.5e-9;

/**
 * An amount of change given in billions, in the unit that keeps it readable: "15,0 Md€",
 * "3,2 M€" or "750 €" (a tiny change must not read "0,0 Md€").
 */
export function formatBillionsChange(billions: number): string {
  const abs = Math.abs(billions);
  if (abs >= 0.05) return formatBillions(billions);
  if (abs >= 0.00005) return `${number(1).format(billions * 1e3)} M€`;
  return formatEuros(billions * 1e9);
}

export function formatEuros(value: number): string {
  return `${number(0).format(value)} €`;
}

/** A fraction as a percentage, e.g. 0.205 → "20,5 %". */
export function formatPercent(value: number, digits = 1): string {
  return `${number(digits).format(value * 100)} %`;
}

/** Text as compared by the search fields: lower case, without accents. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Signed variation, e.g. "+1,2 Md€" or "−0,4 pt"; the minus sign is U+2212. */
export function signed(text: string, value: number): string {
  if (value > 0) return `+${text}`;
  if (value < 0) return `−${text.replace(/^-/, '')}`;
  return text;
}

/** Number of decimals shown in the input field for a lever. */
function fieldDigits(unit: LeverUnit): number {
  return unit === 'eur' || unit === 'change' ? 0 : 1;
}

type Displayed = Pick<Lever, 'unit'> & { displayScale?: number | undefined };

/** Units shown as amounts rather than percentages. */
const isAmount = (unit: LeverUnit) => unit === 'eur' || unit === 'billions' || unit === 'tariff';

/** Converts a lever value to the number shown in its input field (percent, points, euros). */
export function toField(lever: Displayed, value: number): number {
  return isAmount(lever.unit) ? value * (lever.displayScale ?? 1) : value * 100;
}

export function fromField(lever: Displayed, field: number): number {
  return isAmount(lever.unit) ? field / (lever.displayScale ?? 1) : field / 100;
}

/** A tariff shown in a smaller unit (€/L) needs more decimals. */
const tariffDigits = (lever: Displayed) => (lever.displayScale === undefined ? 2 : 4);

export function fieldSuffix(lever: Pick<Lever, 'unit' | 'unitLabel'>): string {
  switch (lever.unit) {
    case 'rate':
    case 'change':
      return '%';
    case 'points':
      return 'pt';
    case 'eur':
      return '€';
    case 'billions':
      return 'Md€';
    case 'tariff':
      return lever.unitLabel ?? '€';
  }
}

/** Decimals for an amount in Md€: more for small amounts. */
function billionDigits(value: number): number {
  const size = Math.abs(value);
  return size >= 10 ? 1 : size >= 1 ? 2 : 3;
}

/** Value of a lever as shown next to its slider, e.g. "20,5 %", "+5 %", "+0,5 pt". */
export function formatLeverValue(
  lever: Pick<Lever, 'unit' | 'unitLabel'> & Displayed,
  value: number,
): string {
  const digits =
    lever.unit === 'billions'
      ? billionDigits(value)
      : lever.unit === 'tariff'
        ? tariffDigits(lever)
        : fieldDigits(lever.unit);
  const shown = number(digits).format(Math.abs(toField(lever, value)));
  const text = `${shown} ${fieldSuffix(lever)}`;
  if (lever.unit === 'rate' || isAmount(lever.unit)) return text;
  return signed(text, value);
}

/** Text of the input field for a value (no unit, comma decimal). */
export function formatField(lever: Displayed, value: number): string {
  const field = toField(lever, value);
  return formatter({
    maximumFractionDigits: lever.unit === 'tariff' ? tariffDigits(lever) : 3,
    useGrouping: isAmount(lever.unit),
  }).format(field);
}

export type ParseResult =
  { ok: true; value: number; clamped: boolean } | { ok: false; error: string };

/** Physical limits that hold even with extended bounds. */
function physicalBounds(unit: LeverUnit): [number, number] {
  switch (unit) {
    case 'rate':
      return [0, 1];
    case 'change':
      return [-1, Infinity];
    case 'points':
      return [-1, 1];
    case 'eur':
    case 'billions':
    case 'tariff':
      return [0, Infinity];
  }
}

/**
 * Parses what the user typed in a lever field ("20,5", "20.5 %", "-3", "1 300 000").
 * The value is clamped to the slider bounds, or only to physical limits in
 * extended-bounds mode.
 */
export function parseField(
  lever: Pick<Lever, 'min' | 'max'> & Displayed,
  text: string,
  extendedBounds = false,
): ParseResult {
  const cleaned = text
    .replace(/\s/g, '') // also removes no-break spaces
    .replace(/\/(l|hl|mwh)$/i, '') // unit typed after the number, e.g. "0,65 €/L"
    .replace(/[%€]|pts?$/gi, '')
    .replace('\u2212', '-')
    .replace(',', '.');
  if (cleaned === '' || !/^[-+]?\d*\.?\d+$/.test(cleaned)) {
    return { ok: false, error: 'Saisie invalide : indiquez un nombre, par exemple 20,5.' };
  }
  const value = fromField(lever, Number(cleaned));
  const [low, high] = extendedBounds ? physicalBounds(lever.unit) : [lever.min, lever.max];
  const bounded = Math.min(high, Math.max(low, value));
  return { ok: true, value: bounded, clamped: bounded !== value };
}

const UNIT_SUFFIX: Record<string, string> = {
  eur: '€',
  eur_hour: '€/h',
  eur_month: '€/mois',
  eur_year: '€/an',
  eur_bn: 'Md€',
  hours_week: 'h/semaine',
  hours_month: 'h/mois',
  hours_year: 'h/an',
  count: '',
  years: 'ans',
  parts: 'part(s)',
  multiple: '×',
  coefficient: '',
  eur_per_hl: '€/hl',
  eur_per_mwh: '€/MWh',
};

/** A data value with its unit, e.g. "20 %", "48 060 €/an", "1 503,47 Md€". */
export function formatDataValue(value: number | null, unit: string): string {
  if (value === null) return 'à renseigner';
  if (unit === 'gdp_share') {
    return `${formatter({ maximumFractionDigits: 2 }).format(value * 100)} % du PIB`;
  }
  if (unit === 'rate' || unit === 'share') {
    return `${formatter({ maximumFractionDigits: 3 }).format(value * 100)} %`;
  }
  const text = formatter({ maximumFractionDigits: 4 }).format(value);
  const suffix = UNIT_SUFFIX[unit] ?? unit;
  return suffix ? `${text} ${suffix}` : text;
}
