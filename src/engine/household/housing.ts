// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Housing aid of a tenant in an ordinary rented home (CCH D823-16, arrêté du 27 septembre
 * 2019): L + C − Pp, with the personal participation Pp = P0 + Tp × (R − R0). Not modelled:
 * wealth, rooms and shared flats, social housing rent reduction (RLS), overseas, and the
 * reference period of the resources (the simulated year stands for it).
 */
import type { Rules } from '../rules.ts';

export type HousingZone = 1 | 2 | 3;

export interface HousingAidInput {
  zone: HousingZone;
  /** Monthly rent, charges excluded. */
  rent: number;
  couple: boolean;
  /** Dependent children. */
  dependents: number;
  /** Annual net income of the household (revenus nets catégoriels). */
  annualResources: number;
  /** A student claimant: resources are at least a flat amount. */
  student: boolean;
  /** Student receiving a grant (lower flat amount). */
  grantHolder: boolean;
  /** No taper when the household receives the AAH. */
  disabilityBenefit: boolean;
}

export interface HousingAidResult {
  /** Rent taken into account (L). */
  rent: number;
  /** Flat charges (C). */
  charges: number;
  /** Personal participation (Pp). */
  participation: number;
  /** Monthly aid before the CRDS. */
  gross: number;
  /** Monthly aid paid: after the CRDS, rounded down to the euro. */
  net: number;
}

type Composition = { couple: boolean; dependents: number };

function rentCeiling(zone: HousingZone, c: Composition, rules: Rules): number {
  const z = rules.socialBenefits.housing.rentCeilings[`zone${zone}`];
  if (c.dependents <= 0) return c.couple ? z.couple : z.single;
  return z.oneDependent + (c.dependents - 1) * z.perExtraDependent;
}

/** Value of a scale given for 0 (single or couple) to 6 dependents, extended beyond. */
function byComposition(
  scale: { single: number; couple: number; dependents: number[] },
  extra: number,
  c: Composition,
): number {
  if (c.dependents <= 0) return c.couple ? scale.couple : scale.single;
  const last = scale.dependents.length;
  const index = Math.min(c.dependents, last) - 1;
  return (scale.dependents[index] ?? 0) + Math.max(0, c.dependents - last) * extra;
}

const round = (x: number, digits: number) => Math.round(x * 10 ** digits) / 10 ** digits;

/** Rent ratio rate TL, as a fraction (0.00305 for 0.305 %). */
function rentRatioRate(rent: number, referenceRent: number, rules: Rules): number {
  const r = rules.socialBenefits.housing.rentRatio;
  const ratio = round((100 * rent) / referenceRent, 2) / 100;
  let rate = 0;
  if (ratio >= r.highThreshold) {
    rate = r.lowRate * (r.highThreshold - r.lowThreshold) + r.highRate * (ratio - r.highThreshold);
  } else if (ratio > r.lowThreshold) {
    rate = r.lowRate * (ratio - r.lowThreshold);
  }
  return round(rate * 100, 3) / 100;
}

export function housingAid(input: HousingAidInput, rules: Rules): HousingAidResult {
  const h = rules.socialBenefits.housing;
  const composition = { couple: input.couple, dependents: Math.max(0, input.dependents) };
  const ceiling = rentCeiling(input.zone, composition, rules);
  const rent = Math.min(Math.max(0, input.rent), ceiling);
  const charges = h.chargesBase + composition.dependents * h.chargesPerDependent;
  const p0 = Math.max(h.participationRate * (rent + charges), h.minimumParticipation);
  const familyRate = byComposition(
    h.familyRates,
    -h.familyRates.perExtraDependentReduction,
    composition,
  );
  const tp = familyRate + rentRatioRate(rent, rentCeiling(2, composition, rules), rules);
  const floor = input.student
    ? input.grantHolder
      ? h.grantHolderIncomeFloor
      : h.studentIncomeFloor
    : 0;
  const resources = Math.ceil(Math.max(input.annualResources, floor, 0) / 100) * 100;
  const r0 = byComposition(h.incomeFloor, h.incomeFloor.perExtraDependent, composition);
  const participation = p0 + tp * Math.max(0, resources - r0);
  let aid = Math.max(0, rent + charges - participation);
  if (!input.disabilityBenefit && input.rent > 0) {
    const [start, end] =
      input.zone === 1
        ? [h.taper.zone1Start, h.taper.zone1End]
        : [h.taper.otherStart, h.taper.otherEnd];
    const ratio = input.rent / ceiling;
    if (ratio > start) aid *= Math.max(0, (end - ratio) / (end - start));
  }
  aid -= h.flatReduction;
  if (aid < h.minimumPayment) aid = 0;
  const crds = Math.floor(aid * rules.crds.rate * 100) / 100;
  return { rent, charges, participation, gross: aid, net: Math.floor(aid - crds) };
}
