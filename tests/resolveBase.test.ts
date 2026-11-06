// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { resolveBase } from '../config/resolveBase.ts';

describe('resolveBase', () => {
  it('defaults to root when unset or empty', () => {
    expect(resolveBase(undefined)).toBe('/');
    expect(resolveBase('')).toBe('/');
    expect(resolveBase('  ')).toBe('/');
    expect(resolveBase('/')).toBe('/');
  });

  it('wraps the repository name in slashes', () => {
    expect(resolveBase('MonBudgetPourLaFrance')).toBe('/MonBudgetPourLaFrance/');
    expect(resolveBase('/MonBudgetPourLaFrance')).toBe('/MonBudgetPourLaFrance/');
    expect(resolveBase('/MonBudgetPourLaFrance/')).toBe('/MonBudgetPourLaFrance/');
    expect(resolveBase('//MonBudgetPourLaFrance//')).toBe('/MonBudgetPourLaFrance/');
  });
});
