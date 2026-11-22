# SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Usage: python3 scripts/estimates/ir-thresholds.py (standard library only). Audit v1.2, docs/audit-v1.2/bareme-ir.md.

Piecewise-Pareto model of the parts-weighted survival S(q) of the quotient familial q.
Inputs (all read from files cited in the audit):
 - DGFiP nid_25519 (2024 incomes): foyers by marginal rate -> foyers above each threshold.
 - LexImpact bases (Md EUR per point of rate), 2027 legislation (2026 incomes).
"""
import math
T24 = [11497, 29315, 83823, 180294]                 # 2024-income thresholds (nid_25519)
N24 = [20930.797+6868.031+434.112+61.476, 6868.031+434.112+61.476, 434.112+61.476, 61.476]  # thousand foyers above
T_LEX = [11844, 30200, 86353, 185737]               # LexImpact thresholds (2027 law)
T_SIM = [11600, 29579, 84577, 181917]               # simulator reference (2026 law)
B_LEX = {0: 484.91, 1: 471.82, 2: 190.6, 3: 24.7, 4: 14.38}  # Md EUR base per 100 points
RATES = [0, .11, .30, .41, .45]

print("foyers above thresholds (k):", [round(x) for x in N24])
# local Pareto exponents from the TMI counts (same mean parts assumed)
a_tmi = [math.log(N24[k]/N24[k+1])/math.log(T24[k+1]/T24[k]) for k in range(3)]
print("Pareto exponents between thresholds (counts):", [round(a,3) for a in a_tmi])

def band_integral(S0, t0, t1, a):
    """int_{t0}^{t1} S0 (q/t0)^-a dq"""
    if t1 == math.inf:
        return S0*t0/(a-1)
    return S0*t0/(a-1)*(1-(t1/t0)**(1-a)) if abs(a-1) > 1e-9 else S0*t0*math.log(t1/t0)

# --- Check 1: shape from TMI counts only, one scale factor from bracket 11 % (B2)
T = T_LEX
shape = [N24[k]/N24[0] for k in range(4)]
unit = sum(band_integral(shape[0], T[0], T[1], a_tmi[0]) for _ in [0])
S1 = B_LEX[1]*1e9/unit           # parts above t1 (LexImpact year)
S = [S1*s for s in shape]
print(f"\nCheck 1: S(t1) = {S1/1e6:.1f} M parts (= {S1/N24[0]/1e3:.2f} parts per foyer above t1, 2024 counts)")
for k, (lo, hi) in enumerate(zip(T, T[1:])):
    b = band_integral(S[k], lo, hi, a_tmi[k])/1e9
    print(f"  band {k+2} ({RATES[k+1]:.0%}) predicted base {b:6.1f} Md  vs LexImpact {B_LEX[k+1]:6.1f}  ratio {b/B_LEX[k+1]:.2f}")

# --- Calibration: per-threshold parts factor so that every band reproduces LexImpact exactly.
# Unknowns: S(t_k) k=1..4 and the top exponent a4. Band k exponent a_k follows from S(t_k), S(t_{k+1})
# and must give B_k: solve S(t_k) sequentially given S(t1) from bracket-2 with the TMI ratio fixed for band 2.
def solve_next(Sk, tk, tk1, Bk):
    """Find S(t_{k+1}) such that int_{tk}^{tk1} power law from Sk to S_{k+1} = Bk."""
    lo, hi = 1e-6*Sk, Sk*(1-1e-9)
    for _ in range(200):
        mid = math.sqrt(lo*hi)
        a = math.log(Sk/mid)/math.log(tk1/tk)
        v = band_integral(Sk, tk, tk1, a)
        if v > Bk: hi = mid   # too big integral -> need smaller S_{k+1}
        else: lo = mid
    return mid, a
for S1_choice_label, S1c in [("S1 from check 1", S1)]:
    Ss = [S1c]; As = []
    for k in range(3):
        nxt, a = solve_next(Ss[-1], T[k], T[k+1], B_LEX[k+1]*1e9)
        Ss.append(nxt); As.append(a)
    a_top = 1 + Ss[3]*T[3]/(B_LEX[4]*1e9)
    As.append(a_top)
    print(f"\nCalibrated ({S1_choice_label}): S(t_k) M parts = {[round(s/1e6,3) for s in Ss]}")
    print("  implied parts per foyer above t_k (vs 2024 TMI counts):", [round(Ss[k]/N24[k]/1e3, 2) for k in range(4)])
    print("  band exponents:", [round(a,3) for a in As])
    CAL = (Ss, As)

Ss, As = CAL
def revenue(thresholds, rates, extra=None):
    """Static barème revenue (Md) under calibrated S, relative computations only."""
    # S(q) on LexImpact scale
    def S_at(q):
        k = max(i for i in range(4) if T[i] <= q) if q >= T[0] else None
        if k is None:  # below t1: not modelled (0 % band), extrapolate with band-2 exponent
            return Ss[0]*(q/T[0])**(-As[0])
        return Ss[k]*(q/T[k])**(-As[k])
    def integral(lo, hi, n=4000):
        if hi <= lo: return 0.0
        # integrate piecewise analytically by splitting at T
        pts = sorted(set([lo, hi] + [t for t in T if lo < t < hi]))
        tot = 0.0
        for x0, x1 in zip(pts, pts[1:]):
            s0 = S_at(x0); k = max([i for i in range(4) if T[i] <= x0], default=0)
            tot += band_integral(s0, x0, x1, As[k])
        if hi == math.inf: pass
        return tot
    ths = list(thresholds) + ([extra[0]] if extra else [])
    rs = list(rates) + ([extra[1]] if extra else [])
    tot = 0.0
    for k in range(1, len(ths)):
        hi = ths[k+1] if k+1 < len(ths) else math.inf
        lo = ths[k]
        if hi == math.inf:
            # tail
            kk = max(i for i in range(4) if T[i] <= lo) if lo >= T[0] else 0
            if lo >= T[3]:
                tot += rs[k]*S_at(lo)*lo/(As[3]-1)
            else:
                tot += rs[k]*(integral(lo, T[3]) + Ss[3]*T[3]/(As[3]-1))
        else:
            if hi > T[3] and lo < T[3]:
                part = integral(lo, T[3]) + (Ss[3]*T[3]/(As[3]-1))*(1-(hi/T[3])**(1-As[3]))
            elif lo >= T[3]:
                part = S_at(lo)*lo/(As[3]-1)*(1-(hi/lo)**(1-As[3]))
            else:
                part = integral(lo, hi)
            tot += rs[k]*part
    return tot/1e9

base_th = [0] + T
base = revenue(base_th, RATES)
print(f"\nModel barème revenue above t1 at LexImpact reference: {base:.1f} Md (gross, no décote/QF ceiling)")
# rate sensitivities reproduced
for k in range(1, 5):
    r = list(RATES); r[k] += .01
    print(f"  +1 pt bracket {RATES[k]:.0%}: {revenue(base_th, r)-base:+.3f} Md (LexImpact {B_LEX[k]/100:.3f})")
# threshold sensitivities
print("\nThreshold sensitivities (thresholds +1 % / +10 %), Md:")
for k in range(1, 5):
    for pct in (0.01, 0.10, -0.10):
        th = list(base_th); th[k] *= 1+pct
        print(f"  t{k} {T[k-1]} {pct:+.0%}: {revenue(th, RATES)-base:+.3f}", end="")
    print(f"   | analytic d/dt = -{RATES[k]-RATES[k-1]:.2f} x S(t{k}) x 1% t = {-(RATES[k]-RATES[k-1])*Ss[k-1]*T[k-1]*0.01/1e9:+.3f}")
th = [t*1.01 for t in base_th]
print(f"\nAll thresholds +1 % (no décote/QF): {revenue(th, RATES)-base:+.3f} Md  (official ~ -2.0 Md per point incl. décote/QF, PLF 2027)")
# extra bracket
print("\nAdded bracket above 45 %:")
for thr in (250000, 500000, 1000000):
    for rate in (0.50, 0.55, 0.60):
        print(f"  threshold {thr:>9} / part, rate {rate:.0%}: {revenue(base_th, RATES, (thr, rate))-base:+.3f} Md")
# tail sensitivity to exponent
print("\nTop tail: parts above t4 =", round(Ss[3]), " exponent a =", round(As[3], 3))
for a in (1.6, 1.8, 2.0, 2.2, 2.5):
    for thr in (250000, 500000, 1000000):
        # keep B5 fixed? no: compare an alternative a with S(t4) re-solved to keep B5
        S4 = B_LEX[4]*1e9*(a-1)/T[3]
        sur = S4*(thr/T[3])**(-a)
        base_above = sur*thr/(a-1)
        print(f"  a={a}: +5 pts above {thr}: {0.05*base_above/1e9:.3f} Md (parts above {sur:,.0f})", end=";")
    print()
