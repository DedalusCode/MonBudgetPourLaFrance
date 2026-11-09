# PLAN.md — Simulateur budgétaire citoyen (v1 statique) Mon budget pour la France

> **Instructions pour Claude Code**
> - Lis ce fichier en entier avant toute action.
> - Exécute **une seule étape à la fois**, dans l'ordre. À la fin de chaque étape :
>   vérifie les critères d'acceptation, coche la checklist (section 12), puis arrête-toi et attends la validation.
> - **Ne gère pas le dépôt git** (init, commits, branches, push, création du dépôt GitHub) : le mainteneur s'en charge.
> - **N'invente jamais un chiffre.** Toute valeur fiscale, budgétaire ou statistique doit avoir une source (URL officielle + date de consultation) dans le fichier de données.
>   Si tu ne peux pas la vérifier, mets `"status": "A_VERIFIER"` et signale-le.
> - Aucun appel réseau à l'exécution de l'application. Tout est embarqué au build.
> - Code, commentaires et noms de variables en anglais ; textes de l'interface en français.

---

## 1. Objectif

Site web statique, open source, hébergé sur GitHub Pages, qui permet à n'importe qui
de comprendre l'effet de chaque levier budgétaire (prélèvements et dépenses publiques)
sur :
1. les grands agrégats : recettes, dépenses, solde, dette (en Md€ et en % du PIB) ;
2. onze profils types de ménages, avec gagnants en vert et perdants en rouge, et le foyer décrit par l'utilisateur (« Votre foyer »).

Public visé : grand public, sans connaissance en finances publiques.
Ton : pédagogique, neutre, sans orientation politique.

## 2. Principes non négociables

1. **Neutralité.** Les leviers sont des paramètres, pas des propositions. Les bornes des curseurs sont
   symétriques : de 0 à 2 fois la valeur actuelle quand c'est possible (taux plafonnés à 100 %),
   sauf contrainte physique. Aucun scénario étiqueté par parti
   ou courant politique. Aucun texte qualifiant une mesure de « bonne » ou « mauvaise ».
2. **Transparence.** Chaque paramètre affiche sa valeur de référence, sa source et sa date.
   Le code du moteur est lisible et commenté. Une page « Méthodologie » explique chaque calcul.
3. **Simplicité assumée.** C'est une version vulgarisée et volontairement simplifiée.
   Les avertissements de la section 9 sont affichés en permanence, pas cachés.
4. **Statique.** Pas d'effets de comportement, pas de bouclage macroéconomique en v1.
5. **Symétrie prélèvements / services.** Chaque profil reçoit aussi une part des dépenses
   publiques (services en nature et collectifs). Sinon, toute baisse de dépense paraîtrait sans coût.
6. **Accessibilité.** Le rouge et le vert ne portent jamais seuls l'information :
   toujours un signe (+/−) et une icône flèche. Contrastes WCAG AA. Navigation clavier complète.

## 3. Stack technique

- **Vite + TypeScript (strict) + Svelte 5** (ou React 18 si le mainteneur le préfère ; à trancher à l'étape 1).
- **D3** (modules `d3-hierarchy`, `d3-scale`, `d3-shape`) pour le treemap et les graphiques.
- **Vitest** pour les tests unitaires du moteur.
- **Zod** pour valider les fichiers de données au build.
- Données en **JSON** dans `src/data/`, importées statiquement.
- Aucune librairie UI lourde. CSS natif avec variables (thème clair/sombre).
- Déploiement : GitHub Actions → GitHub Pages.
- Licence : code **AGPL-3.0-or-later** (fichier `LICENSE`) ; données **Licence Ouverte Etalab 2.0** (fichier `LICENSE-DATA.md`), sous réserve des conditions de chaque source.

## 4. Structure du dépôt

```
/
├─ PLAN.md                 # ce fichier
├─ CLAUDE.md               # rappel court : "lire PLAN.md, une étape à la fois"
├─ README.md
├─ LICENSE
├─ .github/workflows/deploy.yml
├─ vite.config.ts          # base: '/<nom-du-repo>/'
├─ src/
│  ├─ engine/              # calcul pur, AUCUNE dépendance UI
│  │  ├─ types.ts
│  │  ├─ params.ts         # chargement + validation Zod des données
│  │  ├─ levers.ts         # définition des leviers et application au scénario
│  │  ├─ macro.ts          # recettes, dépenses, solde, dette
│  │  ├─ household/
│  │  │  ├─ incomeTax.ts   # IR : barème, quotient familial (simplifié), décote
│  │  │  ├─ socialContrib.ts # cotisations salariales/patronales, CSG/CRDS
│  │  │  ├─ capitalTax.ts  # PFU, prélèvements sociaux, revenus fonciers
│  │  │  ├─ wealthTax.ts   # IFI
│  │  │  ├─ consumptionTax.ts # TVA par taux, accises
│  │  │  ├─ propertyTax.ts # taxe foncière (montant saisi ou par défaut × évolution)
│  │  │  ├─ benefits.ts    # prestations monétaires pertinentes (prime d'activité, etc.)
│  │  │  └─ inKind.ts      # attribution des services publics reçus
│  │  ├─ incidence.ts      # hypothèses d'incidence (paramétrables)
│  │  └─ simulate.ts       # point d'entrée : scénario -> résultats complets
│  ├─ data/
│  │  ├─ meta.json         # année de référence, version des données
│  │  ├─ macro.json        # PIB, dette, taux apparent, croissance nominale
│  │  ├─ revenues.json     # recettes publiques par prélèvement (APU)
│  │  ├─ spending.json     # dépenses APU par fonction COFOG (2 niveaux)
│  │  ├─ taxRules.json     # barèmes et taux
│  │  ├─ profiles.json     # les 10 profils types
│  │  ├─ consumption.json  # structure de consommation par profil
│  │  ├─ inKindAllocation.json # clés de répartition des services publics
│  │  └─ sources.json      # registre de toutes les sources
│  ├─ ui/
│  │  ├─ App.svelte
│  │  ├─ components/       # Slider, LeverGroup, Treemap, ProfileCard, SummaryBar, ...
│  │  ├─ pages/            # Simulateur, Méthodologie, Sources, À propos
│  │  └─ state/            # store du scénario + sérialisation URL
│  └─ main.ts
├─ tests/
│  ├─ engine/*.test.ts
│  └─ fixtures/            # cas types avec résultats attendus et leur source
└─ scripts/
   ├─ validate-data.ts     # exécuté en CI
   └─ openfisca-check/     # (optionnel, étape 11) comparaison Python avec OpenFisca-France
```

## 5. Modèle de données

### 5.1 Toute valeur chiffrée suit ce format

```json
{
  "value": 0.2,
  "unit": "rate",
  "sourceId": "service-public-tva",
  "asOf": "2026-01-01",
  "status": "VERIFIE",
  "note": "Taux normal de TVA"
}
```
`status` ∈ `VERIFIE` | `A_VERIFIER` | `HYPOTHESE`. L'interface affiche un badge pour
`A_VERIFIER` et `HYPOTHESE`.

### 5.2 sources.json

```json
{ "id": "insee-cofog-2025", "title": "...", "publisher": "INSEE", "url": "https://...", "accessed": "2026-11-02" }
```

### 5.3 Profils (profiles.json)

Onze profils, **tous célibataires sans enfant** pour garantir la comparabilité. Les
configurations familiales passent par le formulaire « Votre foyer » (§8.3). Toutes les hypothèses non issues
d'une source sont marquées `HYPOTHESE` et modifiables dans le fichier.

| id | Libellé affiché | Revenus | Patrimoine | Hypothèses clés |
|---|---|---|---|---|
| `smic` | Salarié au SMIC | SMIC temps plein (valeur officielle en vigueur) | ~0, locataire | Taux d'épargne ≈ 0–5 %, consommation ≈ revenu disponible |
| `cadre3k` | Cadre, 3 000 € net/mois | Salaire tel que net mensuel ≈ 3 000 € | Épargne modeste, locataire ou primo-accédant | Taux d'épargne selon décile INSEE correspondant |
| `cadre10k` | Cadre dirigeant, 10 000 € net/mois | Salaire tel que net ≈ 10 000 € | Propriétaire RP + épargne financière | Taux d'épargne élevé (décile supérieur) |
| `rentier5m` | Rentier, 5 M€ de patrimoine | Pas de salaire. Loyers + dividendes/intérêts | Ex. 3 M€ immobilier locatif + 2 M€ financier | Rendements bruts paramétrables, IFI sur l'immobilier |
| `fortune100m` | Très grand patrimoine, 100 M€ et plus | Dividendes effectivement distribués (faible part) | Essentiellement parts d'entreprise via holding | Distinguer revenu **fiscal** et revenu **économique** (bénéfices non distribués) |
| `student` | Étudiant, 20 ans, sans revenu | Aucun revenu propre, APL | Aucun, locataire | Consommation = budget étudiant moyen (OVE), financée par la famille et les aides ; APL qui suivent les dépenses de logement (COFOG 10.6) ; reçoit l'enseignement supérieur en plus du collectif |
| `apprentice` | Alternant, 20 ans, 1re année | 43 % du SMIC (Code du travail art. D6222-26) | Aucun, locataire | Ni cotisations salariales ni CSG jusqu'à 50 % du SMIC ; salaire exonéré d'impôt jusqu'au SMIC annuel ; pas de prime d'activité sous 78 % du SMIC net. Remplace le profil à temps partiel. |
| `employee1800` | Salarié, 1 800 € net/mois | Salaire tel que net ≈ 1 800 € | Aucun, locataire | Prime d'activité ; 4e décile de niveau de vie |
| `retiree1000` | Retraité, 1 000 € net par mois | Pension d'ancien salarié du privé | Propriétaire de sa résidence principale | CSG selon le revenu fiscal de référence, santé des 65 ans et plus |
| `retiree2500` | Retraité, 2 500 € net par mois | Pension d'ancien salarié du privé | Propriétaire de sa résidence principale | Pension qui suit les dépenses de vieillesse (COFOG 10.2) |
| `artisan` | Artisan (entreprise individuelle) | Revenu professionnel médian INSEE (construction) | Locataire | Cotisations des indépendants (réforme 2026), régime réel |

Pour chaque profil, le fichier contient au minimum :
- `incomes` : salaire brut, revenus fonciers, dividendes, intérêts, plus-values réalisées, bénéfices non distribués (part économique) ;
- `wealth` : immobilier (RP / locatif), financier, professionnel ;
- `consumption` : montant annuel et ventilation par taux de TVA (5,5 / 10 / 20 / 2,1 %) et accises (énergie, tabac/alcool optionnels) ;
- `savingsRate` ;
- `inKindShareKey` : clé pour l'attribution des services publics.

**Pour `fortune100m`, l'interface affiche deux taux effectifs** : sur le revenu fiscal
et sur le revenu économique, avec une infobulle expliquant la différence.

### 5.4 Consommation et TVA
Source principale : enquête Budget de famille (INSEE), structure par décile.
Les profils `rentier5m` et `fortune100m` dépassent le champ de l'enquête :
appliquer la structure du dernier décile avec un montant de consommation `HYPOTHESE`,
clairement signalé.

### 5.5 Services publics reçus (inKindAllocation.json)
Source : travaux de l'INSEE sur la « redistribution élargie » (comptes nationaux distribués).
- Services individualisables (santé, éducation, logement…) : montant par unité de consommation selon le niveau de vie, ramené à un adulte seul sans enfant.
- Services collectifs (défense, justice, police, administration…) : répartition **par tête**, uniforme pour tous les profils (choix documenté dans la méthodologie).
- Si une catégorie COFOG n'a pas de clé fiable : répartition par tête + `HYPOTHESE`.

### 5.6 Incidence (incidence.ts + taxRules.json)
Hypothèses par défaut, toutes affichées dans la méthodologie :
- TVA et accises → consommateur ;
- cotisations patronales → salarié ;
- IS → actionnaires, au prorata des revenus et bénéfices d'entreprise du profil ;
- taxe foncière → propriétaire.
Ces choix sont des paramètres, pas du code en dur.

## 6. Leviers (v1)

**Identifiants stables.** Chaque levier a un `id` hiérarchique en anglais (ex. `vat.standard`,
`incomeTax.bracket3.rate`, `spending.cofog.07.1`). Un `id` publié n'est **jamais renommé ni
réutilisé** : un levier supprimé est marqué `deprecated`. Un test snapshot (`tests/engine/lever-ids.test.ts`)
échoue si un `id` existant disparaît ou change.
Le scénario stocke des **valeurs absolues** (ex. `vat.standard: 0.21`), pas des écarts,
pour qu'un programme politique puisse s'exprimer dans le même format.

Chaque levier a : `id`, libellé, groupe, valeur de référence, min, max, pas, unité affichée,
formule d'effet sur l'agrégat, formule d'effet sur chaque profil, texte d'aide (1 à 2 phrases, neutre).

**Règle d'affichage :** les leviers s'expriment en **paramètres concrets** quand c'est possible
(« Taux normal de TVA : 20 % → 21 % »), sinon en % d'évolution d'une enveloppe
(« Dépenses de défense : +5 % »).

### 6.1 Prélèvements
- Impôt sur le revenu : taux de chaque tranche ; option « indexation du barème ».
- CSG sur les revenus d'activité ; CSG sur les revenus du capital.
- PFU : part impôt sur le revenu (12,8 %) — le taux global affiché est recalculé.
- TVA : taux normal, intermédiaire, réduit.
- Accises sur l'énergie : tarif réel de chaque produit (gazole, essences, fioul affichés en €/L, stockés en €/hl comme dans les tarifs officiels publiés ; électricité, gaz en €/MWh).
- Impôt sur les sociétés : taux normal.
- IFI : taux marginaux et seuil.
- Cotisations sociales : taux réel de chaque cotisation salariale et patronale (assiette selon son plafond).
- Taxe foncière : % d'évolution (agrégée). Il n'existe pas de taux national : l'effet sur un ménage
  est calculé à partir du **montant de sa taxe foncière** (montant de l'avis, hors taxe d'enlèvement des
  ordures ménagères). Les profils propriétaires ont un montant par défaut (`HYPOTHESE`) ; l'utilisateur
  peut saisir le sien (voir §8.3).
- Contribution minimale sur les hauts revenus (CDHR) : taux et seuil, si sourcé.

Effet macro en v1 : **statique mécanique**. Variation de recette = assiette de référence ×
variation de taux. Pas d'élasticité.

### 6.2 Dépenses
Les 10 divisions COFOG, chacune dépliable en ses groupes (69 au total). Chaque curseur
s'exprime en **montant annuel (Md€)** : par défaut le montant actuel des comptes, pour montrer
ce que dépense l'État, de 0 à 2 fois ce montant. Pas de 1 Md€ (0,1 Md€ pour les groupes de 1 à
10 Md€, 0,01 Md€ en dessous). Le montant d'une division change dans la même proportion chacun
de ses groupes ; un groupe modifié individuellement est marqué « personnalisé ».

### 6.3 Paramètres macro (mode avancé, repliés par défaut)
Croissance nominale, taux d'intérêt apparent de la dette, horizon de projection (5 ans).

## 7. Calculs

### 7.1 Agrégats
```
recettes = Σ recettes de référence + Σ effets des leviers de prélèvement
dépenses = Σ dépenses de référence + Σ effets des leviers de dépense
solde    = recettes − dépenses
dette(t+1) = dette(t) − solde(t) ; PIB(t+1) = PIB(t) × (1 + g)
charge d'intérêts(t) = dette(t) × taux apparent (incluse dans les dépenses)
```

### 7.2 Profil
```
impact_prelevements = prélèvements(référence) − prélèvements(scénario)   // positif = gain
impact_services     = services_reçus(scénario) − services_reçus(référence)
impact_total        = impact_prelevements + impact_services
```
Afficher pour chaque profil :
- `impact_total` en €/an et en % du revenu (fiscal ; et économique pour `fortune100m`) ;
- le détail : prélèvements / prestations / services reçus ;
- le taux de prélèvement effectif avant et après.

Le cadre « Effet du scénario » de chaque carte présente deux cases indépendantes, sans total net :
l'écart des prélèvements payés et l'écart des prestations et services reçus, chacun avec son signe,
sa flèche et sa couleur (vert : paie moins ou reçoit plus ; rouge : l'inverse). La couleur apparaît
dès un euro d'écart (arrondi). Dans la barre de synthèse, chaque écart est vert s'il améliore les
comptes publics (recettes en hausse, dépenses en baisse, solde en hausse, dette en baisse) et rouge
sinon, toujours avec signe et flèche, la valeur actuelle étant rappelée en petit.

## 8. Interface

### 8.1 Disposition (desktop)
```
┌───────────────────────────────────────────────────────────────┐
│ Bandeau d'avertissement (repliable, jamais supprimable)       │
├───────────────────────────────────────────────────────────────┤
│ Barre de synthèse (collante) : Recettes | Dépenses | Solde    │
│ (Md€ et % PIB) | Dette dans 5 ans | Réinitialiser | Partager  │
├───────────────┬───────────────────────────────────────────────┤
│ Leviers       │ Treemap des dépenses (zoomable, cliquable)    │
│ (accordéons,  │ ou des recettes (bascule)                     │
│ recherche,    ├───────────────────────────────────────────────┤
│ badge "modifié")│ 5 cartes profils (€ et %, détail dépliable) │
└───────────────┴───────────────────────────────────────────────┘
```
- Un clic sur une case du treemap ouvre les curseurs correspondants dans le panneau de gauche.
- Les cartes profils restent visibles pendant la manipulation des curseurs.
- Bascule globale « € / % du revenu ».

### 8.2 Mobile
Synthèse et profils en haut (profils en carrousel horizontal), leviers dans un panneau
qui remonte du bas de l'écran, treemap en pleine largeur.

### 8.3 Interactions
- Recalcul à chaque `input` (pas seulement au relâchement). Cible : moins de 16 ms par recalcul.
- Les leviers modifiés sont mis en évidence ; réinitialisation par levier et globale.
- Le scénario est un objet `{ "schemaVersion": 1, "baseYear": 2026, "levers": { "<id>": <valeur> } }`
  ne contenant que les leviers modifiés. Il est sérialisé dans le hash de l'URL (`#s=` + base64url)
  et importable/exportable en JSON. Une fonction `migrateScenario()` convertit les anciennes versions.
  Bouton « Partager » qui copie le lien.
- Bouton « ? » sur chaque levier : fenêtre explicative (ce que ça concerne ou finance, ce qui n'en fait pas partie, exemples, qui paie ou en bénéficie, d'où ça vient, sources officielles), textes dans `src/data/explanations.json`, chargés à la première ouverture.
- Formulaire « Votre foyer » : un ou deux adultes (salarié, artisan ou commerçant, retraité ou sans revenu, montant net
  mensuel, âge), marié ou pacsé ou en union libre, nombre d'enfants (dont 14 ans ou plus), locataire
  ou propriétaire avec la taxe foncière de l'avis. Le moteur calcule les parts fiscales (quotient
  familial plafonné, décote et seuils des couples, union libre = deux foyers fiscaux), les allocations
  familiales et la prime d'activité familiale, puis l'effet du scénario. Ces données restent dans le
  navigateur, ne sont jamais transmises et ne sont pas incluses dans le lien de partage.

### 8.4 Pages
0. Accueil (adresse racine) : présentation du projet avant les chiffres, quelques chiffres clés tirés des données de référence (aucun chiffre écrit en dur), principes, accès au simulateur. Un lien de scénario partagé (`#s=…`) ouvre directement le simulateur.
1. Simulateur (`#/simulateur`)
2. Méthodologie : chaque formule, chaque hypothèse, chaque limite
3. Sources : générée automatiquement depuis `sources.json`, avec le statut de chaque valeur
4. À propos : objectif, licence, lien GitHub, appel aux contributions

## 9. Textes d'avertissement (à intégrer tels quels, modifiables)

**Bandeau principal :**
> Cet outil est une version volontairement simplifiée, conçue pour que chacun comprenne les grands mécanismes du budget public. Il ne remplace pas les chiffrages officiels. Les résultats montrent l'effet mécanique immédiat de chaque levier, sans tenir compte des réactions qu'il pourrait provoquer.

**Encadré « Ce que l'outil ne prend pas en compte » (page Simulateur, replié par défaut) :**
> - Les changements de comportement : optimisation fiscale, départs ou arrivées de contribuables, variation de la consommation, du travail ou de l'investissement.
> - Les effets sur la croissance : une variation des impôts ou des dépenses peut modifier l'activité économique, donc les recettes futures.
> - Les effets de calendrier : certaines mesures produisent leurs effets sur plusieurs années.
> - La diversité réelle des situations : les onze profils sont des cas types fictifs, pas des personnes réelles.
> - Les liens entre prestations : chaque prestation est modifiée seule ; en réalité, baisser l'une peut en augmenter une autre (le RSA d'un foyer dont l'allocation chômage diminue, par exemple).
> - Le non-recours : les aides de « Votre foyer » sont calculées comme si toutes étaient demandées, alors qu'une partie des personnes qui y ont droit ne les demandent pas.
> - L'organisation des services : les postes à temps plein affichés sont un ordre de grandeur mécanique, qui ne dit pas comment la variation se ferait (départs, recrutements, rémunérations).
> Les montants sont arrondis et reposent sur des hypothèses documentées dans la page Méthodologie.

**Sur les cartes des profils 5 M€ et 100 M€ :**
> Les données publiques sur les très hauts patrimoines sont limitées. Ce profil repose en partie sur des hypothèses, signalées et modifiables.

## 10. Étapes de développement

## 11. Hors périmètre

Comparaison avec les programmes politiques (v2) : chaque programme sera un fichier de scénario
au format de la section 8.3, accompagné des sources justifiant chaque valeur. Ne rien implémenter
en v1 au-delà du format de scénario et des identifiants stables.

### Étape 1 — Initialisation
- Créer le projet Vite + TS strict + Svelte (ou React), ESLint, Prettier, Vitest.
- Créer `CLAUDE.md` (5 lignes : lire PLAN.md, une étape à la fois, ne jamais inventer de chiffres).
- Créer `vite.config.ts` avec `base` configurable via variable d'environnement.
- Créer le workflow `.github/workflows/deploy.yml` (lint, test, build, upload-pages-artifact, deploy-pages).
- Page « Hello » prête à être déployée.
**Acceptation :** `npm run dev`, `npm test` et `npm run build` passent ; le README explique
d'activer *Settings → Pages → Source : GitHub Actions*.

### Étape 2 — Schémas et validation des données
- Écrire les types (`engine/types.ts`) et les schémas Zod pour chaque fichier de `src/data/`.
- Créer des fichiers de données **squelettes** avec la structure complète et des valeurs `A_VERIFIER`.
- `scripts/validate-data.ts` : échoue si un schéma est invalide ou si un `sourceId` n'existe pas ;
  produit un rapport du nombre de valeurs `A_VERIFIER` et `HYPOTHESE`.
**Acceptation :** la CI valide les données ; le rapport s'affiche.

### Étape 3 — Collecte des données de référence
- Remplir `macro.json`, `revenues.json`, `spending.json` (COFOG 2 niveaux) avec la dernière
  année disponible (INSEE comptes des APU, Eurostat `gov_10a_exp`, PLF / LFI en vigueur).
- Remplir `taxRules.json` avec la législation en vigueur (service-public.fr, Légifrance, BOFiP).
- Vérifier la cohérence : Σ dépenses COFOG = dépenses APU totales (tolérance 0,5 %).
- **Lister dans le compte rendu de fin d'étape toutes les valeurs restées `A_VERIFIER`.**
**Acceptation :** cohérence vérifiée par un test ; chaque valeur a une source.

### Étape 4 — Moteur : prélèvements d'un ménage
- Implémenter dans `engine/household/` : cotisations, CSG/CRDS, IR (barème, abattement 10 %,
  décote, quotient familial simplifié), PFU, revenus fonciers (régime réel simplifié ou micro),
  IFI, TVA et accises, taxe foncière (montant × évolution), prime d'activité (simplifiée, pour le profil SMIC).
- Fonctions pures : `(profile, rules) => result`.
- Tests avec des cas types dont le résultat attendu est sourcé (simulateur officiel ou exemples BOFiP).
**Acceptation :** couverture des tests du moteur ≥ 90 % ; cas types à ±1 % près.

### Étape 5 — Moteur : profils, services reçus, incidence
- Remplir `profiles.json` (dont le montant de taxe foncière par défaut des profils propriétaires), `consumption.json`, `inKindAllocation.json`.
- Implémenter `inKind.ts` et `incidence.ts`.
- Implémenter le calcul du revenu fiscal et du revenu économique.
**Acceptation :** pour chaque profil, un test vérifie le bilan de référence ;
un tableau récapitulatif est généré dans `docs/reference-profiles.md`.

### Étape 6 — Moteur : leviers et agrégats
- Implémenter `levers.ts` (catalogue de la section 6) et `macro.ts`.
- `simulate(scenario)` renvoie : agrégats, trajectoire de la dette, résultats par profil.
- Test : scénario vide → résultats identiques à la référence.
- Test : chaque levier, poussé à son maximum, a un effet de signe attendu.
- Test de performance : `simulate` < 5 ms.
**Acceptation :** tous les tests passent.

### Étape 7 — Interface : squelette et synthèse
- Mise en page de la section 8, thème clair/sombre, bandeau d'avertissement.
- Barre de synthèse branchée sur `simulate`.
- Panneau de leviers : accordéons, curseurs, valeur de référence, badge « modifié », réinitialisation, recherche.
- Chaque levier = curseur + champ numérique synchronisés (saisie directe du taux, ex. "20,5 %").
  Le champ accepte la virgule décimale, borne la valeur au min/max et affiche une erreur
  inline si la saisie est invalide. Les bornes du curseur restent indicatives :
  un mode "bornes étendues" (dans les paramètres avancés) permet de les dépasser.
**Acceptation :** chaque curseur met à jour la synthèse en temps réel.

### Étape 8 — Interface : profils
- Cinq cartes : impact total (€ et %), couleur + signe + flèche, détail dépliable,
  taux effectif avant/après, double taux pour `fortune100m`, avertissements de la section 9.
- Formulaire « Votre foyer » (§8.3), qui remplace le champ « Votre taxe foncière ».
- Bascule globale € / %.
**Acceptation :** contrôle manuel ; test de rendu pour les couleurs selon le signe.

### Étape 9 — Interface : treemap
- Treemap D3 des dépenses COFOG (et bascule recettes), zoom par division, coloration selon
  la variation du scénario (même règle couleur + signe), clic → ouverture du levier correspondant.
- Version accessible : tableau équivalent masquable.
**Acceptation :** navigation clavier possible ; libellés lisibles jusqu'à 360 px de large.

### Étape 10 — Partage, pages annexes, responsive
- Sérialisation du scénario dans l'URL ; bouton « Partager ».
- Pages Méthodologie (générée en partie depuis les données), Sources, À propos.
- Mise en page mobile (section 8.2).
**Acceptation :** un lien partagé restaure exactement le scénario ; Lighthouse ≥ 90
en performance et en accessibilité.

### Étape 11 — Validation croisée (optionnelle mais recommandée)
- `scripts/openfisca-check/` : script Python qui calcule les prélèvements des profils
  avec OpenFisca-France et compare avec le moteur TS. Exécuté dans un job CI séparé,
  non bloquant au début.
**Acceptation :** rapport des écarts publié comme artefact CI.

### Étape 12 — Préparation de la publication
- README complet : objectif, captures, lancement local, architecture, comment contribuer,
  comment mettre à jour les données à chaque loi de finances.
- `CONTRIBUTING.md`, modèles d'issues (« Erreur de donnée », « Proposition de levier »).
- Relecture de neutralité : vérifier qu'aucun texte n'emploie de vocabulaire connoté.
**Acceptation :** le mainteneur valide la mise en ligne.

## 11. Hors périmètre v1 (à noter dans le README)
Une partie de cette liste est reprise par la v1.1 (voir §13).

À prévoir dans un mode avancé : la cotisation foncière des entreprises (CFE) de l'artisan, dont
le montant dépend de la commune et dont un artisan travaillant seul peut être exonéré.

Effets de comportement et élasticités ; bouclage macroéconomique ; configurations familiales plus fines que le formulaire « Votre foyer » ;
profils de micro-entrepreneur, d'agent public et de fonctionnaire retraité ; droits de succession et de donation ; collectivités détaillées ;
trajectoire pluriannuelle des mesures ; comparaison internationale.

## 12. Checklist d'avancement
- [x] Étape 1 — Initialisation
- [x] Étape 2 — Schémas et validation
- [x] Étape 3 — Données de référence
- [x] Étape 4 — Prélèvements d'un ménage
- [x] Étape 5 — Profils, services, incidence
- [x] Étape 6 — Leviers et agrégats
- [x] Étape 7 — Interface : synthèse et leviers
- [x] Étape 8 — Interface : profils
- [x] Étape 9 — Interface : treemap
- [x] Étape 10 — Partage, pages, responsive
- [x] Étape 11 — Validation OpenFisca
- [x] Étape 12 — Publication

## 13. Version 1.1

> Mêmes règles que la v1 : une étape à la fois, dans l'ordre, arrêt et validation à chaque fin
> d'étape, aucun chiffre sans source, neutralité, accessibilité. Les identifiants de leviers existants
> ne changent pas. Le format de scénario reste `schemaVersion: 1` : la v1.1 n'ajoute que des identifiants.

**Objectif.** Permettre à chacun d'affiner sa situation, de jouer avec beaucoup plus de curseurs et
de relire clairement l'effet de ses choix.

### 13.1 Niveau de détail
Sélecteur **« Niveau de détail »** à trois positions, **Essentiel** par défaut pour un nouveau visiteur :

| Niveau | Dépenses | Prélèvements |
|---|---|---|
| Essentiel | les 10 fonctions | les 13 grands prélèvements (liste ci-dessous) |
| Détaillé | + les 69 groupes | tous les leviers de la v1, paramètres macro compris |
| Expert | + le niveau 3 (§13.2) | tous les leviers de la v1 et ceux qui s'y ajoutent |

**Grands prélèvements du niveau Essentiel :** TVA (taux normal), CSG sur les revenus d'activité, CSG sur les
revenus du capital, prélèvement forfaitaire sur les revenus du capital, impôt sur le revenu (les quatre tranches
taxées), impôt sur les sociétés, taxe foncière, accise sur le gazole, cotisation employeur maladie, cotisation
salariale vieillesse plafonnée. L'IFI reste en Détaillé (2,7 Md€).

- Changer de niveau masque des curseurs et **n'efface jamais une modification** ; le panneau indique le
  nombre de modifications masquées.
- Le niveau est une préférence d'affichage (localStorage), pas une donnée du scénario. Un lien partagé
  s'ouvre au niveau nécessaire pour voir tous ses leviers modifiés.

### 13.2 Niveau 3 des dépenses
Il n'existe pas de niveau 3 officiel uniforme : Eurostat publie les fonctions et les groupes, pas en
dessous. Règle par groupe, dans cet ordre :
1. **Postes concrets** dès qu'une source fiable existe (prestations : DREES ; santé : comptes de la
   santé ; crédits de l'État : PLF). Un écart de périmètre avec le groupe est recalé, et ce recalage est `HYPOTHESE`.
2. **Sinon, détail par nature** (Eurostat `gov_10a_exp`, même source et même périmètre que le groupe) :
   Personnel, Achats, Investissement, Autres, plus Subventions, Transferts, Prestations et aides sur les
   18 groupes où « Autres » dépasserait sinon 25 %.
3. Une ligne **« Autres »** garantit que la somme des postes égale exactement le montant du groupe.

Un montant de fonction ou de groupe change ses postes dans la même proportion, sauf un poste réglé
individuellement (prolongement de `groupAmountsFor`). Pas de niveau 3 sous 0,5 Md€, ni pour la charge
d'intérêts (10 groupes sans niveau 3 au total). Soit 314 leviers de plus. Bornes : 0 à 2 fois le montant,
comme les autres dépenses. Identifiants du type `spending.cofog.10.7.rsa` ou `spending.cofog.02.1.compensation`.

### 13.3 Prestations
Les prestations sont des postes de niveau 3 de la fonction Protection sociale. Un curseur de prestation
modifie la dépense **et** ce que reçoivent les foyers concernés ; il peut aller jusqu'à 0.
**Chaque prestation est traitée séparément** : le curseur s'applique au montant de cette prestation
sans recalculer les autres, même si, en réalité, baisser l'une peut en augmenter une autre (supprimer
l'ARE augmenterait le RSA de certains foyers). Ce choix garde cohérents le total et l'effet sur les
foyers, et il est expliqué dans la Méthodologie.

### 13.4 Foyer : situations
Chaque adulte du formulaire « Votre foyer » peut être :
- salarié, alternant, agent public, artisan ou commerçant, agriculteur, profession libérale,
  micro-entrepreneur, étudiant, retraité, au chômage (indemnisé ou non), sans activité ;
- **en situation de handicap** : case à cocher qui s'ajoute au statut, avec le taux d'incapacité ;
- titulaire d'une pension d'invalidité (revenu qui s'ajoute au statut).

Le RSA n'est pas un statut : il est calculé selon les ressources. L'ARE est saisie par l'utilisateur.
Agent public : cotisations propres, RAFP, champ facultatif « part des primes » prérempli (25,4 %, ou le taux du
versant). Agriculteur : cotisations MSA. Profession libérale : SSI et Cipav ; les autres caisses par
approximation signalée ; médecins conventionnés et avocats plus tard. Le congé parental est reporté.

**Cotisations des agents publics.** Les cotisations employeur des agents publics sont imputées en totalité à
l'agent, avec la même règle d'incidence que pour les salariés du privé, et elles reçoivent leurs curseurs.
Une cotisation d'employeur public est une dépense publique versée à un régime public : son curseur fait varier
recettes et dépenses du même montant, sans changer le solde. Ses bornes vont de 0 à 2 fois le taux, même
au-delà de 100 % (État : 82,28 %).

**Trois blocs sur les cartes.** Les cartes de profils et de « Votre foyer » séparent : prélèvements payés par le
foyer, part patronale (cotisations employeur, affichée seulement si le profil en a), prestations et services reçus.
Le total des prélèvements et le taux effectif restent ceux de la v1.

### 13.5 Foyer : aides calculées selon les revenus
RSA, AAH, ASPA, ASS, APL (nouveaux champs : loyer et zone), allocation de soutien familial, complément
familial, allocation de rentrée scolaire, PAJE de base, bourses étudiantes sur critères sociaux,
chèque énergie, complémentaire santé solidaire. Les aides sont calculées en supposant que le foyer les
demande ; le non-recours est signalé dans la Méthodologie.
Expliquées mais non calculées, car dépendantes d'un plan individuel, du département ou du mode de
garde : PCH, APA, complément de libre choix du mode de garde, aides locales.

### 13.6 Fenêtres explicatives
Chaque fenêtre « ? », pour **tous** les leviers, y compris ceux de la v1, indique à quoi le levier
correspond et ce que change une variation **dans les deux sens** : nouvelle rubrique obligatoire
**« Ce que change une variation »**, contrôlée par `validateExplanations`. Pour un détail par nature, elle
précise ce que recouvre le poste (Personnel : rémunérations et cotisations des agents ; etc.).

### 13.7 Bilan du scénario
Bouton **« Bilan »** à côté de « Partager », qui ouvre une fenêtre (`<dialog>`) :
- la liste des mesures, groupées en prélèvements et dépenses : valeur actuelle → nouvelle valeur, effet
  en Md€, et le texte d'impact de chaque mesure ;
- le total : recettes, dépenses, solde et dette dans cinq ans ;
- l'effet sur les profils types ;
- un état vide si rien n'est modifié.

Aucun score ni verdict : le bilan décrit, il ne juge pas.

### 13.8 Textes d'impact et postes
Sur les curseurs concernés, un texte court décrit l'effet de la valeur choisie, sous le curseur et dans
le bilan. Il est tiré des données, avec une variante à la hausse et une à la baisse, de poids égal.
Là où la dépense comprend du personnel, il traduit l'écart en **ordre de grandeur de postes** :
« soit environ N postes à temps plein en moins » (suppressions) ou « en plus » (créations ou
recrutements).
- Calcul : écart de dépense de personnel ÷ coût moyen d'un poste. Pour un montant de groupe ou de
  fonction, la part de personnel est celle d'Eurostat, à structure constante.
- Effectifs et rémunérations sourcés (DGAFP, INSEE) ; le coût moyen est marqué `HYPOTHESE`. Si aucune
  source ne convient pour un poste, pas de texte chiffré.
- C'est un ordre de grandeur mécanique, signalé comme tel : pas d'effet sur les services ni sur les
  impôts payés par les agents, ni de calendrier (départs, recrutements).

### 13.9 Étapes

#### Étape 13 — Audit des données
- Lister groupe par groupe les postes de niveau 3 et leur source, en lisant les tableaux officiels (DREES,
  comptes de la santé, PLF, Eurostat par nature) ; signaler les écarts de périmètre.
- Lister les barèmes des aides et des statuts, avec leurs sources officielles ; proposer les grands
  impôts du niveau Essentiel, la part des primes des agents publics et le périmètre des professions
  libérales ; vérifier les sources d'effectifs et de coût moyen des postes.
- Aucun code. Livrable : `docs/audit-v1.1.md`.
**Acceptation :** le mainteneur valide la liste des curseurs et les arbitrages.

#### Étape 14 — Niveau de détail (Essentiel, Détaillé)
- Sélecteur, panneau et treemap selon le niveau, modifications masquées, ouverture d'un lien partagé (§13.1).
**Acceptation :** changer de niveau ne modifie jamais le résultat ; test sur un scénario partagé.

#### Étape 15 — Situations du foyer
- Nouveaux statuts, handicap, invalidité, chômage (§13.4), avec leurs modules dans `household/`.
- Cotisations des agents publics : imputation complète et curseurs ; trois blocs sur les cartes (§13.4).
- Tests sur des cas officiels chiffrés ; statuts ajoutés à la validation OpenFisca quand elle les couvre.
**Acceptation :** chaque statut a au moins un cas sourcé rejoué à ±1 %. Sans cas publié (MSA, Cipav, agent public),
le cas est un calcul manuel depuis le barème officiel, ou mon-entreprise s'il couvre le statut ; cette preuve plus
faible est signalée en Méthodologie.

#### Étape 16 — Aides selon les revenus
- Une fonction pure par aide (§13.5), résultat détaillé sur la carte du foyer, champs loyer et zone.
- Comparaison avec OpenFisca ; retirer de `KNOWN_GAPS` les écarts résolus.
**Acceptation :** cas officiels à ±1 % ; écarts OpenFisca restants tous expliqués.

#### Étape 17 — Niveau 3 et prestations
- Données et leviers du niveau 3, niveau Expert, curseurs de prestations reliés aux foyers (§13.2, §13.3).
- Identifiants ajoutés à `tests/fixtures/lever-ids.json`.
**Acceptation :** somme des postes = groupe (test) ; une prestation à 0 réduit la dépense et ce que reçoit
un foyer concerné ; `simulate` < 5 ms et recalcul < 16 ms avec tous les leviers.

#### Étape 18 — Bilan et textes d'impact
- Fenêtre « Bilan » (§13.7), textes d'impact et postes (§13.8).
**Acceptation :** la somme des effets affichés retombe sur la synthèse (arrondis près) ; hausse et baisse
testées pour chaque texte ; navigation au clavier.

#### Étape 19 — Textes et publication
- Fenêtres explicatives de tous les leviers (§13.6), Méthodologie, Sources, README, CLAUDE.md.
- Lignes d'avertissement mises à jour (§9) ; relecture de neutralité ; `docs/reference-profiles.md`.
**Acceptation :** le mainteneur valide la mise en ligne.

### 13.10 Arbitrages de l'étape 13
Validés par le mainteneur le 7 novembre 2026, sur la base de `docs/audit-v1.1.md` :
- 314 leviers de niveau 3, lignes de nature supplémentaires comprises (§13.2).
- Niveau Essentiel : 13 prélèvements, les quatre tranches taxées de l'impôt sur le revenu (§13.1).
- Agents publics : imputation complète, curseurs et trois blocs sur les cartes (§13.4).
- Critère d'acceptation adapté pour les statuts sans cas publié (étape 15).
- Formulaire : tranches d'âge des enfants à la place de `childrenFrom14`, revenu des parents facultatif pour les
  bourses, case pour l'allocation de soutien familial, champs affichés selon la situation.
- Profil `rentier5m` : libellé « Patrimoine de 5 M€, revenus du capital », identifiant inchangé.
- Décisions de détail D1 à D15, P1 à P6 et 1 à 13 des annexes : recommandations retenues.
- Aides selon les revenus appliquées aussi aux profils types (8 novembre 2026), par le même calcul que « Votre foyer » ;
  leur aide au logement reste un montant fixe (loyer non décrit) et l'étudiant n'a pas de bourse (revenu des parents non décrit).
- Étape 17 (8 novembre 2026) : 314 postes de niveau 3 repris de l'audit ; la ligne « Autres » est calculée (groupe moins les
  postes listés). Chaque prestation suit son poste (RSA, prime d'activité, chèque énergie, prestations familiales, ARE, ASS,
  AAH, invalidité, minimum vieillesse, aides au logement, bourses du supérieur, retraites CNAV et Agirc-Arrco). Les bourses
  suivent donc le groupe 09.6 et non plus 09.4. Les fenêtres « ? » des postes reprennent celle de leur groupe jusqu'à l'étape 19.

- Étape 18 (8 novembre 2026) : chaque écart de dépense est attribué au levier qui fixe le montant (poste, sinon groupe, sinon
  fonction), d'où un Bilan dont la somme égale la synthèse. Postes = variation de rémunération (D1 Eurostat par administration,
  2024) ÷ coût moyen (RAP 2024, INSEE, DREES ; HYPOTHESE) ; seuil de part du personnel 10 % pour un groupe ou une fonction, le
  poste « Personnel » compte toujours ; 03.2 au coût moyen incendie et secours (D1 ÷ professionnels, PATS et militaires de Paris et Marseille, HYPOTHESE) ; pas de postes pour 10.4 et 10.5. Arrondi : rien sous 0,5, à
  l'unité sous 20, sinon deux chiffres significatifs. Un poste de prestation indique la variation reçue par ménage.

- Étape 19 (9 novembre 2026) : rubrique obligatoire « Ce que change une variation » (« À la hausse » puis « À la baisse »,
  même forme) dans les 450 fenêtres ; 93 postes concrets ont leur propre fenêtre ; les 221 postes par nature (personnel,
  achats, investissement, subventions, transferts, prestations et aides, autres) reprennent un modèle par nature fondé sur
  les définitions du SEC 2010, complété du nom du groupe, avec un lien vers la fenêtre du groupe. Trois limites ajoutées
  au §9 (liens entre prestations, non-recours, postes à temps plein).

### 13.11 Checklist v1.1
- [x] Étape 13 — Audit des données
- [x] Étape 14 — Niveau de détail
- [x] Étape 15 — Situations du foyer
- [x] Étape 16 — Aides selon les revenus
- [x] Étape 17 — Niveau 3 et prestations
- [x] Étape 18 — Bilan et textes d'impact
- [x] Étape 19 — Textes et publication
