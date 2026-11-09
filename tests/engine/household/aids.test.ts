// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Means-tested aids (PLAN.MD §13.5, step 16). Expected amounts come from the worked examples
 * and tables of the official sources listed in docs/audit-v1.1/foyer.md: service-public
 * pages, the APL brochure of April 2024 (replayed with its parameters) and the arrêtés.
 * Family benefits are compared before the CRDS (DSS amounts) unless stated otherwise.
 */
import { describe, expect, it } from 'vitest';
import {
  backToSchoolAllowance,
  familySupplement,
  supportAllowance,
  youngChildAllowance,
} from '../../../src/engine/household/familyBenefits.ts';
import { familyAllowanceParts } from '../../../src/engine/household/family.ts';
import { energyCheck, energyCheckUnits } from '../../../src/engine/household/energyCheck.ts';
import { healthCover } from '../../../src/engine/household/healthCover.ts';
import { housingAid } from '../../../src/engine/household/housing.ts';
import {
  aahAmount,
  aahEligible,
  aspaAmount,
  assAmount,
  rsaAmount,
  rsaLumpSum,
} from '../../../src/engine/household/minima.ts';
import { studentGrant, studentGrantLevel } from '../../../src/engine/household/studentGrant.ts';
import { relativeGap, rules, rulesWith } from './helpers.ts';

const within1pc = (actual: number, expected: number) =>
  expect(relativeGap(actual, expected)).toBeLessThan(0.01);

describe('RSA (SP F19778, CASF R262-1)', () => {
  const noFamily = { adults: 1, children: 0, singleParentIncrease: false };
  it('pays the lump sum minus the housing flat rate to a person without resources', () => {
    expect(
      rsaAmount({ ...noFamily, monthlyResources: 0, housingFlatRateApplies: true }, rules),
    ).toBeCloseTo(651.69 - 78.2, 2);
  });

  it('scales the lump sum with the household, as in the service-public table', () => {
    within1pc(rsaLumpSum({ adults: 2, children: 2, singleParentIncrease: false }, rules), 1_368.55);
    const third =
      rsaLumpSum({ adults: 2, children: 3, singleParentIncrease: false }, rules) -
      rsaLumpSum({ adults: 2, children: 2, singleParentIncrease: false }, rules);
    within1pc(third, 260.68);
    // 128,412 % (pregnant, no child yet: 836,85 €) + 42,804 % per child: 1 115,80 € with one.
    within1pc(rsaLumpSum({ adults: 1, children: 0, singleParentIncrease: true }, rules), 836.85);
    within1pc(rsaLumpSum({ adults: 1, children: 1, singleParentIncrease: true }, rules), 1_115.8);
  });

  it('deducts resources and pays nothing below the minimum payment', () => {
    const amount = (monthlyResources: number) =>
      rsaAmount({ ...noFamily, monthlyResources, housingFlatRateApplies: false }, rules);
    expect(amount(500)).toBeCloseTo(151.69, 2);
    expect(amount(651.69 - 5)).toBe(0);
  });
});

describe('AAH (SP F12242, CSS D821-9)', () => {
  const base = {
    disabilityRate: 0.8,
    employmentRestriction: false,
    age: 40,
    retired: false,
    children: 0,
    annualEarnings: 0,
    annualOtherIncome: 0,
    monthlyPension: 0,
  };
  it('tops up a pension of 800 € to the maximum', () => {
    expect(aahAmount({ ...base, monthlyPension: 800 }, rules)).toBeCloseTo(241.59, 2);
  });

  it('pays the maximum without resources', () => {
    // The annual ceiling (12 499 €) is the maximum × 12, rounded down to the euro.
    within1pc(aahAmount(base, rules), 1_041.59);
  });

  it('needs a restriction of access to employment from 50 to 79 %', () => {
    expect(aahEligible({ ...base, disabilityRate: 0.6 }, rules)).toBe(false);
    expect(aahEligible({ ...base, disabilityRate: 0.6, employmentRestriction: true }, rules)).toBe(
      true,
    );
    expect(aahEligible({ ...base, disabilityRate: 0.4, employmentRestriction: true }, rules)).toBe(
      false,
    );
  });

  it('applies the allowance of D821-9 on earnings: 80 %, then 40 % above 30 % of the SMIC', () => {
    const smicYear = rules.minimumWage.hourlyGross * rules.minimumWage.monthlyHours * 12;
    const threshold = 0.3 * smicYear;
    const earnings = 12_000;
    const counted = earnings - 0.8 * threshold - 0.4 * (earnings - threshold);
    expect(aahAmount({ ...base, annualEarnings: earnings }, rules)).toBeCloseTo(
      Math.min(1_041.59, (12_499 - counted) / 12),
      6,
    );
  });
});

describe('ASPA (SP F16871, published examples)', () => {
  it('pays 243,59 € to a single person with 800 € of resources', () => {
    const annual = aspaAmount(
      { eligibleAdults: 1, couple: false, annualIncome: 800 * 12, annualEarnings: 0 },
      rules,
    );
    expect(annual / 12).toBeCloseTo(243.59, 1);
  });

  it('pays 620,18 € to a couple with 1 000 € of resources', () => {
    const annual = aspaAmount(
      { eligibleAdults: 2, couple: true, annualIncome: 1_000 * 12, annualEarnings: 0 },
      rules,
    );
    expect(annual / 12).toBeCloseTo(620.18, 1);
  });

  it('caps the allowance of a couple with one beneficiary at the single amount', () => {
    const annual = aspaAmount(
      { eligibleAdults: 1, couple: true, annualIncome: 0, annualEarnings: 0 },
      rules,
    );
    expect(annual).toBeCloseTo(12_523.14, 2);
  });
});

describe('ASS (SP F12484)', () => {
  it('pays 363,60 € to a single person with 1 000 € of resources', () => {
    expect(assAmount({ couple: false, monthlyResources: 1_000 }, rules)).toBeCloseTo(363.6, 2);
    expect(assAmount({ couple: false, monthlyResources: 0 }, rules)).toBeCloseTo(584.4, 2);
  });
});

describe('housing aid (CCH D823-16, brochure of April 2024)', () => {
  // Brochure §3.1.6: couple with 2 children, zone II, R = 11 500 €, rent 500 € (January 2024).
  const rules2024 = rulesWith((r) => {
    const h = r.socialBenefits.housing;
    h.rentCeilings.zone2.oneDependent = 439.07;
    h.rentCeilings.zone2.perExtraDependent = 0;
    h.chargesBase = 84.42;
    h.chargesPerDependent = 0;
    h.incomeFloor.dependents[1] = 9_061;
    h.minimumPayment = 0;
  });
  const input = {
    zone: 2 as const,
    rent: 500,
    couple: true,
    dependents: 2,
    annualResources: 11_500,
    student: false,
    grantHolder: false,
    disabilityBenefit: false,
  };

  it('replays the worked example: 406 € paid', () => {
    const result = housingAid(input, rules2024);
    expect(result.rent).toBeCloseTo(439.07, 2);
    expect(result.participation).toBeCloseTo(109.98, 1);
    expect(result.gross).toBeCloseTo(408.51, 1);
    expect(result.net).toBe(406);
  });

  it('tapers the aid between 2,5 and 3,1 times the rent ceiling in zone II', () => {
    // Brochure: single person, zone II, taper from 695,70 € to 862,67 € of rent.
    const r = rulesWith((x) => {
      x.socialBenefits.housing.rentCeilings.zone2.single = 278.28;
    });
    const single = { ...input, couple: false, dependents: 0, annualResources: 0 };
    const untapered = housingAid({ ...single, rent: 695 }, r);
    const halfway = housingAid({ ...single, rent: (695.7 + 862.67) / 2 }, r);
    expect(halfway.gross + 5).toBeCloseTo((untapered.gross + 5) / 2, 0);
    expect(housingAid({ ...single, rent: 862.67 }, r).gross).toBe(0);
  });

  it('uses the flat resources of a student, lower for a grant holder', () => {
    const student = { ...input, couple: false, dependents: 0, annualResources: 0, student: true };
    const grant = housingAid({ ...student, grantHolder: true }, rules).net;
    expect(grant).toBeGreaterThan(housingAid(student, rules).net);
  });
});

describe('family benefits (DSS 2026/46, DSS 2025/177, service-public)', () => {
  it('support allowance: full amount minus maintenance, nothing below 15 € (SP F815)', () => {
    expect(supportAllowance({ children: 1, monthlyMaintenancePerChild: 100 }, rules)).toBeCloseTo(
      101.78,
      1,
    );
    expect(supportAllowance({ children: 1, monthlyMaintenancePerChild: 190 }, rules)).toBe(0);
  });

  it('complément familial: increased under 22 372 €, normal under 44 735 € (SP F13214)', () => {
    const three = { childAges: [4, 7, 12], twoIncomesOrSingleParent: false };
    expect(familySupplement({ ...three, annualIncome: 22_000 }, rules) * 0.995).toBeCloseTo(
      297.27,
      0,
    );
    expect(familySupplement({ ...three, annualIncome: 40_000 }, rules) * 0.995).toBeCloseTo(
      198.16,
      0,
    );
    expect(familySupplement({ ...three, childAges: [2, 7, 12], annualIncome: 0 }, rules)).toBe(0);
  });

  it('allocation de rentrée scolaire: 429,01 € for a child of 8 (SP F1878)', () => {
    expect(backToSchoolAllowance({ childAges: [8], annualIncome: 28_000 }, rules)).toBeCloseTo(
      429.01,
      1,
    );
    // Just above the ceiling (28 956 € for one child): differential.
    within1pc(backToSchoolAllowance({ childAges: [8], annualIncome: 29_056 }, rules), 329.01);
  });

  it('PAJE: partial rate for one income of 35 000 € with one child (SP F2552)', () => {
    const input = { childAges: [1], annualIncome: 35_000, twoIncomesOrSingleParent: false };
    expect(youngChildAllowance(input, rules) * 0.995).toBeCloseTo(99.08, 1);
    expect(youngChildAllowance({ ...input, annualIncome: 30_000 }, rules)).toBeCloseTo(199.15, 1);
    expect(youngChildAllowance({ ...input, childAges: [3] }, rules)).toBe(0);
  });

  it('isolates the age increase of the allocations familiales (CSS R844-5)', () => {
    const parts = familyAllowanceParts(
      { children: 3, childrenAboveAge: 1, annualIncome: 30_000 },
      rules,
    );
    expect(parts.ageIncrease).toBeCloseTo(0.16 * 478.16, 2);
    expect(parts.total).toBeCloseTo((0.32 + 0.41 + 0.16) * 478.16, 2);
  });
});

describe('student grant (arrêté du 26 mars 2026)', () => {
  it('reads the level from the ceilings and the points of charge', () => {
    // 20 000 € with 2 points: level 3 (ceiling 20 818 €), 3 828 €.
    const input = {
      parentsIncome: 20_000,
      distanceKm: 250,
      siblings: 0,
      siblingStudents: 0,
      disabled: false,
    };
    expect(studentGrantLevel(input, rules)).toBe(3);
    expect(studentGrant(input, rules)).toBe(3_828);
    expect(studentGrant({ ...input, parentsIncome: 200_000 }, rules)).toBe(0);
  });
});

describe('chèque énergie (SP F33667)', () => {
  it('uses its own consumption units and income brackets', () => {
    expect(energyCheckUnits(4, rules)).toBeCloseTo(2.1, 9);
    // Published example: couple, 2 children, RFR 48 000 €: not eligible.
    expect(energyCheck({ persons: 4, referenceIncome: 48_000 }, rules)).toBe(0);
    expect(energyCheck({ persons: 1, referenceIncome: 5_000 }, rules)).toBe(194);
    expect(energyCheck({ persons: 1, referenceIncome: 10_000 }, rules)).toBe(48);
  });
});

describe('complémentaire santé solidaire (SP F10027)', () => {
  it('asks a participation of 14 € a month at 40 with 900 € a month', () => {
    const result = healthCover(
      { ages: [40], annualResources: 900 * 12, monthlyHousingFlatRate: 0, rsa: false },
      rules,
    );
    expect(result).toEqual({ status: 'participation', monthlyParticipation: 14 });
    expect(
      healthCover({ ages: [40], annualResources: 0, monthlyHousingFlatRate: 0, rsa: true }, rules)
        .status,
    ).toBe('free');
  });
});
