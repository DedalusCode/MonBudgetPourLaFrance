# SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Cross-check with OpenFisca-France (PLAN.MD step 11), part 2.

Reads out/cases.json (written by export-cases.ts), recomputes every household with
OpenFisca-France and writes out/report.md and out/report.json with the gaps.

Usage:
    node scripts/openfisca-check/export-cases.ts
    python scripts/openfisca-check/compare.py [--strict]

Exit code 0, unless --strict is given and a gap exceeds the tolerance (the CI job runs
without --strict: the check informs, it does not block).

Periods (see `Periods`), for the simulator's legislation year N: social contributions and
allocations familiales in year N; the prime d'activité of September N, whose three
reference months all follow the rules of N, as the simulator applies them to the whole
year; income tax on the income of N − 1, computed with the barème voted for N, which is
the one the simulator applies.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import date
from importlib.metadata import version as package_version
from pathlib import Path

from openfisca_core.simulation_builder import SimulationBuilder
from openfisca_france import FranceTaxBenefitSystem

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
# A gap is accepted below max(2 % of the larger amount, 20 €); parts must be equal.
RELATIVE_TOLERANCE = 0.02
ABSOLUTE_TOLERANCE = 20.0

# Gaps whose cause is known: a benefit the simulator leaves out, or a rule OpenFisca
# applies differently. They stay in the report, with their explanation.
KNOWN_GAPS = {
    ("apprentice", "employerContributions"): (
        "OpenFisca applique à l'apprenti l'ancienne exonération propre aux apprentis et pas"
        " la réduction générale dégressive unique (RGDU) ; le simulateur applique la RGDU,"
        " qui couvre tous les contrats en alternance depuis 2026 (service-public, F24542)."
    ),
    ("singleParent1Child", "activityBonus"): (
        "OpenFisca verse l'allocation de soutien familial (ASF), que le simulateur ne modélise"
        " pas ; elle entre dans les ressources de la prime d'activité, qui est donc plus faible."
    ),
    ("coupleSmicInactive3Children", "activityBonus"): (
        "OpenFisca verse le complément familial (familles de trois enfants ou plus), que le"
        " simulateur ne modélise pas ; il entre dans les ressources de la prime d'activité."
    ),
}

METRICS = {
    "employeeContributions": "Cotisations salariales",
    "csgCrdsSalary": "CSG et CRDS sur les salaires",
    "netSalary": "Salaire net",
    "employerContributions": "Cotisations patronales après allègement général",
    "csgCrdsPension": "CSG et CRDS sur les pensions",
    "incomeTax": "Impôt sur le revenu (après décote)",
    "parts": "Nombre de parts",
    "activityBonus": "Prime d’activité (annuelle)",
    "familyAllowances": "Allocations familiales (annuelles)",
}


@dataclass(frozen=True)
class Periods:
    """Periods of the comparison for the simulator's legislation year."""

    year: int

    @property
    def years(self) -> list[int]:
        # Four years back: the CSG on pensions of year N depends on the income of N − 2.
        return list(range(self.year - 4, self.year + 1))

    @property
    def months(self) -> list[str]:
        return [f"{y}-{m:02d}" for y in self.years for m in range(1, 13)]

    @property
    def income_tax_year(self) -> str:
        # Income of the previous year, taxed with the barème voted for this year.
        return str(self.year - 1)

    @property
    def activity_bonus_month(self) -> str:
        # Its three reference months (June to August) all follow this year's rules.
        return f"{self.year}-09"

    @property
    def family_allowances_month(self) -> str:
        return f"{self.year}-06"


def situation(case: dict, work_accident_rate: float, periods: Periods) -> dict:
    def every_month(value):
        return {m: value for m in periods.months}

    def birth(age: int) -> str:
        return f"{periods.year - age}-01-01"
    adults = case["persons"]
    children = case["children"]
    individus = {}
    for p in adults:
        person = {
            "date_naissance": {"ETERNITY": birth(p["age"])},
            "statut_marital": every_month("marie" if case["married"] else "celibataire"),
        }
        if p["grossMonthlySalary"] > 0:
            # OpenFisca keeps an apprentice's pay apart from the ordinary base salary.
            pay = "remuneration_apprenti" if p["apprentice"] else "salaire_de_base"
            person.update(
                {
                    pay: every_month(round(p["grossMonthlySalary"], 2)),
                    "effectif_entreprise": every_month(100),
                    "categorie_salarie": every_month("prive_non_cadre"),
                    "contrat_de_travail": every_month("temps_plein"),
                    "taux_accident_travail": every_month(work_accident_rate),
                }
            )
        if p["apprentice"]:
            person["apprenti"] = every_month(True)
            # A contract signed last autumn: the current exemption rules apply.
            person["apprentissage_contrat_debut"] = every_month(f"{periods.year - 1}-09-01")
        if p["grossMonthlyPension"] > 0:
            person["retraite_brute"] = every_month(round(p["grossMonthlyPension"], 2))
            # OpenFisca does not derive the declared (taxable) pension from the gross one:
            # it is declared, as on the tax return (net of the deductible levies).
            person["retraite_imposable"] = every_month(round(p["taxablePension"] / 12, 2))
        individus[p["id"]] = person
    child_ids = []
    for i, age in enumerate(children):
        cid = f"enfant{i + 1}"
        child_ids.append(cid)
        individus[cid] = {"date_naissance": {"ETERNITY": birth(age)}}

    adult_ids = [p["id"] for p in adults]
    if len(adult_ids) == 1 or case["married"]:
        foyers = {"foyer1": {"declarants": adult_ids, "personnes_a_charge": child_ids}}
        if len(adult_ids) == 1 and child_ids:
            # Single parent living alone with the children: case T is a box to tick.
            foyers["foyer1"]["caseT"] = {str(y): True for y in periods.years}
    else:
        foyers = {
            "foyer1": {"declarants": [adult_ids[0]], "personnes_a_charge": child_ids},
            "foyer2": {"declarants": [adult_ids[1]]},
        }
    menage = {
        "personne_de_reference": [adult_ids[0]],
        "enfants": child_ids,
        "statut_occupation_logement": every_month(
            "proprietaire" if case["owner"] else "locataire_vide"
        ),
    }
    if len(adult_ids) > 1:
        menage["conjoint"] = [adult_ids[1]]
    return {
        "individus": individus,
        "foyers_fiscaux": foyers,
        "familles": {"famille1": {"parents": adult_ids, "enfants": child_ids}},
        "menages": {"menage1": menage},
    }


def openfisca_values(tbs, case: dict, work_accident_rate: float, periods: Periods) -> dict:
    situation_ = situation(case, work_accident_rate, periods)
    sim = SimulationBuilder().build_from_entities(tbs, situation_)
    year = str(periods.year)
    adults = len(case["persons"])

    def year_sum(variable: str, entity_count: int = adults) -> float:
        return float(sim.calculate_add(variable, year)[:entity_count].sum())

    gross_salary = year_sum("salaire_de_base") + year_sum("remuneration_apprenti")
    values = {
        "employeeContributions": -year_sum("cotisations_salariales"),
        "csgCrdsSalary": -(
            year_sum("csg_deductible_salaire")
            + year_sum("csg_imposable_salaire")
            + year_sum("crds_salaire")
        ),
        # Net = gross − employee levies (OpenFisca's salaire_net leaves out apprentices' pay).
        "netSalary": gross_salary
        + year_sum("cotisations_salariales")
        + year_sum("csg_deductible_salaire")
        + year_sum("csg_imposable_salaire")
        + year_sum("crds_salaire"),
        "employerContributions": year_sum("cout_du_travail") - gross_salary,
        "csgCrdsPension": -(
            year_sum("csg_deductible_retraite")
            + year_sum("csg_imposable_retraite")
            + year_sum("crds_retraite")
        ),
        "incomeTax": float(sim.calculate("ip_net", periods.income_tax_year).sum()),
        "parts": [float(x) for x in sim.calculate("nbptr", periods.income_tax_year)],
        "activityBonus": float(sim.calculate("ppa", periods.activity_bonus_month).sum()) * 12,
        "familyAllowances": float(sim.calculate("af", periods.family_allowances_month).sum()) * 12,
    }
    return values


def status_of(metric: str, engine, openfisca) -> tuple[str, float | None]:
    if metric == "parts":
        return ("OK" if [float(x) for x in engine] == openfisca else "ÉCART"), None
    gap = float(engine) - float(openfisca)
    limit = max(ABSOLUTE_TOLERANCE, RELATIVE_TOLERANCE * max(abs(engine), abs(openfisca)))
    return ("OK" if abs(gap) <= limit else "ÉCART"), gap


def euros(x: float) -> str:
    return f"{x:,.0f} €".replace(",", " ")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict", action="store_true", help="exit 1 when a gap exceeds the tolerance"
    )
    args = parser.parse_args()

    cases_file = OUT / "cases.json"
    if not cases_file.exists():
        print(
            "cases.json manquant : lancer d'abord node scripts/openfisca-check/export-cases.ts",
            file=sys.stderr,
        )
        return 1
    exported = json.loads(cases_file.read_text(encoding="utf-8"))
    rate = exported["assumptions"]["workAccidentRate"]
    periods = Periods(exported["legislationYear"])
    version = package_version("OpenFisca-France")

    tbs = FranceTaxBenefitSystem()
    rows = []
    for case in exported["cases"]:
        try:
            of = openfisca_values(tbs, case, rate, periods)
        except Exception as error:  # report it, keep going
            rows.append({"case": case["id"], "label": case["label"], "error": str(error)})
            continue
        for metric, engine in case["engine"].items():
            if metric not in METRICS:
                continue
            openfisca = of[metric]
            # Skip lines that are zero on both sides (not relevant for this household).
            if metric != "parts" and abs(engine) < 0.5 and abs(openfisca) < 0.5:
                continue
            status, gap = status_of(metric, engine, openfisca)
            note = KNOWN_GAPS.get((case["id"], metric))
            if status == "ÉCART" and note:
                status = "ÉCART EXPLIQUÉ"
            rows.append(
                {
                    "case": case["id"],
                    "label": case["label"],
                    "metric": metric,
                    "engine": engine,
                    "openfisca": openfisca,
                    "gap": gap,
                    "status": status,
                    "note": note if status == "ÉCART EXPLIQUÉ" else None,
                }
            )

    gaps = [r for r in rows if r.get("status") == "ÉCART"]
    explained = [r for r in rows if r.get("status") == "ÉCART EXPLIQUÉ"]
    errors = [r for r in rows if "error" in r]
    lines = [
        "# Validation croisée avec OpenFisca-France",
        "",
        f"- Données du simulateur : version {exported['dataVersion']}, "
        f"législation {periods.year}.",
        f"- OpenFisca-France {version}, généré le {date.today().isoformat()}.",
        f"- Tolérance : écart ≤ max({RELATIVE_TOLERANCE:.0%}, {ABSOLUTE_TOLERANCE:.0f} €) ; "
        "nombre de parts identique.",
        f"- Hypothèses communes : employeur {exported['assumptions']['employerSize']} ; "
        f"{exported['assumptions']['category']}.",
        f"- Périodes : cotisations et allocations familiales en {periods.year} ; "
        f"prime d'activité de septembre {periods.year} (trois mois de référence aux règles {periods.year}) ; impôt sur "
        f"les revenus {periods.income_tax_year} (barème voté pour {periods.year}).",
        "",
        f"**{len(rows) - len(gaps) - len(explained) - len(errors)} comparaisons dans la tolérance, "
        f"{len(explained)} écart(s) expliqué(s), {len(gaps)} écart(s) à analyser, "
        f"{len(errors)} erreur(s).**",
        "",
        "| Cas | Grandeur | Simulateur | OpenFisca | Écart | Statut |",
        "|---|---|---:|---:|---:|---|",
    ]
    for r in rows:
        if "error" in r:
            lines.append(f"| {r['label']} | — | — | — | — | erreur : {r['error'][:120]} |")
            continue
        if r["metric"] == "parts":
            engine = " + ".join(f"{p:g}" for p in r["engine"])
            openfisca = " + ".join(f"{p:g}" for p in r["openfisca"])
            gap = "—"
        else:
            engine, openfisca = euros(r["engine"]), euros(r["openfisca"])
            gap = euros(r["gap"])
        status = r["status"]
        lines.append(
            f"| {r['label']} | {METRICS[r['metric']]} | {engine} | {openfisca} | {gap} | {status} |"
        )
    if explained:
        lines += ["", "## Écarts expliqués", ""]
        for r in explained:
            lines.append(f"- **{r['label']} — {METRICS[r['metric']]}** : {r['note']}")
    OUT.mkdir(exist_ok=True)
    (OUT / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (OUT / "report.json").write_text(
        json.dumps({"openfiscaFrance": version, "rows": rows}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("\n".join(lines))
    return 1 if args.strict and (gaps or errors) else 0


if __name__ == "__main__":
    sys.exit(main())
