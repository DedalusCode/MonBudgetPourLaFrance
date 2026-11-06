# SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Approximate taxable income per income tax bracket (2024 incomes).

Usage: python3 scripts/estimates/ir-brackets.py (standard library only).

Independent cross-check only: the data uses LexImpact simulations (source
"leximpact-socio-fiscal-2027"). Results against LexImpact (+1 point, Md€):
11 %: 3.5 vs 4.72; 30 %: 1.5 vs 1.91; 41 %: 0.27 vs 0.25; 45 %: 0.12 vs 0.14.

Inputs: DGFiP Statistiques n°41 (Nov. 2025), table 2 (2024 incomes), source id
"dgfip-stat-41-ir-2024": mean revenu fiscal de référence (RFR) per part and mean barème
tax per household, by decile of RFR per part, the top decile split into 9 % / 0.9 % /
0.1 %.

Method: within a group, income per part is uniform between boundaries halfway between
neighbouring group means. A per-group scale (alpha) makes the modelled mean barème tax
per household equal to the published one; it absorbs what the model leaves out (flat-tax
income inside the RFR, décote, quotient familial ceilings...). The average number of
parts per household is a sensitivity parameter.
"""

from __future__ import annotations

# Barème applied to 2025 incomes (CGI art. 197); the 2024 thresholds are the same
# divided by the 0.9 % indexation of the loi de finances pour 2026.
THRESHOLDS_2025_INCOMES = [0, 11_600, 29_579, 84_577, 181_917]
THRESHOLDS = [round(t / 1.009) for t in THRESHOLDS_2025_INCOMES]
RATES = [0, 0.11, 0.30, 0.41, 0.45]

# DGFiP Statistiques n°41, table 2.
HOUSEHOLDS = 272.658212477e9 / 65532.4266 * 10
DECILE_MEAN_RFR_PER_PART = [
    5093.27, 9548.21, 12704.82, 15523.31, 18224.06, 21127.63, 24861.99, 31043.19,
]
DECILE_MEAN_TAX = [14.38, 6.44, 5.26, 95.54, 485.67, 1103.33, 2008.28, 3895.53]
TOP_10_PCT = (65532.43, 16136.92)  # (mean RFR per part, mean tax) of the top 10 %
TOP_1_PCT = (213672.06, 57712.97)
TOP_01_PCT = (916590.48, 163412.97)

GRID_POINTS = 801


def bracket_slices(income: float, thresholds: list[float]) -> list[float]:
    """Part of `income` (per part) falling in each bracket."""
    uppers = thresholds[1:] + [float("inf")]
    return [max(0.0, min(income, upper) - lower) for lower, upper in zip(thresholds, uppers)]


def bareme_tax(income: float, thresholds: list[float]) -> float:
    return sum(rate * part for rate, part in zip(RATES, bracket_slices(income, thresholds)))


def income_groups() -> list[tuple[float, float, float]]:
    """(share of households, mean RFR per part, mean tax) of each group, D2 to the top 0.1 %."""
    groups = [(0.10, mean, tax) for mean, tax in zip(DECILE_MEAN_RFR_PER_PART, DECILE_MEAN_TAX)]
    (m10, t10), (m1, t1), (m01, t01) = TOP_10_PCT, TOP_1_PCT, TOP_01_PCT
    groups.append((0.09, (10 * m10 - m1) / 9, (10 * t10 - t1) / 9))
    groups.append((0.009, (m1 - 0.1 * m01) / 0.9, (t1 - 0.1 * t01) / 0.9))
    groups.append((0.001, m01, t01))
    return groups


def income_grid(group: int, means: list[float], bounds: list[float]) -> list[float]:
    """Uniform incomes per part of a group, centred on its mean."""
    low = bounds[group]
    high = bounds[group + 1] if group + 1 < len(bounds) else 2 * means[group] - low
    shift = means[group] - (low + high) / 2
    return [
        max(0.0, low + shift + (high - low) * j / (GRID_POINTS - 1)) for j in range(GRID_POINTS)
    ]


def calibrated_scale(
    incomes: list[float], parts: float, thresholds: list[float], target: float
) -> float:
    """Scale of the incomes that gives the published mean tax per household (bisection)."""

    def mean_tax(scale: float) -> float:
        return parts * sum(bareme_tax(scale * x, thresholds) for x in incomes) / len(incomes)

    low, high = 0.0, 2.0
    for _ in range(60):
        scale = (low + high) / 2
        if mean_tax(scale) < target:
            low = scale
        else:
            high = scale
    return scale


def estimate(parts: float, thresholds: list[float], alphas: list[float] | None = None):
    """Taxable income per bracket (Md€), total barème tax (Md€) and the per-group scales."""
    groups = income_groups()
    means = [mean for _, mean, _ in groups]
    bounds = [means[0] - (means[1] - means[0]) / 2]
    bounds += [(means[i - 1] + means[i]) / 2 for i in range(1, len(means))]

    per_bracket = [0.0] * len(RATES)
    total_tax = 0.0
    scales = []
    for i, (share, _, published_tax) in enumerate(groups):
        incomes = income_grid(i, means, bounds)
        if alphas is None:
            alpha = calibrated_scale(incomes, parts, thresholds, published_tax)
        else:
            alpha = alphas[i]
        scales.append(alpha)
        weight = HOUSEHOLDS * share * parts / len(incomes)
        for x in incomes:
            for k, part in enumerate(bracket_slices(alpha * x, thresholds)):
                per_bracket[k] += weight * part
            total_tax += weight * bareme_tax(alpha * x, thresholds)
    return [y / 1e9 for y in per_bracket], total_tax / 1e9, scales


def main() -> None:
    print("N foyers =", round(HOUSEHOLDS / 1e6, 2), "M ; barème 2024 =", THRESHOLDS)
    for parts in (1.3, 1.5, 1.7):
        bases, tax, scales = estimate(parts, THRESHOLDS)
        # Indexation check: thresholds +2.1 % with the same incomes gives the tax loss.
        _, indexed_tax, _ = estimate(parts, [t * 1.021 for t in THRESHOLDS], scales)
        print(
            f"p={parts}: bases Md€ 11%:{bases[1]:6.0f} 30%:{bases[2]:5.0f} 41%:{bases[3]:4.0f}"
            f" 45%:{bases[4]:4.0f} | point Md€ {bases[1] / 100:.2f} {bases[2] / 100:.2f}"
            f" {bases[3] / 100:.2f} {bases[4] / 100:.2f} | barème {tax:.1f}"
            f" | indexation 2,1 % : {indexed_tax - tax:+.2f} Md€"
        )
        print("   alpha:", [round(a, 2) for a in scales])


if __name__ == "__main__":
    main()
