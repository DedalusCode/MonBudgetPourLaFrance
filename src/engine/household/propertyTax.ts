// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Property tax. There is no national rate: the amount comes from the tax notice
 * (entered by the user, or the profile's default); the `propertyTax.change` lever
 * scales it before it reaches here (ScenarioFactors.propertyTax, PLAN.MD §6.1).
 */
import type { HouseholdInput } from './input.ts';

export function propertyTax(input: Pick<HouseholdInput, 'propertyTax'>): number {
  return Math.max(0, input.propertyTax);
}
