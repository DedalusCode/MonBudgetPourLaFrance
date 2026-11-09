// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * What a profile card shows (PLAN.MD §7.2 and §8): impact in € or % of income,
 * its tone (gain / loss / neutral), effective rates and the detailed lines.
 */
import type { HealthCoverResult } from '../engine/household/healthCover.ts';
import type { ProfileImpact } from '../engine/simulate.ts';
import { formatEuros } from './format.ts';
import { AID_LABELS, LEVY_LABELS, levyRank } from './labels.ts';

/** Impacts that round to less than 1 € are shown as no change (neutral, no arrow). */
export const NEUTRAL_AMOUNT = 0.5;

export type Tone = 'gain' | 'loss' | 'neutral';

export interface AmountLine {
  label: string;
  before: number;
  after: number;
  /** Positive = favourable to the household (pays less or receives more). */
  impact: number;
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

export function profileView(impact: ProfileImpact): ProfileView {
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
    .map((line) => {
      const previous = before.borne.find((l) => l.id === line.id)?.amount ?? 0;
      return {
        label: LEVY_LABELS[line.id] ?? line.id,
        before: previous,
        after: line.amount,
        impact: previous - line.amount,
      };
    })
    .filter((l) => l.before >= NEUTRAL_AMOUNT || l.after >= NEUTRAL_AMOUNT);
  const receivedLine = (label: string, from: number, to: number): AmountLine => ({
    label,
    before: from,
    after: to,
    impact: to - from,
  });
  const aid = (id: keyof typeof AID_LABELS) =>
    receivedLine(AID_LABELS[id], before.aids?.[id] ?? 0, after.aids?.[id] ?? 0);
  // Same order as the spending levers (COFOG 09.4, 10.1, 10.2, 10.4, 10.5, 10.6, 10.7), then services.
  const received = [
    aid('studentGrant'),
    receivedLine(
      'Pension d’invalidité (brute)',
      before.invalidityPension ?? 0,
      after.invalidityPension ?? 0,
    ),
    aid('aah'),
    receivedLine('Pension de retraite (brute)', before.pension, after.pension),
    aid('aspa'),
    receivedLine(
      'Allocations familiales',
      before.familyAllowances ?? 0,
      after.familyAllowances ?? 0,
    ),
    aid('supportAllowance'),
    aid('familySupplement'),
    aid('backToSchool'),
    aid('youngChild'),
    receivedLine(
      'Allocation chômage (brute)',
      before.unemploymentBenefit ?? 0,
      after.unemploymentBenefit ?? 0,
    ),
    aid('ass'),
    receivedLine('Aide au logement', before.housingAid, after.housingAid),
    receivedLine('Prime d’activité', before.activityBonus, after.activityBonus),
    aid('rsa'),
    aid('energyCheck'),
    receivedLine('Services publics reçus', before.inKind.total, after.inKind.total),
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
  };
}
