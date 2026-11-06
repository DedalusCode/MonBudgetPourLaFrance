// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Normalizes the public base path used by Vite.
 *
 * GitHub Pages serves a project site under `/<repo-name>/`, so the deploy
 * workflow passes `BASE_PATH=/<repo-name>/`. Locally the variable is unset
 * and the app is served from `/`.
 */
export function resolveBase(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '' || trimmed === '/') return '/';
  const inner = trimmed.replace(/^\/+|\/+$/g, '');
  return `/${inner}/`;
}
