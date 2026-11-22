// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * What a profile card shows (PLAN.MD §7.2 and §8): impact in € or % of income,
 * its tone (gain / loss / neutral), effective rates and the detailed lines.
 */
import type { HealthCoverResult } from '../engine/household/healthCover.ts';
import type { BorneLevy } from '../engine/incidence.ts';
import type { LineId } from '../engine/lineLevers.ts';
import type { ProfileImpact } from '../engine/simulate.ts';
import { formatEuros } from './format.ts';
import { AID_LABELS, LEVY_LABELS, levyRank } from './labels.ts';

/** Impacts that round to less than 1 € are shown as no change (neutral, no arrow). */
export const NEUTRAL_AMOUNT = 0.5;

export type Tone = 'gain' | 'loss' | 'neutral';

export interface AmountLine {
  /** Line of the card, for the window of the levers that move it. */
  id: LineId;
  label: string;
  before: number;
  after: number;
  /** Positive = favourable to the household (pays less or receives more). */
  impact: number;
  /** The same amount in detail (each contribution, CSG, CRDS, services by function...). */
  parts: AmountPart[];
}

export interface AmountPart {
  id: string;
  label: string;
  before: number;
  after: number;
  impact: number;
  /** A part that is a line of its own (public services of one function). */
  line?: LineId;
}

/** Names of the parts of a line: contributions, CSG..., and COFOG functions. */
export interface PartNames {
  part: (id: string) => string;
  division: (code: string) => string;
}

const NO_NAMES: PartNames = { part: (id) => id, division: (code) => code };

/** Parts of a levy line before and after, in the order they come (zero on both sides left out). */
function levyParts(
  before: BorneLevy | undefined,
  after: BorneLevy | undefined,
  names: PartNames,
): AmountPart[] {
  const ids = [...(after?.parts ?? []), ...(before?.parts ?? [])].map((p) => p.id);
  const amount = (line: BorneLevy | undefined, id: string) =>
    line?.parts?.find((p) => p.id === id)?.amount ?? 0;
  return [...new Set(ids)]
    .map((id) => {
      const [from, to] = [amount(before, id), amount(after, id)];
      return { id, label: names.part(id), before: from, after: to, impact: from - to };
    })
    .filter((p) => Math.abs(p.before) >= NEUTRAL_AMOUNT || Math.abs(p.after) >= NEUTRAL_AMOUNT);
}

export interface ProfileView {
  id: string;
  /**
   * Impact as a share of the income shown in "%" mode: the fiscal income, or, for a
   * household without any (a student), its annual budget. Null when it has neither.
   */
  share: { value: number; base: 'fiscalIncome' | 'budget'; baseAmount: number } | null;
  /** Change of the levies paid (scenario − reference): negative = pays less. */
  leviesChange: number;
  /** Paying less is favourable. */
  leviesTone: Tone;
  /** Employer contributions borne by the household (part patronale), before and after. */
  employerBefore: number;
  employerAfter: number;
  /** Whether the household bears employer contributions (shown as a block of its own). */
  hasEmployerPart: boolean;
  employerChange: number;
  employerTone: Tone;
  /** Change of the other levies, paid by the household itself. */
  ownLeviesChange: number;
  ownLeviesTone: Tone;
  /** Change of the cash benefits and public services received. */
  receivedChange: number;
  receivedTone: Tone;
  /** Levies borne / economic income; null without income. */
  rateBefore: number | null;
  rateAfter: number | null;
  /** Personal taxes on income / fiscal income; null without fiscal income. */
  personalRateBefore: number | null;
  personalRateAfter: number | null;
  /** Total levies paid per year, before and after the scenario. */
  leviesBefore: number;
  leviesAfter: number;
  /** Every levy the household pays, in the order of the lever panel. */
  levies: AmountLine[];
  /** Cash benefits and public services received. */
  received: AmountLine[];
  /** Complémentaire santé solidaire in the scenario (a right, not an amount); null without it. */
  healthCover: string | null;
  /** Reste à vivre per month, before and after the scenario (PLAN.MD §14.5). */
  remaining: RemainingView;
}

export interface RemainingView {
  before: number;
  after: number;
  /** Positive = more left to live on. */
  change: number;
  tone: Tone;
  /** Per month in the scenario: disposable income, then each pre-committed item. */
  lines: { label: string; before: number; after: number }[];
  /** An owner's loan repayment is deducted (outside the INSEE definition). */
  withLoan: boolean;
}

/** Monthly reste à vivre and its parts. */
function remainingView(remaining: ProfileImpact['remaining']): RemainingView {
  const { reference: r, scenario: s } = remaining;
  const month = (x: number) => x / 12;
  const line = (label: string, before: number, after: number) => ({
    label,
    before: month(before),
    after: month(after),
  });
  const lines = [
    line('Revenu disponible', r.disposable, s.disposable),
    line('Loyer (avant aide au logement)', r.preCommitted.rent, s.preCommitted.rent),
    line(
      'Remboursement de l’emprunt immobilier',
      r.preCommitted.housingLoan,
      s.preCommitted.housingLoan,
    ),
    line('Énergie du logement', r.preCommitted.energy, s.preCommitted.energy),
    line(
      'Eau, charges, télécoms, cantine, assurances, banque',
      r.preCommitted.other - r.preCommitted.energy,
      s.preCommitted.other - s.preCommitted.energy,
    ),
  ].filter(
    (l, i) =>
      i === 0 || Math.abs(l.before) >= NEUTRAL_AMOUNT || Math.abs(l.after) >= NEUTRAL_AMOUNT,
  );
  const change = month(s.remaining - r.remaining);
  return {
    before: month(r.remaining),
    after: month(s.remaining),
    change,
    tone: toneOf(change),
    lines,
    withLoan: r.preCommitted.housingLoan > 0,
  };
}

/** Complémentaire santé solidaire, as a right to a cover. */
export function healthCoverText(cover: HealthCoverResult): string | null {
  if (cover.status === 'free') return 'Droit ouvert, sans participation';
  if (cover.status === 'participation') {
    return `Droit ouvert, ${formatEuros(cover.monthlyParticipation)} par mois`;
  }
  return null;
}

/** `amount / income`, or null when there is no income to compare with. */
export function ratio(amount: number, income: number): number | null {
  return income > 0 ? amount / income : null;
}

export function shareOf(total: number, fiscalIncome: number, budget: number): ProfileView['share'] {
  if (fiscalIncome > 0) {
    return { value: total / fiscalIncome, base: 'fiscalIncome', baseAmount: fiscalIncome };
  }
  if (budget > 0) return { value: total / budget, base: 'budget', baseAmount: budget };
  return null;
}

export function toneOf(total: number): Tone {
  if (total >= NEUTRAL_AMOUNT) return 'gain';
  if (total <= -NEUTRAL_AMOUNT) return 'loss';
  return 'neutral';
}

const EMPLOYER_LINE = 'employerContributions';

export function profileView(impact: ProfileImpact, names: PartNames = NO_NAMES): ProfileView {
  const { reference: before, scenario: after } = impact;
  const employerOf = (result: typeof before) =>
    result.borne.find((l) => l.id === EMPLOYER_LINE)?.amount ?? 0;
  const employerBefore = employerOf(before);
  const employerAfter = employerOf(after);
  const employerChange = employerAfter - employerBefore;
  const leviesChange = after.totalLevies - before.totalLevies;
  // Same order as the lever panel, whatever the amounts.
  const levies: AmountLine[] = [...after.borne]
    .sort((a, b) => levyRank(a.id) - levyRank(b.id))
    .map((line): AmountLine => {
      const previousLine = before.borne.find((l) => l.id === line.id);
      const previous = previousLine?.amount ?? 0;
      const parts = levyParts(previousLine, line, names);
      return {
        id: line.id as LineId,
        label: LEVY_LABELS[line.id] ?? line.id,
        before: previous,
        after: line.amount,
        impact: previous - line.amount,
        // A single part says nothing more than its line.
        parts: parts.length > 1 ? parts : [],
      };
    })
    .filter((l) => l.before >= NEUTRAL_AMOUNT || l.after >= NEUTRAL_AMOUNT);
  const receivedLine = (
    id: LineId,
    label: string,
    from: number,
    to: number,
    parts: AmountPart[] = [],
  ): AmountLine => ({ id, label, before: from, after: to, impact: to - from, parts });
  const aid = (id: keyof typeof AID_LABELS) =>
    receivedLine(`aids.${id}`, AID_LABELS[id], before.aids?.[id] ?? 0, after.aids?.[id] ?? 0);
  // Public services by COFOG function, each a line of its own.
  const divisions = [
    ...new Set([...Object.keys(after.inKind.byDivision), ...Object.keys(before.inKind.byDivision)]),
  ].sort();
  const services: AmountPart[] = divisions
    .map((code): AmountPart => {
      const [from, to] = [before.inKind.byDivision[code] ?? 0, after.inKind.byDivision[code] ?? 0];
      return {
        id: code,
        label: names.division(code),
        before: from,
        after: to,
        impact: to - from,
        line: `inKind.${code}`,
      };
    })
    .filter((p) => p.before >= NEUTRAL_AMOUNT || p.after >= NEUTRAL_AMOUNT);
  // Same order as the spending levers (COFOG 09.4, 10.1, 10.2, 10.4, 10.5, 10.6, 10.7), then services.
  const received = [
    aid('studentGrant'),
    receivedLine(
      'invalidityPension',
      'Pension d’invalidité (brute)',
      before.invalidityPension ?? 0,
      after.invalidityPension ?? 0,
    ),
    aid('aah'),
    receivedLine('pension', 'Pension de retraite (brute)', before.pension, after.pension),
    aid('aspa'),
    receivedLine(
      'familyAllowances',
      'Allocations familiales',
      before.familyAllowances ?? 0,
      after.familyAllowances ?? 0,
    ),
    aid('supportAllowance'),
    aid('familySupplement'),
    aid('backToSchool'),
    aid('youngChild'),
    receivedLine(
      'unemploymentBenefit',
      'Allocation chômage (brute)',
      before.unemploymentBenefit ?? 0,
      after.unemploymentBenefit ?? 0,
    ),
    aid('ass'),
    receivedLine('housingAid', 'Aide au logement', before.housingAid, after.housingAid),
    receivedLine('activityBonus', 'Prime d’activité', before.activityBonus, after.activityBonus),
    aid('rsa'),
    aid('energyCheck'),
    receivedLine(
      'inKind',
      'Services publics reçus',
      before.inKind.total,
      after.inKind.total,
      services.length > 1 ? services : [],
    ),
  ].filter((l) => l.before >= NEUTRAL_AMOUNT || l.after >= NEUTRAL_AMOUNT);
  return {
    id: impact.id,
    share: shareOf(impact.total, before.fiscalIncome, before.consumption),
    leviesChange,
    leviesTone: toneOf(-leviesChange),
    employerBefore,
    employerAfter,
    hasEmployerPart: employerBefore >= NEUTRAL_AMOUNT || employerAfter >= NEUTRAL_AMOUNT,
    employerChange,
    employerTone: toneOf(-employerChange),
    ownLeviesChange: leviesChange - employerChange,
    ownLeviesTone: toneOf(employerChange - leviesChange),
    receivedChange: impact.benefitsImpact + impact.servicesImpact,
    receivedTone: toneOf(impact.benefitsImpact + impact.servicesImpact),
    rateBefore: ratio(before.totalLevies, before.economicIncome),
    rateAfter: ratio(after.totalLevies, after.economicIncome),
    personalRateBefore: ratio(before.personalIncomeTaxes, before.fiscalIncome),
    personalRateAfter: ratio(after.personalIncomeTaxes, after.fiscalIncome),
    leviesBefore: before.totalLevies,
    leviesAfter: after.totalLevies,
    levies,
    received,
    healthCover: healthCoverText(after.healthCover),
    remaining: remainingView(impact.remaining),
  };
}
