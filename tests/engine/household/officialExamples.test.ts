// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The engine replays worked examples published by the tax administration
 * (BOFiP, impots.gouv.fr, service-public.fr, CAF). See tests/fixtures/official-examples.json.
 */
import { describe, expect, it } from 'vitest';
import { activityBonus } from '../../../src/engine/household/benefits.ts';
import { rentalTaxableIncome } from '../../../src/engine/household/capitalTax.ts';
import {
  highIncomeContribution,
  incomeTax,
  professionalExpensesAllowance,
  progressiveTax,
} from '../../../src/engine/household/incomeTax.ts';
import { taxableRealEstate, wealthTax } from '../../../src/engine/household/wealthTax.ts';
import examples from '../../fixtures/official-examples.json';
import { emptyHousehold, rules, rulesWith } from './helpers.ts';

/** Published amounts are rounded: accept 1 € or 1 %, whichever is larger. */
function expectPublished(actual: number, published: number) {
  expect(Math.abs(actual - published)).toBeLessThanOrEqual(Math.max(1, Math.abs(published) * 0.01));
}

const taxOn = (taxableIncome: number) =>
  incomeTax({ taxableSalary: 0, rentalTaxableIncome: taxableIncome, deductibleCsg: 0 }, rules);

describe('income tax (barème applied to 2025 incomes)', () => {
  const [single, table, droitsSimples] = examples.incomeTax;

  it(`service-public example: ${String(single?.taxableIncome)} €`, () => {
    expect(taxOn(single?.taxableIncome ?? NaN).tax).toBeCloseTo(single?.tax ?? NaN, 2);
  });

  for (const [income, tax] of Object.entries(table?.table ?? {})) {
    it(`DGFiP brochure, 1 part: ${income} € → ${String(tax)} €`, () => {
      expectPublished(taxOn(Number(income)).tax, tax);
    });
  }

  it('BOFiP CDHR example: droits simples on 240 000 €', () => {
    expectPublished(
      progressiveTax(droitsSimples?.taxableIncome ?? NaN, rules.incomeTax.brackets),
      droitsSimples?.tax ?? NaN,
    );
  });

  it('service-public décote example', () => {
    const example = examples.decote[0];
    if (!example) throw new Error('missing example');
    // Taxable income whose barème tax is exactly the example's gross tax.
    const income = 11_600 + example.grossTax / 0.11;
    const r = taxOn(income);
    expect(r.grossTax).toBeCloseTo(example.grossTax, 6);
    expect(r.decote).toBeCloseTo(example.decote, 2);
    expect(r.tax).toBeCloseTo(example.tax, 2);
  });
});

describe('10 % professional expenses allowance', () => {
  const [simple, ceiling, minimum] = examples.professionalExpenses;

  it('service-public example', () => {
    const salary = simple?.salary ?? NaN;
    expect(salary - professionalExpensesAllowance(salary, rules)).toBe(simple?.netOfAllowance);
  });

  it('BOFiP example: ceiling', () => {
    expect(professionalExpensesAllowance(ceiling?.salary ?? NaN, rules)).toBe(ceiling?.allowance);
  });

  it('BOFiP example: minimum (426 € for the example), capped at the salary', () => {
    const withMinimum = rulesWith((r) => {
      r.incomeTax.professionalExpenses.min = minimum?.minimum ?? NaN;
    });
    for (const c of minimum?.cases ?? []) {
      expect(c.salary - professionalExpensesAllowance(c.salary, withMinimum)).toBeCloseTo(
        c.netOfAllowance,
        6,
      );
    }
  });
});

describe('CEHR', () => {
  for (const example of examples.highIncomeContribution) {
    it(`${String(example.referenceIncome)} € → ${String(example.amount)} €`, () => {
      expect(highIncomeContribution(example.referenceIncome, rules)).toBeCloseTo(example.amount, 2);
    });
  }
});

describe('IFI', () => {
  const [bofip, servicePublic, mainResidence] = examples.wealthTax;
  for (const example of [bofip, servicePublic]) {
    it(`${String(example?.taxableRealEstate)} € of taxable real estate`, () => {
      const wealth = {
        ...emptyHousehold.wealth,
        rentalProperty: example?.taxableRealEstate ?? NaN,
      };
      expectPublished(wealthTax(wealth, rules), example?.amount ?? NaN);
    });
  }

  it('30 % allowance on the main residence', () => {
    const wealth = { ...emptyHousehold.wealth, mainResidence: mainResidence?.mainResidence ?? NaN };
    expect(taxableRealEstate(wealth, rules)).toBeCloseTo(
      mainResidence?.taxableMainResidence ?? NaN,
      6,
    );
  });
});

describe('micro-foncier', () => {
  for (const example of examples.microFoncier) {
    it(`${String(example.rents)} € of rents`, () => {
      expect(rentalTaxableIncome(example.rents, 0, rules)).toBeCloseTo(example.taxable, 6);
    });
  }
});

describe('prime d’activité: CAF example (parameters before April 2026)', () => {
  const ex = examples.activityBonus;
  const oldRules = rulesWith((r) => {
    r.activityBonus.lumpSum = ex.parameters.lumpSum;
    r.activityBonus.earningsShare = ex.parameters.earningsShare;
    r.activityBonus.individualBonusMax = ex.parameters.individualBonusMax;
    r.activityBonus.individualBonusStartSmicHours = ex.parameters.startSmicHours;
    r.activityBonus.individualBonusFullSmicHours = ex.parameters.fullSmicHours;
    r.activityBonus.housingFlatRate = ex.parameters.housingFlatRate;
    r.minimumWage.hourlyGross = ex.parameters.smicHourly;
  });
  const amounts = ex.months.map((m) =>
    activityBonus(
      { monthlyEarnings: m.earnings, otherMonthlyResources: 0, housingFlatRateApplies: true },
      oldRules,
    ),
  );

  ex.months.forEach((m, i) => {
    it(`month with ${String(m.earnings)} € of earnings`, () => {
      expect(amounts[i]).toBeCloseTo(m.amount, 1);
    });
  });

  it('quarterly average', () => {
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    expect(average).toBeCloseTo(ex.quarterlyAverage, 1);
  });
});
