// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Scenario in the URL (PLAN.MD §8.3): `#s=` + base64url(JSON). The landing page is
 * the bare address; other pages use `#/simulateur`, `#/methodologie`, `#/sources`,
 * `#/a-propos`. A shared scenario (`#s=…`) always opens the simulator.
 */
import { migrateScenario, type MigrationResult, type Scenario } from '../../engine/scenario.ts';

export type Page = 'home' | 'simulator' | 'methodology' | 'sources' | 'about';

const PAGE_PATHS: Record<Exclude<Page, 'home'>, string> = {
  simulator: 'simulateur',
  methodology: 'methodologie',
  sources: 'sources',
  about: 'a-propos',
};

export function pageHash(page: Page): string {
  return page === 'home' ? '#' : `#/${PAGE_PATHS[page]}`;
}

export function pageFromHash(hash: string): Page {
  if (hash.startsWith('#s=')) return 'simulator';
  const path = hash.replace(/^#\/?/, '');
  const entry = Object.entries(PAGE_PATHS).find(([, p]) => p === path);
  return entry ? (entry[0] as Page) : 'home';
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/** Hash for a scenario; empty when no lever is modified. */
export function scenarioHash(scenario: Scenario): string {
  return Object.keys(scenario.levers).length === 0
    ? ''
    : `#s=${toBase64Url(JSON.stringify(scenario))}`;
}

/** Address of the simulator showing this scenario (its own page when nothing is modified). */
export function simulatorHash(scenario: Scenario): string {
  return scenarioHash(scenario) || pageHash('simulator');
}

/** Scenario read from a hash, or null when the hash carries none. Throws if it is invalid. */
export function scenarioFromHash(
  hash: string,
  knownLeverIds: { has(id: string): boolean },
): MigrationResult | null {
  const match = /^#s=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!match?.[1]) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(match[1]));
  } catch {
    throw new Error('Lien de scénario illisible.');
  }
  return migrateScenario(raw, knownLeverIds);
}
