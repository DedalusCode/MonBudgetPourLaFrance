// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** French labels of engine identifiers, shared by the UI and the generated docs. */
import type { LeverGroup } from '../engine/levers.ts';
import type { AidId } from '../engine/profiles.ts';

/** Tax lever groups, in the order of the lever panel. */
export const TAX_GROUPS: [LeverGroup, string][] = [
  ['incomeTax', 'Impôt sur le revenu'],
  ['csg', 'Contribution sociale généralisée'],
  ['capitalIncome', 'Revenus du capital'],
  ['socialContributions', 'Cotisations sociales'],
  ['vat', 'TVA'],
  ['energy', 'Énergie'],
  ['corporateTax', 'Impôt sur les sociétés'],
  ['wealthTax', 'Impôt sur la fortune immobilière'],
  ['propertyTax', 'Taxe foncière'],
];

/** Lever group of each levy borne by a household, declared in display order within a group. */
export const LEVY_GROUP: Record<string, LeverGroup> = {
  incomeTax: 'incomeTax',
  highIncomeContribution: 'incomeTax',
  highIncomeMinimumTax: 'incomeTax',
  microFlatIncomeTax: 'incomeTax',
  csgCrdsSalary: 'csg',
  csgCrdsSelfEmployed: 'csg',
  csgCrdsPension: 'csg',
  csgCrdsReplacement: 'csg',
  flatTax: 'capitalIncome',
  capitalSocialLevies: 'capitalIncome',
  employeeContributions: 'socialContributions',
  employerContributions: 'socialContributions',
  selfEmployedContributions: 'socialContributions',
  microContributions: 'socialContributions',
  vat: 'vat',
  energyExcise: 'energy',
  corporateTax: 'corporateTax',
  wealthTax: 'wealthTax',
  propertyTax: 'propertyTax',
};

/** Position of a levy in the detail tables: the lever panel order, then declaration order. */
export function levyRank(id: string): number {
  const group = LEVY_GROUP[id];
  const groupIndex = TAX_GROUPS.findIndex(([g]) => g === group);
  const withinIndex = Object.keys(LEVY_GROUP).indexOf(id);
  return (groupIndex < 0 ? TAX_GROUPS.length : groupIndex) * 100 + Math.max(0, withinIndex);
}

export const LEVY_LABELS: Record<string, string> = {
  employeeContributions: 'Cotisations salariales',
  csgCrdsSalary: 'CSG et CRDS sur le salaire',
  employerContributions: 'Cotisations patronales',
  selfEmployedContributions: 'Cotisations sociales d’indépendant',
  csgCrdsSelfEmployed: 'CSG et CRDS sur le revenu d’indépendant',
  csgCrdsPension: 'CSG, CRDS et CASA sur la pension',
  csgCrdsReplacement: 'CSG, CRDS et CASA sur l’allocation chômage ou la pension d’invalidité',
  microContributions: 'Cotisations sociales de micro-entrepreneur (CSG et CRDS comprises)',
  microFlatIncomeTax: 'Versement libératoire de l’impôt sur le revenu',
  incomeTax: 'Impôt sur le revenu (barème)',
  highIncomeContribution: 'Contribution exceptionnelle sur les hauts revenus',
  highIncomeMinimumTax: 'Contribution différentielle sur les hauts revenus',
  flatTax: 'Prélèvement forfaitaire unique (part impôt)',
  capitalSocialLevies: 'Prélèvements sociaux sur le capital',
  wealthTax: 'Impôt sur la fortune immobilière',
  vat: 'TVA',
  energyExcise: "Accises sur l'énergie",
  propertyTax: 'Taxe foncière',
  corporateTax: 'Impôt sur les sociétés (part supportée)',
};

/** Means-tested aids of the household described by the user (PLAN.MD §13.5). */
export const AID_LABELS: Record<AidId, string> = {
  aah: 'Allocation aux adultes handicapés (AAH)',
  aspa: 'Minimum vieillesse (ASPA)',
  supportAllowance: 'Allocation de soutien familial',
  familySupplement: 'Complément familial',
  backToSchool: 'Allocation de rentrée scolaire',
  youngChild: 'Allocation de base de la PAJE',
  ass: 'Allocation de solidarité spécifique (ASS)',
  rsa: 'Revenu de solidarité active (RSA)',
  energyCheck: 'Chèque énergie',
  studentGrant: 'Bourse sur critères sociaux',
};
