// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Social contributions on a private-sector salary: employee and employer
 * contributions, general employer relief (RGDU), CSG and CRDS.
 */
import type { Rules } from '../rules.ts';
import { slice } from '../math.ts';

export interface ContributionLine {
  id: string;
  payer: 'employee' | 'employer';
  amount: number;
}

export interface SalaryResult {
  gross: number;
  lines: ContributionLine[];
  employeeContributions: number;
  /** Employer contributions before the general relief. */
  employerContributionsGross: number;
  employerRelief: number;
  employerContributions: number;
  csgDeductible: number;
  csgNonDeductible: number;
  crds: number;
  /** Net salary before income tax. */
  netSalary: number;
  /** Net taxable salary ("net imposable"): non-deductible CSG and CRDS are taxed. */
  taxableSalary: number;
  employerCost: number;
}

/**
 * RGDU coefficient for an annual gross salary (CSS art. D241-7). For part-time
 * work the SMIC is prorated to the contract hours (`hoursRatio` = hours / 35).
 */
export function employerReliefRate(gross: number, rules: Rules, hoursRatio = 1): number {
  const r = rules.socialContributions.employerRelief;
  const smicAnnual = r.annualHours * r.smicHourlyReference * hoursRatio;
  const end = r.endSmicMultiple * smicAnnual;
  if (gross <= 0 || gross >= end) return 0;
  const coefficient = r.tMin + r.tDelta * (0.5 * (end / gross - 1)) ** r.exponent;
  // The coefficient is rounded to 4 decimals and capped at its value for one SMIC.
  return Math.min(Math.round(coefficient * 10_000) / 10_000, r.tMin + r.tDelta);
}

/** Base of CSG and CRDS: the salary minus the `baseAllowance` share of its part below the cap. */
export function csgBase(gross: number, rules: Rules): number {
  const { baseAllowance, baseAllowanceCapPassMultiple } = rules.csg.activity;
  const cap = baseAllowanceCapPassMultiple * rules.socialSecurityCeiling;
  return Math.min(gross, cap) * (1 - baseAllowance) + Math.max(0, gross - cap);
}

/**
 * Part of an apprentice's pay subject to employee contributions and CSG-CRDS: only
 * the pay above a share of the SMIC is (Code du travail art. L6243-2, CSS art. L136-1-1).
 */
export function apprenticeLiablePay(gross: number, rules: Rules): number {
  const exempt = rules.socialContributions.apprenticeExemptionSmicShare * annualMinimumWage(rules);
  return Math.max(0, gross - exempt);
}

/** Gross SMIC for a full year at the legal working time. */
export function annualMinimumWage(rules: Rules): number {
  return rules.minimumWage.hourlyGross * rules.minimumWage.monthlyHours * 12;
}

export function salaryContributions(
  gross: number,
  rules: Rules,
  hoursRatio = 1,
  apprentice = false,
): SalaryResult {
  const pass = rules.socialSecurityCeiling;
  // Apprentice: employee-side levies only on the pay above the exemption ceiling.
  const liable = apprentice ? apprenticeLiablePay(gross, rules) : gross;
  const employeeShare = gross > 0 ? liable / gross : 0;
  const lines: ContributionLine[] = rules.socialContributions.items.map((item) => {
    const due =
      item.onlyAbovePassMultiple === undefined || gross > item.onlyAbovePassMultiple * pass;
    const floor = (item.floorPassMultiple ?? 0) * pass;
    const cap = item.capPassMultiple === null ? Infinity : item.capPassMultiple * pass;
    const amount = due ? slice(gross, floor, cap) * item.rate : 0;
    return {
      id: item.id,
      payer: item.payer,
      amount: item.payer === 'employee' ? amount * employeeShare : amount,
    };
  });
  const sum = (payer: ContributionLine['payer']) =>
    lines.filter((l) => l.payer === payer).reduce((total, l) => total + l.amount, 0);

  const employeeContributions = sum('employee');
  const employerContributionsGross = sum('employer');
  const employerRelief = Math.min(
    employerReliefRate(gross, rules, hoursRatio) * gross,
    employerContributionsGross,
  );
  const employerContributions = employerContributionsGross - employerRelief;

  const base = csgBase(liable, rules);
  const { rate, deductibleRate } = rules.csg.activity;
  const csgDeductible = base * deductibleRate;
  const csgNonDeductible = base * (rate - deductibleRate);
  const crds = base * rules.crds.rate;

  const netSalary = gross - employeeContributions - csgDeductible - csgNonDeductible - crds;
  return {
    gross,
    lines,
    employeeContributions,
    employerContributionsGross,
    employerRelief,
    employerContributions,
    csgDeductible,
    csgNonDeductible,
    crds,
    netSalary,
    taxableSalary: netSalary + csgNonDeductible + crds,
    employerCost: gross + employerContributions,
  };
}
