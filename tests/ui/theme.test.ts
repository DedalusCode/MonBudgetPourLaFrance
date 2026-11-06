// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** WCAG contrast of every style × mode palette declared in src/ui/app.css. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, MODE_KEY, STYLE_KEY, STYLES } from '../../src/ui/state/theme.ts';

const css = readFileSync(new URL('../../src/ui/app.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Colour tokens of each rule whose selector list matches `selector` exactly. */
function block(selector: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = (match[1] ?? '').split(',').map((s) => s.trim().replace(/\s+/g, ' '));
    if (!selectors.includes(selector)) continue;
    for (const decl of (match[2] ?? '').matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})/gi)) {
      tokens[decl[1] ?? ''] = decl[2] ?? '';
    }
  }
  return tokens;
}

function palette(style: string, mode: 'light' | 'dark'): Record<string, string> {
  const light = block(`:root[data-style='${style}']`);
  return mode === 'light'
    ? light
    : { ...light, ...block(`:root[data-style='${style}'][data-theme='dark']`) };
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** [foreground, background, minimum ratio]: 4.5 for text, 3 for UI components. */
const PAIRS: [string, string, number][] = [
  ['color-text', 'color-bg', 4.5],
  ['color-text', 'color-surface', 4.5],
  ['color-text', 'color-card', 4.5],
  ['color-text', 'color-summary-bg', 4.5],
  ['color-text-muted', 'color-bg', 4.5],
  ['color-text-muted', 'color-surface', 4.5],
  ['color-text-muted', 'color-card', 4.5],
  ['color-accent', 'color-bg', 4.5],
  ['color-accent', 'color-surface', 4.5],
  ['color-on-accent', 'color-accent', 4.5],
  ['color-on-highlight', 'color-highlight', 4.5],
  ['color-text', 'color-accent-soft', 4.5],
  ['color-header-text', 'color-header-bg', 4.5],
  ['color-header-accent', 'color-header-bg', 4.5],
  ['color-text', 'color-warning-bg', 4.5],
  ['color-error', 'color-bg', 4.5],
  ['color-gain', 'color-card', 4.5],
  ['color-loss', 'color-card', 4.5],
  ['color-gain', 'color-surface', 4.5],
  ['color-loss', 'color-surface', 4.5],
  ['color-text', 'color-tile', 4.5],
  ['color-text', 'color-up-fill', 4.5],
  ['color-text', 'color-down-fill', 4.5],
  ['color-border-strong', 'color-card', 3],
  ['color-focus', 'color-bg', 3],
  ['color-up', 'color-bg', 3],
  ['color-down', 'color-bg', 3],
];

describe('theme palettes', () => {
  for (const { id } of STYLES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${id} ${mode} meets WCAG AA`, () => {
        const colours = palette(id, mode);
        const failures = PAIRS.flatMap(([fg, bg, min]) => {
          const a = colours[fg];
          const b = colours[bg];
          if (!a || !b) return [`${fg} / ${bg}: missing`];
          const ratio = contrast(a, b);
          return ratio >= min ? [] : [`${fg} / ${bg}: ${ratio.toFixed(2)} < ${min}`];
        });
        expect(failures).toEqual([]);
      });
    }
  }
});

describe('pre-paint theme script of index.html', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const script = html.slice(html.indexOf('<script>'), html.indexOf('</script>'));

  it('knows the same styles, default and dark-first styles as state/theme.ts', () => {
    const others = STYLES.filter((s) => s.id !== DEFAULT_STYLE).map((s) => `'${s.id}'`);
    expect(script).toContain(
      `[${others.join(', ')}].indexOf(style) < 0) style = '${DEFAULT_STYLE}'`,
    );
    for (const { id, preferredMode } of STYLES) {
      expect(script.includes(`style === '${id}'`), id).toBe(preferredMode === 'dark');
    }
    expect(script).toContain(`get('${STYLE_KEY}')`);
    expect(script).toContain(`get('${MODE_KEY}')`);
  });
});
