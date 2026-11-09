// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Lever catalogue (PLAN.MD §6). Each lever has a stable id (never renamed nor
 * reused: retire it with `deprecated`), a reference value read from the data,
 * symmetric bounds, its static effect on revenue (base × rate change, no
 * elasticity) and its effect on the household rules.
 */
import { referenceGroupAmounts, referenceItems, type CofogItem } from './cofog.ts';
import { resolve, resolveRules, type Rules } from './rules.ts';
import type { Dataset } from './types.ts';

export type LeverGroup =
  | 'incomeTax'
  | 'csg'
  | 'capitalIncome'
  | 'vat'
  | 'energy'
  | 'corporateTax'
  | 'wealthTax'
  | 'socialContributions'
  | 'propertyTax'
  | 'spending'
  | 'macro';

/**
 * - `rate`: absolute rate (0.2 = 20 %), shown as a percentage;
 * - `change`: relative change of an envelope (0.05 = +5 %);
 * - `points`: added percentage points (0.01 = +1 point);
 * - `eur`: an amount in euros;
 * - `billions`: an amount in billions of euros (Md€), e.g. spending of a COFOG function;
 * - `tariff`: a tariff in euros per physical unit, labelled by `unitLabel` (e.g. €/hl).
 */
export type LeverUnit = 'rate' | 'change' | 'points' | 'eur' | 'billions' | 'tariff';

export interface Lever {
  id: string;
  group: LeverGroup;
  label: string;
  help: string;
  unit: LeverUnit;
  reference: number;
  min: number;
  max: number;
  step: number;
  deprecated?: boolean;
  /** COFOG group codes a spending lever applies to. */
  cofog?: string[];
  /** Level-3 item key of a spending item lever, e.g. "10.7.rsa" (PLAN.MD §13.2). */
  item?: string;
  /** Revenue item (revenues.json id) a tax lever changes. */
  revenueItem?: string;
  /** Unit shown for `tariff` levers, e.g. "€/L". */
  unitLabel?: string;
  /**
   * Fields and labels show value × displayScale (fuel tariffs are stored in €/hl, as in
   * the published tariff tables, and shown in €/L). Scenarios keep the stored unit.
   */
  displayScale?: number;
  /** Static change of revenue, in billions of euros, for `value` instead of the reference. */
  revenueEffect?: (value: number) => number;
  /**
   * Static change of spending outside the COFOG levers, in billions of euros: a public
   * employer's contribution is paid by public spending to a public scheme.
   */
  spendingEffect?: (value: number) => number;
  /** Writes the lever into a copy of the household rules. */
  applyToRules?: (rules: Rules, value: number) => void;
}

/**
 * Bounds of a lever: from 0 to twice its current value, symmetric around it. A rate
 * stays below 100 %; a rate currently at 0 (no double) can go up to 1 point.
 */
function rateBounds(reference: number): Pick<Lever, 'min' | 'max' | 'step'> {
  return {
    min: 0,
    max: reference > 0 ? Math.min(1, round(2 * reference)) : 0.01,
    step: 0.001,
  };
}

function doubleBounds(reference: number): Pick<Lever, 'min' | 'max'> {
  return { min: 0, max: round(2 * reference) };
}

/** A change of an amount, from −100 % (0) to +100 % (twice the amount). */
const CHANGE_BOUNDS = { reference: 0, min: -1, max: 1, step: 0.01 } as const;
const round = (x: number) => Math.round(x * 1e6) / 1e6;

/** A share as a French percentage, e.g. 0.9825 → "98,25 %". */
const frenchPercent = (share: number) =>
  `${(share * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;

/** Base of a revenue item, in billions of euros. */
function base(data: Dataset, item: string, key: string): number {
  const revenue = data.revenues.items.find((r) => r.id === item);
  const value = revenue?.bases?.[key];
  if (!value) throw new Error(`No base ${item}.${key}`);
  return resolve(value, `revenues.${item}.bases.${key}`);
}

function amount(data: Dataset, item: string): number {
  const revenue = data.revenues.items.find((r) => r.id === item);
  if (!revenue) throw new Error(`No revenue item ${item}`);
  return resolve(revenue.amount, `revenues.${item}.amount`);
}

/** A rate lever whose revenue effect is (value − reference) × base. */
function rateLever(
  fields: Omit<Lever, 'unit' | 'min' | 'max' | 'step' | 'revenueEffect'> & { base: number },
): Lever {
  const { base: leverBase, ...rest } = fields;
  return {
    ...rest,
    unit: 'rate',
    ...rateBounds(fields.reference),
    revenueEffect: (value) => (value - fields.reference) * leverBase,
  };
}

function taxLevers(data: Dataset, rules: Rules): Lever[] {
  const levers: Lever[] = [];

  const euros = (x: number) => `${x.toLocaleString('fr-FR')} €`;
  rules.incomeTax.brackets.forEach((bracket, i) => {
    const n = i + 1;
    const upper = rules.incomeTax.brackets[i + 1]?.threshold;
    const range =
      upper === undefined
        ? `au-delà de ${euros(bracket.threshold)}`
        : `de ${euros(bracket.threshold)} à ${euros(upper)}`;
    levers.push(
      rateLever({
        id: `incomeTax.bracket${n}.rate`,
        group: 'incomeTax',
        label: `Impôt sur le revenu : tranche ${range}`,
        help: `Taux appliqué à la part du revenu imposable (par part) comprise ${range}. Les petits impôts étant réduits ou annulés par la décote, une variation de taux peut n’avoir aucun effet pour les revenus modestes.`,
        reference: bracket.rate,
        base: base(data, 'incomeTax', `bracket${n}`),
        applyToRules: (r, value) => {
          const target = r.incomeTax.brackets[i];
          if (target) target.rate = value;
        },
      }),
    );
  });

  const indexationPoint = base(data, 'incomeTax', 'indexationPoint');
  levers.push({
    id: 'incomeTax.indexation',
    group: 'incomeTax',
    label: 'Impôt sur le revenu : indexation du barème',
    help: 'Revalorisation des seuils des tranches et de la décote ; une revalorisation plus forte que l’inflation allège l’impôt, une revalorisation plus faible l’alourdit.',
    unit: 'change',
    reference: 0,
    min: -0.05,
    max: 0.05,
    step: 0.001,
    revenueEffect: (value) => -value * 100 * indexationPoint,
    // The barème thresholds, the décote and the quotient familial ceilings move together.
    applyToRules: (r, value) => {
      const factor = 1 + value;
      for (const bracket of r.incomeTax.brackets) bracket.threshold *= factor;
      r.incomeTax.decote.singleCeiling *= factor;
      r.incomeTax.decote.coupleCeiling *= factor;
      r.incomeTax.family.halfPartCeiling *= factor;
      r.incomeTax.family.singleParentFirstChildCeiling *= factor;
    },
  });

  levers.push(
    rateLever({
      id: 'csg.activity.rate',
      group: 'csg',
      label: 'CSG sur les revenus d’activité',
      help: `Taux de la contribution sociale généralisée prélevée sur les salaires (assiette : ${frenchPercent(1 - rules.csg.activity.baseAllowance)} du brut, dans la limite de ${String(rules.csg.activity.baseAllowanceCapPassMultiple)} plafonds de la sécurité sociale).`,
      reference: rules.csg.activity.rate,
      base: base(data, 'csg', 'activity'),
      applyToRules: (r, value) => {
        r.csg.activity.rate = value;
      },
    }),
    rateLever({
      id: 'csg.capital.rate',
      group: 'csg',
      label: 'CSG sur les revenus du capital',
      help: 'Taux de la CSG sur les dividendes, intérêts et plus-values ; la même variation s’applique aux revenus fonciers.',
      reference: rules.csg.capital.rate,
      base: base(data, 'csg', 'capital'),
      applyToRules: (r, value) => {
        const delta = value - r.csg.capital.rate;
        r.csg.capital.rate = value;
        r.csg.capital.propertyIncomeRate += delta;
        r.capitalIncome.socialLeviesRate += delta;
        r.capitalIncome.socialLeviesRatePropertyIncome += delta;
      },
    }),
    rateLever({
      id: 'capitalIncome.flatTaxIncomeRate',
      group: 'capitalIncome',
      label: 'Prélèvement forfaitaire unique : part impôt sur le revenu',
      help: 'Part « impôt sur le revenu » du PFU sur les dividendes, intérêts et plus-values ; le taux global ajoute les prélèvements sociaux.',
      reference: rules.capitalIncome.flatTaxIncomeRate,
      base: base(data, 'incomeTax', 'flatTaxCapitalIncome'),
      applyToRules: (r, value) => {
        r.capitalIncome.flatTaxIncomeRate = value;
      },
    }),
  );

  const vatRates = [
    ['standard', 'normal'],
    ['intermediate', 'intermédiaire'],
    ['reduced', 'réduit'],
    ['superReduced', 'particulier'],
  ] as const;
  for (const [key, name] of vatRates) {
    levers.push(
      rateLever({
        id: `vat.${key}`,
        group: 'vat',
        label: `TVA : taux ${name}`,
        help: `Taux ${name} de la taxe sur la valeur ajoutée, payée par le consommateur final.`,
        reference: rules.vat[key],
        base: base(data, 'vat', key),
        applyToRules: (r, value) => {
          r.vat[key] = value;
        },
      }),
    );
  }

  // Energy excise: one lever per product, at its 2026 tariff. The household
  // excise share moves by the product's weight in the household excise bill.
  const share0 = rules.energyExcise.shareOfEnergySpending;
  const perHectolitreIds = new Set(
    data.taxRules.energyExcise.products
      .filter((p) => p.rate.unit === 'eur_per_hl')
      .map((p) => p.id),
  );
  for (const product of rules.energyExcise.products) {
    const reference = product.rate;
    const perHectolitre = perHectolitreIds.has(product.id);
    // Relative change of the tariff (0 for a product currently untaxed).
    const change = (value: number) => (reference > 0 ? value / reference - 1 : 0);
    levers.push({
      id: `energyExcise.${product.id}.rate`,
      group: 'energy',
      label: `Accise : ${product.label}`,
      help: `Tarif de l’accise sur ${product.label.toLowerCase()}, en ${perHectolitre ? 'euros par litre (tarif officiel publié en euros par hectolitre)' : 'euros par mégawattheure'}.`,
      unit: 'tariff',
      unitLabel: perHectolitre ? '€/L' : '€/MWh',
      ...(perHectolitre ? { displayScale: 0.01 } : {}),
      reference,
      ...doubleBounds(reference),
      step: 0.01,
      revenueEffect: (value) => change(value) * product.revenue,
      applyToRules: (r, value) => {
        const target = r.energyExcise.products.find((p) => p.id === product.id);
        if (target) target.rate = value;
        r.energyExcise.shareOfEnergySpending += share0 * product.householdWeight * change(value);
      },
    });
  }

  levers.push(
    rateLever({
      id: 'corporateTax.standardRate',
      group: 'corporateTax',
      label: 'Impôt sur les sociétés : taux normal',
      help: 'Taux normal de l’impôt sur les bénéfices des sociétés, supporté par leurs actionnaires dans ce simulateur.',
      reference: rules.corporateTax.standardRate,
      base: base(data, 'corporateTax', 'profits'),
      applyToRules: (r, value) => {
        r.corporateTax.standardRate = value;
      },
    }),
  );

  const wealthBrackets = rules.wealthTax.brackets;
  wealthBrackets.forEach((bracket, i) => {
    if (i === 0) return; // 0 % bracket below 800 000 €
    const n = i + 1;
    const upper = wealthBrackets[i + 1]?.threshold;
    const millions = (x: number) => `${String(x / 1e6).replace('.', ',')} M€`;
    const range =
      upper === undefined
        ? `au-delà de ${millions(bracket.threshold)}`
        : `de ${millions(bracket.threshold)} à ${millions(upper)}`;
    levers.push(
      rateLever({
        id: `wealthTax.bracket${n}.rate`,
        group: 'wealthTax',
        label: `IFI : taux de la tranche ${range}`,
        help: `Taux de l’impôt sur la fortune immobilière appliqué à la part du patrimoine immobilier net taxable ${range}.`,
        reference: bracket.rate,
        base: base(data, 'wealthTax', `bracket${n}`),
        applyToRules: (r, value) => {
          const target = r.wealthTax.brackets[i];
          if (target) target.rate = value;
        },
      }),
    );
  });
  const ifiThreshold = rules.wealthTax.threshold;
  const thresholdPoint = base(data, 'wealthTax', 'thresholdPoint');
  levers.push({
    id: 'wealthTax.threshold',
    group: 'wealthTax',
    label: 'IFI : seuil d’assujettissement',
    help: 'Patrimoine immobilier net taxable à partir duquel l’IFI est dû.',
    unit: 'eur',
    reference: ifiThreshold,
    ...doubleBounds(ifiThreshold),
    step: 10_000,
    revenueEffect: (value) => -(value / ifiThreshold - 1) * 100 * thresholdPoint,
    applyToRules: (r, value) => {
      r.wealthTax.threshold = value;
    },
  });

  // Social contributions: one lever per contribution, at its 2026 rate; the
  // base depends on the contribution's ceiling (whole wage, 1, 4 or 8 ceilings).
  const contributionBase = (item: Rules['socialContributions']['items'][number]) => {
    const key =
      item.onlyAbovePassMultiple !== undefined
        ? 'wagesEquilibriumTechnical'
        : item.floorPassMultiple !== null
          ? 'wagesSecondTranche'
          : item.capPassMultiple === null
            ? 'wagesUncapped'
            : item.capPassMultiple <= 1
              ? 'wagesBelowCeiling'
              : 'wagesBelowFourCeilings';
    return base(data, `${item.payer}Contributions`, key);
  };
  rules.socialContributions.items.forEach((item, i) => {
    levers.push({
      ...rateLever({
        id: `socialContributions.${item.id}.rate`,
        group: 'socialContributions',
        label: item.label,
        help:
          item.payer === 'employee'
            ? 'Taux à la charge du salarié, prélevé sur le salaire brut (secteur privé).'
            : 'Taux à la charge de l’employeur, sur le salaire brut (secteur privé) ; supporté par le salarié dans ce simulateur.',
        reference: item.rate,
        base: contributionBase(item),
        applyToRules: (r, value) => {
          const target = r.socialContributions.items[i];
          if (target) target.rate = value;
        },
      }),
      revenueItem: `${item.payer}Contributions`,
    });
  });

  // Public servants: pension contributions of the employee and of the two employers. An
  // employer contribution moves public revenue and public spending (pay) by the same amount.
  const publicPension = (regime: 'state' | 'local', itemId: string) => {
    const item = rules.publicSector.employer[regime].find((i) => i.id === itemId);
    if (!item) throw new Error(`No public employer contribution ${itemId}`);
    return item;
  };
  const publicLevers: [string, string, 'state' | 'local', string, string][] = [
    [
      'publicEmployerStatePension',
      'statePension',
      'state',
      'otherTaxes',
      'stateServantsIndexedPay',
    ],
    [
      'publicEmployerLocalPension',
      'localPension',
      'local',
      'employerContributions',
      'localServantsIndexedPay',
    ],
  ];
  const employeePensionBase = base(data, 'employeeContributions', 'publicServantsIndexedPay');
  levers.push({
    ...rateLever({
      id: 'socialContributions.publicEmployeePension.rate',
      group: 'socialContributions',
      label: 'Fonctionnaires : cotisation salariale de retraite',
      help: 'Taux de la retenue pour pension des fonctionnaires, prélevée sur le traitement indiciaire (hors primes).',
      reference: rules.publicSector.employeePensionRate,
      base: employeePensionBase,
      applyToRules: (r, value) => {
        r.publicSector.employeePensionRate = value;
      },
    }),
    revenueItem: 'employeeContributions',
  });
  for (const [leverId, itemId, regime, revenueItem, baseKey] of publicLevers) {
    const item = publicPension(regime, itemId);
    const pay = base(data, revenueItem, baseKey);
    const effect = (value: number) => (value - item.rate) * pay;
    levers.push({
      id: `socialContributions.${leverId}.rate`,
      group: 'socialContributions',
      label: item.label,
      help:
        regime === 'state'
          ? 'Contribution de l’État employeur aux pensions de ses fonctionnaires civils, sur le traitement indiciaire. Elle est payée par une dépense publique à un compte public : recettes et dépenses varient du même montant, le solde ne change pas. Supportée par le fonctionnaire dans ce simulateur.'
          : 'Cotisation des collectivités et des hôpitaux employeurs à la caisse de retraite de leurs fonctionnaires (CNRACL), sur le traitement indiciaire. Elle est payée par une dépense publique à une caisse publique : recettes et dépenses varient du même montant, le solde ne change pas. Supportée par le fonctionnaire dans ce simulateur.',
      unit: 'rate',
      reference: item.rate,
      // A rate above 100 % of the indexed salary exists (State pensions): 0 to twice the rate.
      ...doubleBounds(item.rate),
      step: 0.001,
      revenueItem,
      revenueEffect: effect,
      spendingEffect: effect,
      applyToRules: (r, value) => {
        const target = r.publicSector.employer[regime].find((i) => i.id === itemId);
        if (target) target.rate = value;
      },
    });
  }

  const propertyTaxAmount = amount(data, 'propertyTax');
  levers.push({
    id: 'propertyTax.change',
    group: 'propertyTax',
    label: 'Taxe foncière',
    help: 'Évolution de la taxe foncière payée par les propriétaires (ménages et entreprises).',
    unit: 'change',
    ...CHANGE_BOUNDS,
    revenueEffect: (value) => value * propertyTaxAmount,
  });

  return levers;
}

/** Slider step for a spending amount: 1 Md€, finer for small COFOG groups and items. */
function amountStep(reference: number): number {
  if (reference >= 10) return 1;
  if (reference >= 1) return 0.1;
  if (reference >= 0.1) return 0.01;
  return 0.001;
}

/** A spending amount lever: from 0 to twice the reference amount. */
function amountLever(fields: Omit<Lever, 'unit' | 'min' | 'max' | 'step'>, step: number): Lever {
  return { ...fields, unit: 'billions', min: 0, max: round(2 * fields.reference), step };
}

function spendingLevers(data: Dataset): Lever[] {
  const levers: Lever[] = [];
  const amounts = referenceGroupAmounts(data);
  const items = referenceItems(data, amounts);
  for (const division of data.spending.divisions) {
    const groups = division.groups.map((g) => ({ ...g, reference: amounts[g.code] ?? 0 }));
    levers.push(
      amountLever(
        {
          id: `spending.cofog.${division.code}`,
          group: 'spending',
          label: division.label,
          help: 'Dépenses publiques annuelles de cette fonction. Modifier ce montant change dans la même proportion chacun de ses groupes non personnalisés.',
          reference: round(groups.reduce((sum, g) => sum + g.reference, 0)),
          cofog: groups.map((g) => g.code),
        },
        1,
      ),
    );
    for (const group of groups) {
      levers.push(
        amountLever(
          {
            id: `spending.cofog.${group.code}`,
            group: 'spending',
            label: group.label,
            help: 'Dépenses publiques annuelles de ce groupe de la classification des fonctions (COFOG).',
            reference: group.reference,
            cofog: [group.code],
          },
          amountStep(group.reference),
        ),
      );
      for (const item of items.get(group.code) ?? []) {
        levers.push(
          amountLever(
            {
              id: `spending.cofog.${item.key}`,
              group: 'spending',
              label: item.label,
              help: `Poste du groupe « ${group.label} ». Modifier le montant du groupe ou de la fonction change ce poste dans la même proportion, sauf s'il est personnalisé.`,
              reference: item.reference,
              cofog: [group.code],
              item: item.key,
            },
            amountStep(item.reference),
          ),
        );
      }
    }
  }
  return levers;
}

function macroLevers(data: Dataset): Lever[] {
  const growth = resolve(data.macro.nominalGrowth, 'macro.nominalGrowth');
  const rate = resolve(data.macro.apparentInterestRate, 'macro.apparentInterestRate');
  return [
    {
      id: 'macro.nominalGrowth',
      group: 'macro',
      label: 'Croissance nominale du PIB',
      help: 'Croissance annuelle du PIB en valeur retenue pour la projection de la dette.',
      unit: 'rate',
      reference: growth,
      ...doubleBounds(growth),
      step: 0.001,
    },
    {
      id: 'macro.apparentInterestRate',
      group: 'macro',
      label: 'Taux d’intérêt apparent de la dette',
      help: 'Charge d’intérêts rapportée à la dette, appliquée sur toute la projection.',
      unit: 'rate',
      reference: rate,
      ...doubleBounds(rate),
      step: 0.001,
    },
  ];
}

/** Revenue item changed by each tax lever group. */
const REVENUE_ITEM_BY_GROUP: Partial<Record<LeverGroup, string>> = {
  incomeTax: 'incomeTax',
  capitalIncome: 'incomeTax',
  csg: 'csg',
  vat: 'vat',
  energy: 'energyExcise',
  corporateTax: 'corporateTax',
  wealthTax: 'wealthTax',
  propertyTax: 'propertyTax',
};

export type LeverCatalogue = Map<string, Lever>;

/** Level-3 spending item levers, e.g. "spending.cofog.10.7.rsa" (PLAN.MD §13.2). */
export const isItemLeverId = (id: string): boolean => /^spending\.cofog\.\d{2}\.\d\.[a-z]/.test(id);

export function buildLevers(data: Dataset): LeverCatalogue {
  const taxes = taxLevers(data, resolveRules(data.taxRules)).map((lever) => ({
    ...lever,
    revenueItem: lever.revenueItem ?? REVENUE_ITEM_BY_GROUP[lever.group],
  }));
  const all = [...taxes, ...spendingLevers(data), ...macroLevers(data)];
  return new Map(all.map((lever) => [lever.id, lever]));
}

/** Spending of the COFOG groups and of their level-3 items in a scenario, in Md€. */
export interface SpendingAmounts {
  groups: Record<string, number>;
  /** By item key ("10.7.rsa"). */
  items: Record<string, number>;
}

/**
 * Spending of each COFOG group and level-3 item in the scenario, in Md€. A division
 * lever scales its groups, a group lever sets its amount ("personnalisé"); a group's
 * items follow it in proportion unless an item lever sets its amount, and the group is
 * then the sum of its items.
 */
export function spendingAmountsFor(
  data: Dataset,
  references: Record<string, number>,
  items: ReadonlyMap<string, CofogItem[]>,
  levers: Record<string, number>,
): SpendingAmounts {
  const groups: Record<string, number> = {};
  const itemAmounts: Record<string, number> = {};
  for (const division of data.spending.divisions) {
    const codes = division.groups.map((g) => g.code);
    const divisionReference = codes.reduce((sum, c) => sum + (references[c] ?? 0), 0);
    const divisionAmount = levers[`spending.cofog.${division.code}`];
    const factor =
      divisionAmount === undefined || divisionReference === 0
        ? 1
        : divisionAmount / divisionReference;
    for (const code of codes) {
      const reference = references[code] ?? 0;
      const amount = levers[`spending.cofog.${code}`] ?? reference * factor;
      const list = items.get(code) ?? [];
      const groupFactor = reference === 0 ? 0 : amount / reference;
      let customised = false;
      let total = 0;
      for (const item of list) {
        const own = levers[`spending.cofog.${item.key}`];
        if (own !== undefined) customised = true;
        const value = own ?? item.reference * groupFactor;
        itemAmounts[item.key] = value;
        total += value;
      }
      // Without a customised item the group keeps its own amount (no rounding drift).
      groups[code] = customised ? total : amount;
    }
  }
  return { groups, items: itemAmounts };
}
