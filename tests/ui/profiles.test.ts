// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { emptyScenario } from '../../src/engine/scenario.ts';
import { createModel, simulate, type ProfileImpact } from '../../src/engine/simulate.ts';
import App from '../../src/ui/App.svelte';
import ProfileCard from '../../src/ui/components/ProfileCard.svelte';
import { LEVY_GROUP, LEVY_LABELS, levyRank, TAX_GROUPS } from '../../src/ui/labels.ts';
import { formatEuros } from '../../src/ui/format.ts';
import { profileView, toneOf } from '../../src/ui/profileView.ts';

const model = createModel(loadDataset());
const run = (levers: Record<string, number>) =>
  simulate(model, { ...emptyScenario(model.data.meta.baseYear), levers }).profiles;
const smicOf = (list: ProfileImpact[]) => {
  const p = list.find((x) => x.id === 'smic');
  if (!p) throw new Error('no smic');
  return p;
};

describe('tone of an impact', () => {
  it('is a gain or a loss from 1 € (rounded), neutral below', () => {
    expect(toneOf(1)).toBe('gain');
    expect(toneOf(-1)).toBe('loss');
    expect(toneOf(0.5)).toBe('gain');
    expect(toneOf(-0.5)).toBe('loss');
    expect(toneOf(0.4)).toBe('neutral');
    expect(toneOf(-0.4)).toBe('neutral');
    expect(toneOf(0)).toBe('neutral');
  });
});

describe('profile view', () => {
  it('splits the impact into levies, benefits and services', () => {
    const smic = smicOf(
      run({
        'vat.standard': 0.22,
        'spending.cofog.02': (model.levers.get('spending.cofog.02')?.reference ?? NaN) * 1.1,
      }),
    );
    const view = profileView(smic);
    // Pays more VAT, receives more public services: two separate changes.
    expect(view.leviesChange).toBeGreaterThan(0);
    expect(view.leviesTone).toBe('loss');
    expect(view.receivedChange).toBeGreaterThan(0);
    expect(view.receivedTone).toBe('gain');
    const vat = view.levies.find((l) => l.label === 'TVA');
    expect(vat?.after).toBeGreaterThan(vat?.before ?? Infinity);
    expect(vat?.impact).toBeLessThan(0);
    expect(view.leviesAfter).toBeGreaterThan(view.leviesBefore);
    expect(view.received.map((l) => l.label)).toEqual([
      'Prime d’activité',
      'Services publics reçus',
    ]);
    expect(view.rateAfter ?? NaN).toBeGreaterThan(view.rateBefore ?? NaN);
    expect(view.share).toEqual({
      value: smic.total / smic.reference.fiscalIncome,
      base: 'fiscalIncome',
      baseAmount: smic.reference.fiscalIncome,
    });
  });
});

describe('profile card rendering', () => {
  const card = (impact: ProfileImpact, dualRates = false) =>
    render(ProfileCard, {
      props: {
        impact,
        label: 'Salarié au SMIC',
        mode: 'eur',
        showDataWarning: false,
        dualRates,
        detailInitiallyOpen: true,
      },
    }).body;

  const effects = (body: string) =>
    body.slice(body.indexOf('class="effects'), body.indexOf('class="rates'));

  it('shows a levy increase in red, with a plus sign and an up arrow', () => {
    const body = effects(card(smicOf(run({ 'vat.standard': 0.24 }))));
    expect(body).toContain('data-tone="loss"');
    expect(body).toMatch(/\+\d/);
    expect(body).toContain('data-direction="up"');
  });

  it('shows a levy cut in green, with a minus sign and a down arrow', () => {
    const body = effects(card(smicOf(run({ 'vat.standard': 0.16 }))));
    expect(body).toContain('data-tone="gain"');
    expect(body).toMatch(/−\d/);
    expect(body).toContain('data-direction="down"');
  });

  it('keeps what is paid and what is received in two separate boxes, without a net total', () => {
    // Less VAT but less public spending: pays less (green) and receives less (red).
    const reference = model.levers.get('spending.cofog.02')?.reference ?? NaN;
    const body = effects(
      card(smicOf(run({ 'vat.standard': 0.199, 'spending.cofog.02': reference * 0.9 }))),
    );
    expect(body).toContain('Prélèvements payés');
    expect(body).toContain('Prestations et services reçus');
    expect(body).toContain('data-tone="gain"');
    expect(body).toContain('data-tone="loss"');
  });

  it('shows the levies paid per year and their detail, VAT included', () => {
    const body = card(smicOf(run({})));
    expect(body).toContain('Prélèvements payés (estimation)');
    expect(body).toContain(formatEuros(smicOf(run({})).reference.totalLevies));
    expect(body).toContain('>TVA<');
    expect(body).toContain('Total payé');
  });

  it('shows the student impact in % of the annual budget, as there is no fiscal income', () => {
    const student = run({ 'vat.standard': 0.24 }).find((p) => p.id === 'student');
    if (!student) throw new Error('no student profile');
    const view = profileView(student);
    expect(student.reference.fiscalIncome).toBe(0);
    expect(view.share?.base).toBe('budget');
    expect(view.share?.value).toBeCloseTo(student.total / student.reference.consumption, 9);
    const body = render(ProfileCard, {
      props: {
        impact: student,
        label: 'Étudiant',
        mode: 'percent',
        showDataWarning: false,
        dualRates: false,
      },
    }).body;
    expect(body).toMatch(/\+[\d,\s]+ % de son budget/);
    expect(body).toContain('rapportés à son budget annuel');
  });

  it('renders no change as neutral, without arrow', () => {
    const body = card(smicOf(run({})));
    expect(body).toContain('Aucun changement par rapport à aujourd’hui');
    expect(body).not.toContain('data-tone');
    expect(body).not.toContain('data-direction');
  });

  it('shows two rates and their explanation for the very large fortune', () => {
    const fortune = run({ 'corporateTax.standardRate': 0.3 }).find((p) => p.id === 'fortune100m');
    if (!fortune) throw new Error('no fortune profile');
    const body = card(fortune, true);
    expect(body).toContain('revenu économique');
    expect(body).toContain('Impôts personnels sur le revenu (revenu fiscal)');
    expect(body).toContain('Revenu fiscal ou économique ?');
  });
});

describe('profiles section in the page', () => {
  const { body } = render(App);

  it('shows the eleven cards, the €/% switch and the household form', () => {
    // Eleven reference profiles, plus the card of the household described by the user.
    expect(body.match(/<article class="card/g)).toHaveLength(12);
    expect(body).toContain('en % du revenu fiscal');
    expect(body).toContain('Votre foyer');
    expect(body).toContain('Enfants à charge');
  });

  it('warns about limited data on the two wealth profiles only', () => {
    expect(body.match(/Les données publiques sur les très hauts patrimoines/g)).toHaveLength(2);
  });
});

describe('order of the detail lines', () => {
  it('follows the lever panel for every profile, whatever the amounts', () => {
    for (const impact of run({})) {
      const labels = profileView(impact).levies.map((l) => l.label);
      const ranks = labels.map((label) => {
        const id = Object.entries(LEVY_LABELS).find(([, l]) => l === label)?.[0] ?? label;
        return levyRank(id);
      });
      expect(ranks, impact.id).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it('ranks every levy and keeps the panel groups in order', () => {
    for (const id of Object.keys(LEVY_LABELS)) {
      expect(LEVY_GROUP[id], id).toBeDefined();
    }
    const groups = Object.values(LEVY_GROUP).map((g) => TAX_GROUPS.findIndex(([t]) => t === g));
    expect(groups.every((g) => g >= 0)).toBe(true);
    expect(groups).toEqual([...groups].sort((a, b) => a - b));
  });
});
