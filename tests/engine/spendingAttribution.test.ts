// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../../src/engine/params.ts';
import { emptyScenario } from '../../src/engine/scenario.ts';
import { createModel, simulate } from '../../src/engine/simulate.ts';
import { groupStaff } from '../../src/engine/spendingAttribution.ts';

const data = loadDataset();
const model = createModel(data);
const empty = emptyScenario(data.meta.baseYear);
const base = simulate(model, empty);
const run = (levers: Record<string, number>) => simulate(model, { ...empty, levers });
const reference = (id: string) => {
  const lever = model.levers.get(id);
  if (!lever) throw new Error(`unknown lever ${id}`);
  return lever.reference;
};
const total = (record: Record<string, number>) =>
  Object.values(record).reduce((sum, x) => sum + x, 0);
const spendingDelta = (r: ReturnType<typeof run>) =>
  r.aggregates.spending - base.aggregates.spending;

describe('spending attribution', () => {
  it('is empty without a spending lever', () => {
    expect(base.spendingByLever).toEqual({});
    expect(base.positionsByLever).toEqual({});
    expect(base.positionsByGroup).toEqual({});
  });

  it('adds up to the spending change of the aggregates, whatever lever sets an amount', () => {
    const r = run({
      // A function, one of its groups set on its own, one of its items set on its own.
      'spending.cofog.09': reference('spending.cofog.09') * 0.9,
      'spending.cofog.09.1': reference('spending.cofog.09.1') + 2,
      'spending.cofog.09.2.compensation': reference('spending.cofog.09.2.compensation') - 1,
      // An item alone, in a group without other lever.
      'spending.cofog.10.7.rsa': 0,
      // A group with an item of its own, and the debt interest.
      'spending.cofog.07.3': reference('spending.cofog.07.3') * 1.05,
      'spending.cofog.07.3.compensation': reference('spending.cofog.07.3.compensation') + 1,
      'spending.cofog.01.7': reference('spending.cofog.01.7') - 3,
      // A public employer contribution: spending and revenue move together.
      'socialContributions.publicEmployerStatePension.rate':
        reference('socialContributions.publicEmployerStatePension.rate') + 0.01,
    });
    const listed = total(r.spendingByLever) + total(r.spendingChanges);
    expect(listed).toBeCloseTo(spendingDelta(r), 9);
    expect(r.spendingByLever['spending.cofog.09.1']).toBeCloseTo(2, 9);
    expect(r.spendingByLever['spending.cofog.10.7.rsa']).toBeCloseTo(
      -reference('spending.cofog.10.7.rsa'),
      9,
    );
    // The item set on its own carries its own change; the group lever the other items'.
    expect(r.spendingByLever['spending.cofog.07.3.compensation']).toBeCloseTo(1, 9);
    expect(r.spendingByLever['spending.cofog.01.7']).toBeCloseTo(-3, 9);
  });

  it('gives each lever the change it sets and nothing for an unchanged lever', () => {
    const r = run({ 'spending.cofog.04': reference('spending.cofog.04') });
    expect(r.spendingByLever).toEqual({});
    expect(r.positionsByLever).toEqual({});
  });
});

describe('posts', () => {
  const staff = groupStaff(data);

  it('shows about 4 400 fewer posts for 1 Md€ less on defence (audit example)', () => {
    const r = run({ 'spending.cofog.02': reference('spending.cofog.02') - 1 });
    const posts = r.positionsByLever['spending.cofog.02'] ?? NaN;
    expect(posts).toBeLessThan(-4_350);
    expect(posts).toBeGreaterThan(-4_450);
    // A function is the sum of its groups.
    expect(total(r.positionsByGroup)).toBeCloseTo(posts, 6);
  });

  it('is symmetric: the same change upward gives as many more posts', () => {
    const down = run({ 'spending.cofog.09.1': reference('spending.cofog.09.1') - 1 });
    const up = run({ 'spending.cofog.09.1': reference('spending.cofog.09.1') + 1 });
    const posts = up.positionsByLever['spending.cofog.09.1'] ?? NaN;
    expect(posts).toBeGreaterThan(0);
    expect(down.positionsByLever['spending.cofog.09.1']).toBeCloseTo(-posts, 6);
  });

  it('counts a compensation item as all staff, a group by its staff share', () => {
    const info = staff.get('09.1');
    if (!info) throw new Error('09.1 has staff');
    const item = run({
      'spending.cofog.09.1.compensation': reference('spending.cofog.09.1.compensation') - 1,
    });
    const group = run({ 'spending.cofog.09.1': reference('spending.cofog.09.1') - 1 });
    expect(item.positionsByLever['spending.cofog.09.1.compensation']).toBeCloseTo(
      -info.postsPerBillion,
      6,
    );
    expect(group.positionsByLever['spending.cofog.09.1']).toBeCloseTo(
      -info.postsPerBillion * info.share,
      6,
    );
  });

  it('shows no posts for a concrete item, nor for a group below the staff threshold', () => {
    const benefit = run({ 'spending.cofog.10.7.rsa': reference('spending.cofog.10.7.rsa') - 1 });
    expect(benefit.positionsByLever).toEqual({});
    const low = [...staff].find(([, s]) => !s.showsPosts);
    if (!low) throw new Error('a group below the threshold');
    const [code, info] = low;
    const r = run({ [`spending.cofog.${code}`]: reference(`spending.cofog.${code}`) - 1 });
    expect(r.positionsByLever).toEqual({});
    // Its compensation item set on its own still shows posts.
    const id = `spending.cofog.${info.compensationItem ?? ''}`;
    const own = run({ [id]: reference(id) - 1 });
    expect(own.positionsByLever[id]).toBeCloseTo(-info.postsPerBillion, 6);
  });

  it('keeps the staff share for items that follow a group without a compensation line', () => {
    const info = staff.get('10.7');
    if (!info?.showsPosts || info.compensationItem) throw new Error('10.7 as expected');
    const r = run({
      'spending.cofog.10.7': reference('spending.cofog.10.7') - 1,
      'spending.cofog.10.7.rsa': reference('spending.cofog.10.7.rsa'),
    });
    // The RSA item stays at its reference: the other items carry the whole group cut.
    const groupCut = (r.spendingByLever['spending.cofog.10.7'] ?? NaN) * info.share;
    expect(r.positionsByLever['spending.cofog.10.7']).toBeCloseTo(
      groupCut * info.postsPerBillion,
      6,
    );
    expect(r.positionsByLever['spending.cofog.10.7.rsa']).toBeUndefined();
  });

  it('leaves family and unemployment benefits without posts', () => {
    for (const code of ['10.4', '10.5']) expect(staff.has(code)).toBe(false);
  });

  it('counts the fire services (03.2) at their own average cost', () => {
    const fire = staff.get('03.2');
    expect(fire?.showsPosts).toBe(true);
    // 4 873 M€ of compensation for 68 969 posts (professional, administrative, military).
    const scaling = data.spending.scaling.value ?? NaN;
    expect((fire?.postsPerBillion ?? NaN) * scaling).toBeCloseTo(1e9 / 70_655, 6);
  });
});
