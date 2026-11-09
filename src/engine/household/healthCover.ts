// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Complémentaire santé solidaire: a health cover, not a payment. The result says whether
 * the household is entitled to it, free or with a monthly participation by member; it is
 * not added to the benefits received (health care is already counted in the services).
 */
import type { Rules } from '../rules.ts';

export type HealthCoverStatus = 'none' | 'free' | 'participation';

export interface HealthCoverInput {
  /** Ages of every member of the household. */
  ages: number[];
  /** Annual resources of the household over twelve months, housing flat rate excluded. */
  annualResources: number;
  /** Monthly housing flat rate added to the resources (owner, free housing, housing aid). */
  monthlyHousingFlatRate: number;
  /** RSA beneficiaries are entitled to the free cover. */
  rsa: boolean;
}

export interface HealthCoverResult {
  status: HealthCoverStatus;
  /** Monthly participation of the household (0 when free or not entitled). */
  monthlyParticipation: number;
}

function ceilingFor(ceilings: number[], perExtra: number, persons: number): number {
  const known = Math.min(persons, ceilings.length);
  return (ceilings[known - 1] ?? 0) + Math.max(0, persons - ceilings.length) * perExtra;
}

export function healthCover(input: HealthCoverInput, rules: Rules): HealthCoverResult {
  const c = rules.socialBenefits.healthCover;
  if (input.rsa) return { status: 'free', monthlyParticipation: 0 };
  const persons = Math.max(1, input.ages.length);
  const resources = input.annualResources + 12 * input.monthlyHousingFlatRate;
  if (resources <= ceilingFor(c.freeCeilings, c.freePerExtraPerson, persons)) {
    return { status: 'free', monthlyParticipation: 0 };
  }
  if (resources <= ceilingFor(c.participationCeilings, c.participationPerExtraPerson, persons)) {
    const participation = input.ages.reduce((sum, age) => {
      const band = c.participationByAge.find((b) => age <= b.maxAge);
      return sum + (band ? band.amount : c.participationFrom70);
    }, 0);
    return { status: 'participation', monthlyParticipation: participation };
  }
  return { status: 'none', monthlyParticipation: 0 };
}
