// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Situations added in v1.1 (PLAN.MD §13.4). Without a published worked example (MSA, Cipav,
 * public servants), each case is computed by hand from the official barème, as decided at
 * step 13: the expected amounts below are written out from the rates of the sources.
 */
import { describe, expect, it } from 'vitest';
import { activityBonus } from '../../../src/engine/household/benefits.ts';
import { householdLevies } from '../../../src/engine/household/index.ts';
import { quotientTax, taxParts } from '../../../src/engine/household/incomeTax.ts';
import { microContributions } from '../../../src/engine/household/micro.ts';
import { pensionOnly } from '../../../src/engine/household/pension.ts';
import {
  grossForNetPublic,
  publicAgentContributions,
} from '../../../src/engine/household/publicAgent.ts';
import { unemploymentOnly } from '../../../src/engine/household/replacement.ts';
import { selfEmployedContributions } from '../../../src/engine/household/selfEmployed.ts';
import { emptyHousehold, rules } from './helpers.ts';

const PASS = 48_060;

describe('public servant (barème: SP F468, F12387, décret 2012-1507, CSS D712-38)', () => {
  // SP F12387: indexed salary 28 000 €, bonuses 7 200 €, RAFP on 5 600 € (20 % of 28 000).
  const gross = 35_200;
  const state = publicAgentContributions(
    gross,
    { regime: 'state', bonusShare: 7_200 / gross },
    rules,
  );
  const line = (id: string) => state.lines.find((l) => l.id === id)?.amount ?? NaN;

  it('replays the RAFP example of service-public.fr', () => {
    expect(line('rafp')).toBeCloseTo(0.05 * 5_600, 6);
    expect(line('rafpEmployer')).toBeCloseTo(0.05 * 5_600, 6);
  });

  it('takes the pension contribution on the indexed salary only', () => {
    expect(line('publicPension')).toBeCloseTo(0.111 * 28_000, 6);
    // CSG 9.2 % and CRDS 0.5 % on 98.25 % of the whole pay.
    expect(state.csgDeductible + state.csgNonDeductible).toBeCloseTo(0.092 * 0.9825 * gross, 6);
    expect(state.crds).toBeCloseTo(0.005 * 0.9825 * gross, 6);
    expect(state.netSalary).toBeCloseTo(gross - 0.111 * 28_000 - 280 - 0.097 * 0.9825 * gross, 6);
  });

  it('computes the State employer contributions on the indexed salary', () => {
    const rates = 0.8228 + 0.097 + 0.0032 + 0.0525 + 0.003 + 0.005;
    expect(state.employerContributions).toBeCloseTo(rates * 28_000 + 280, 6);
    expect(state.employerRelief).toBe(0);
  });

  it('applies the CNRACL rates to a local or hospital servant', () => {
    const local = publicAgentContributions(
      gross,
      { regime: 'local', bonusShare: 7_200 / gross },
      rules,
    );
    const rates = 0.3765 + 0.0988 + 0.004 + 0.0525 + 0.003 + 0.005;
    expect(local.employerContributions).toBeCloseTo(rates * 28_000 + 280, 6);
    expect(local.netSalary).toBeCloseTo(state.netSalary, 6);
    // Territorial employers also pay the CNFPT training contribution, 1 % of the whole pay.
    const territorial = publicAgentContributions(
      gross,
      { regime: 'local', territorial: true, bonusShare: 7_200 / gross },
      rules,
    );
    expect(territorial.employerContributions - local.employerContributions).toBeCloseTo(
      0.01 * gross,
      6,
    );
    expect(territorial.netSalary).toBeCloseTo(local.netSalary, 6);
  });

  it('finds the gross pay of a net pay', () => {
    const agent = { regime: 'state' as const, bonusShare: 0.25 };
    const g = grossForNetPublic(30_000, agent, rules);
    expect(publicAgentContributions(g, agent, rules).netSalary).toBeCloseTo(30_000, 3);
  });

  it('is taxed and eligible to the prime d’activité like an employee', () => {
    const agent = { regime: 'state' as const, bonusShare: 0.25 };
    const levies = householdLevies(
      {
        ...emptyHousehold,
        grossSalary: grossForNetPublic(16_000, agent, rules),
        publicAgent: agent,
      },
      rules,
    );
    expect(levies.salary.netSalary).toBeCloseTo(16_000, 3);
    expect(levies.activityBonus).toBeGreaterThan(0);
    expect(levies.incomeTax.taxableIncome).toBeGreaterThan(0);
  });
});

describe('micro-entrepreneur (CSS D613-4, SP F23267, F23459)', () => {
  it('pays the global rate and the training contribution on turnover', () => {
    const r = microContributions({ activity: 'services', turnover: 40_000, flatTax: false }, rules);
    expect(r.contributions).toBeCloseTo(0.212 * 40_000, 6);
    expect(r.trainingContribution).toBeCloseTo(0.003 * 40_000, 6);
    // 50 % allowance: 20 000 € taxed on the barème.
    expect(r.taxableIncome).toBeCloseTo(20_000, 6);
    expect(r.netIncome).toBeCloseTo(20_000 - 8_480 - 120, 6);
    expect(r.flatIncomeTax).toBe(0);
  });

  it('uses the 2026 rate of 25.6 % for a liberal profession of the SSI', () => {
    const r = microContributions({ activity: 'liberal', turnover: 65_000, flatTax: false }, rules);
    expect(r.contributions).toBeCloseTo(16_640, 6);
    // SP F23267: 65 000 € of BNC turnover → 42 900 € taxable.
    expect(r.taxableIncome).toBeCloseTo(42_900, 6);
  });

  it('replays the allowances of service-public.fr, with their minimum', () => {
    const profit = (activity: 'sales' | 'services', turnover: number) =>
      microContributions({ activity, turnover, flatTax: false }, rules).taxableIncome;
    expect(profit('services', 65_000)).toBeCloseTo(32_500, 6);
    expect(profit('sales', 175_000)).toBeCloseTo(50_750, 6);
    // 71 % of 400 € is below the 305 € minimum allowance.
    expect(profit('sales', 400)).toBeCloseTo(95, 6);
  });

  it('replaces the barème by the versement libératoire, counted in the reference income', () => {
    const micro = { activity: 'services' as const, turnover: 40_000, flatTax: true };
    const levies = householdLevies({ ...emptyHousehold, micro }, rules);
    expect(levies.selfEmployed.flatIncomeTax).toBeCloseTo(0.017 * 40_000, 6);
    expect(levies.incomeTax.tax).toBe(0);
    expect(levies.referenceIncome).toBeCloseTo(20_000, 6);
  });
});

describe('self-employed schemes (barème MSA 2026, Urssaf Cipav, SP F23459)', () => {
  it('computes a farm operator’s contributions from the MSA barème', () => {
    // Gross income 40 000 €: 26 % allowance, base 29 600 € (61.6 % of the ceiling).
    const r = selfEmployedContributions(40_000, rules, 'farmer');
    const base = 29_600;
    const x = base / PASS;
    const amexa = (0.04 + (0.025 * (x - 0.6)) / 0.5) * base;
    const additional = (0.013 + (0.005 * (x - 0.6)) / 0.4) * base;
    const expected =
      amexa +
      0.011 * base + // invalidité
      250 + // IJ AMEXA
      0.1715 * base + // retraite de base plafonnée
      0.0072 * base + // retraite de base déplafonnée
      0.04 * base + // RCO (base above its 21 876 € minimum)
      additional + // RCO additionnelle
      550.95; // ATEXA, category B
    expect(r.base).toBeCloseTo(base, 6);
    expect(r.contributions).toBeCloseTo(expected, 6);
    expect(r.trainingContribution).toBeCloseTo(0.0061 * base, 6);
    expect(r.csgDeductible + r.csgNonDeductible).toBeCloseTo(0.092 * base, 6);
  });

  it('applies the MSA minimum bases to a small income', () => {
    const r = selfEmployedContributions(5_000, rules, 'farmer');
    // Retirement on 600 and 1 820 SMIC hours, disability on 11.5 % of the ceiling.
    expect(r.contributions).toBeGreaterThan(0.1787 * 7_212 + 0.04 * 21_876 + 0.011 * 0.115 * PASS);
    expect(r.trainingContribution).toBeCloseTo(0.0017 * PASS, 6);
  });

  it('computes a Cipav liberal profession’s contributions', () => {
    // Gross income 50 000 €: base 37 000 €, below one ceiling.
    const r = selfEmployedContributions(50_000, rules, 'cipav');
    const craft = selfEmployedContributions(50_000, rules, 'craft');
    const base = 37_000;
    const own =
      0.003 * base + // indemnités journalières
      (0.0873 + 0.0187) * base + // retraite de base
      0.11 * base + // complémentaire
      0.005 * base; // invalidité-décès
    // Health and family follow the same scales as the craftsman's.
    // The craftsman's own: daily allowances, base pension, complementary, disability.
    const ssiOwn = (0.005 + 0.1787 + 0.081 + 0.013) * base;
    expect(r.contributions - own).toBeCloseTo(craft.contributions - ssiOwn, 6);
    expect(r.trainingContribution).toBeCloseTo(0.0025 * PASS, 6);
  });

  it('gives a non-regulated liberal profession the craftsman’s contributions and its own training rate', () => {
    const liberal = selfEmployedContributions(50_000, rules, 'liberal');
    const craft = selfEmployedContributions(50_000, rules, 'craft');
    expect(liberal.contributions).toBeCloseTo(craft.contributions, 6);
    expect(liberal.trainingContribution).toBeCloseTo(0.0025 * PASS, 6);
    expect(craft.trainingContribution).toBe(139);
  });
});

describe('unemployment benefit (SP F2971, F14860, CSS L136-1-2)', () => {
  it('levies CSG at 6.2 % and CRDS on 98.25 % of the benefit', () => {
    const r = unemploymentOnly(2_400 * 12, rules);
    expect(r.band).toBe('normal');
    expect(r.csgDeductible).toBeCloseTo(0.038 * 0.9825 * 28_800, 6);
    expect(r.csgNonDeductible).toBeCloseTo(0.024 * 0.9825 * 28_800, 6);
    expect(r.crds).toBeCloseTo(0.005 * 0.9825 * 28_800, 6);
    expect(r.taxable).toBeCloseTo(28_800 - r.csgDeductible, 6);
  });

  it('levies nothing on a daily benefit below the daily SMIC, and stops at it just above', () => {
    expect(unemploymentOnly(60 * 365, rules).net).toBeCloseTo(60 * 365, 6);
    const r = unemploymentOnly(62 * 365, rules);
    expect(r.net).toBeCloseTo(61.55 * 365, 6);
  });

  it('is taxed with the 10 % allowance and counted as a resource of the prime d’activité', () => {
    const levies = householdLevies({ ...emptyHousehold, unemploymentBenefit: 28_800 }, rules);
    expect(levies.incomeTax.taxableIncome).toBeCloseTo(0.9 * levies.unemployment.taxable, 3);
    expect(levies.activityBonus).toBe(0);
  });
});

describe('invalidity pension (SP F2971, F3169, CSS L131-2)', () => {
  it('pays the pension levies, without the contribution on complementary pensions', () => {
    const invalidity = pensionOnly(24_000, rules, 0, false);
    const retirement = pensionOnly(24_000, rules);
    expect(invalidity.band).toBe(retirement.band);
    expect(invalidity.casa).toBeCloseTo(retirement.casa, 6);
    expect(invalidity.complementaryHealth).toBe(0);
    expect(retirement.complementaryHealth).toBeGreaterThan(0);
  });

  it('is taxed as a pension', () => {
    const levies = householdLevies({ ...emptyHousehold, invalidityPension: 24_000 }, rules);
    expect(levies.invalidity.gross).toBe(24_000);
    expect(levies.incomeTax.taxableIncome).toBeCloseTo(0.9 * levies.invalidity.taxable, 3);
  });
});

describe('disability card (brochure IR 2026, BOFiP BOI-IR-BASE-40)', () => {
  const single = { joint: false, children: 0, singleParent: false };

  it('gives half a part per disabled taxpayer', () => {
    expect(taxParts({ ...single, disabledAdults: 1 }, rules)).toBe(1.5);
    expect(
      taxParts({ joint: true, children: 0, singleParent: false, disabledAdults: 2 }, rules),
    ).toBe(3);
  });

  it('caps the half-part at 1 807 €, then adds a reduction of up to 1 801 €', () => {
    const income = 100_000;
    const without = quotientTax(income, single, rules);
    const withCard = quotientTax(income, { ...single, disabledAdults: 1 }, rules);
    expect(without - withCard).toBeCloseTo(1_807 + 1_801, 6);
    // A modest income: the half-part is worth less than the ceiling, no extra reduction.
    const small = 20_000;
    const uncapped =
      quotientTax(small, single, rules) -
      quotientTax(small, { ...single, disabledAdults: 1 }, rules);
    expect(uncapped).toBeLessThan(1_807);
  });

  it('opens the allowance of people over 65 to a disabled taxpayer of any age', () => {
    const base = { ...emptyHousehold, age: 40, grossSalary: 20_000 };
    const without = householdLevies(base, rules).incomeTax.taxableIncome;
    const withCard = householdLevies({ ...base, disabilityCard: true }, rules).incomeTax
      .taxableIncome;
    expect(without - withCard).toBe(2_822);
  });
});

describe('students and apprentices (CSS L842-2, 3°, and R512-2)', () => {
  it('are eligible to the prime d’activité only above the minimum earnings', () => {
    const threshold = rules.activityBonus.apprenticeThreshold;
    const bonus = (monthlyEarnings: number) =>
      activityBonus(
        {
          monthlyEarnings,
          otherMonthlyResources: 0,
          housingFlatRateApplies: false,
          minimumEarnings: true,
        },
        rules,
      );
    expect(bonus(threshold - 1)).toBe(0);
    expect(bonus(threshold + 100)).toBeGreaterThan(0);
  });
});
