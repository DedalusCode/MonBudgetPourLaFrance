// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Card lines linked to their levers (PLAN.MD §14.3): buttons, detail rows and pop-up. */
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { createModel } from '../../src/engine/simulate.ts';
import LineLevers from '../../src/ui/components/LineLevers.svelte';
import ProfileCard from '../../src/ui/components/ProfileCard.svelte';
import { profileView } from '../../src/ui/profileView.ts';
import { ScenarioStore } from '../../src/ui/state/scenario.svelte.ts';

const model = createModel(loadDataset());

function storeWith(levers: Record<string, number>) {
  const store = new ScenarioStore(model);
  for (const [id, value] of Object.entries(levers)) store.set(id, value);
  return store;
}

describe('card lines', () => {
  const store = storeWith({ 'vat.standard': 0.22 });
  const impact = (id: string) => {
    const found = store.result.profiles.find((p) => p.id === id);
    if (!found) throw new Error(id);
    return found;
  };

  it('gives every line an id and names its parts', () => {
    const view = profileView(impact('cadre3k'), store.partNames);
    const csg = view.levies.find((l) => l.id === 'csgCrdsSalary');
    expect(csg?.parts.map((p) => p.label)).toEqual([
      'CSG déductible',
      'CSG non déductible',
      'CRDS',
    ]);
    const employee = view.levies.find((l) => l.id === 'employeeContributions');
    expect(employee?.parts.map((p) => p.label)).toContain(
      'Assurance vieillesse plafonnée (part salariale)',
    );
    const services = view.received.find((l) => l.id === 'inKind');
    expect(services?.parts.map((p) => p.line)).toContain('inKind.07');
    expect(services?.parts.find((p) => p.line === 'inKind.07')?.label).toBe('Santé');
  });

  it('renders lines as buttons that open the pop-up, and their detail behind a toggle', () => {
    const { body } = render(ProfileCard, {
      props: {
        impact: impact('cadre3k'),
        label: 'Cadre',
        mode: 'eur',
        showDataWarning: false,
        dualRates: false,
        detailInitiallyOpen: true,
        names: store.partNames,
        onLine: () => {},
      },
    });
    expect(body).toMatch(
      /<button[^>]*class="line-button[^"]*"[^>]*aria-haspopup="dialog"[^>]*>TVA<\/button>/,
    );
    expect(body).toMatch(/class="fold[^"]*"[^>]*aria-expanded="false"/);
  });

  it('says so when no lever can move a line, without a button', () => {
    const { body } = render(ProfileCard, {
      props: {
        impact: impact('artisan'),
        label: 'Artisan',
        mode: 'eur',
        showDataWarning: false,
        dualRates: false,
        detailInitiallyOpen: true,
        names: store.partNames,
        onLine: () => {},
      },
    });
    expect(body).toContain('aucun curseur ne la modifie');
    expect(body).not.toMatch(/class="line-button[^"]*"[^>]*>Cotisations sociales d’indépendant</);
  });
});

describe('pop-up of a line', () => {
  it('lists the modified levers with their effect, then the others', () => {
    const store = storeWith({ 'vat.standard': 0.22, 'csg.activity.rate': 0.1 });
    store.openLine({
      subject: { kind: 'profile', id: 'cadre3k' },
      line: 'vat',
      label: 'TVA',
      cardLabel: 'Cadre',
    });
    const { body } = render(LineLevers, { props: { store } });
    expect(body).toContain('Curseurs modifiés');
    expect(body).toContain('Par les taux');
    expect(body).toContain('Par la consommation (revenu disponible)');
    expect(body).toContain('TVA : taux normal');
    expect(body).toContain('CSG sur les revenus d’activité');
    expect(body).toMatch(/Autres curseurs qui peuvent agir sur cette ligne \(\d+\)/);
    expect(body).toContain('aria-label="Ouvrir le curseur TVA : taux normal"');
  });

  it('works for the household described by the user and marks levers of a more detailed level', () => {
    const store = new ScenarioStore(model);
    store.openLine({
      subject: {
        kind: 'household',
        household: {
          adults: [{ status: 'salaried', netMonthly: 1_400, age: 30 }],
          married: false,
          childAges: [],
          tenure: 'tenant',
          rent: 500,
          zone: 2,
          propertyTax: 0,
          otherParentAbsent: false,
          maintenancePerChild: 0,
        },
      },
      line: 'activityBonus',
      label: 'Prime d’activité',
      cardLabel: 'Votre foyer',
    });
    const { body } = render(LineLevers, { props: { store } });
    expect(body).toContain('le scénario ne change pas cette ligne');
    expect(body).toContain('Prime d’activité');
    expect(body).toContain('niveau Expert');
  });
});

describe('reste à vivre on the cards', () => {
  it('shows the monthly amount, its parts, and explains a negative one', () => {
    const store = new ScenarioStore(model);
    const student = store.result.profiles.find((p) => p.id === 'student');
    if (!student) throw new Error('no student');
    const { body } = render(ProfileCard, {
      props: {
        impact: student,
        label: 'Étudiant',
        mode: 'eur',
        showDataWarning: false,
        dualRates: false,
        detailInitiallyOpen: true,
      },
    });
    expect(body).toContain('Reste à vivre');
    expect(body).toContain('Reste à vivre, par mois');
    expect(body).toContain('Loyer (avant aide au logement)');
    expect(body).toContain('Négatif : les dépenses contraintes dépassent le revenu disponible');
  });
});
