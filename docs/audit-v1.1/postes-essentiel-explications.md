# Audit Étape 13 : postes, niveau Essentiel, rubrique « Ce que change une variation »

Consultation : 07/11/2026. Aucun fichier du dépôt modifié. Montants Eurostat : 2024, données provisoires (p), mise à jour du 21/10/2026.

## 0. Résultats principaux

- **D1 Eurostat = titre 2 du budget de l'État, y compris CAS Pensions.** Test : 03.1, sous-secteur État (S1311) = 20,606 Md€ ; T2 police + gendarmerie (RAP 2024) = 20,612 Md€. Le titre 2 / ETPT mesure donc bien le même objet que D1.
- **Le coût moyen par fonction est calculable.** 17 groupes ont un coût direct, 29 un coût moyen par sous-secteur, 23 restent sans chiffre.
- **Contrôle global :** avec les coûts proposés, D1 total (362,1 Md€) correspond à 5,72 M de postes, pour 5,80 M d'EQTP dans la fonction publique (Insee). Écart −1,4 %, mais les périmètres diffèrent (voir §1.5).
- **Point d'attention :** la défense est le seul grand écart (D1 inférieur de 7 % au T2, voir §1.5).

## 1. Objectif 1 : postes

### 1.1 Formule proposée

`N = Δdépense × (D1 / TE du groupe, 2024) ÷ (coût moyen 2024 × spending.scaling)`

Le coût doit porter `scaling` (1,0248, HYPOTHESE). Sinon N est surévalué d'environ 2,5 %, car le montant de référence est déjà ramené à 2025. Coût identique à la hausse et à la baisse (symétrie).

### 1.2 Données de base 2024

| Donnée | Valeur | Statut | Source |
|---|---|---|---|
| D1 APU total | 362 149 M€ | sourcé | Eurostat gov_10a_exp, S13 |
| D1 État et ODAC (S1311) | 181 469 M€ | sourcé | Eurostat, S1311 |
| D1 administrations locales (S1313) | 95 245 M€ | sourcé | Eurostat, S1313 |
| D1 sécurité sociale et hôpitaux (S1314) | 85 435 M€ | sourcé | Eurostat, S1314 |
| EQTP FPE / FPT / FPH / total (y c. contrats aidés) | 2 581,4 / 1 999,3 / 1 223,6 / 5 804,2 milliers | sourcé | Insee IP 2094, figure 1 |
| Effectifs au 31/12 FPE / FPT / FPH | 2 587,4 / 2 039,4 / 1 249,9 milliers | sourcé | Insee IP 2094, figure 1 |
| Salariés hôpitaux publics au 31/12 | 1 087 608 | vérifié (fiche 07, tableau 1, 2024) | DREES, Établissements de santé 2026, fiche 07 |
| Charges de personnel des hôpitaux publics, budget principal | 63,34 Md€ | sourcé | DREES, fiche 25, tableau 2 |
| Salaire brut mensuel moyen FPE / FPT / FPH | 3 737 / 2 851 / 3 558 € | sourcé | DGAFP, RA 2026, salaires, figure 1 |

### 1.3 Coûts moyens par poste (2024)

Tous les coûts sont **dérivés, statut HYPOTHESE, formule en note**. Leurs composantes sont sourcées.

| Clé | Coût (€) | Formule | Composantes |
|---|---|---|---|
| `defense` | 87 288 | T2 ÷ ETPT mission Défense | 23 171,4 M€ ; 265 458 ETPT |
| `security` | 81 706 | T2 ÷ ETPT, P176 + P152 | 20 611,8 M€ ; 252 267 ETPT |
| `justiceCourts` | 78 823 | T2 ÷ ETPT, P166 | 2 940,7 M€ ; 37 308 ETPT |
| `prisons` | 72 410 | T2 ÷ ETPT, P107 | 3 182,3 M€ ; 43 949 ETPT |
| `publicFinance` | 76 404 | T2 ÷ ETPT, mission GFP | 8 586,2 M€ ; 112 379 ETPT |
| `schoolEducation` | 75 228 | T2 ÷ ETPT, mission Enseignement scolaire | 80 461,0 M€ ; 1 069 559 ETPT |
| `hospital` | 59 932 | D1 07.3 ÷ (salariés × EQTP/effectif FPH) | 63 811 M€ ; 1 087 608 × 0,979 |
| `stateAverage` | 70 299 | D1 S1311 ÷ EQTP FPE | 181 469 M€ ; 2 581,4 milliers |
| `localAverage` | 47 639 | D1 S1313 ÷ EQTP FPT | 95 245 M€ ; 1 999,3 milliers |
| `fireServices` | 70 655 | D1 03.2 ÷ (SPP + PATS + militaires), HYPOTHESE (militaires inclus, voir §1.5) | 4 873 M€ ; 43 985 + 11 508 + 13 476 |
| `employmentService` | 66 124 | D1 10.5 ÷ emplois France Travail **A_VERIFIER** | 3 508 M€ ; 49 147 + 3 905 (LFI 2025, pas 2024) |

Détail T2 / ETPT, exécution 2024 (RAP 2024) :

| Programme | T2 y c. CAS (M€) | ETPT | €/ETPT |
|---|---|---|---|
| P140 Scolaire public 1er degré | 26 590,4 | 340 746 | 78 037 |
| P141 Scolaire public 2d degré | 37 788,7 | 449 768 | 84 019 |
| P230 Vie de l'élève | 4 873,3 | 105 872 | 46 029 |
| P139 Enseignement privé | 8 043,9 | 130 728 | 61 531 |
| P214 Soutien éducation nationale | 2 073,4 | 27 017 | 76 744 |
| P143 Enseignement technique agricole | 1 091,4 | 15 428 | 70 740 |
| P176 Police nationale | 11 528,8 | 151 408 | 76 144 |
| P152 Gendarmerie nationale | 9 083,0 | 100 859 | 90 059 |
| P166 Justice judiciaire | 2 940,7 | 37 308 | 78 823 |
| P107 Administration pénitentiaire | 3 182,3 | 43 949 | 72 410 |
| P182 Protection judiciaire de la jeunesse | 664,8 | 9 179 | 72 417 |
| P156 Gestion fiscale et financière | 6 743,6 | 91 313 | 73 852 |
| P218 Conduite et pilotage | 520,1 | 4 827 | 107 751 |
| P302 Facilitation des échanges | 1 322,5 | 16 240 | 81 434 |

Le P139 ne porte presque pas de CAS Pensions (48 M€), d'où son coût plus bas. Taux CAS 2024 : 74,28 % civils, 126,07 % militaires (RAP Sécurités). Le taux 2025 n'a pas été vérifié : **A_VERIFIER**.

Coût direct par catégorie, « coût global » hors CAS (RAP 2024, tableaux « Coûts entrée-sortie ») :

| Catégorie | Entrée (€) | Global (€) | Sortie (€) |
|---|---|---|---|
| Enseignants 1er degré (P140) | 38 363 | 48 335 | 58 436 |
| Enseignants 2d degré (P140) | 40 509 | 52 032 | 62 190 |
| Officiers (Défense) | 43 177 | 78 645 | 72 707 |
| Sous-officiers (Défense) | 29 684 | 44 811 | 39 173 |
| Militaires du rang (Défense) | 25 648 | 35 030 | 28 131 |
| Sous-officiers de gendarmerie | 35 609 | 47 380 | 46 765 |
| Magistrats (P166) | 64 749 | 95 401 | 107 851 |

Ces coûts sont hors CAS, donc non comparables à D1. Ils servent à signaler dans la Méthodologie qu'un recrutement coûte moins cher que la moyenne et qu'un départ en fin de carrière coûte souvent plus.

### 1.4 Correspondance par groupe

**Part D1** = D1 / TE 2024. **Postes implicites** = postes équivalents à D1 2024, ordre de grandeur de contrôle.

Division :

| Fonction | TE (Md€) | D1 (Md€) | Part D1 | Postes implicites | Décision |
|---|---|---|---|---|---|
| 01 Services généraux | 181,1 | 47,6 | 26,3 % | 847 000 | par groupe |
| 02 Défense | 54,2 | 21,5 | 39,7 % | 246 000 | chiffre |
| 03 Ordre et sécurité | 52,1 | 36,4 | 69,9 % | 465 000 | chiffre |
| 04 Affaires économiques | 166,1 | 20,3 | 12,2 % | 332 000 | chiffre, faible |
| 05 Environnement | 30,3 | 6,4 | 21,2 % | 124 000 | chiffre |
| 06 Logement, équipements collectifs | 42,1 | 8,8 | 20,9 % | 176 000 | chiffre |
| 07 Santé | 261,2 | 70,1 | 26,8 % | 1 164 000 | chiffre, voir note |
| 08 Loisirs, culture, religion | 43,1 | 14,8 | 34,4 % | 284 000 | chiffre |
| 09 Enseignement | 148,6 | 103,8 | 69,8 % | 1 516 000 | chiffre |
| 10 Protection sociale | 693,0 | 32,4 | 4,7 % | 566 000 | **pas de chiffre** |

Note 07 : 07.1 et 07.2 ont D1 = 0. Au niveau division, la structure constante reporte donc 26,8 % sur des dépenses sans personnel public. Recommandation : calculer une division comme la somme de ses groupes chiffrés, pas avec sa part globale.

**Niveau A : coût direct (17 groupes)**

| Groupe | Coût retenu | Part D1 | Effectifs de rapprochement | Contrôle |
|---|---|---|---|---|
| 01.1 Exécutif, finances, affaires étrangères | `publicFinance` (S1311, S1314), `localAverage` (S1313) | 29,3 % | GFP 112 379 ETPT ; Économie et finances 130 300 (Insee) | ≈ 76 200 €, implicite 164 000 : périmètre plus large que GFP |
| 02.1 à 02.5 Défense | `defense` | 38,3 / 81,1 / 25,5 / 74,6 / 50,9 % | 265 458 ETPT ; Armées 279 200 (Insee) | implicite 246 000, voir §1.5 |
| 03.1 Police | `security` | 79,4 % | 252 267 ETPT État | implicite 281 000, soit 28 600 hors État, cohérent avec la police municipale (A_VERIFIER, §5) |
| 03.2 Incendie et secours | `fireServices` | 61,4 % | SPP + PATS + militaires | HYPOTHESE, voir §1.5 |
| 03.3 Tribunaux | `justiceCourts` | 54,8 % | P166 37 308 + P182 9 179 + autres | implicite 58 000 |
| 03.4 Prisons | `prisons` | 60,2 % | P107 43 949 | implicite 43 000 |
| 07.3 Hôpitaux | `hospital` | 58,4 % | 1 087 608 salariés | D1 63,81 Md€ ; DREES 63,34 Md€ |
| 09.1, 09.2, 09.3, 09.5, 09.6, 09.8 | `schoolEducation` (S1311), `localAverage` (S1313) | 81,2 / 78,0 / 56,3 / 17,3 / 48,9 / 73,0 % | 1 069 559 ETPT État | voir ci-dessous |

Contrôle enseignement : D1 S1311 de la division 09 = 86,9 Md€ ; T2 scolaire + D1 09.4 = 87,9 Md€. Écart 1,1 %. Le partage 09.1 / 09.2 / 09.6 entre programmes n'est pas établi : garder un seul coût scolaire. La part locale (16,9 Md€) passe par `localAverage`, sans effectif dédié.

**Niveau B : coût moyen par sous-secteur (29 groupes)**

`N = ΔD1 × (S1311 / stateAverage + S1313 / localAverage)`, avec parts de sous-secteur Eurostat. La valeur est sourcée, l'hypothèse porte sur la moyenne.

| Groupes | Sous-secteur dominant | Coût implicite (k€) |
|---|---|---|
| 01.3, 01.6 | local | 48,1 ; 52,0 |
| 01.4 Recherche fondamentale, 09.4 Supérieur | État | 70,3 ; 70,2 |
| 03.6 | État | 70,3 |
| 04.2, 04.4, 04.5, 04.7, 04.8, 04.9 | mixte | 54,5 ; 67,8 ; 64,3 ; 50,3 ; 70,3 ; 68,2 |
| 05.1, 05.2, 05.4, 05.5, 05.6 | local sauf 05.6 | 47,6 ; 47,6 ; 54,5 ; 57,9 ; 69,6 |
| 06.1, 06.2, 06.3, 06.6 | local | 58,7 ; 48,2 ; 47,6 ; 52,7 |
| 07.4, 07.5, 07.6 | mixte | 63,5 ; 70,3 ; 52,5 |
| 08.1, 08.2, 08.3, 08.6 | local sauf 08.3 | 48,2 ; 51,4 ; 66,1 ; 47,6 |
| 10.7, 10.9 | local | 48,5 ; 47,6 |

Contrôle recherche : D1 (01.4 + 04.8 + 05.5 + 07.5 + 09.4) = 19,76 Md€ pour 278 302 ETPT d'opérateurs (P150 197 464 ; P172 59 052 + 21 786), soit 71 000 €, proche de `stateAverage`. Le périmètre n'est pas exact : à présenter comme un simple recoupement.

Réserve 04.5 : le S1311 contient des entités hors fonction publique. La présence de SNCF Réseau dans ce périmètre est **A_VERIFIER**. Le niveau B reste un ordre de grandeur.

Réserve 07.5 : la part S1314 (1 407 M€) est traitée au coût `stateAverage`, sans source propre.

**Niveau C : pas de chiffre (23 groupes)**

| Motif | Groupes |
|---|---|
| D1 nul ou négligeable (10) | 01.5, 01.7, 01.8, 03.5, 06.5, 07.1, 07.2, 08.5, 09.7, 10.8 |
| Part D1 < 10 % (12) | 01.2, 04.1, 04.3, 04.6, 05.3, 06.4, 08.4, 10.1, 10.2, 10.3, 10.5, 10.6 |
| Part S1314 sans coût sourcé (1) | 10.4 |

Pourquoi le seuil de 10 % : à structure constante, baisser une enveloppe de pensions ou de prestations produirait un nombre de postes alors que le curseur parle d'abord de transferts. Le seuil est un choix de projet (HYPOTHESE).

Pour S1314 hors hôpitaux (21,6 Md€), il manque une source récente sur les organismes de sécurité sociale (Ucanss) et une ventilation des établissements médico-sociaux (160 500 agents, Insee), probablement en 10.1 et 10.2 (A_VERIFIER).

### 1.5 Cohérence et limites

| Point | Constat | Conséquence |
|---|---|---|
| Défense | D1 21,5 Md€ < T2 23,2 Md€ | Une partie du T2 est classée hors 02, cause non établie. Avec `defense`, N couvre 246 000 postes, pas 265 458. Écart assumé en note. |
| Incendie | D1 03.2 / (SPP + PATS) = 87 800 € ; avec militaires = 70 655 € | Eurostat (D1 03.2, 2024 p) : État 237,0 M€, collectivités 4 636,0 M€. Le D1 de l'État est trop faible pour la solde de la BSPP et du BMPM : elle passe par les budgets locaux. Militaires inclus (HYPOTHESE, 9 novembre 2026). Dépenses de personnel affichées 66 €/hab., population non explicitée. |
| Effectifs | ETPT du PLF et EQTP Siasp diffèrent | Justice : 93 127 ETPT, 94 600 agents. Écart faible, à mentionner. |
| Champ APU | DGAFP : le champ APU diffère de la fonction publique (organismes sociaux, etc.) | Le 5,72 M / 5,80 M est un recoupement, pas une égalité. |
| Mayotte | Siasp hors Mayotte | Léger biais à la hausse du coût FPE, FPT, FPH. |
| Année | D1 et effectifs 2024, référence 2025 | `scaling` appliqué au coût. D1 2025 par fonction attendu fin 2026. |
| Évolution | Hausse D1 2023-2024 : 4,6 % (346,3 → 362,1 Md€) | À actualiser à chaque millésime. |

### 1.6 Sourcé et dérivé

- **Sourcé (VERIFIE) :** D1 et TE par groupe et sous-secteur, EQTP et effectifs Insee, salaires DGAFP, T2 et ETPT RAP 2024, coûts par catégorie RAP, données DREES.
- **Dérivé (HYPOTHESE, formule en note) :** tous les coûts de §1.3, part D1, seuil de 10 %, coefficient 0,979.
- **Exemple de calcul :** −1 Md€ sur le levier Défense (division) : 1 000 M€ × 39,7 % = 397 M€ de personnel ; 397 M€ ÷ (87 288 € × 1,0248) ≈ 4 400 postes à temps plein en moins.

## 2. Objectif 2 : niveau Essentiel

### 2.1 Règle proposée

1. **Une famille entre si** son rendement dépasse 40 Md€, parmi : TVA, CSG, impôt sur le revenu, impôt sur les sociétés, taxe foncière, accises énergie, cotisations.
2. **Le plus gros levier de la famille entre** (taux × assiette statiques), plus un second lorsque la famille a deux logiques (salarié et employeur, activité et capital, milieu et haut de barème).
   Pour l'impôt sur le revenu, la tranche 5 s'ajoute hors rendement (voir plus bas).
3. **Équilibre travail/capital :** les deux prélèvements propres aux revenus du capital entrent, même sous le seuil (CSG capital, PFU).
4. **Rendement :** valeur actuelle × assiette de `revenues.json`, certaines assiettes étant HYPOTHESE (TVA).

### 2.2 Liste proposée (12 leviers)

| # | Identifiant exact | Rendement statique (Md€) | Assiette | Payeur légal |
|---|---|---|---|---|
| 1 | `vat.standard` | 150,0 | consommation | ménages |
| 2 | `csg.activity.rate` | 108,2 | travail | ménages |
| 3 | `socialContributions.employerHealth.rate` | 96,2 | travail | entreprises |
| 4 | `corporateTax.standardRate` | 63,4 | capital | entreprises |
| 5 | `incomeTax.bracket3.rate` | 57,2 | revenus | ménages |
| 6 | `incomeTax.bracket2.rate` | 51,9 | revenus | ménages |
| 7 | `propertyTax.change` | 44,2 | patrimoine immobilier | ménages et entreprises |
| 8 | `socialContributions.employeeOldAgeCapped.rate` | 43,5 | travail | ménages |
| 9 | `csg.capital.rate` | 20,3 | capital | ménages |
| 10 | `energyExcise.diesel.rate` | 19,5 | énergie | ménages et entreprises |
| 11 | `capitalIncome.flatTaxIncomeRate` | 10,3 | capital | ménages |
| 12 | `incomeTax.bracket5.rate` | 6,5 | hauts revenus | ménages |

La tranche 5 est retenue pour que le haut du barème soit présent, avec la même visibilité que le milieu. Elle sort de la règle de rendement : la tranche 4 rapporte davantage (10,1 Md€). Ce choix est à valider (§6).

`socialContributions.employerOldAgeCapped.rate` (53,9 Md€) rapporte plus que plusieurs leviers retenus. Il est écarté car la règle ne garde que le plus gros levier par payeur, pour éviter que les cotisations occupent la moitié de la liste.

**Décompte :** 133 leviers = 52 prélèvements + 79 dépenses + 2 macro.
- Essentiel : 12 prélèvements + 10 fonctions = **22 leviers**.
- Détaillé ajoute **40 prélèvements + 69 groupes = 109 leviers**, soit 131.
- Les 2 leviers macro restent hors de cette grille : leur niveau n'est pas fixé au §13.1 (§6).

### 2.3 Groupes sans levier unique satisfaisant

| Groupe | Difficulté | Solution proposée |
|---|---|---|
| Impôt sur le revenu | Barème à 5 tranches, tranche 1 à 0 %. `incomeTax.indexation` borné à ±5 %, ne mesure pas un taux | 3 tranches |
| IFI (2,7 Md€) | 5 taux et un seuil, rendements ≤ 0,9 Md€ par tranche | Hors Essentiel par la règle ; `wealthTax.threshold` en option (§6) |
| Accises énergie (43,1 Md€) | 6 produits, aucun levier d'ensemble | Gazole seul, 19,5 Md€ |
| Cotisations | 25 taux distincts | 2 leviers |
| TVA | 4 taux | Taux normal seul |
| Autres impôts (324,4 Md€) | Pas de levier (autres impôts sur la production, cotisations des non-salariés, etc.) | À signaler dans le panneau |
| CRDS (9,3 Md€), CDHR (0,4 Md€) | Pas de levier ; CDHR volontairement absente | Rien à l'étape 14 |

Limite : les rendements sont bruts (taux × assiette). Leur somme par famille ne retombe pas sur `revenues.json` : pour l'impôt sur le revenu, 125,7 Md€ pour les tranches, 103,6 Md€ d'encaissements (décote, réductions, etc., écart non détaillé ici).

## 3. Objectif 3 : « Ce que change une variation »

### 3.1 Volume

| Groupe | Entrées | Modèle |
|---|---|---|
| `spending.cofog` | 79 (10 fonctions + 69 groupes) | Dépense |
| `socialContributions` | 25 | Cotisation |
| `incomeTax` | 6 | Impôt |
| `energyExcise` | 6 | Impôt |
| `wealthTax` | 6 | Impôt |
| `vat` | 4 | Impôt |
| `csg` | 2 | Impôt |
| `macro` | 2 | Macro |
| `capitalIncome` | 1 | Impôt |
| `corporateTax` | 1 | Impôt |
| `propertyTax` | 1 | Impôt |
| **Total** | **133** | Impôt 27, Cotisation 25, Dépense 79, Macro 2 |

Effort : les entrées font 147 mots en moyenne (76 à 212). Prévoir 40 à 60 mots de plus par entrée. Le vocabulaire de hausse ou de baisse n'apparaît que dans 2 entrées de dépense, 22 de prélèvement et les 2 macro : presque tout est à écrire. Une recherche par mots-clés n'a relevé aucun effet comportemental affirmé (une seule occurrence, « renoncer au PFU », sans rapport).

Changements de schéma à prévoir (`src/engine/schemas.ts`) :
- ajouter la rubrique à `EXPLANATION_HEADINGS` ;
- la rendre obligatoire dans `validateExplanations` ;
- exiger exactement deux `items`, le premier « À la hausse », le second « À la baisse » ;
- `sections.max(6)` suffit, le maximum actuel étant 4 ; `sourceIds.max(5)` aussi, sauf ajout de source par entrée (27 entrées en ont déjà 4).

Le test existant interdit les montants en Md€ dans ces textes.

### 3.2 Modèles

Règles communes : deux items de longueur comparable, mêmes verbes des deux côtés, « dans ce simulateur », aucune conséquence comportementale affirmée, aucun chiffre, aucun adjectif de jugement.

**Impôt**
- À la hausse : « Le taux passe au-dessus de sa valeur actuelle. Dans ce simulateur, [recette] augmente et [redevables] paient davantage sur [assiette]. »
- À la baisse : « Le taux passe en dessous de sa valeur actuelle. Dans ce simulateur, [recette] diminue et [redevables] paient moins sur [assiette]. »
- Fin commune, dans « Bon à savoir » si utile : « L'assiette est supposée inchangée : le simulateur ne tient pas compte d'éventuels changements de comportement. »

**Cotisation**
- À la hausse : « Le taux augmente. Dans ce simulateur, les recettes de [branche ou régime] augmentent et [supporteur selon l'hypothèse d'incidence] voit son revenu baisser d'autant. »
- À la baisse : « Le taux diminue. Dans ce simulateur, les recettes de [branche ou régime] diminuent et [supporteur] voit son revenu augmenter d'autant. »
- Pour les retraites : ne rien affirmer sur les droits futurs, non modélisés. Ajouter : « Les droits à prestation ne sont pas recalculés. »

**Dépense**
- À la hausse : « Le montant augmente. Dans ce simulateur, la dépense publique augmente de l'écart et les services de [fonction] reçus par les profils augmentent dans la même proportion. »
- À la baisse : « Le montant diminue. Dans ce simulateur, la dépense publique diminue de l'écart et les services de [fonction] reçus par les profils diminuent dans la même proportion. »
- Si le groupe a un chiffre : « Le texte sous le curseur donne un ordre de grandeur de postes à temps plein, à structure constante. »
- Cas à adapter : 01.7 (intérêts, hors solde primaire), 10.7 (prime d'activité), 10.2 (pensions), groupes sans allocation aux profils.

**Macro** : « Une valeur plus élevée […] / Une valeur plus basse […] : la trajectoire de la dette change, pas les recettes ni les dépenses de l'année de référence » (à relire avec `macro.ts`).

### 3.3 Exemples

**`vat.standard`**
- À la hausse : « Le taux passe au-dessus de sa valeur actuelle. Dans ce simulateur, la recette de TVA augmente et les ménages paient davantage sur leurs achats taxés au taux normal. »
- À la baisse : « Le taux passe en dessous de sa valeur actuelle. Dans ce simulateur, la recette de TVA diminue et les ménages paient moins sur leurs achats taxés au taux normal. »

**`corporateTax.standardRate`**
- À la hausse : « Le taux augmente. Dans ce simulateur, la recette de l'impôt sur les sociétés augmente et les actionnaires supportent un impôt plus élevé sur les bénéfices. »
- À la baisse : « Le taux diminue. Dans ce simulateur, la recette de l'impôt sur les sociétés diminue et les actionnaires supportent un impôt plus faible sur les bénéfices. »

**`socialContributions.employerHealth.rate`**
- À la hausse : « Le taux augmente. Dans ce simulateur, les recettes de l'Assurance maladie augmentent et le salarié, qui supporte cette cotisation par hypothèse, voit son revenu baisser d'autant. »
- À la baisse : « Le taux diminue. Dans ce simulateur, les recettes de l'Assurance maladie diminuent et le salarié voit son revenu augmenter d'autant. »

**`socialContributions.employerUnemployment.rate`**
- À la hausse : « Le taux augmente. Dans ce simulateur, les recettes de l'assurance chômage augmentent et le salarié, qui supporte cette cotisation par hypothèse, voit son revenu baisser d'autant. Les droits ne sont pas recalculés. »
- À la baisse : « Le taux diminue. Dans ce simulateur, les recettes de l'assurance chômage diminuent et le salarié voit son revenu augmenter d'autant. Les droits ne sont pas recalculés. »

**`spending.cofog.03.1`**
- À la hausse : « Le montant augmente. Dans ce simulateur, la dépense publique augmente de l'écart et les services de police et de gendarmerie reçus par les profils augmentent dans la même proportion. »
- À la baisse : « Le montant diminue. Dans ce simulateur, la dépense publique diminue de l'écart et les services de police et de gendarmerie reçus par les profils diminuent dans la même proportion. »

**`spending.cofog.09.2`**
- À la hausse : « Le montant augmente. Dans ce simulateur, la dépense publique augmente de l'écart et les services d'enseignement secondaire reçus par les profils augmentent dans la même proportion. »
- À la baisse : « Le montant diminue. Dans ce simulateur, la dépense publique diminue de l'écart et les services d'enseignement secondaire reçus par les profils diminuent dans la même proportion. »

À vérifier avant rédaction : l'allocation aux profils diffère selon le groupe (`inKindAllocation.json`). Le modèle dépense doit dire la vérité du moteur pour chaque groupe.

## 4. Nouvelles sources pour `sources.json`

Toutes consultées le 2026-11-07.

| id proposé | Titre | Éditeur | URL | Année |
|---|---|---|---|---|
| `eurostat-gov-10a-exp-d1` | gov_10a_exp, D1 et TE, France, S13, MIO_EUR | Eurostat | https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?geo=FR&sector=S13&unit=MIO_EUR&time=2024&na_item=D1&na_item=TE | 2024 (p) |
| `eurostat-gov-10a-exp-d1-subsectors` | Idem, S1311, S1313, S1314 | Eurostat | https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?geo=FR&sector=S1311&unit=MIO_EUR&time=2024&na_item=D1 (remplacer le secteur) | 2024 (p) |
| `insee-ip2094-emploi-fp-2024` | L'emploi dans la fonction publique en 2024, Insee Première n° 2094, 10/02/2026 | Insee | https://www.insee.fr/fr/statistiques/8732435 | fin 2024 |
| `dgafp-ra-2026` | Rapport annuel sur l'état de la fonction publique, édition 2026, 15/10/2026 | DGAFP | https://www.fonction-publique.gouv.fr/files/files/publications/rapport-annuel/rapport_annuel_2026.pdf | 2024 |
| `rap2024-enseignement-scolaire` | RAP 2024, mission Enseignement scolaire | PLRG 2024 (AN) | https://questions.assemblee-nationale.fr/dyn/contenu/visualisation/906949/file/Enseignement%20scolaire | 2024 |
| `rap2024-securites` | RAP 2024, mission Sécurités | PLRG 2024 (AN) | https://questions.assemblee-nationale.fr/dyn/contenu/visualisation/907009/file/Securites.pdf | 2024 |
| `rap2024-justice` | RAP 2024, mission Justice | PLRG 2024 (AN) | https://questions.assemblee-nationale.fr/dyn/contenu/visualisation/906967/file/Justice | 2024 |
| `rap2024-defense` | RAP 2024, mission Défense | PLRG 2024 (AN) | https://www2.assemblee-nationale.fr/static/17/Annexes-DL/PJL-1285/Defense.pdf | 2024 |
| `rap2024-gestion-finances-publiques` | RAP 2024, mission Gestion des finances publiques | PLRG 2024 (AN) | https://questions.assemblee-nationale.fr/dyn/contenu/visualisation/906955/file/Gestion_finances_publiques.pdf | 2024 |
| `rap2024-recherche-enseignement-superieur` | RAP 2024, mission Recherche et enseignement supérieur | PLRG 2024 (AN) | https://www2.assemblee-nationale.fr/static/17/Annexes-DL/PJL-1285/Recherche_enseignement_superieur.pdf | 2024 |
| `pap2026-travail-emploi` | PAP 2026, mission Travail et emploi | PLF 2026 (AN) | https://www.assemblee-nationale.fr/dyn/dyn/contenu/visualisation/1088047/file/PAP2026_BG_Travail_emploi_TB.pdf | LFI 2025 |
| `drees-etablissements-sante-2026` | Les établissements de santé en 2024, édition 2026, fiches 05, 06, 07, 25 | DREES | https://drees.solidarites-sante.gouv.fr/publications-communique-de-presse-documents-de-reference/panoramas-de-la-drees/260520-Etablissements-de-sant%C3%A9-en-2024 | 2024 |
| `dgscgc-stats-sdis-2025` | Statistiques des services d'incendie et de secours, édition 2025 | DGSCGC, **copie tierce** | https://www.faceaurisque.com/wp-content/uploads/2025/12/Statistiques-interventions-Sdis-edition-2025-sur-annee-2024_compressed.pdf | 2024 |

Page officielle à substituer pour la dernière ligne : https://www.interieur.gouv.fr/documentation/etudes-et-statistiques/statistiques-2024-dgscgc.html

## 5. Valeurs A_VERIFIER

| Élément | Raison |
|---|---|
| `fireServices`, 70 655 € | Passé en HYPOTHESE le 9 novembre 2026 (militaires inclus, déduit de la ventilation Eurostat par sous-secteur) ; publication lue via copie tierce |
| 03.2, 66 € de personnel par habitant | Population de référence non explicitée, valeur non utilisée |
| `employmentService`, 66 124 € | Emplois LFI 2025 rapportés à D1 2024. RAP 2024 Travail illisible (PDF altéré, deux tentatives) |
| Défense, écart D1 / T2 de 1,65 Md€ | Cause non établie |
| Police municipale, 28 600 implicites | Déduit par différence ; pas d'effectif national sourcé |
| Répartition des EMS de la FPH entre 10.1 et 10.2 | Déduite du niveau de S1314, non documentée |
| Taux CAS Pensions 2025 | Non vérifié ; un changement rendrait le coût 2024 × `scaling` imprécis |
| SNCF Réseau dans S1311 | Non vérifié |
| Effectifs de la sécurité sociale (Ucanss) | Dernière édition trouvée : effectifs fin 2022, trop ancienne ; chiffres non relevés |
| Synthèse chiffrée des RAP 2024 (budget.gouv.fr) | Site inaccessible (protection anti-robot), non consultée |
| PLF 2027 / PAP 2027 | Non exploités ; RAP 2024 préférés car de même année que D1 |

## 6. Décisions pour le mainteneur

| # | Décision | Recommandation |
|---|---|---|
| 1 | Base du coût pour l'État | **T2 / ETPT** (exécution RAP), mesure directe et identique à D1 |
| 2 | Niveau B par sous-secteur | **Oui**, signalé « moyenne de versant » dans la Méthodologie |
| 3 | Seuil de part D1 pour afficher un chiffre | **10 %**, division 10 sans chiffre |
| 4 | Lignes `compensation` du niveau 3 (Expert) | **Afficher les postes** même si le groupe n'en a pas, le poste étant 100 % personnel, sauf coût absent |
| 5 | Calcul d'une division | **Somme des groupes chiffrés**, pour éviter l'effet 07.1 et 07.2 |
| 6 | 03.2 et 10.5 | **Publier 03.2 après lecture de la source officielle** ; 10.5 reste en niveau C |
| 7 | Coût moyen ou coût d'entrée | **Coût moyen**, symétrique, comme §13.8, avec une phrase dans la Méthodologie |
| 8 | Cotisations dans « grands impôts » | **Oui, 2 leviers**, elles pèsent 411,5 Md€ |
| 9 | Tranche 5 ou 4 de l'impôt sur le revenu | **Tranche 5**, ou garder les deux avec 13 leviers |
| 10 | IFI dans Essentiel | **Non** selon la règle ; si oui, `wealthTax.threshold` et 13 ou 14 leviers |
| 11 | Taux réduit de TVA | **Non** (11,0 Md€) ; `vat.intermediate` rapporte plus (16,0 Md€) et serait prioritaire en cas d'ajout |
| 12 | Leviers macro | **Détaillé**, déjà en mode avancé selon §6.3 |
| 13 | Sections `items` à deux entrées | **Oui**, cela rend le contrôle de symétrie automatique |
