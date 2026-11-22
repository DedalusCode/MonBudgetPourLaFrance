# SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
# Pre-committed spending shares (INSEE survey definition) from Budget de famille 2017,
# recalibrated to 2025 prices with INSEE CPI annual averages (base 2015, COICOP 2016).
# Usage: python3 -I scripts/estimates/pre-committed.py <dl_dir>   (reads TF102/TF106/TF107 CSV and ipc_annual.xml)
import csv, json, os, re, sys

DL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dl')
OUT = os.path.join(DL, 'precommitted.json')
ACCESS = '2026-11-21'
BDF = 'https://www.insee.fr/fr/statistiques/fichier/4648335/'
API = 'https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/'

# item -> (BdF codes, CPI idbank)
ITEMS = {
    'rent':       (['041'], '001764621'),
    'water':      (['0443'], '001764644'),
    'charges':    (['0444'], '001764644'),
    'energy':     (['045'], '001764659'),
    'telecom':    (['0813'], '001764901'),
    'canteens':   (['1112'], '001765064'),
    'insurance':  (['1252', '1253', '1254', '1255'], '001765124'),
    'financial':  (['126'], '001765134'),
}
ENERGY_DETAIL = ['0450', '0451', '0452', '0453', '045A']
ALL_ITEMS = '001764363'
GROUPS = [('L1', 'TF107', 'L1'), ('L2', 'TF107', 'L2'), ('L3', 'TF107', 'L3'), ('L4', 'TF107', 'L4'),
          ('L5', 'TF107', 'L5'), ('age65_74', 'TF102', '6'), ('D10', 'TF106', '10')]

def load(table):
    d = {}
    with open(os.path.join(DL, table + '.csv'), encoding='utf-8', newline='') as f:
        r = csv.reader(f, delimiter=';'); next(r)
        for code, grp, val in r:
            d[(code, grp)] = float(val)
    return d

def load_cpi(path):
    t = open(path, encoding='utf-8').read(); out = {}
    for s in re.findall(r'<Series .*?</Series>', t, re.S):
        h = dict(re.findall(r'([\w-]+)="([^"]*)"', re.search(r'<Series[^>]*>', s).group(0)))
        obs = dict(re.findall(r'TIME_PERIOD="([^"]*)" OBS_VALUE="([^"]*)"', s))
        out[h['IDBANK']] = {'title': h['TITLE_FR'], 'freq': h['FREQ'],
                            '2017': float(obs['2017']), '2025': float(obs['2025']),
                            'url': 'https://www.insee.fr/fr/statistiques/serie/' + h['IDBANK']}
    return out

cpi = load_cpi(os.path.join(DL, 'ipc_annual.xml'))
ratio = {k: v['2025'] / v['2017'] for k, v in cpi.items()}
tables = {t: load(t) for t in ('TF102', 'TF106', 'TF107')}

def shares(a, total):
    rent = a['rent']; nonrent = sum(v for k, v in a.items() if k != 'rent')
    return {'rentShare': round(rent / total, 4),
            'nonRentShare': round(nonrent / (total - rent), 4),
            'housingEnergyShare': round(a['energy'] / (total - rent), 4),
            'precommittedShare': round((rent + nonrent) / total, 4)}

res = {}
for name, table, grp in GROUPS:
    d = tables[table]
    a17 = {k: sum(d[(c, grp)] for c in codes) for k, (codes, _) in ITEMS.items()}
    # checks: 041 = 04111 + 04121, 045 = sum of its sub-items
    assert abs(d[('041', grp)] - d[('04111', grp)] - d[('04121', grp)]) <= 1
    assert abs(d[('045', grp)] - sum(d[(c, grp)] for c in ENERGY_DETAIL)) <= 1
    tot17 = d[('CTOTALE', grp)]
    a25 = {k: a17[k] * ratio[ITEMS[k][1]] for k in a17}
    tot25 = tot17 * ratio[ALL_ITEMS]
    res[name] = {'source': BDF + table + '.csv', 'groupCode': grp,
                 'amounts2017': {**{k: round(v) for k, v in a17.items()}, 'CTOTALE': round(tot17),
                                 'energyDetail': {c: d[(c, grp)] for c in ENERGY_DETAIL}},
                 'amounts2025prices': {**{k: round(v, 1) for k, v in a25.items()}, 'CTOTALE': round(tot25, 1)},
                 'shares2017': shares(a17, tot17), 'shares2025prices': shares(a25, tot25)}

out = {'accessDate': ACCESS,
       'definition': 'INSEE pre-committed spending, survey field: rent 041 (net of housing aid), water 0443, '
                     'collective charges 0444, energy 045, telecom 0813, canteens 1112, non-life insurance '
                     '1252-1255, financial services 126; denominator CTOTALE. No imputed rent, no mortgage.',
       'bdfPublication': 'https://www.insee.fr/fr/statistiques/4648335',
       'bdfLabels': BDF + 'metadonnees_bdf2017.csv',
       'cpi': {k: {**v, 'api': API + k, 'ratio2025over2017': round(ratio[k], 4)} for k, v in cpi.items()},
       'itemIndex': {k: v[1] for k, v in ITEMS.items()} | {'CTOTALE': ALL_ITEMS},
       'groups': res}
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

print('CPI (annual average, base 2015):')
for k, v in cpi.items():
    print(f"  {k} {v['2017']:7.2f} {v['2025']:7.2f} x{ratio[k]:.4f}  {v['title'][62:]}")
hdr = ['rent', 'water', 'charges', 'energy', 'telecom', 'canteens', 'insurance', 'financial', 'CTOTALE']
print('\nAmounts 2017 (EUR per household):')
print('group     ' + ''.join(f'{h:>10}' for h in hdr))
for g, r in res.items():
    print(f'{g:10}' + ''.join(f"{r['amounts2017'][h]:>10}" for h in hdr))
print('\nShares          rent17  nonRent17 energy17 | rent25  nonRent25 energy25 | total17 total25')
for g, r in res.items():
    a, b = r['shares2017'], r['shares2025prices']
    print(f"{g:10} {a['rentShare']:9.4f} {a['nonRentShare']:9.4f} {a['housingEnergyShare']:8.4f} | "
          f"{b['rentShare']:7.4f} {b['nonRentShare']:9.4f} {b['housingEnergyShare']:8.4f} | "
          f"{a['precommittedShare']:7.4f} {b['precommittedShare']:7.4f}")
print('\nwritten', OUT)
