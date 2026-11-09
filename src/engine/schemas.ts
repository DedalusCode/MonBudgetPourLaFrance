// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Zod schemas for every file in `src/data/`.
 *
 * Every numeric value is wrapped in a "data value" object
 * `{ value, unit, sourceId, asOf, status, note }` (PLAN.MD §5.1) so that its
 * provenance travels with it. Cross-file rules (unknown sourceId, profile ids,
 * COFOG coverage...) live in `dataChecks.ts`.
 */
import { z } from 'zod';
import { NATURE_ITEMS, VARIATION_HEADING, type NatureItem } from './natures.ts';
import { STATUSES, type DataFileName } from './dataFiles.ts';

// ---------------------------------------------------------------------------
// Data value
// ---------------------------------------------------------------------------

export const statusSchema = z.enum(STATUSES);

/**
 * Units used across data files.
 * - `rate`, `share`: fractions in [0, 1] (0.2 = 20 %).
 * - `eur*`: euros; `eur_bn` is billions of euros (Md€).
 * - `multiple`: multiple of a reference amount (e.g. of the social security ceiling).
 * - `coefficient`: dimensionless number that is not a fraction (e.g. an exponent).
 * - `km`: distance in kilometres.
 * - `gdp_share`: signed share of GDP (−0.054 = a deficit of 5.4 % of GDP), may exceed 1.
 */
export const UNITS = [
  'rate',
  'share',
  'eur',
  'eur_hour',
  'eur_month',
  'eur_year',
  'eur_bn',
  'hours_week',
  'hours_month',
  'hours_year',
  'count',
  'years',
  'parts',
  'multiple',
  'coefficient',
  'eur_per_hl',
  'eur_per_mwh',
  'gdp_share',
  'km',
] as const;
export type Unit = (typeof UNITS)[number];

const FRACTION_UNITS: ReadonlySet<Unit> = new Set(['rate', 'share']);

const isoDateSchema = z.iso.date();

/**
 * Builds the schema of a data value whose unit is fixed by its position in a file.
 *
 * Status rules:
 * - `VERIFIE`: value, sourceId and asOf are required.
 * - `HYPOTHESE`: value and a note explaining the assumption are required.
 * - `A_VERIFIER`: value may be null (skeleton) and sourceId may be missing.
 */
export function dataValue<U extends Unit>(unit: U) {
  return z
    .strictObject({
      value: z.number().nullable(),
      unit: z.literal(unit),
      sourceId: z.string().min(1).nullable(),
      asOf: isoDateSchema.nullable(),
      status: statusSchema,
      note: z.string().min(1).optional(),
    })
    .superRefine((v, ctx) => {
      if (v.value !== null && FRACTION_UNITS.has(unit) && (v.value < 0 || v.value > 1)) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: `A "${unit}" must be a fraction between 0 and 1`,
        });
      }
      if (v.status === 'VERIFIE') {
        for (const key of ['value', 'sourceId', 'asOf'] as const) {
          if (v[key] === null) {
            ctx.addIssue({
              code: 'custom',
              path: [key],
              message: `"${key}" is required when status is VERIFIE`,
            });
          }
        }
      }
      if (v.status === 'HYPOTHESE') {
        if (v.value === null) {
          ctx.addIssue({
            code: 'custom',
            path: ['value'],
            message: '"value" is required when status is HYPOTHESE',
          });
        }
        if (v.note === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['note'],
            message: 'A HYPOTHESE must explain its assumption in "note"',
          });
        }
      }
    });
}

/** Stable identifier: lowerCamelCase segments, optionally dot-separated. */
const idSchema = z.string().regex(/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)*$/, 'Invalid identifier');

// ---------------------------------------------------------------------------
// sources.json
// ---------------------------------------------------------------------------

export const sourceSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Source ids are kebab-case'),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url({ protocol: /^https$/ }),
  accessed: isoDateSchema,
  license: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
});

export const sourcesFileSchema = z.strictObject({
  sources: z.array(sourceSchema),
});

// ---------------------------------------------------------------------------
// explanations.json (pop-up texts of the levers; loaded on demand by the UI)
// ---------------------------------------------------------------------------

const EXPLANATION_HEADINGS = [
  'Ce que ça concerne',
  'Ce que ça finance',
  "Ce qui n'en fait pas partie",
  'Exemples',
  'Qui paie',
  'Qui en bénéficie',
  "D'où ça vient",
  'Bon à savoir',
  VARIATION_HEADING,
] as const;

const explanationSectionSchema = z
  .strictObject({
    heading: z.enum(EXPLANATION_HEADINGS),
    text: z.string().min(1).optional(),
    items: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((s) => s.text !== undefined || s.items !== undefined, 'A section needs text or items');

const explanationContent = {
  summary: z.string().min(1),
  sections: z.array(explanationSectionSchema).min(1).max(7),
  sourceIds: z.array(z.string().min(1)).min(1).max(5),
};

/** Lever id: level-3 item ids may contain hyphens ("spending.cofog.10.7.prime-activite"). */
const leverIdSchema = z
  .string()
  .regex(/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9][A-Za-z0-9-]*)*$/, 'Invalid lever identifier');

export const explanationSchema = z.strictObject({
  /** Lever id. */
  id: leverIdSchema,
  ...explanationContent,
});

/** Text of a nature item; "{groupe}" is replaced by the group's label. */
export const natureExplanationSchema = z.strictObject(explanationContent);

export const explanationsFileSchema = z.strictObject({
  entries: z.array(explanationSchema),
  natures: z.strictObject(
    Object.fromEntries(NATURE_ITEMS.map((n) => [n, natureExplanationSchema])) as Record<
      NatureItem,
      typeof natureExplanationSchema
    >,
  ),
});

export type Explanation = z.infer<typeof explanationSchema>;
export type NatureExplanation = z.infer<typeof natureExplanationSchema>;
export type ExplanationsFile = z.infer<typeof explanationsFileSchema>;

// ---------------------------------------------------------------------------
// meta.json
// ---------------------------------------------------------------------------

export const metaFileSchema = z.strictObject({
  dataVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Year of the legislation used for tax rules and of scenarios (`baseYear`). */
  baseYear: z.number().int().min(2000).max(2100),
  /** Year of the national accounts used for revenues, spending and debt. */
  accountsYear: z.number().int().min(2000).max(2100),
  updated: isoDateSchema,
});

// ---------------------------------------------------------------------------
// macro.json
// ---------------------------------------------------------------------------

export const macroFileSchema = z.strictObject({
  gdp: dataValue('eur_bn'),
  debt: dataValue('eur_bn'),
  totalRevenue: dataValue('eur_bn'),
  totalSpending: dataValue('eur_bn'),
  interestCharge: dataValue('eur_bn'),
  apparentInterestRate: dataValue('rate'),
  nominalGrowth: dataValue('rate'),
  population: dataValue('count'),
  projectionHorizon: dataValue('years'),
  /** Official forecast for the year after the accounts (shown for context, not simulated). */
  forecast: z.strictObject({
    year: z.number().int().min(2000).max(2100),
    balanceToGdp: dataValue('gdp_share'),
    balance: dataValue('eur_bn'),
    debtToGdp: dataValue('gdp_share'),
    spending: dataValue('eur_bn'),
    spendingToGdp: dataValue('gdp_share'),
    revenue: dataValue('eur_bn'),
    taxToGdp: dataValue('gdp_share'),
    interestCharge: dataValue('eur_bn'),
    gdp: dataValue('eur_bn'),
    realGrowth: dataValue('rate'),
    otherGrowthForecasts: z.array(
      z.strictObject({ organisation: z.string().min(1), value: dataValue('rate') }),
    ),
  }),
});

// ---------------------------------------------------------------------------
// revenues.json
// ---------------------------------------------------------------------------

const REVENUE_CATEGORIES = ['tax', 'socialContribution', 'other'] as const;

export const revenueItemSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1),
  category: z.enum(REVENUE_CATEGORIES),
  amount: dataValue('eur_bn'),
  /** Tax bases used for static "base × rate change" effects, keyed by sub-base id. */
  bases: z.record(idSchema, dataValue('eur_bn')).optional(),
});

export const revenuesFileSchema = z.strictObject({
  items: z.array(revenueItemSchema).min(1),
});

// ---------------------------------------------------------------------------
// spending.json (COFOG, two levels)
// ---------------------------------------------------------------------------

const cofogDivisionCode = z.string().regex(/^(0[1-9]|10)$/, 'COFOG division code, e.g. "07"');
const cofogGroupCode = z.string().regex(/^(0[1-9]|10)\.[1-9]$/, 'COFOG group code, e.g. "07.1"');

/**
 * A level-3 item of a COFOG group (PLAN.MD §13.2): a concrete item (a benefit, a programme)
 * or a nature of spending (compensation, purchases...). The rest of the group is an implicit
 * "other" item, so that the items always add up to the group.
 */
export const cofogItemSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case item id, e.g. "rsa"'),
  label: z.string().min(1),
  amount: dataValue('eur_bn'),
});

/** Sub-sectors of general government: S1311 (State), S1313 (local), S1314 (social security). */
export const STAFF_SECTORS = ['state', 'local', 'socialSecurity'] as const;

const staffSchema = z.strictObject({
  sector: z.enum(STAFF_SECTORS),
  compensation: dataValue('eur_bn'),
  /** Key of `spending.staffCosts`. */
  cost: z.string().min(1),
});

export const cofogGroupSchema = z.strictObject({
  code: cofogGroupCode,
  label: z.string().min(1),
  amount: dataValue('eur_bn'),
  /** Level-3 items, same year and scaling as the group amount. */
  items: z.array(cofogItemSchema).min(1).optional(),
  /** Label of the remaining "other" item (default "Autres"). */
  otherLabel: z.string().min(1).optional(),
  /**
   * Compensation of employees (Eurostat D1) of the group by sub-sector, and the average cost
   * of a full-time post used to turn a change of it into posts (PLAN.MD §13.8). Absent when
   * no cost applies: the group then shows no number of posts.
   */
  staff: z.array(staffSchema).min(1).optional(),
});

export const cofogDivisionSchema = z.strictObject({
  code: cofogDivisionCode,
  label: z.string().min(1),
  groups: z.array(cofogGroupSchema).min(1),
});

export const spendingFileSchema = z.strictObject({
  /** Year of the latest published COFOG breakdown (may precede the accounts year). */
  structureYear: z.number().int().min(2000).max(2100),
  /** Brings the structureYear amounts to the accounts year total (1 when the years match). */
  scaling: dataValue('coefficient'),
  /** Average yearly cost of a full-time post, structureYear euros (PLAN.MD §13.8). */
  staffCosts: z.record(z.string().regex(/^[a-z][A-Za-z]*$/), dataValue('eur_year')),
  /**
   * A group or function shows posts only when compensation weighs at least this share of
   * its spending: below, its lever is about transfers (pensions, benefits).
   */
  staffShareThreshold: dataValue('share'),
  divisions: z.array(cofogDivisionSchema).length(10),
});

// ---------------------------------------------------------------------------
// taxRules.json
// ---------------------------------------------------------------------------

const bracketSchema = z.strictObject({
  /** Lower bound of the bracket. */
  threshold: dataValue('eur_year'),
  rate: dataValue('rate'),
});

const contributionSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1),
  payer: z.enum(['employee', 'employer']),
  rate: dataValue('rate'),
  /** Upper bound of the base as a multiple of the annual social security ceiling; null = whole salary. */
  capPassMultiple: dataValue('multiple').nullable(),
  /** Lower bound of the base, same unit; null = from the first euro. */
  floorPassMultiple: dataValue('multiple').nullable(),
  /** The contribution is due only when the salary exceeds this multiple of the ceiling. */
  onlyAbovePassMultiple: dataValue('multiple').optional(),
});

/** A contribution of a public employer, on the indexed salary or on the whole gross pay. */
const publicContributionSchema = z.strictObject({
  id: idSchema,
  label: z.string().min(1),
  rate: dataValue('rate'),
  base: z.enum(['indexedPay', 'totalPay']),
  /** Due by territorial employers only, not by hospitals (both affiliated to the CNRACL). */
  territorialOnly: z.boolean().optional(),
});

/** Social contributions of a micro-entrepreneur for one kind of activity, in shares of turnover. */
const microActivitySchema = z.strictObject({
  /** Social contributions, CSG and CRDS included (one flat rate). */
  contributionRate: dataValue('rate'),
  /** Contribution à la formation professionnelle. */
  trainingRate: dataValue('rate'),
  /** Income tax: flat allowance for costs (micro-BIC, micro-BNC). */
  taxAllowance: dataValue('rate'),
  /** Versement libératoire de l'impôt sur le revenu. */
  flatTaxRate: dataValue('rate'),
});

/** Who bears a levy; `notAttributed` leaves it out of household balances. */
const INCIDENCE_BEARERS = [
  'consumer',
  'employee',
  'shareholder',
  'owner',
  'notAttributed',
] as const;

const incidenceAssumptionSchema = z.strictObject({
  bearer: z.enum(INCIDENCE_BEARERS),
  note: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Benefits computed for the household described by the user (PLAN.MD §13.5)
// ---------------------------------------------------------------------------

const housingFlatRateSchema = z.strictObject({
  one: dataValue('eur_month'),
  two: dataValue('eur_month'),
  threeOrMore: dataValue('eur_month'),
});

/** Rent ceiling of a zone, by household composition. */
const rentCeilingSchema = z.strictObject({
  single: dataValue('eur_month'),
  couple: dataValue('eur_month'),
  oneDependent: dataValue('eur_month'),
  perExtraDependent: dataValue('eur_month'),
});

/** Income ceiling of a family benefit: base, per child, from the third child, two incomes. */
const familyCeilingSchema = z.strictObject({
  base: dataValue('eur_year'),
  perChild: dataValue('eur_year'),
  perChildFrom3: dataValue('eur_year'),
  twoIncomes: dataValue('eur_year'),
});

const socialBenefitsSchema = z.strictObject({
  /** Revenu de solidarité active (CASF L262-1 and R262-1). */
  rsa: z.strictObject({
    lumpSum: dataValue('eur_month'),
    secondPersonRate: dataValue('rate'),
    additionalPersonRate: dataValue('rate'),
    thirdDependentRate: dataValue('rate'),
    singleParentRate: dataValue('multiple'),
    singleParentPerChildRate: dataValue('rate'),
    singleParentChildAge: dataValue('years'),
    housingFlatRate: housingFlatRateSchema,
    minimumPayment: dataValue('eur_month'),
    minAge: dataValue('years'),
  }),
  /** Allocation aux adultes handicapés. */
  aah: z.strictObject({
    maxAmount: dataValue('eur_month'),
    ceiling: dataValue('eur_year'),
    perChildCeilingRate: dataValue('rate'),
    fullRate: dataValue('share'),
    partialRate: dataValue('share'),
    minAge: dataValue('years'),
    activityAllowanceLowRate: dataValue('rate'),
    activityAllowanceHighRate: dataValue('rate'),
    /** Share of the monthly gross SMIC. */
    activityAllowanceThreshold: dataValue('share'),
    /** Monthly earnings, in hourly SMICs, from which the AAH counts as earnings in the prime d'activité. */
    activityBonusEarningsHours: dataValue('hours_month'),
  }),
  /** Allocation de solidarité aux personnes âgées. */
  aspa: z.strictObject({
    singleMax: dataValue('eur_year'),
    coupleMax: dataValue('eur_year'),
    minAge: dataValue('years'),
    professionalAllowance: dataValue('eur_year'),
  }),
  /** Allocation de solidarité spécifique. */
  ass: z.strictObject({
    fullAmount: dataValue('eur_month'),
    ceilingSingle: dataValue('eur_month'),
    ceilingCouple: dataValue('eur_month'),
  }),
  /** Aides personnelles au logement, rented home (CCH D823-16, arrêté du 27 septembre 2019). */
  housing: z.strictObject({
    rentCeilings: z.strictObject({
      zone1: rentCeilingSchema,
      zone2: rentCeilingSchema,
      zone3: rentCeilingSchema,
    }),
    chargesBase: dataValue('eur_month'),
    chargesPerDependent: dataValue('eur_month'),
    minimumParticipation: dataValue('eur_month'),
    participationRate: dataValue('rate'),
    familyRates: z.strictObject({
      single: dataValue('rate'),
      couple: dataValue('rate'),
      /** From one to six dependents. */
      dependents: z.array(dataValue('rate')).length(6),
      perExtraDependentReduction: dataValue('rate'),
    }),
    rentRatio: z.strictObject({
      lowThreshold: dataValue('share'),
      highThreshold: dataValue('share'),
      lowRate: dataValue('rate'),
      highRate: dataValue('rate'),
    }),
    incomeFloor: z.strictObject({
      single: dataValue('eur_year'),
      couple: dataValue('eur_year'),
      dependents: z.array(dataValue('eur_year')).length(6),
      perExtraDependent: dataValue('eur_year'),
    }),
    taper: z.strictObject({
      zone1Start: dataValue('coefficient'),
      zone1End: dataValue('coefficient'),
      otherStart: dataValue('coefficient'),
      otherEnd: dataValue('coefficient'),
    }),
    flatReduction: dataValue('eur_month'),
    minimumPayment: dataValue('eur_month'),
    studentIncomeFloor: dataValue('eur_year'),
    grantHolderIncomeFloor: dataValue('eur_year'),
  }),
  /** Family benefits other than the allocations familiales, in shares of the BMAF. */
  familyBenefits: z.strictObject({
    ceilings: z.strictObject({
      full: familyCeilingSchema,
      increased: familyCeilingSchema,
      pajePartial: familyCeilingSchema,
      secondIncomeMin: dataValue('eur_year'),
    }),
    asf: z.strictObject({
      rate: dataValue('rate'),
      minimumPayment: dataValue('eur_month'),
      resourceRate: dataValue('rate'),
    }),
    cf: z.strictObject({
      rate: dataValue('rate'),
      increasedRate: dataValue('rate'),
      minChildren: dataValue('count'),
      minAge: dataValue('years'),
    }),
    ars: z.strictObject({
      rate6to10: dataValue('rate'),
      rate11to14: dataValue('rate'),
      rate15to18: dataValue('rate'),
      ceilingBase: dataValue('eur_year'),
      perChildRate: dataValue('rate'),
    }),
    paje: z.strictObject({
      fullRate: dataValue('rate'),
      partialRate: dataValue('rate'),
      maxAge: dataValue('years'),
    }),
  }),
  /** Bourses sur critères sociaux: levels 0 bis to 7. */
  studentGrant: z.strictObject({
    amounts: z.array(dataValue('eur_year')).length(8),
    /** Income ceilings by points of charge (rows) and level (columns). */
    ceilings: z.array(z.array(dataValue('eur_year')).length(8)).min(1),
    distancePoints: z.array(z.strictObject({ minKm: dataValue('km'), points: dataValue('count') })),
    siblingPoints: dataValue('count'),
    siblingStudentPoints: dataValue('count'),
    disabilityPoints: dataValue('count'),
    maxAge: dataValue('years'),
  }),
  /** Chèque énergie: amount by consumption units and income per unit. */
  energyCheck: z.strictObject({
    incomeCeiling: dataValue('eur_year'),
    units: z.strictObject({
      first: dataValue('coefficient'),
      second: dataValue('coefficient'),
      further: dataValue('coefficient'),
    }),
    /** Upper bounds of the first three income brackets; the last ends at incomeCeiling. */
    brackets: z.array(dataValue('eur_year')).length(3),
    amounts: z.strictObject({
      oneUnit: z.array(dataValue('eur_year')).length(4),
      belowTwo: z.array(dataValue('eur_year')).length(4),
      twoOrMore: z.array(dataValue('eur_year')).length(4),
    }),
  }),
  /** Complémentaire santé solidaire. */
  healthCover: z.strictObject({
    freeCeilings: z.array(dataValue('eur_year')).length(4),
    freePerExtraPerson: dataValue('eur_year'),
    participationCeilings: z.array(dataValue('eur_year')).length(4),
    participationPerExtraPerson: dataValue('eur_year'),
    participationByAge: z.array(
      z.strictObject({ maxAge: dataValue('years'), amount: dataValue('eur_month') }),
    ),
    participationFrom70: dataValue('eur_month'),
    ownerFlatRate: housingFlatRateSchema,
  }),
});

export const taxRulesFileSchema = z.strictObject({
  minimumWage: z.strictObject({
    hourlyGross: dataValue('eur_hour'),
    monthlyHours: dataValue('hours_month'),
    /** Legal weekly working time, the base of part-time ratios. */
    legalWeeklyHours: dataValue('hours_week'),
  }),
  socialSecurityCeiling: dataValue('eur_year'),
  socialContributions: z.strictObject({
    items: z.array(contributionSchema).min(1),
    /**
     * General employer relief on low wages (RGDU since 2026):
     * coefficient = tMin + tDelta × (½ × (endSmicMultiple × SMIC / salary − 1))^exponent,
     * applied to the gross salary while it stays below endSmicMultiple × SMIC.
     */
    employerRelief: z.strictObject({
      tMin: dataValue('rate'),
      tDelta: dataValue('rate'),
      exponent: dataValue('coefficient'),
      endSmicMultiple: dataValue('multiple'),
      /** Hourly SMIC used by the formula (frozen for the year) and annual hours. */
      smicHourlyReference: dataValue('eur_hour'),
      annualHours: dataValue('hours_year'),
    }),
    /** Apprentice pay exempt of employee contributions and CSG-CRDS up to this share of the SMIC. */
    apprenticeExemptionSmicShare: dataValue('rate'),
  }),
  /** Self-employed craftsmen and traders (travailleurs indépendants), 2026 reform. */
  selfEmployed: z.strictObject({
    /** Single base for contributions and CSG-CRDS: gross income minus this allowance. */
    baseAllowance: dataValue('rate'),
    baseAllowanceMinPassMultiple: dataValue('multiple'),
    baseAllowanceMaxPassMultiple: dataValue('multiple'),
    /** Health: rate interpolated linearly between these points (base in multiples of the ceiling). */
    healthScale: z
      .array(z.strictObject({ passMultiple: dataValue('multiple'), rate: dataValue('rate') }))
      .min(2),
    /** Health rate on the part of the base above the last point of the scale. */
    healthRateAbove: dataValue('rate'),
    dailyAllowances: z.strictObject({
      rate: dataValue('rate'),
      capPassMultiple: dataValue('multiple'),
      minBasePassMultiple: dataValue('multiple'),
    }),
    basePension: z.strictObject({
      rateCapped: dataValue('rate'),
      rateUncapped: dataValue('rate'),
      minBase: dataValue('eur_year'),
    }),
    supplementaryPension: z.strictObject({
      rateFirstCeiling: dataValue('rate'),
      rateAbove: dataValue('rate'),
      capPassMultiple: dataValue('multiple'),
    }),
    disability: z.strictObject({
      rate: dataValue('rate'),
      capPassMultiple: dataValue('multiple'),
      minBasePassMultiple: dataValue('multiple'),
    }),
    /** Family allowances: 0 below `start`, rising linearly to `rate` at `full` (multiples of the ceiling). */
    family: z.strictObject({
      startPassMultiple: dataValue('multiple'),
      fullPassMultiple: dataValue('multiple'),
      rate: dataValue('rate'),
    }),
    /** Contribution à la formation professionnelle (artisans), flat amount. */
    trainingContribution: dataValue('eur_year'),
    /** Same contribution for a liberal profession, in shares of the ceiling. */
    liberalTrainingPassShare: dataValue('rate'),
    /** Liberal professions of the Cipav: their own pensions, disability and daily allowances. */
    cipav: z.strictObject({
      dailyAllowances: z.strictObject({
        rate: dataValue('rate'),
        capPassMultiple: dataValue('multiple'),
        minBasePassMultiple: dataValue('multiple'),
      }),
      basePension: z.strictObject({
        rateFirstCeiling: dataValue('rate'),
        rateUpToCap: dataValue('rate'),
        capPassMultiple: dataValue('multiple'),
        minBase: dataValue('eur_year'),
      }),
      supplementaryPension: z.strictObject({
        rateFirstCeiling: dataValue('rate'),
        rateAbove: dataValue('rate'),
        capPassMultiple: dataValue('multiple'),
      }),
      disability: z.strictObject({
        rate: dataValue('rate'),
        capPassMultiple: dataValue('multiple'),
        minBasePassMultiple: dataValue('multiple'),
      }),
    }),
    /** Farm operators (MSA): same base, health and family scales; their own other contributions. */
    farmer: z.strictObject({
      disability: z.strictObject({
        rate: dataValue('rate'),
        minBasePassMultiple: dataValue('multiple'),
      }),
      dailyAllowances: dataValue('eur_year'),
      basePension: z.strictObject({
        rateCapped: dataValue('rate'),
        rateUncapped: dataValue('rate'),
        minBase: dataValue('eur_year'),
      }),
      supplementaryPension: z.strictObject({
        rate: dataValue('rate'),
        minBase: dataValue('eur_year'),
      }),
      /** Additional complementary pension: rate read on this scale, applied to the whole base. */
      additionalPensionScale: z
        .array(z.strictObject({ passMultiple: dataValue('multiple'), rate: dataValue('rate') }))
        .min(2),
      workAccidents: dataValue('eur_year'),
      /** VIVEA training contribution, within a floor and a cap in shares of the ceiling. */
      training: z.strictObject({
        rate: dataValue('rate'),
        minPassShare: dataValue('rate'),
        maxPassShare: dataValue('rate'),
      }),
    }),
  }),
  /** Public servants (fonctionnaires titulaires). */
  publicSector: z.strictObject({
    /** Employee pension contribution, on the indexed salary. */
    employeePensionRate: dataValue('rate'),
    /** Retraite additionnelle de la fonction publique, on bonuses within a share of the indexed salary. */
    rafp: z.strictObject({
      employeeRate: dataValue('rate'),
      employerRate: dataValue('rate'),
      capShareOfIndexedPay: dataValue('rate'),
    }),
    /** Employer contributions by pension regime (State, or CNRACL for local and hospital). */
    employer: z.strictObject({
      state: z.array(publicContributionSchema).min(1),
      local: z.array(publicContributionSchema).min(1),
    }),
    /** Share of bonuses in gross pay, by branch, used when the user does not give it. */
    bonusShare: z.strictObject({
      state: dataValue('share'),
      territorial: dataValue('share'),
      hospital: dataValue('share'),
    }),
  }),
  /** Micro-entrepreneurs (régime micro-social and micro-fiscal). */
  micro: z.strictObject({
    activities: z.strictObject({
      /** Sales of goods and accommodation (BIC). */
      sales: microActivitySchema,
      /** Commercial and craft services (BIC). */
      services: microActivitySchema,
      /** Liberal professions of the SSI (BNC). */
      liberal: microActivitySchema,
      /** Liberal professions of the Cipav (BNC). */
      cipav: microActivitySchema,
    }),
    /** Minimum income tax allowance. */
    minTaxAllowance: dataValue('eur_year'),
  }),
  /** Unemployment insurance benefit (ARE): CSG bands follow the pension thresholds. */
  unemployment: z.strictObject({
    csgRate: dataValue('rate'),
    csgDeductibleRate: dataValue('rate'),
    /** Reduced rate, wholly deductible. */
    reducedCsgRate: dataValue('rate'),
    /** CSG and CRDS cannot bring the daily benefit below this amount. */
    dailyFloor: dataValue('eur'),
  }),
  /** Retirement pensions of former private-sector employees. */
  pension: z.strictObject({
    /** CSG bands by revenu fiscal de référence (1 part): upper bound of the zero, reduced and median rates. */
    zeroRateCeiling: dataValue('eur_year'),
    reducedRateCeiling: dataValue('eur_year'),
    medianRateCeiling: dataValue('eur_year'),
    csgRates: z.strictObject({
      reduced: dataValue('rate'),
      median: dataValue('rate'),
      normal: dataValue('rate'),
    }),
    csgDeductibleRates: z.strictObject({
      reduced: dataValue('rate'),
      median: dataValue('rate'),
      normal: dataValue('rate'),
    }),
    /** Contribution additionnelle de solidarité pour l'autonomie (median and normal CSG rates). */
    casaRate: dataValue('rate'),
    /** Health contribution on complementary pensions (median and normal CSG rates). */
    complementaryHealthRate: dataValue('rate'),
    /** Share of the complementary (Agirc-Arrco) pension in the total pension. */
    complementaryShare: dataValue('share'),
    /** Income tax: 10 % allowance on pensions. */
    allowance: z.strictObject({
      rate: dataValue('rate'),
      min: dataValue('eur_year'),
      max: dataValue('eur_year'),
    }),
    /** Income tax: extra allowance for taxpayers over 65 (CGI art. 157 bis). */
    elderlyAllowance: z.strictObject({
      minAge: dataValue('years'),
      full: dataValue('eur_year'),
      fullIncomeCeiling: dataValue('eur_year'),
      half: dataValue('eur_year'),
      halfIncomeCeiling: dataValue('eur_year'),
    }),
  }),
  csg: z.strictObject({
    activity: z.strictObject({
      rate: dataValue('rate'),
      deductibleRate: dataValue('rate'),
      /** Share of gross salary excluded from the base for professional expenses. */
      baseAllowance: dataValue('rate'),
      /** The allowance only applies to the salary below this multiple of the ceiling. */
      baseAllowanceCapPassMultiple: dataValue('multiple'),
    }),
    capital: z.strictObject({
      /** Rate on dividends, interest and securities gains. */
      rate: dataValue('rate'),
      /** Rate on property income (and life insurance, home savings). */
      propertyIncomeRate: dataValue('rate'),
      deductibleRate: dataValue('rate'),
    }),
  }),
  crds: z.strictObject({ rate: dataValue('rate') }),
  capitalIncome: z.strictObject({
    /** Income tax part of the flat tax (PFU). */
    flatTaxIncomeRate: dataValue('rate'),
    /** Total social levies on dividends and interest (CSG + CRDS + solidarity levy). */
    socialLeviesRate: dataValue('rate'),
    /** Total social levies on property income. */
    socialLeviesRatePropertyIncome: dataValue('rate'),
  }),
  propertyIncome: z.strictObject({
    microFoncierAllowance: dataValue('rate'),
    microFoncierCeiling: dataValue('eur_year'),
  }),
  incomeTax: z.strictObject({
    brackets: z.array(bracketSchema).min(2),
    professionalExpenses: z.strictObject({
      rate: dataValue('rate'),
      min: dataValue('eur_year'),
      max: dataValue('eur_year'),
    }),
    decote: z.strictObject({
      singleCeiling: dataValue('eur_year'),
      /** Couple taxed jointly (married or PACS). */
      coupleCeiling: dataValue('eur_year'),
      rate: dataValue('rate'),
    }),
    singleParts: dataValue('parts'),
    /** Quotient familial: parts by household composition and ceilings of their effect. */
    family: z.strictObject({
      coupleParts: dataValue('parts'),
      firstChildrenParts: dataValue('parts'),
      furtherChildParts: dataValue('parts'),
      singleParentParts: dataValue('parts'),
      halfPartCeiling: dataValue('eur_year'),
      singleParentFirstChildCeiling: dataValue('eur_year'),
      /** Half-part of a taxpayer holding a disability card (CGI art. 195). */
      disabilityParts: dataValue('parts'),
      /** Extra tax reduction per disability half-part capped by the general ceiling. */
      disabilityExtraReduction: dataValue('eur_year'),
    }),
    /** Apprentice salary exempt up to this annual amount (CGI art. 81 bis). */
    apprenticeExemption: dataValue('eur_year'),
    /** Rate of incapacity from which a disability card is assumed (half-part, allowance). */
    disabilityCardMinRate: dataValue('rate'),
  }),
  /** CEHR: contribution exceptionnelle sur les hauts revenus, single-person brackets. */
  highIncomeContribution: z.strictObject({
    brackets: z.array(bracketSchema).min(2),
    coupleBrackets: z.array(bracketSchema).min(2),
  }),
  /** CDHR: minimum average tax rate on high incomes. */
  highIncomeMinimumTax: z.strictObject({
    rate: dataValue('rate'),
    singleThreshold: dataValue('eur_year'),
    /** Below this income the 20 % term is capped at smoothingRate × (income − threshold). */
    smoothingUpperBound: dataValue('eur_year'),
    smoothingRate: dataValue('rate'),
    coupleThreshold: dataValue('eur_year'),
    coupleSmoothingUpperBound: dataValue('eur_year'),
    /** Added to the taxes already paid, per dependant and for a jointly taxed couple. */
    dependantAddition: dataValue('eur_year'),
    coupleAddition: dataValue('eur_year'),
  }),
  wealthTax: z.strictObject({
    threshold: dataValue('eur'),
    brackets: z.array(bracketSchema.extend({ threshold: dataValue('eur') })).min(2),
    mainResidenceAllowance: dataValue('rate'),
    /** Décote = constant − rate × net taxable wealth, below upperBound. */
    decote: z.strictObject({
      upperBound: dataValue('eur'),
      constant: dataValue('eur'),
      rate: dataValue('rate'),
    }),
  }),
  vat: z.strictObject({
    standard: dataValue('rate'),
    intermediate: dataValue('rate'),
    reduced: dataValue('rate'),
    superReduced: dataValue('rate'),
  }),
  energyExcise: z.strictObject({
    /** Share of household energy spending made of excise duties. */
    shareOfEnergySpending: dataValue('share'),
    /** Excise per product: tariff, national revenue at that tariff, share of the household excise bill. */
    products: z
      .array(
        z.strictObject({
          id: idSchema,
          label: z.string().min(1),
          rate: dataValue('eur_per_hl').or(dataValue('eur_per_mwh')),
          revenue: dataValue('eur_bn'),
          householdWeight: dataValue('share'),
        }),
      )
      .min(1),
  }),
  corporateTax: z.strictObject({
    standardRate: dataValue('rate'),
    reducedRate: dataValue('rate'),
    reducedRateCeiling: dataValue('eur_year'),
  }),
  activityBonus: z.strictObject({
    lumpSum: dataValue('eur_month'),
    earningsShare: dataValue('rate'),
    individualBonusMax: dataValue('eur_month'),
    /** Monthly earnings where the bonus starts / is full, as multiples of the hourly SMIC. */
    individualBonusStartSmicHours: dataValue('multiple'),
    individualBonusFullSmicHours: dataValue('multiple'),
    /** Housing flat-rate deduction for a single person, as a share of lumpSum. */
    housingFlatRate: dataValue('rate'),
    /** Increases of the lump sum by household size (CSS art. D843-1). */
    secondPersonRate: dataValue('rate'),
    additionalPersonRate: dataValue('rate'),
    thirdChildRate: dataValue('rate'),
    /** Housing flat rate for 2 and for 3+ persons, as shares of the lump sum for that size. */
    housingFlatRateTwo: dataValue('rate'),
    housingFlatRateThreeOrMore: dataValue('rate'),
    /** An apprentice is eligible only above these monthly earnings. */
    apprenticeThreshold: dataValue('eur_month'),
    /** Monthly amount below which the prime d'activité is not paid (CSS art. D846-2). */
    minimumPayment: dataValue('eur_month'),
  }),
  /** Allocations familiales (from two children), in shares of the BMAF. */
  familyAllowances: z.strictObject({
    bmaf: dataValue('eur_month'),
    twoChildrenRate: dataValue('rate'),
    perAdditionalChildRate: dataValue('rate'),
    ageMajorationRate: dataValue('rate'),
    ageMajorationAge: dataValue('years'),
    maxAge: dataValue('years'),
    secondBracketFactor: dataValue('rate'),
    thirdBracketFactor: dataValue('rate'),
    firstBracketBase: dataValue('eur_year'),
    secondBracketBase: dataValue('eur_year'),
    perChildCeiling: dataValue('eur_year'),
  }),
  /** Equivalence scale of the INSEE (consumption units). */
  consumptionUnits: z.strictObject({
    firstAdult: dataValue('coefficient'),
    otherFrom14: dataValue('coefficient'),
    childUnder14: dataValue('coefficient'),
  }),
  incidence: z.strictObject({
    vat: incidenceAssumptionSchema,
    energyExcise: incidenceAssumptionSchema,
    employerContributions: incidenceAssumptionSchema,
    corporateTax: incidenceAssumptionSchema,
    propertyTax: incidenceAssumptionSchema,
  }),
  socialBenefits: socialBenefitsSchema,
});

// ---------------------------------------------------------------------------
// profiles.json
// ---------------------------------------------------------------------------

export const PROFILE_IDS = [
  'student',
  'apprentice',
  'retiree1000',
  'smic',
  'employee1800',
  'retiree2500',
  'artisan',
  'cadre3k',
  'cadre10k',
  'rentier5m',
  'fortune100m',
] as const;
export const profileIdSchema = z.enum(PROFILE_IDS);

const salarySchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('minimumWage'),
    /** Contract hours per week; full time (35 h) when absent. */
    weeklyHours: dataValue('hours_week').optional(),
  }),
  z.strictObject({ kind: z.literal('targetNetMonthly'), amount: dataValue('eur_month') }),
  /** Apprentice paid a share of the SMIC (Code du travail art. D6222-26). */
  z.strictObject({ kind: z.literal('apprentice'), smicShare: dataValue('rate') }),
  z.strictObject({ kind: z.literal('none') }),
]);

export const profileSchema = z.strictObject({
  id: profileIdSchema,
  label: z.string().min(1),
  /** v1: every profile is a single adult without children (PLAN.MD §5.3). */
  household: z.strictObject({ adults: z.literal(1), children: z.literal(0) }),
  /** Age in years: defines the profile, not a statistic (used by age-related tax rules). */
  age: z.number().int().min(18).max(110),
  salary: salarySchema,
  /** Self-employed craftsman income (entreprise individuelle, real regime). */
  selfEmployment: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('none') }),
    z.strictObject({
      kind: z.literal('targetProfessionalIncome'),
      /** Taxable professional income (profit + non-deductible CSG), as INSEE measures it. */
      amount: dataValue('eur_year'),
    }),
  ]),
  /** Retirement pension (former private-sector employee). */
  pension: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('none') }),
    z.strictObject({ kind: z.literal('targetNetMonthly'), amount: dataValue('eur_month') }),
  ]),
  incomes: z.strictObject({
    rentalIncome: dataValue('eur_year'),
    dividends: dataValue('eur_year'),
    interest: dataValue('eur_year'),
    realizedCapitalGains: dataValue('eur_year'),
    /** Economic income only: profits retained in companies the profile owns. */
    retainedEarnings: dataValue('eur_year'),
  }),
  wealth: z.strictObject({
    mainResidence: dataValue('eur'),
    rentalProperty: dataValue('eur'),
    financial: dataValue('eur'),
    business: dataValue('eur'),
  }),
  /** Housing status: a tenant pays no property tax; an owner may bear the housing flat rate. */
  tenure: z.enum(['tenant', 'owner']),
  /** Share of gross rents deducted as charges under the real regime. */
  rentalChargesRate: dataValue('share'),
  savingsRate: dataValue('share'),
  /** Housing aid received (APL), per month. */
  housingAid: dataValue('eur_month'),
  /** Annual property tax paid (owners), as on the tax notice; 0 for tenants. */
  propertyTax: dataValue('eur_year'),
  /**
   * Keys into inKindAllocation.json `keys` (age group, student...), by priority:
   * a rule uses the index of the first key it defines.
   */
  inKindKeys: z.array(idSchema),
  /** Shows the "limited public data" warning (PLAN.MD §9). */
  showDataWarning: z.boolean(),
  /** Shows the rates on fiscal and on economic income (retained profits matter). */
  showDualRates: z.boolean(),
});

export const profilesFileSchema = z.strictObject({
  profiles: z.array(profileSchema).length(PROFILE_IDS.length),
});

// ---------------------------------------------------------------------------
// consumption.json
// ---------------------------------------------------------------------------

export const consumptionEntrySchema = z.strictObject({
  /** Annual consumption; null = disposable income × (1 − savings rate). */
  annualAmount: dataValue('eur_year').nullable(),
  /** Share of consumption subject to each VAT rate; `exempt` covers the rest (rent...). */
  vatShares: z.strictObject({
    standard: dataValue('share'),
    intermediate: dataValue('share'),
    reduced: dataValue('share'),
    superReduced: dataValue('share'),
    exempt: dataValue('share'),
  }),
  energyShare: dataValue('share'),
  tobaccoAlcoholShare: dataValue('share'),
});

export const consumptionFileSchema = z.strictObject({
  byProfile: z.record(profileIdSchema, consumptionEntrySchema),
});

// ---------------------------------------------------------------------------
// inKindAllocation.json
// ---------------------------------------------------------------------------

const ALLOCATION_MODES = ['perCapita', 'notAllocated'] as const;

export const allocationRuleSchema = z.strictObject({
  cofog: cofogGroupCode,
  /**
   * - `perCapita`: group amount / population × index, the index being the one of
   *   the profile's first key found in `indexByKey`, else `index` (1 by default);
   * - `notAllocated`: cash transfers or spending not received as a service by the profiles.
   */
  mode: z.enum(ALLOCATION_MODES),
  /** Ratio to the national per-capita average for every profile. */
  index: dataValue('coefficient').optional(),
  /** Ratio for the profiles holding a key (age group, student...). */
  indexByKey: z.record(idSchema, dataValue('coefficient')).optional(),
  status: statusSchema,
  note: z.string().min(1).optional(),
});

export const inKindAllocationFileSchema = z.strictObject({
  /** Profile characteristics that change the services received (age group, student...). */
  keys: z.array(z.strictObject({ id: idSchema, label: z.string().min(1) })),
  rules: z.array(allocationRuleSchema),
});

// ---------------------------------------------------------------------------
// Whole dataset
// ---------------------------------------------------------------------------

export const DATA_FILES = {
  meta: metaFileSchema,
  sources: sourcesFileSchema,
  macro: macroFileSchema,
  revenues: revenuesFileSchema,
  spending: spendingFileSchema,
  taxRules: taxRulesFileSchema,
  profiles: profilesFileSchema,
  consumption: consumptionFileSchema,
  inKindAllocation: inKindAllocationFileSchema,
} as const satisfies Record<DataFileName, z.ZodType>;
