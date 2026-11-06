// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Visual style (four designs) and light/dark mode, stored in this browser only.
 * index.html applies the same choice before the first paint to avoid a flash;
 * keep the storage keys and defaults in sync with its inline script.
 */
export type Style = 'prestige' | 'populaire' | 'gazette' | 'neon';
export type Mode = 'light' | 'dark';

export const STYLES: { id: Style; label: string; preferredMode?: Mode }[] = [
  { id: 'gazette', label: 'Gazette : papier et encre' },
  { id: 'prestige', label: 'Prestige : noir et or', preferredMode: 'dark' },
  { id: 'populaire', label: 'Populaire : simple et coloré' },
  { id: 'neon', label: 'Néon : tableau de bord', preferredMode: 'dark' },
];

export const DEFAULT_STYLE: Style = 'gazette';
export const STYLE_KEY = 'style';
export const MODE_KEY = 'theme';

export const isStyle = (value: unknown): value is Style => STYLES.some((s) => s.id === value);
export const isMode = (value: unknown): value is Mode => value === 'light' || value === 'dark';

export function systemMode(): Mode {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Mode shown for a style: the stored choice, else the style's own mode, else the system's. */
export function modeFor(style: Style, stored: string | null): Mode {
  if (isMode(stored)) return stored;
  return STYLES.find((s) => s.id === style)?.preferredMode ?? systemMode();
}
