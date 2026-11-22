// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * How the breakdown of spending and revenue is drawn (PLAN.MD §14.1): pie chart, bars or
 * squares (treemap). A display preference kept in this browser, never part of a scenario.
 */
export type ChartView = 'pie' | 'bars' | 'squares';

export const CHART_VIEWS: { id: ChartView; label: string }[] = [
  { id: 'pie', label: 'Camembert' },
  { id: 'bars', label: 'Barres' },
  { id: 'squares', label: 'Carrés' },
];

export const DEFAULT_CHART_VIEW: ChartView = 'pie';
export const CHART_VIEW_KEY = 'chartView';

export const isChartView = (value: unknown): value is ChartView =>
  CHART_VIEWS.some((view) => view.id === value);
