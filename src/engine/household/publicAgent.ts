// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Contributions of a public servant (fonctionnaire titulaire): pension contribution on the
 * indexed salary, RAFP on bonuses within a share of the indexed salary, CSG and CRDS on the
 * whole pay, and the employer contributions of the State or of a local employer (CNRACL).
 * The result has the shape of a private-sector salary, so the rest of the engine applies.
 */
import { invertIncreasing } from '../math.ts';
import type { Rules } from '../rules.ts';
import type { PublicAgent } from './input.ts';
import { csgBase, type ContributionLine, type SalaryResult } from './socialContrib.ts';

export function publicAgentContributions(
  gross: number,
  agent: PublicAgent,
  rules: Rules,
): SalaryResult {
  const p = rules.publicSector;
  const pay = Math.max(0, gross);
  const indexed = pay * (1 - agent.bonusShare);
  const bonuses = pay - indexed;
  const rafpBase = Math.min(bonuses, p.rafp.capShareOfIndexedPay * indexed);
  const lines: ContributionLine[] = [
    { id: 'publicPension', payer: 'employee', amount: indexed * p.employeePensionRate },
    { id: 'rafp', payer: 'employee', amount: rafpBase * p.rafp.employeeRate },
    ...p.employer[agent.regime]
      .filter((item) => !item.territorialOnly || agent.territorial === true)
      .map((item): ContributionLine => ({
        id: item.id,
        payer: 'employer',
        amount: (item.base === 'indexedPay' ? indexed : pay) * item.rate,
      })),
    { id: 'rafpEmployer', payer: 'employer', amount: rafpBase * p.rafp.employerRate },
  ];
  const total = (payer: ContributionLine['payer']) =>
    lines.filter((l) => l.payer === payer).reduce((sum, l) => sum + l.amount, 0);
  const employeeContributions = total('employee');
  const employerContributions = total('employer');

  const base = csgBase(pay, rules);
  const { rate, deductibleRate } = rules.csg.activity;
  const csgDeductible = base * deductibleRate;
  const csgNonDeductible = base * (rate - deductibleRate);
  const crds = base * rules.crds.rate;
  const netSalary = pay - employeeContributions - csgDeductible - csgNonDeductible - crds;
  return {
    gross: pay,
    lines,
    employeeContributions,
    employerContributionsGross: employerContributions,
    employerRelief: 0,
    employerContributions,
    csgDeductible,
    csgNonDeductible,
    crds,
    netSalary,
    taxableSalary: netSalary + csgNonDeductible + crds,
    employerCost: pay + employerContributions,
  };
}

/** Gross pay of a public servant whose net pay is `annualNet`. */
export function grossForNetPublic(annualNet: number, agent: PublicAgent, rules: Rules): number {
  return invertIncreasing(
    (gross) => publicAgentContributions(gross, agent, rules).netSalary,
    annualNet,
  );
}
