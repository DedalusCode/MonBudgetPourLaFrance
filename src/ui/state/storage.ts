// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Browser-only helpers: whether the code runs in a browser (not in the server render of
 * the tests), and choices kept in this browser's localStorage, never sent anywhere.
 */

export const browser = typeof window !== 'undefined';

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, quota): the choice lasts for this visit only.
  }
}

/** Whether the screen is phone-sized (the lever panel is then a bottom sheet). */
export const PHONE_QUERY = '(max-width: 52rem)';
