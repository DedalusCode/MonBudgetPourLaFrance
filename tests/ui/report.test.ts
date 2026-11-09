// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { emptyScenario } from '../../src/engine/scenario.ts';
import { createModel, simulate } from '../../src/engine/simulate.ts';
import LeverPanel from '../../src/ui/components/LeverPanel.svelte';
import ScenarioReport from '../../src/ui/components/ScenarioReport.svelte';
import SummaryBar from '../../src/ui/components/SummaryBar.svelte';
import {
  benefitText,
  formatPosts,
  postsClause,
  projectionText,
  publicEmployerText,
  revenueText,
  sliderImpactText,
  spendingText,
} from '../../src/ui/impactText.ts';
import { reportLines, reportTotals } from '../../src/ui/report.ts';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';

const data = loadDataset();
const model = createModel(data);
const empty = emptyScenario(data.meta.baseYear);
const run = (levers: Record<string, number>) => simulate(model, { ...empty, levers });
const reference = (id: string) => model.levers.get(id)?.reference ?? NaN;

/**
 * The same sentence whatever the direction: numbers and direction words replaced, so
 * that an upward and a downward text must be built alike (equal weight).
 */
const shape = (text: string) =>
  text
    .replace(/en hausse|en baisse/g, '<dir>')
    .replace(/en plus|en moins|de plus|de moins/g, '<more>')
    .replace(/relevée|abaissée/g, '<dir>')
    .replace(/[+−]/g, '<sign>')
    .replace(/postes/g, 'poste')
    .replace(/[\d\s\u202f,]+(Md€|M€|€|%)/g, '<n> $1')
    .replace(/environ [\d\s\u202f]+ poste/g, 'environ <n> poste');

describe('posts rounding', () => {
  it('shows nothing below half a post, units below 20, two significant figures above', () => {
    expect(formatPosts(0.4)).toBeNull();
    expect(formatPosts(-0.4)).toBeNull();
    expect(formatPosts(0.6)).toBe('1');
    expect(formatPosts(-12.4)).toBe('12');
    expect(formatPosts(4_439.98)).toBe('4\u202f400');
    expect(formatPosts(-11_777)).toBe('12\u202f000');
  });

  it('says more or fewer posts, with the plural', () => {
    expect(postsClause(-4_440)).toBe(', soit environ 4\u202f400 postes à temps plein en moins');
    expect(postsClause(4_440)).toBe(', soit environ 4\u202f400 postes à temps plein en plus');
    expect(postsClause(1)).toBe(', soit environ 1 poste à temps plein en plus');
    expect(postsClause(0.2)).toBe('');
  });
});

describe('impact texts, upward and downward', () => {
  const pairs: [string, string, string][] = [
    ['spending', spendingText(1, 40, 4_440), spendingText(-1, 40, -4_440)],
    ['spending without posts', spendingText(0.3, 40), spendingText(-0.3, 40)],
    ['benefit', benefitText(1, 14), benefitText(-1, 14)],
    ['revenue', revenueText(2.3), revenueText(-2.3)],
    ['public employer', publicEmployerText(0.4), publicEmployerText(-0.4)],
    ['projection', projectionText(0.01), projectionText(-0.01)],
  ];

  it.each(pairs)('%s: two variants built alike', (_kind, up, down) => {
    expect(up).not.toBe(down);
    expect(shape(up)).toBe(shape(down));
  });

  it('reads the change, the share and the posts', () => {
    expect(spendingText(-1, 40, -4_440)).toBe(
      'Dépense annuelle en baisse de 1,0 Md€ (−2,5 %), soit environ 4\u202f400 postes à temps plein en moins.',
    );
    expect(benefitText(-1.4, 14)).toBe(
      'Dépense annuelle en baisse de 1,4 Md€ : chaque ménage qui perçoit cette prestation en reçoit 10,0 % de moins, à règles d’attribution inchangées.',
    );
    expect(revenueText(2.3)).toBe(
      'Recettes en hausse d’environ 2,3 Md€ par an (effet mécanique, sans changement de comportement).',
    );
    expect(publicEmployerText(-0.4)).toBe(
      'Recettes et dépenses en baisse de 0,4 Md€ chacune : le solde ne change pas.',
    );
  });

  it('says when there is no change', () => {
    expect(spendingText(0, 40)).toBe('Dépense annuelle inchangée.');
    expect(benefitText(0, 14)).toBe('Dépense annuelle inchangée.');
    expect(revenueText(0)).toBe('Pas d’effet sur les recettes de l’année.');
    expect(publicEmployerText(0)).toBe('Pas d’effet sur les comptes de l’année.');
    expect(projectionText(0)).toBe('Hypothèse de projection inchangée.');
  });

  it('has an upward and a downward variant for every lever', () => {
    let checked = 0;
    for (const lever of model.levers.values()) {
      if (lever.deprecated) continue;
      // Halfway towards each bound (a lever at a bound has a single direction).
      const up = lever.reference + (lever.max - lever.reference) / 2;
      const down = lever.reference - (lever.reference - lever.min) / 2;
      if (up === lever.reference || down === lever.reference) continue;
      const textOf = (value: number) =>
        sliderImpactText(model, run({ [lever.id]: value }), lever, value);
      const [upText, downText] = [textOf(up), textOf(down)];
      // Opposite directions (raising the indexation of the brackets lowers revenue).
      const sense = (text: string) =>
        /en hausse|relevée/.test(text) ? 1 : /en baisse|abaissée/.test(text) ? -1 : 0;
      expect(sense(upText) * sense(downText), lever.id).toBe(-1);
      expect(shape(upText), lever.id).toBe(shape(downText));
      checked += 1;
    }
    expect(checked).toBeGreaterThan(400);
  });
});

describe('scenario report', () => {
  const levers = {
    'vat.standard': reference('vat.standard') + 0.01,
    'incomeTax.bracket2.rate': reference('incomeTax.bracket2.rate') - 0.01,
    'socialContributions.publicEmployerLocalPension.rate':
      reference('socialContributions.publicEmployerLocalPension.rate') + 0.02,
    'spending.cofog.02': reference('spending.cofog.02') - 1,
    'spending.cofog.02.1': reference('spending.cofog.02.1') + 0.5,
    'spending.cofog.09': reference('spending.cofog.09') * 1.02,
    'spending.cofog.09.1.compensation': reference('spending.cofog.09.1.compensation') - 2,
    'spending.cofog.10.7.rsa': reference('spending.cofog.10.7.rsa') * 0.9,
    'spending.cofog.01.7': reference('spending.cofog.01.7') - 4,
    'macro.nominalGrowth': reference('macro.nominalGrowth') + 0.005,
  };
  const result = run(levers);
  const base = run({});

  it('lists the effects that add up to the summary bar', () => {
    const lines = reportLines(model, result, levers);
    const totals = reportTotals(base, result);
    const all = [...lines.levies, ...lines.spending, ...lines.projection];
    expect(lines.count).toBe(Object.keys(levers).length);
    const revenue = all.reduce((sum, l) => sum + l.revenue, 0);
    const spending = all.reduce((sum, l) => sum + l.spending, 0);
    expect(revenue).toBeCloseTo(totals.revenue, 9);
    expect(spending).toBeCloseTo(totals.spending, 9);
    expect(revenue - spending).toBeCloseTo(totals.balance, 9);
    // Shown to 0.1 Md€: the rounded lines fall back on the rounded total within the
    // rounding of each line.
    const rounded = all.reduce((sum, l) => sum + Math.round(l.spending * 10) / 10, 0);
    expect(Math.abs(rounded - totals.spending)).toBeLessThanOrEqual(0.05 * all.length);
  });

  it('groups the measures and flags what finer levers set apart', () => {
    const lines = reportLines(model, result, levers);
    expect(lines.levies.map((l) => l.lever.id)).toEqual([
      'incomeTax.bracket2.rate',
      'vat.standard',
      'socialContributions.publicEmployerLocalPension.rate',
    ]);
    expect(lines.projection.map((l) => l.lever.id)).toEqual(['macro.nominalGrowth']);
    const defence = lines.spending.find((l) => l.lever.id === 'spending.cofog.02');
    // The function's own cut leaves out 02.1, set on its own (+0.5 Md€ from its reference).
    expect(defence?.setApart).not.toBeNull();
    expect(defence?.text).toMatch(/postes à temps plein en moins\.$/);
    const rsa = lines.spending.find((l) => l.lever.id === 'spending.cofog.10.7.rsa');
    expect(rsa?.text).toContain(
      'chaque ménage qui perçoit cette prestation en reçoit 10,0 % de moins',
    );
  });

  it('renders the measures, the totals and the profiles', () => {
    const store = new ScenarioStore(model);
    store.restore(levers);
    const { body } = render(ScenarioReport, { props: { store, open: true, onClose: () => {} } });
    for (const text of [
      'Bilan de votre scénario',
      '10 mesures',
      'Prélèvements',
      'Dépenses',
      'Hypothèses de projection',
      'Total',
      'Dette en 2030',
      'Effet sur les profils',
      'réglés par des leviers plus fins',
      'Fermer',
    ])
      expect(body).toContain(text);
    for (const profile of data.profiles.profiles) expect(body).toContain(profile.label);
    // No verdict: neither a score nor a grade.
    expect(body).not.toMatch(/score|note globale/i);
  });

  it('has an empty state', () => {
    const store = new ScenarioStore(model);
    const { body } = render(ScenarioReport, { props: { store, open: true, onClose: () => {} } });
    expect(body).toContain('Aucune mesure pour l’instant');
    expect(body).not.toContain('Effet sur les profils');
  });

  it('renders nothing inside the dialog while closed', () => {
    const store = new ScenarioStore(model);
    const { body } = render(ScenarioReport, { props: { store, open: false, onClose: () => {} } });
    expect(body).toContain('<dialog');
    expect(body).not.toContain('Bilan de votre scénario');
  });

  it('is opened by a button of the summary bar, next to "Partager"', () => {
    const store = new ScenarioStore(model);
    store.restore(levers);
    const { body } = render(SummaryBar, { props: { store } });
    expect(body).toMatch(/aria-haspopup="dialog"[^>]*>\s*Bilan \(10\)/);
    expect(body.indexOf('Bilan')).toBeLessThan(body.indexOf('Partager'));
  });
});

describe('impact text under the slider', () => {
  it('shows the posts under a function and the change of the groups that follow it', () => {
    const store = new ScenarioStore(model);
    store.detailLevel = 'expert';
    store.restore({ 'spending.cofog.02': reference('spending.cofog.02') - 1 });
    const { body } = render(LeverPanel, { props: { store, expanded: true } });
    expect(body).toContain('environ 4\u202f400 postes à temps plein en moins');
    // 02.1 follows the function: its own change is shown too.
    expect(body.match(/Dépense annuelle en baisse/g)?.length).toBeGreaterThan(1);
  });

  it('shows the revenue effect of a tax lever', () => {
    const store = new ScenarioStore(model);
    store.restore({ 'vat.standard': reference('vat.standard') + 0.01 });
    const { body } = render(LeverPanel, { props: { store, expanded: true } });
    expect(body).toMatch(/Recettes en hausse d’environ [\d\s\u202f,]+ Md€ par an/);
  });
});

describe('methodology of the posts', () => {
  it('names every average cost and the staff threshold', async () => {
    const { default: Methodology } = await import('../../src/ui/pages/Methodology.svelte');
    const store = new ScenarioStore(model);
    const { body } = render(Methodology, { props: { store } });
    const start = body.indexOf('Bilan et équivalent en postes');
    expect(start).toBeGreaterThan(0);
    const section = body.slice(start, body.indexOf('<h2', start));
    for (const key of Object.keys(data.spending.staffCosts)) expect(section).not.toContain(key);
    expect(section).toMatch(/défense 87\s288 €/u);
    expect(section).toContain('10 %');
  });
});
