// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Benefits computed for a whole household from its incomes (PLAN.MD §13.5, graph of
 * docs/audit-v1.1/foyer.md §2), shared by the reference profiles and the household
 * described by the user: family benefits, ASS, AAH and ASPA, housing aid, RSA and prime
 * d'activité, chèque énergie, student grants and complémentaire santé solidaire. Each
 * member's levies are computed beforehand; aids are computed as if the household claimed
 * them all.
 */
import { belowMinimumEarnings, householdActivityBonus } from './household/benefits.ts';
import { energyCheck } from './household/energyCheck.ts';
import { familyAllowanceParts } from './household/family.ts';
import {
  backToSchoolAllowance,
  familySupplement,
  supportAllowance,
  youngChildAllowance,
} from './household/familyBenefits.ts';
import { healthCover, type HealthCoverResult } from './household/healthCover.ts';
import { housingAid, type HousingZone } from './household/housing.ts';
import {
  activityEarnings,
  categoricalWorkIncome,
  type HouseholdInput,
  type HouseholdLevies,
} from './household/index.ts';
import { aahAmount, aspaAmount, assAmount, flatRateFor, rsaAmount } from './household/minima.ts';
import { studentGrant, type StudentGrantInput } from './household/studentGrant.ts';
import { sum } from './math.ts';
import type { Rules } from './rules.ts';
import type { ScenarioFactors } from './profiles.ts';

/** Means-tested aids, besides the allocations familiales, housing aid and prime d'activité. */
export type AidId =
  | 'aah'
  | 'aspa'
  | 'supportAllowance'
  | 'familySupplement'
  | 'backToSchool'
  | 'youngChild'
  | 'ass'
  | 'rsa'
  | 'energyCheck'
  | 'studentGrant';

export interface AidMember {
  input: HouseholdInput;
  levies: HouseholdLevies;
  age: number;
  student: boolean;
  retired: boolean;
  /** Unemployed whose insurance rights have ended, with the required work history (ASS). */
  assEligible: boolean;
  /** Rate of incapacity, as a share; 0 without disability. */
  disabilityRate: number;
  /** Restriction substantielle et durable d'accès à l'emploi (AAH from 50 to 79 %). */
  employmentRestriction: boolean;
  /** Student: parents' income and family situation for the bourse sur critères sociaux. */
  studentGrant: StudentGrantInput | null;
}

export interface AidHousehold {
  /** One or two adults, levies already computed. */
  members: AidMember[];
  /** Ages of the dependent children, already validated. */
  childAges: number[];
  tenure: 'tenant' | 'owner' | 'free';
  /** Monthly rent, charges excluded (tenant); 0 when unknown. */
  rent: number;
  zone: HousingZone;
  /** Single parent: the children's other parent pays no maintenance (allocation de soutien familial). */
  otherParentAbsent: boolean;
  /** Monthly maintenance received per child. */
  maintenancePerChild: number;
  /** Revenu fiscal de référence of the household. */
  fiscalIncome: number;
  /**
   * Monthly housing aid set by the data, already scaled by the scenario, when the rent is
   * not known (reference profiles): it replaces the computation.
   */
  fixedHousingAid?: number;
}

export interface AidsResult {
  /** Annual allocations familiales, net of the CRDS. */
  familyAllowances: number;
  /** Annual housing aid paid. */
  housingAid: number;
  /** Annual prime d'activité. */
  activityBonus: number;
  /** Annual amounts paid; family benefits net of the CRDS. */
  aids: Record<AidId, number>;
  /** Complémentaire santé solidaire: a right to a cover, not counted in the benefits. */
  healthCover: HealthCoverResult;
}

export function householdAids(
  household: AidHousehold,
  rules: Rules,
  factors: ScenarioFactors,
): AidsResult {
  const b = rules.socialBenefits;
  const people = household.members;
  const { childAges, fiscalIncome } = household;
  const children = childAges.length;
  const couple = people.length === 2;
  const singleParent = !couple && children > 0;
  const crdsNet = 1 - rules.crds.rate;

  // Incomes of each adult, monthly and net, used by the means tests below.
  const monthly = people.map((p) => ({
    earnings: activityEarnings(p.levies),
    // Pensions, replacement and capital income.
    other:
      (p.levies.pension.net +
        p.levies.unemployment.net +
        p.levies.invalidity.net +
        p.levies.capital.rentalTaxableIncome +
        p.levies.capital.financialIncome) /
      12,
    pension: (p.levies.pension.net + p.levies.invalidity.net) / 12,
  }));
  const householdEarnings = sum(monthly.map((m) => m.earnings));
  const householdOther = sum(monthly.map((m) => m.other));

  // 1. Family benefits (the CAF ignores marriage), net of the CRDS when paid.
  const family = familyAllowanceParts(
    {
      children,
      childrenAboveAge: childAges.filter((age) => age >= rules.familyAllowances.ageMajorationAge)
        .length,
      annualIncome: fiscalIncome,
    },
    rules,
  );
  const twoIncomesOrSingleParent =
    !couple || monthly.every((m) => m.earnings * 12 >= b.familyBenefits.ceilings.secondIncomeMin);
  const tested = { childAges, annualIncome: fiscalIncome, twoIncomesOrSingleParent };
  const monthlySupport =
    singleParent && household.otherParentAbsent
      ? supportAllowance(
          { children, monthlyMaintenancePerChild: household.maintenancePerChild },
          rules,
        )
      : 0;
  // Monthly amounts before the CRDS, each scaled by its spending item.
  const familyMonthly = {
    allowances: family.total * factors.family,
    ageIncrease: family.ageIncrease * factors.family,
    support: monthlySupport * factors.supportAllowance,
    supplement: familySupplement(tested, rules) * factors.familySupplement,
    youngChild: youngChildAllowance(tested, rules) * factors.youngChild,
  };
  const annualBackToSchool = backToSchoolAllowance(tested, rules);
  // Allocation de soutien familial: counted at a flat rate per child by the RSA and the
  // prime d'activité (CSS R844-4).
  const supportResource =
    monthlySupport > 0
      ? b.familyBenefits.asf.resourceRate *
        rules.familyAllowances.bmaf *
        children *
        factors.supportAllowance
      : 0;

  // 2. ASS, AAH and ASPA.
  const assMonthly = people.map((p, i) => {
    if (!p.assEligible) return 0;
    // Resources of the household apart from the jobseeker's own lost earnings.
    const others = sum(monthly.filter((_, j) => j !== i).map((m) => m.earnings + m.other));
    return assAmount({ couple, monthlyResources: others + (monthly[i]?.other ?? 0) }, rules);
  });
  const aahMonthly = people.map((p, i) =>
    aahAmount(
      {
        disabilityRate: p.disabilityRate,
        employmentRestriction: p.employmentRestriction,
        age: p.age,
        retired: p.retired,
        children,
        annualEarnings: categoricalWorkIncome(p.levies, rules),
        annualOtherIncome: p.levies.unemployment.taxable,
        monthlyPension: monthly[i]?.pension ?? 0,
      },
      rules,
    ),
  );
  // ASS and AAH do not add up: the higher one is kept.
  for (let i = 0; i < people.length; i++) {
    if ((assMonthly[i] ?? 0) > 0 && (aahMonthly[i] ?? 0) > 0) {
      if ((assMonthly[i] ?? 0) >= (aahMonthly[i] ?? 0)) aahMonthly[i] = 0;
      else assMonthly[i] = 0;
    }
  }
  const ass = sum(assMonthly) * factors.ass;
  const aah = sum(aahMonthly) * factors.aah;
  const aspa =
    (aspaAmount(
      {
        eligibleAdults: people.filter((p) => p.age >= b.aspa.minAge).length,
        couple,
        annualIncome: householdOther * 12,
        annualEarnings: householdEarnings * 12,
      },
      rules,
    ) /
      12) *
    factors.aspa;

  // 3. Student grants and housing aid of a tenant.
  const grants = people.map((p) =>
    p.student && p.studentGrant ? studentGrant(p.studentGrant, rules) * factors.studentGrant : 0,
  );
  const allStudents = people.every((p) => p.student);
  const housing =
    household.fixedHousingAid !== undefined
      ? household.fixedHousingAid
      : household.tenure === 'tenant' && household.rent > 0
        ? housingAid(
            {
              zone: household.zone,
              rent: household.rent,
              couple,
              dependents: children,
              annualResources: fiscalIncome,
              student: allStudents,
              grantHolder: grants.some((g) => g > 0),
              disabilityBenefit: aah > 0,
            },
            rules,
          ).net * factors.housingAid
        : 0;
  // Owners, people housed for free and housing aid recipients count a housing flat rate.
  const housingFlatRateApplies = household.tenure !== 'tenant' || housing > 0;

  // 4. RSA and prime d'activité: neither counts the other (CASF R262-11, CSS R844-5).
  const familyResources =
    familyMonthly.allowances -
    familyMonthly.ageIncrease +
    familyMonthly.supplement +
    familyMonthly.youngChild +
    supportResource;
  // The prime d'activité counts the increased complément familial at its normal rate (CSS R844-4).
  const supplementCap =
    b.familyBenefits.cf.rate * rules.familyAllowances.bmaf * factors.familySupplement;
  const bonusFamilyResources =
    familyResources - familyMonthly.supplement + Math.min(familyMonthly.supplement, supplementCap);
  const persons = people.length + children;
  const rsaEligible =
    (children > 0 || people.some((p) => p.age >= b.rsa.minAge)) && (!allStudents || singleParent);
  const rsa = rsaEligible
    ? rsaAmount(
        {
          adults: people.length,
          children,
          singleParentIncrease:
            singleParent && childAges.some((age) => age < b.rsa.singleParentChildAge),
          monthlyResources: householdEarnings + householdOther + familyResources + ass + aah + aspa,
          housingFlatRateApplies,
        },
        rules,
      ) * factors.rsa
    : 0;
  // Apprentices and students below the minimum earnings are not eligible: their earnings
  // only count as a resource. The AAH counts as earnings above a level of activity (CSS L842-8).
  const aahEarningsThreshold = b.aah.activityBonusEarningsHours * rules.minimumWage.hourlyGross;
  const earnings = people.map((p, i) => {
    const own = monthly[i]?.earnings ?? 0;
    const ownAah = (aahMonthly[i] ?? 0) * factors.aah;
    const aahAsEarnings = own >= aahEarningsThreshold ? ownAah : 0;
    const limited = p.input.apprentice || p.input.student === true;
    return limited && belowMinimumEarnings(own, rules)
      ? { counted: 0, resource: own + ownAah }
      : { counted: own + aahAsEarnings, resource: ownAah - aahAsEarnings };
  });
  const activityBonus =
    householdActivityBonus(
      {
        monthlyEarnings: earnings.map((e) => e.counted),
        children,
        otherMonthlyResources:
          householdOther + bonusFamilyResources + ass + aspa + sum(earnings.map((e) => e.resource)),
        housingFlatRateApplies,
      },
      rules,
    ) *
    12 *
    factors.activityBonus;

  // 5. Chèque énergie and complémentaire santé solidaire.
  // One chèque per home: a person housed for free by someone else does not receive it.
  const energy =
    household.tenure === 'free'
      ? 0
      : energyCheck({ persons, referenceIncome: fiscalIncome }, rules) * factors.energyCheck;
  const housingFlat = housingFlatRateApplies
    ? flatRateFor(
        persons,
        household.tenure === 'tenant' ? b.rsa.housingFlatRate : b.healthCover.ownerFlatRate,
      )
    : 0;
  const cover = healthCover(
    {
      ages: [...people.map((p) => p.age), ...childAges],
      annualResources:
        12 *
        (householdEarnings +
          householdOther +
          familyMonthly.allowances +
          familyMonthly.supplement +
          familyMonthly.youngChild +
          familyMonthly.support +
          ass +
          aah +
          aspa),
      monthlyHousingFlatRate: housingFlat,
      rsa: rsa > 0,
    },
    rules,
  );

  return {
    familyAllowances: familyMonthly.allowances * 12 * crdsNet,
    housingAid: housing * 12,
    activityBonus,
    aids: {
      aah: aah * 12,
      aspa: aspa * 12,
      supportAllowance: familyMonthly.support * 12 * crdsNet,
      familySupplement: familyMonthly.supplement * 12 * crdsNet,
      backToSchool: annualBackToSchool * factors.backToSchool * crdsNet,
      youngChild: familyMonthly.youngChild * 12 * crdsNet,
      ass: ass * 12,
      rsa: rsa * 12,
      energyCheck: energy,
      studentGrant: sum(grants),
    },
    healthCover: cover,
  };
}
