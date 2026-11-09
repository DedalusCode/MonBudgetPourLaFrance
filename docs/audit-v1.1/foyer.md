# Audit v1.1 — Aides du foyer et nouveaux statuts (PLAN.MD §13.4, §13.5, Étape 13)

Consultation de toutes les URL : **2026-11-07**. Aucun fichier du dépôt modifié.

## 0. Lecture du rapport

**Statuts.** `VERIFIE` : valeur lue sur une page officielle. `A_VERIFIER` : non lue directement sur une page officielle, ou texte ambigu. `HYPOTHESE` : choix de modélisation.

**Trois limites de collecte, à garder en tête :**
1. **Légifrance** refuse curl (403) et n'est lisible que par WebFetch, qui passe le texte dans un modèle d'extraction : les tableaux lus ainsi peuvent contenir une erreur de recopie. Les valeurs issues de Légifrance sont marquées `VERIFIE¹`. Celles recoupées avec OpenFisca 176.1.10 sont indiquées. **Le barème des bourses (`VERIFIE¹`, non recoupé) doit être relu ligne à ligne avant saisie.**
2. **caf.fr** bloque toute lecture automatique (Radware). Le barème CAF des aides au logement n'a pas été lu, seulement un extrait de moteur de recherche concordant. Aucun exemple chiffré CAF n'a pu être récupéré.
3. **education.gouv.fr** bloque aussi ; la circulaire des bourses a été lue dans le PDF du BO n° 9 sur enseignementsup-recherche.gouv.fr.

**Montants brut / net de CRDS.** L'instruction DSS donne les prestations familiales **avant** CRDS ; service-public les donne **après** CRDS (0,5 %). Exemple : complément familial 199,15 € (DSS) et 198,16 € (SP). Tout cas de test doit préciser sa base.

**Dates en vigueur.** Plafonds familiaux : 1/1/2026. Minima et prestations : 1/4/2026 (ASPA : 1/1/2026). APL : 1/10/2026. Bourses : année 2026-2027.

---

## 1. Constats sur le code existant (à traiter avant ou pendant l'Étape 16)

| # | Fichier | Constat | Base |
|---|---|---|---|
| E1 | `customHousehold.ts` | Les ressources de la prime d'activité comptent toutes les allocations familiales, **majoration pour âge comprise** ; or elle est exclue. Écart faible, sauf familles avec enfants de 14 ans ou plus. | CSS R844-5, 3° |
| E2 | `family.ts` / `customHousehold.ts` | Les allocations familiales sont brutes de CRDS (0,5 %) dans le revenu disponible. | Instruction DSS 2026/46 |
| E3 | `customHousehold.ts` | `housingFlatRateApplies` = propriétaire seulement. Dès que l'APL est calculée, le forfait logement s'applique aussi au locataire aidé (RSA et prime d'activité). **Le passage à l'APL baissera mécaniquement la prime d'activité des locataires** : c'est la règle, pas un bug. | CSS R844-3/R844-4 ; CASF R262-10 |
| E4 | `taxRules.json` | `selfEmployed.baseAllowanceMin/MaxPassMultiple` (1,76 % et 130 % du PASS) sont `A_VERIFIER`. La page MSA de la réforme donne les mêmes bornes pour les non-salariés agricoles. Cela les conforte sans remplacer la lecture du décret 2024-688. | MSA réforme assiette |
| E5 | `customHousehold.ts` | `housingAid: 0` figé ; `AdultStatus` limité à 4 valeurs ; `CustomAdult.netMonthly` ne convient ni à un micro-entrepreneur (saisie du CA) ni à un agent public (traitement et primes). | — |

---

## 2. Graphe de calcul proposé

Plusieurs aides dépendent des autres. Ordre sans cycle :

1. Revenus individuels (statuts) → net, imposable, revenu net catégoriel.
2. AF, ASF, complément familial, PAJE base, ARS (selon revenu net catégoriel, proxy de N-2).
3. ASS, AAH, ASPA (l'ARE est saisie).
4. APL (revenus nets catégoriels : RSA, AAH, prestations familiales non imposables en sont absents).
5. RSA (ressources de 1 à 3 + forfait logement) et prime d'activité (idem). **L'un exclut l'autre de ses ressources** (CASF R262-11 ; CSS R844-5, 25°) : aucune itération.
6. C2S (ressources 12 mois), chèque énergie (RFR par UC).

Le §13.3 du plan (« chaque prestation est traitée séparément ») reste compatible : un curseur multiplie le résultat de la prestation sans repasser dans le graphe. **Décision D7.**

---

## 3. Aides calculées

### 3.1 RSA

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Montant forfaitaire, 1 personne | 651,69 €/mois | Décret 2026-220 ; SP F19778 | 2026-04-01 | VERIFIE |
| Majoration 2e personne | 50 % | CASF R262-1 | — | VERIFIE¹ |
| Personne supplémentaire | 30 % ; 40 % dès le 3e enfant ou personne à charge de moins de 25 ans | CASF R262-1 | — | VERIFIE¹ |
| Parent isolé | 128,412 % + 42,804 % par enfant | CASF R262-1 | — | VERIFIE¹ (recoupé : 836,85 et 1 115,80 de SP) |
| Forfait logement | 12 % (1 p.), 16 % du forfait 2 p., 16,5 % du forfait 3 p. soit 78,20 / 156,41 / 193,55 € | CASF R262-9 ; SP F19778 | 2026-04-01 | VERIFIE |
| Seuil de non-versement | 6 € | OpenFisca seul | 2009 | A_VERIFIER (article actuel non lu) |
| Âge minimal | 25 ans (sauf charge d'enfant) | SP F19778 | — | VERIFIE |

**Formule.** `max(0, forfait(foyer) − ressources − forfaitLogement)`, le forfait ayant la structure de `householdLumpSum()` (réutilisable : même barème 50/30/40, base différente). Vérifié sur SP : couple 2 enfants = 1 368,55 ; 3e enfant + 260,68.

**Ressources comptées (R262-6)** : toutes, dont salaires, ARE, ASS, AAH, pensions, allocations familiales de base, complément familial, PAJE base. **Exclues (R262-11)** : prime d'activité, prime à la naissance, majoration pour âge et allocation forfaitaire, ARS, CMG, AEEH, bourses, APA, PCH sous conditions, MTP. APL : incluse **à hauteur du forfait** (R262-10). ASF : forfaitisée (R262-10-1, via OpenFisca, `A_VERIFIER`).

**Exclus de principe** : élèves, étudiants et stagiaires non rémunérés, sauf parent isolé ; congé parental, sabbatique, sans solde, disponibilité (SP F19778). Propriétaire, logé gratuit ou aidé : forfait logement.

**Fiscalité** : non imposable (CGI 81, 9° selon BOFiP BOI-RSA-CHAMP-20-50-30, lu par extrait, `A_VERIFIER`). Pas de CSG.

**Champs** : statut (déjà), parent isolé (déduit : un adulte + enfants ; la condition d'« isolement récent » est une `HYPOTHESE`).

**OpenFisca** : `rsa`, `rsa_base_ressources`, `rsa_forfait_logement`.

**Test** (dérivé du tableau SP, aucun exemple rédigé trouvé) : personne seule, sans ressources, logée gratuitement : 651,69 − 78,20 = 573,49 €.

**Complexité** : M.

### 3.2 AAH

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Montant maximal | 1 041,59 €/mois | Décret 2026-229 ; SP F12242 | 2026-04-01 | VERIFIE |
| Plafond annuel, seul | 12 499 € ; + 50 % par enfant (18 749 ; 24 998 ; 31 248 ; 37 497) | SP F12242 | 2026-04-01 | VERIFIE |
| Couple (ancien calcul, droits antérieurs) | 22 623 € ; 28 873 ; 35 122 ; 41 372 ; 47 621 | SP F12242 | 2026-04-01 | VERIFIE |
| Taux d'incapacité | ≥ 80 %, ou 50-79 % avec restriction substantielle et durable d'accès à l'emploi (RSDAE) | SP F12242 ; CASF R241-33 | — | VERIFIE |
| Âge | ≥ 20 ans (16 si plus à charge) ; fin à l'âge légal de retraite, sauf taux ≥ 80 % (voir SP, cas retraite) | SP F12242 | — | VERIFIE |
| Abattement activité | 80 % jusqu'à 30 % du SMIC mensuel (151,67 h) ; 40 % au-delà | CSS D821-9 (décret 2026-548) | 2026-06-28 | VERIFIE¹ |
| Neutralisation de reprise | 6 mois maximum par 12 mois glissants | CSS D821-9 | 2026-06-28 | VERIFIE¹ |
| Déconjugalisation | ressources du bénéficiaire seul | SP F12242 | 2023-10-01 | VERIFIE |

**Formule.** `R = revenuNetCatégorielIndividuel après abattement D821-9` ; `AAH = max(0, min(1041,59 ; (plafond − R) / 12))`. Pension ou rente : versement différentiel jusqu'au maximum (SP).

**Attention** : les ressources de base sont celles de l'année N-2, mais l'activité en milieu ordinaire suit une évaluation trimestrielle (`aah_base_ressources_activite_eval_trimestrielle` dans OpenFisca). `HYPOTHESE` : revenu courant pour les deux.

**Interactions.** Non cumulable avec l'ASS (régime transitoire fini au 31/12/2026, SP A19095). Comptée dans le RSA. Pas de dégressivité de l'APL si l'allocataire perçoit l'AAH (brochure APL). Prime d'activité : **l'AAH est un revenu professionnel si les revenus d'activité atteignent 29 × SMIC horaire** (CSS L842-8, en vigueur au 07/11/2026 ; seuil D843-4 via OpenFisca). L'abrogation prévue par l'art. 79 du PLF 2026 n'apparaît pas dans le code consolidé. **Le simulateur doit donc traiter ce cas.**

**Fiscalité** : non imposable (CGI 81, 2°, BOFiP). Pas de CSG.

**Champs** : case handicap, taux d'incapacité, RSDAE (case).

**OpenFisca** : `aah`, `aah_base`, `aah_base_ressources_deconjugalisee`.

**Test** (dérivé) : pension de 800 €/mois, sans autre revenu : 241,59 €. Cas 2 : salaire donnant 500 € de revenu mensuel, abattement à calculer avec le SMIC en vigueur, comparer à `aah`.

**Complexité** : M.

### 3.3 ASPA

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Maximum, personne seule | 1 043,59 €/mois (12 523,14 €/an) | SP F16871 | 2026-01-01 | VERIFIE |
| Maximum, couple | 1 620,18 €/mois (19 442,21 €/an) | SP F16871 | 2026-01-01 | VERIFIE |
| Âge | 65 ans (plus tôt si inaptitude ou invalidité) | SP F16871 | — | VERIFIE |
| Abattement revenu professionnel | 2 734,55 € (3 mois) ; 10 938,20 € (12 mois) | SP F16871 | 2026 | VERIFIE |
| Revenu fictif des biens | 3 % de la valeur vénale, résidence principale exclue | SP F16871 | 2026 | VERIFIE |
| Récupération sur succession | actif net > 108 586,14 € | SP F16871 | 2026 | VERIFIE |

**Formule.** `max(0, plafond − revenus)`. Couple dont un seul perçoit l'ASPA : si revenus ≤ 576,59 € : 1 043,59 € ; entre 576,59 et 1 620,18 € : 1 620,18 − revenus ; au-delà : 0.

**Ressources comptées** : pensions, invalidité, pension alimentaire judiciaire, revenus professionnels après abattement, biens à 3 %. **Exclues** : AAH sauf cas particuliers, APL/ALS, APA, PCH, MTP, prestations familiales, aides des descendants, résidence principale.

**Patrimoine.** Le foyer ne saisit pas son patrimoine : `HYPOTHESE` à 0, signalée. **Décision D6.** La récupération sur succession n'est pas modélisée et doit être citée en Méthodologie.

**Fiscalité** : `A_VERIFIER` (texte non lu ; CGI 81, 9° probable). Décret de revalorisation : `A_VERIFIER` (numéro non trouvé).

**OpenFisca** : `aspa`.

**Tests publiés (SP F16871, exemple rédigé)** : seul, revenus de 800 € : **243,59 €**. Couple, revenus de 1 000 € : **620,18 €**.

**Complexité** : S.

### 3.4 ASS

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Montant journalier | 19,48 € (584,40 € sur 30 j) | Décret 2026-219 ; SP F12484 | 2026-04-01 | VERIFIE |
| Plafond seul | 1 363,60 €/mois (70 × le journalier) | SP F12484 | 2026-04-01 | VERIFIE |
| Plafond couple | 2 142,80 €/mois (110 ×) | SP F12484 | 2026-04-01 | VERIFIE |
| Plein taux si ressources < | 779,20 € seul ; 1 558,40 € couple | SP F12484 | 2026-04-01 | VERIFIE |
| Condition d'emploi | 5 ans d'activité sur les 10 ans précédant la fin du dernier contrat | SP F12484 | — | VERIFIE |

**Formule.** `min(584,40 ; max(0, plafond − ressources))`, sur la moyenne des 12 derniers mois.

**Ressources** : pension alimentaire reçue, revenus du capital imposables. **Non comptées** : ARE antérieure, prestations familiales, allocation de logement, revenus d'activité interrompus. Cumul intégral 3 mois en cas de reprise (non modélisé).

**Limite de champ.** Le droit dépend de l'historique (fin de droits ARE et condition de 5 ans). **Proposition** : case « fin de droits, condition de durée remplie » dans le statut chômage. **Décision D5.**

**Fiscalité et CSG** : `A_VERIFIER` (non lue).

**OpenFisca** : `ass`.

**Test** (tableau SP) : seul, ressources de 1 000 € : 363,60 €.

**Complexité** : S.

### 3.5 ARE (saisie, pas calculée)

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| CSG taux normal | 6,2 % (dont 3,8 % déductible) | SP F2971 | 2026-06-01 (vérif.) | VERIFIE |
| CSG taux réduit | 3,8 % déductible | SP F2971 | idem | VERIFIE |
| CRDS | 0,5 % | SP F2971 | idem | VERIFIE |
| Assiette | 98,25 % jusqu'à 192 240 € ; 100 % au-delà | SP F2971 | idem | VERIFIE |
| Seuils RFR 2024, 1 part | 13 048 € (zéro) ; 17 057 € (réduit) ; quart de part + 1 742 / 2 278 ; demi-part + 3 484 / 4 555 | SP F2971 | 2026 | VERIFIE |
| Écrêtement | pas de CSG-CRDS si le net tomberait sous le SMIC journalier, 61,55 € | SP F14860 | 2026-07-23 (vérif.) | VERIFIE |
| Retenue retraite complémentaire | 3 % du SJR, sans passer sous 32,13 € | SP F14860 | idem | VERIFIE |
| Calcul de l'ARE (info) | 13,18 € + 40,4 % SJR, borné à 57-75 % SJR ; minimum net 32,13 € | SP F14860 | idem | VERIFIE |
| Dégressivité (info) | 30 % dès le 7e mois au-delà de 159,68 €/j de salaire | SP F14860 | idem | VERIFIE |

**Point de vigilance** : les seuils sont les mêmes que `pension.zeroRateCeiling` et `reducedRateCeiling`. Réutilisable, mais il faut étendre `pensionOnly()` ou écrire `replacementLevies()`.

**Saisie.** Proposer l'ARE **brute mensuelle** ; la retenue de 3 % du SJR demande le SJR, non saisi. `HYPOTHESE` : SJR estimé à partir de l'ARE (formule ci-dessus, en borne) ou retenue ignorée. **Décision D5.** L'ARE est imposable (revenu de remplacement, abattement 10 %) et comptée au RSA et à la prime d'activité (R844-2, 2°).

**OpenFisca** : `chomage_brut`, `chomage_imposable`, `allocation_retour_emploi`.

**Test** : ARE brute de 1 500 €/mois, taux normal : CSG = 1 500 × 0,9825 × 6,2 %, CRDS = 1 500 × 0,9825 × 0,5 % (hors écrêtement), à comparer à OpenFisca.

**Complexité** : S (prélèvements), M si la retenue SJR est calculée.

### 3.6 APL (aides au logement, secteur locatif ordinaire)

Texte : arrêté du 27 septembre 2019 consolidé au 20/10/2026, modifié par l'arrêté du 28 septembre 2026 (+1,15 %, IRL, prestations dues dès le 1/10/2026). R0 et forfait étudiant non révisés pour 2026 (décret 2025-1401). Formule : CCH D823-16.

| Paramètre | Valeur | Source (arrêté 2019) | Statut |
|---|---|---|---|
| L plafond zone I : seul / couple / 1 PAC / PAC sup. | 336,97 / 406,40 / 459,32 / + 66,65 | art. 7 | VERIFIE¹, recoupé OF |
| L plafond zone II | 293,68 / 359,47 / 404,49 / + 58,88 | art. 7 | VERIFIE¹, recoupé OF |
| L plafond zone III | 275,25 / 333,67 / 374,13 / + 53,62 | art. 7 | VERIFIE¹, extrait CAF concordant |
| Chambre, cas général (90 %) | 303,27 / 264,31 / 247,73 | art. 8 | VERIFIE¹ |
| Colocation (75 %), seul | 252,73 / 220,26 / 206,44 | art. 16 | VERIFIE¹ |
| C forfait charges | 61,29 € ; + 13,90 € par personne supplémentaire ; colocataire isolé 30,64 € | art. 9, 16 | VERIFIE¹, recoupé OF |
| Coefficients dégressivité / suppression | zone I : 3,4 / 4 ; zones II, III : 2,5 / 3,1 | art. 10 | VERIFIE¹, brochure 2024 |
| Minoration forfaitaire | 5 € | art. 11 | VERIFIE¹ |
| Seuil de versement | AL 10 € ; APL 0 € | art. 12 | VERIFIE¹ |
| P0 | max(8,5 % × (L + C) ; 40,01 €) | art. 13 | VERIFIE¹, recoupé OF |
| TF | seul 2,83 % ; couple 3,15 % ; 1 PAC 2,70 % ; 2 : 2,38 ; 3 : 2,01 ; 4 : 1,85 ; 5 : 1,79 ; 6 : 1,73 ; − 0,06 point par PAC sup. | art. 14 | VERIFIE¹ |
| TL | 0 si RL < 45 % ; 0,45 % × (RL − 45 %) ; au-delà de 75 % : 0,45 % × 30 % + 0,68 % × (RL − 75 %) | art. 14 | VERIFIE¹, brochure |
| LR | = loyer plafond zone II, selon la composition | art. 14 | VERIFIE¹ |
| R0 | 5 235 / couple 7 501 / 1 PAC 8 947 / 2 : 9 148 / 3 : 9 498 / 4 : 9 851 / 5 : 10 202 / 6 : 10 554 ; + 346 | art. 15 | VERIFIE¹, recoupé OF (seul, 2 PAC) |
| Forfait étudiant | location 8 600 € ; boursier 6 900 € ; foyer 6 600 / 5 400 € | art. 6 (D822-21) | VERIFIE¹ |
| Seuil patrimoine | 30 000 € | SP F12006 ; brochure | VERIFIE |

**Formule (brochure §3.1, CCH D823-16) :**
```
L = min(loyerRéel, plafond(zone, composition))
P0 = max(0,085 × (L + C), 40,01)
RL = arrondi2(100 × L / LR) ; TL = arrondi3(...)
Tp = TF + TL
R = max(ressources annuelles, forfait étudiant le cas échéant), arrondi à la centaine supérieure
Pp = P0 + Tp × max(0, R − R0)         [montant mensuel]
A = max(0, L + C − Pp)
si loyerRéel > cd × plafond : A × (cs − loyerRéel/plafond) / (cs − cd), nul au-delà de cs
A = A − 5 ; [RLS si HLM : − 98 % de la RLS]
seuil de versement ; CRDS 0,5 % (arrondi au centime inférieur) ; arrondi à l'euro inférieur
```
**Ordre CRDS / arrondi** : la brochure prend la CRDS puis arrondit à l'euro inférieur. OpenFisca applique le même ordre.

**Ressources (brochure §5, CCH R822-2 à R822-5).** Revenus nets catégoriels après abattement de 10 %, sur [M-13 ; M-2] (salaires, chômage, pensions) ou N-2. Déductions limitées (pensions alimentaires versées, abattement invalide). `HYPOTHESE` : revenu courant. RSA, AAH, prestations familiales, prime d'activité ne sont pas des revenus catégoriels imposables.

**Valeurs art. 3 et 4 (95 € et 2 589 €)** : abattements de R822-7 et R822-8, dont le champ n'a pas été lu. `A_VERIFIER`, sans effet attendu sur le cas général.

**Dégressivité** : non appliquée si AAH ou AEEH dans le foyer (brochure).

**RLS** : HLM seulement, baisse le loyer et l'APL en parallèle. Montants 2026 non lus. **Proposition** : ignorée (effet net de 2 % de la RLS). `HYPOTHESE`.

**Zones** : 3 zones dans l'arrêté. SP mentionne un outil « 1, 1 bis, 2 ou 3 » : libellé à éclaircir. `A_VERIFIER`.

**Hors champ proposé** : logement-foyer (formule K), accession, CROUS, Outre-mer, colocation et chambre (option plus tard).

**Fiscalité** : non imposable (CGI 81, 2° bis, extrait). CRDS 0,5 %.

**Champs** : statut d'occupation (locataire / propriétaire / logé gratuit), loyer hors charges, zone, étudiant déduit du statut, boursier déduit, type de logement si AL ≠ APL (seuil 10 € contre 0 €).

**OpenFisca** : `aide_logement`, `apl`, `als`, `alf`, `aide_logement_montant_brut`, `aide_logement_participation_personnelle`. **Pin 176.1.10 : paramètres déjà au 2026-10-01.**

**Test publié (brochure avril 2024, §3.1.6, à rejouer avec `rulesWith()`)** : couple, 2 enfants, zone II, R = 11 500 €, loyer 500 €, droit de janvier 2024 : L 439,07 ; C 84,42 ; P0 44,50 ; R0 9 061 ; TF 2,38 % ; TL 0,305 % ; Pp 109,98 ; AL 413,51 ; brute 408,51 ; CRDS 2,04 ; **versé 406 €**. Dégressivité : personne seule zone II, début 695,70 €, fin 862,67 € (2024).

**Complexité** : L.

### 3.7 Allocation de soutien familial

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Taux partiel | 42,20 % BMAF = 201,78 € par enfant (avant CRDS) | DSS 2026/46 | 2026-04-01 | VERIFIE |
| Taux plein | 56,25 % = 268,97 € | DSS 2026/46 | 2026-04-01 | VERIFIE |
| Net CRDS | 200,78 € | SP F815 | 2026-04-01 | VERIFIE |
| Différentiel minimal | pas de versement sous 15 € | CSS D523-3 ; SP F815 | — | VERIFIE |
| Forfait dans RSA et prime d'activité | 22,5 % ou 30 % BMAF par enfant | CSS R844-4, III | — | VERIFIE¹ |

**Coquille SP.** F815 écrit une fois « 201,78 € » dans un titre, sinon 200,78 €. Le 268,97 € n'y figure pas. Le taux plein concerne l'enfant privé des deux parents (orphelin), `A_VERIFIER`.

**Formule.** Parent isolé, sans condition de ressources : `Σ enfants max(0, 201,78 − pensionReçue)`, nul si le différentiel est < 15 €. Supprimée en cas de vie en couple.

**Dépendance.** L'ASF suppose que l'autre parent ne participe pas ou que la pension fixée est inférieure à 200,78 €. **Champ à ajouter** : pension alimentaire reçue par enfant et case « l'autre parent ne verse rien ». Sans cette case, on verserait l'ASF à tout parent seul. **Décision D4.**

**Effet attendu** : résout `KNOWN_GAPS[("singleParent1Child", "activityBonus")]` si le cas OpenFisca est aligné.

**OpenFisca** : `asf`, `asf_montant`, `rsa_forfait_asf`.

**Test** : pension de 100 € : 101,78 € brut. Pension de 190 € : 11,78 € < 15 € : 0.

**Complexité** : S.

### 3.8 Complément familial

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Montant | 41,65 % = 199,15 € (198,16 € net) | DSS 2026/46 ; SP F13214 | 2026-04-01 | VERIFIE |
| Montant majoré | 62,48 % = 298,75 € (297,27 € net) | idem | 2026-04-01 | VERIFIE |
| Plafond : 3 enfants | 44 735 € (1 revenu) ; 54 724 € (2 revenus ou isolé) | DSS 2025/177 | 2026-01-01 | VERIFIE |
| Plafond : 4 enfants, puis sup. | 52 191 / 62 180 ; + 7 456 | DSS 2025/177 | 2026-01-01 | VERIFIE |
| Base du plafond | 24 853 € ; 25 % : 6 213 ; 30 % dès le 3e : 7 456 ; biactivité / isolement : 9 989 | DSS 2025/177 | 2026-01-01 | VERIFIE |
| Plafond majoré : base | 12 429 € ; 3 107 ; 3 729 ; 4 995 | DSS 2025/177 | 2026-01-01 | VERIFIE |
| Plafond majoré : 3 enfants | 22 372 / 27 367 ; 4 enfants 26 101 / 31 096 | DSS, SP | 2026-01-01 | VERIFIE |
| Double revenu | chacun ≥ 6 306 € en 2024 | SP F13214 | 2026 | VERIFIE |

**Formule.** ≥ 3 enfants, tous entre 3 et 21 ans : montant majoré si R ≤ plafond majoré ; plein si R ≤ plafond ; différentiel juste au-dessus (SP, modalité `A_VERIFIER`, CSS R522-2). Non cumulable avec la PAJE de base (OpenFisca, `A_VERIFIER`).

**Champs** : âge des enfants. **Le formulaire n'a que `children` et `childrenFrom14`** : il faut des tranches d'âge (< 3, 3-5, 6-10, 11-14, 15-17, 18-19, 20). **Décision D3.** Base R : revenu net catégoriel N-2, approché comme pour les AF.

**Effet attendu** : résout `KNOWN_GAPS[("coupleSmicInactive3Children", "activityBonus")]`. Dans la prime d'activité, le CF majoré compte pour 41,65 % BMAF (R844-4, II), à intégrer.

**OpenFisca** : `cf`, `cf_montant`.

**Test** (SP) : 3 enfants, 1 revenu, R = 22 000 € : 297,27 € net ; R = 40 000 € : 198,16 €.

**Complexité** : S (M avec différentiel).

### 3.9 Allocation de rentrée scolaire

| Paramètre | Valeur brute | Net CRDS (SP) | Source | Statut |
|---|---|---|---|---|
| 6-10 ans | 89,72 % = 429,01 € | 426,87 € | DSS 2026/46 ; SP F1878 | VERIFIE |
| 11-14 ans | 94,67 % = 452,67 € | 450,41 € | idem | VERIFIE |
| 15-18 ans | 97,95 % = 468,36 € | 466,02 € | idem | VERIFIE |
| Plafond | 22 274 € + 30 % par enfant : 28 956 ; 35 638 ; 42 320 ; 49 002 ; + 6 682 | DSS 2025/177 | | VERIFIE |

**Formule (R543-6-1 via OpenFisca, `A_VERIFIER` sur l'article).** `max(0, Σ taux × BMAF − max(0, R − plafond))`. Versement annuel. Exclue du RSA et de la prime d'activité.

**Champs** : tranches d'âge (D3). Âge au 31/12/2025 pour la rentrée 2026 (SP) ; condition de scolarité supposée.

**OpenFisca** : `ars`, `ars_nette_crds` (annuel, compare en net). **Test** (SP) : 1 enfant de 8 ans, R = 28 000 € : 429,01 € brut, 426,87 € net.

**Complexité** : S.

### 3.10 PAJE, allocation de base

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Taux plein | 41,65 % = 199,15 € (198,16 € net) | DSS 2026/46 ; SP F2552 | 2026-04-01 | VERIFIE |
| Taux partiel | 20,825 % = 99,58 € (99,08 € net) | idem | 2026-04-01 | VERIFIE |
| Plafond taux plein, 1 enfant | 31 066 € / 41 055 € | DSS 2025/177 ; SP | 2026-01-01 | VERIFIE |
| 2 enfants | 37 279 / 47 268 | idem | 2026-01-01 | VERIFIE |
| 3 enfants | 44 735 / 54 724 | idem | 2026-01-01 | VERIFIE |
| Plafond taux partiel, 1 enfant | 37 118 € / 49 054 € | idem | 2026-01-01 | VERIFIE |
| 2 enfants | 44 542 / 56 478 | idem | 2026-01-01 | VERIFIE |
| 3 enfants ; sup. | 53 450 / 65 386 ; + 8 908 | idem | 2026-01-01 | VERIFIE |
| Base taux partiel | 29 694 € ; 7 424 ; 8 908 ; 11 936 | DSS 2025/177 | 2026-01-01 | VERIFIE |

**Formule.** Par foyer (une seule allocation, enfants à naître comptés) : R ≤ plafond plein : 199,15 ; ≤ plafond partiel : 99,58 ; sinon 0. Versée jusqu'au mois précédant les 3 ans. Prime à la naissance : ponctuelle, non modélisée (1 098,57 €, à citer en explication).

**Interaction** : comptée dans RSA et prime d'activité, sauf mois de naissance. Non imposable (CGI 81, 2°).

**Champs** : tranche « moins de 3 ans » (D3). **OpenFisca** : `paje_base`.

**Test** (SP) : couple 1 revenu, 1 enfant, R = 35 000 € : 99,08 € net.

**Complexité** : S.

### 3.11 Bourses sur critères sociaux (2026-2027)

Montants annuels (arrêté du 26 mars 2026 sur les taux, SP F12214, vérif. 10/04/2026, `VERIFIE`), versés en 10 mensualités :

| Échelon | 0 bis | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Montant | 1 454 € | 2 163 € | 3 071 € | 3 828 € | 4 587 € | 5 212 € | 5 506 € | 6 335 € |

Outre-mer : + 300 €.

Plafonds de RBG par points de charge (arrêté du 26 mars 2026, annexe, `VERIFIE¹`, **à relire**) :

| Points | 0 bis | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| 0 | 35 086 | 23 850 | 19 281 | 17 034 | 14 829 | 12 667 | 7 992 | 265 |
| 1 | 38 966 | 26 500 | 21 423 | 18 921 | 16 472 | 14 077 | 8 872 | 530 |
| 2 | 42 877 | 29 150 | 23 564 | 20 818 | 18 126 | 15 476 | 9 773 | 795 |
| 3 | 46 767 | 31 800 | 25 705 | 22 716 | 19 758 | 16 875 | 10 653 | 1 060 |
| 4 | 50 668 | 34 450 | 27 846 | 24 603 | 21 412 | 18 285 | 11 533 | 1 325 |
| 5 | 54 569 | 37 111 | 29 998 | 26 500 | 23 066 | 19 695 | 12 434 | 1 590 |
| 6 | 58 459 | 39 761 | 32 139 | 28 376 | 24 709 | 21 105 | 13 324 | 1 855 |
| 7 | 62 360 | 42 411 | 34 280 | 30 274 | 26 352 | 22 514 | 14 215 | 2 120 |
| 8 | 66 261 | 45 061 | 36 422 | 32 171 | 28 005 | 23 914 | 15 094 | 2 385 |
| 9 | 70 151 | 47 700 | 38 563 | 34 058 | 29 648 | 25 323 | 15 985 | 2 650 |
| 10 | 74 052 | 50 361 | 40 704 | 35 955 | 31 291 | 26 733 | 16 865 | 2 915 |
| 11 | 77 952 | 53 011 | 42 835 | 37 853 | 32 955 | 28 132 | 17 755 | 3 180 |
| 12 | 81 843 | 55 650 | 44 976 | 39 739 | 34 588 | 29 542 | 18 645 | 3 445 |
| 13 | 85 743 | 58 300 | 47 117 | 41 637 | 36 231 | 30 952 | 19 525 | 3 710 |
| 14 | 89 634 | 60 971 | 49 269 | 43 513 | 37 895 | 32 362 | 20 426 | 3 975 |
| 15 | 93 545 | 63 611 | 51 410 | 45 410 | 39 538 | 33 772 | 21 317 | 4 240 |
| 16 | 97 435 | 66 261 | 53 551 | 47 308 | 41 170 | 35 181 | 22 196 | 4 505 |
| 17 | 101 347 | 68 911 | 55 692 | 49 195 | 42 824 | 36 581 | 23 087 | 4 770 |

**Points de charge (circulaire du 13/02/2026, BO n° 9, `VERIFIE`)** : distance 30-249 km : 1 ; 250-3 499 : 2 ; 3 500-12 999 : 3 ; ≥ 13 000 : 4. Autre enfant à charge : 2 ; s'il est étudiant du supérieur : 4. Étudiant en situation de handicap (droits CDAPH) : 4. Aidant de parents handicapés : 4 maximum.

**Formule.** RBG des **parents** N-2 ; échelon = le plus élevé dont le plafond ≥ RBG aux points de charge. Âge : moins de 28 ans à la première demande (non opposable en cas de handicap).

**Obstacle majeur.** La ressource est celle **des parents**, or `CustomHousehold` décrit le foyer de l'étudiant. Un étudiant décohabitant sans parents dans le formulaire n'a pas de RBG. **Champ indispensable** : RBG des parents et distance (ou tranche), ou RBG du foyer si l'étudiant est un enfant à charge. **Décision D2.**

**Interaction** : exclue du RSA et de la prime d'activité. Forfait étudiant APL 6 900 € si boursier.

**Fiscalité** : exonérée (forfait APL « non imposable » selon l'arrêté). CGI 81, 23° ? `A_VERIFIER`.

**OpenFisca** : `bourse_criteres_sociaux`, `bourse_criteres_sociaux_echelon`, `bourse_criteres_sociaux_points_de_charge`.

**Test** (lecture du tableau) : RBG 20 000 €, 2 points : plafond 23 564 ≥ RBG (échelon 2), 20 818 ≥ RBG (échelon 3), 18 126 < RBG : échelon 3, 3 828 €.

**Complexité** : M (table de 144 valeurs, 1 fonction).

### 3.12 Chèque énergie

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Seuil | RFR/UC < 11 000 € (RFR 2024 pour 2026) | Presse Bercy 01/04/2026 | 2026 | VERIFIE |
| UC | 1 ; 0,5 ; 0,3 (pers. suivantes) | SP F33667 | 2025 | VERIFIE |
| 1 UC | 194 / 146 / 98 / 48 € | SP F33667 | 17/10/2025 (vérif.) | A_VERIFIER pour 2026 |
| 1 < UC < 2 | 240 / 176 / 113 / 63 € | idem | | A_VERIFIER pour 2026 |
| 2 UC ou plus | 277 / 202 / 126 / 76 € | idem | | A_VERIFIER pour 2026 |
| Tranches RFR/UC | < 5 700 ; < 6 800 ; < 7 850 ; < 11 000 € | idem | | A_VERIFIER pour 2026 |

**Statut 2026.** La page SP date d'octobre 2025. L'actualité SP A17885 (mise à jour 01/04/2026) et Bercy confirment la fourchette **48 à 277 €** et renvoient à F33667. Barème très probablement inchangé, mais le texte 2026 n'a pas été lu (Code de l'énergie R124-1 à R124-16 ; arrêté 2021 cité par OpenFisca).

**Formule.** `table(catégorieUC, trancheRFRparUC)` ; un chèque par logement ; annuel. La loi de finances 2025, art. 173, a changé le ciblage (rapprochement avec le point de livraison).

**UC** : **attention**, ce n'est pas l'échelle INSEE d'`consumptionUnits()`. Le 2e membre vaut 0,5 et les suivants 0,3, quel que soit l'âge. Il faut une fonction dédiée.

**RFR** : approché par le revenu de l'année simulée (même simplification que `pension.ts`). Pas d'effet sur le RSA. Fiscalité : `A_VERIFIER`.

**OpenFisca** : `cheque_energie`, `cheque_energie_montant`, `cheque_energie_unites_consommation`.

**Test publié (SP F33667)** : couple, 2 enfants, RFR 48 000 €, UC 2,1, 22 857,14 €/UC : **non éligible**.

**Complexité** : S.

### 3.13 Complémentaire santé solidaire

| Paramètre | Sans participation | Avec participation | Source | En vigueur | Statut |
|---|---|---|---|---|---|
| 1 personne | 10 421 €/an (868,44 €/mois) | 14 069 € (1 172,40 €) | SP F10027 ; ameli | 2026-04-01 | VERIFIE |
| 2 personnes | 15 632 € (1 302,66) | 21 103 € (1 758,59) | idem | | VERIFIE |
| 3 personnes | 18 758 € (1 563,19) | 25 324 € (2 110,31) | idem | | VERIFIE |
| 4 personnes | 21 885 € (1 823,73) | 29 544 € (2 462,03) | idem | | VERIFIE |
| Personne en plus | + 4 169 € (347,38) | + 5 628 € (468,96) | idem | | VERIFIE |

Participation par personne, selon l'âge au 1er janvier : ≤ 29 ans 8 € ; 30-49 : 14 € ; 50-59 : 21 € ; 60-69 : 25 € ; ≥ 70 : 30 €/mois (SP F10027). Forfait logement : aide au logement 78,20 / 156,41 / 193,55 € ; propriétaire ou logé gratuit 78,20 / 136,86 / 164,23 €.

**Formule.** `ressources12mois + forfaitLogement` comparé aux plafonds. RSA : droit automatique, gratuite. Cas AAH et ASPA : règles spécifiques (F10027, à détailler, `A_VERIFIER`).

**Modélisation à trancher.** C'est une couverture, pas un versement. **Proposition** : afficher « droit ouvert, sans/avec participation » et le montant de participation, **sans valeur monétaire**, et ne pas l'ajouter aux prestations. Sinon il faudrait une valeur moyenne de la couverture, sans source retenue ici. **Décision D1.** Effet sur le double compte : les soins sont déjà en services en nature (`inKind`).

**OpenFisca** : `css_participation_forfaitaire`, `css_cmu_acs_eligibilite`, `cmu_c`, `css_cmu_base_ressources`.

**Test** : 1 personne, 900 €/mois, locataire sans aide, 40 ans : participation 14 €/mois.

**Complexité** : M (ressources proches du RSA).

---

## 4. Expliquées, non calculées

| Aide | Paramètres retenus pour le texte | Source | Statut |
|---|---|---|---|
| **PCH** | Sans condition de ressources. Prise en charge 100 % si ressources ≤ 31 162,62 €/an, sinon 80 %. Aide humaine : 19,92 €/h ; aidant 4,93 €/h, 7,40 € si arrêt d'activité. | SP F14202 (01/07/2026) | VERIFIE |
| **APA** | GIR 1 à 4 seulement. Plafonds domicile : 2 080,33 / 1 682,30 / 1 215,99 / 811,52 €/mois. | SP F10009 (01/06/2026) | VERIFIE |
| **CMG** | Barème au 01/04/2026. Structure : maximum 825,16 à 997,11 € (moins de 3 ans) selon mode. Emploi direct : réforme du 01/09/2025, barème par éléments, plafond horaire assistante maternelle 8,09 €. Prise en charge 50 % des cotisations dans la limite de 524 € et 263 €/mois. | DSS 2026/46 | VERIFIE |

**À noter** : F345 affiche 992,12 €, l'instruction DSS 997,11 € (brut). La différence (0,5 %) est la CRDS. Exclues du RSA et de la prime d'activité. OpenFisca : `paje_cmg`, `apa_domicile`, `pch` (« inutilisée pour l'instant » dans le code).

---

## 5. Nouveaux statuts

### 5.1 Agent public

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Retenue pension (État, CNRACL) | 11,10 % de traitement indiciaire + NBI | SP F468 ; CNRACL | 2026 | VERIFIE |
| RAFP salarié | 5 % | SP F468, F12387 | 2026 | VERIFIE |
| Assiette RAFP | IR + SFT + primes + avantages en nature, dans la limite de 20 % du traitement indiciaire brut | SP F468 | 2026 | VERIFIE |
| CSG | 9,2 % dont 6,8 % déductible, sur 98,25 % de toute la rémunération | SP F468 ; Urssaf | 2026 | VERIFIE |
| CRDS | 0,5 %, même assiette | idem | 2026 | VERIFIE |
| Plafond de l'assiette 98,25 % | 192 240 €/an ; au-delà 100 % | Urssaf secteur public | 2026 | VERIFIE |
| Employeur État, pension | 82,28 % | Décret 2025-1341 | 2026-01-01 | VERIFIE¹ (militaires : sources contradictoires, A_VERIFIER) |
| Employeur CNRACL | 37,65 % (40,65 en 2027 ; 43,65 en 2028) | CNRACL ; décret 2025-86 | 2026-01-01 | VERIFIE |
| RAFP employeur | 5 % | rafp.fr | 2026 | VERIFIE (extrait) |
| Maladie employeur | 9,70 % (État) ; 9,88 % (CNRACL) | Urssaf secteur public | 2026 | VERIFIE (page Urssaf datée de 2026 pour le plafond) |
| AF / CSA | 5,25 % / 0,30 % | idem | 2026 | VERIFIE |
| Fnal | 0,10 % (< 50) sous plafond ; 0,50 % (≥ 50) | idem | 2026 | VERIFIE |
| Formation FPT | 1,00 % | idem | 2026 | VERIFIE |
| AT (collectivités, hôpitaux) | taux affichés, à ventiler | idem | 2026 | A_VERIFIER |
| Indemnité de résidence | 3 / 1 / 0 % du traitement selon la zone | fonction-publique.gouv.fr ; SP F32511 (extraits) | — | A_VERIFIER |

**Part des primes (DGAFP, Rapport annuel, édition 2026, données 2024, fonctionnaires, y compris IR et SFT, en % du salaire brut)** :

| Champ | Part |
|---|---|
| Ensemble FP | **25,4 %** (878 € sur 3 460 €) |
| FPE | 26,4 % |
| FPT | 25,0 % |
| FPH | 23,6 % |
| Enseignants | 19,6 % |
| Autres catégorie A FPE | 33,9 % |
| FPT catégorie A | 29,5 % |
| FPH catégorie A | 25,3 % |
| Catégorie B ensemble | 29,5 % (FPE 36,1 %) |

`VERIFIE` sur le texte du PDF. Attention : ces parts incluent IR et SFT. La ligne « hors IR et SFT » existe (figure 10) mais ses chiffres sont illisibles à l'extraction, `A_VERIFIER`. **L'édition 2025 (24,6 % sur 2023) est dépassée.**

**Proposition (décision D8).** Champ facultatif « part des primes » prérempli par versant, avec le taux de l'ensemble à 25,4 % en `HYPOTHESE` et une variante par versant. Saisie : net mensuel, comme les autres statuts, plus versant (État / territoriale / hospitalière).

**Formule.** Soit `B` le brut total, `p` la part de primes, `T = B(1−p)`, `P = B·p`.
```
pension = 11,10 % × T
rafp    = 5 %   × min(P, 20 % × T)
csg/crds sur 98,25 % × B (plafond 192 240 €), réutilise csgBase()
net = B − pension − rafp − CSG − CRDS
inversion par invertIncreasing (comme grossForNet)
```
**Point d'attention (P ≥ 20 % T dès p ≥ 16,7 %)** : à 25,4 % de primes, le plafond RAFP mord toujours. Le plafond compte davantage que `p` : c'est un argument pour une hypothèse simple. Exemple SP F12387 : traitement 28 000 €, primes 7 200 €, cotisation sur 5 600 €.

**Contractuels** : régime général + Ircantec (taux Urssaf sur la page, non relevés). **Proposition** : traiter en « salarié ». `HYPOTHESE`. Les cotisations patronales de 82,28 % sont en partie un financement d'équilibre : leur imputation à l'agent via `incidence` doit être discutée. **Décision D9.**

**Prime d'activité** : un fonctionnaire y a droit (SP F2882). **RGDU** : ne s'applique pas. `salaryContributions` n'est pas réutilisable, il faut `publicAgentContributions()`.

**OpenFisca** : `pension_salarie`, `pension_employeur`, `rafp_salarie`, `rafp_employeur`, `traitement_indiciaire_brut`, `primes_fonction_publique`, `indemnite_residence`, `categorie_salarie = public_titulaire_*`. Couverture à vérifier pour le taux 82,28 % (fichier `cotsoc` non contrôlé).

**Test publié** : RAFP F12387 (ci-dessus) : 5 % × 5 600 € = 280 €.

**Complexité** : M.

### 5.2 Agriculteur (chef d'exploitation, MSA)

Barème MSA 2026 (PDF), SMIC au 01/01/2026 : 12,02 €.

| Cotisation | Taux | Assiette | Statut |
|---|---|---|---|
| Assiette | revenu brut − 26 %, abattement entre 1,76 % et 130 % du PASS | MSA réforme, revenus 2025 | VERIFIE |
| AMEXA | **même barème que `healthScale`** : 0 ; 1,5 ; 4 ; 6,5 ; 7,7 ; 8,5 % aux points 20, 40, 60, 110, 200, 300 % PASS ; 6,5 % au-delà | MSA | VERIFIE |
| Invalidité | 1,1 %, minimum 11,5 % PASS | MSA | VERIFIE (plafond éventuel A_VERIFIER) |
| IJ AMEXA | 250 € forfaitaires | MSA | VERIFIE |
| Retraite de base plafonnée | 17,15 % (principal), 14,15 % (secondaire), minimum 600 SMIC, plafond PASS | MSA | VERIFIE |
| Retraite déplafonnée | 0,72 %, minimum 600 SMIC | MSA | VERIFIE |
| RCO | 4 %, minimum 1 820 SMIC (21 876 €) | MSA | VERIFIE |
| RCO complémentaire | progressive : 0-1 % à 40 % PASS ; 1,3 % à 60 % ; 1,8 % à 100 % ; 3 % à 200 % ; 3 % au-delà | MSA | VERIFIE |
| PFA | 0 sous 110 % PASS ; progressive à 3,10 % à 140 % PASS | MSA | VERIFIE |
| ATEXA | forfait de 515,55 à 560,38 € selon le risque | MSA | VERIFIE |
| VIVEA | 0,61 %, entre 0,17 % et 0,89 % du PASS | MSA | VERIFIE |
| CSG / CRDS | 9,2 % (2,4 % non déductible) / 0,5 % | MSA | VERIFIE |

**Comparaison avec `selfEmployed.ts`.** Même assiette et mêmes fonctions de calcul (`interpolatedRate`, abattement). Différences : retraite de base (17,15 + 0,72 au lieu de 17,87 + 0,72), retraite complémentaire (RCO au lieu de 8,1 / 9,1 %), invalidité (1,1 % au lieu de 1,3 %), forfaits ATEXA, IJ et VIVEA. **Proposition** : paramétrer `selfEmployedContributions` par un régime plutôt que dupliquer.

**Simplifications** : assiette annuelle (option), le droit commun étant triennal ; chef à titre exclusif ; pas de déduction de rente du sol ; ATEXA catégorie moyenne ou C ; pas d'exonération jeune agriculteur ; `HYPOTHESE`.

**OpenFisca** : **ne couvre pas les cotisations MSA** (`categorie_non_salarie` : artisan, commerçant, libéral ; `rpns_benefice_exploitant_agricole` n'est qu'un revenu). Pas de recoupement possible : tests à la main à partir du barème.

**Test.** Revenu brut 40 000 € : abattement 10 400 €, assiette 29 600 €. Taux AMEXA dans la tranche 60-110 % = 4 % + 2,5 % × (29 600 − 28 836) / 24 030 = 4,08 %. Aucun exemple officiel chiffré trouvé. **L'acceptation §13.9 (« un cas sourcé ± 1 % ») n'est donc pas atteignable sur un exemple publié** : à faire valider. **Décision D10.**

**Complexité** : M.

### 5.3 Profession libérale

**Trois cas (SP F31233, Urssaf)** :
- **PLNR (SSI)** : mêmes cotisations que l'artisan, page Urssaf AC-PLNR. Seule la CFP diffère : 0,25 % du PASS (0,34 % avec conjoint collaborateur). **Déjà couvert par `selfEmployed.ts` avec la CFP changée.**
- **Cipav** : architectes, psychologues, ostéopathes, psychomotriciens, diététiciens, etc.
- **CNAVPL hors Cipav** : CARMF, CARCDSF, CAVP, CARPIMKO, CARPV, CAVOM, CAVAMAC, CAVEC, chacune avec ses retraites complémentaires et invalidité. Plus **CNBF** pour les avocats, hors CNAVPL.

| Cotisation Cipav 2026 | Taux | Base | Statut |
|---|---|---|---|
| Maladie | même barème | | VERIFIE |
| IJ (maladie 2) | 0,30 % | jusqu'à 3 PASS, min. 40 % PASS (58 €) | VERIFIE |
| Retraite de base | 8,73 % jusqu'à 1 PASS + 1,87 % jusqu'à 5 PASS | min. 450 SMIC (573 €) | VERIFIE |
| Complémentaire | 11 % jusqu'à 1 PASS ; 21 % de 1 à 4 PASS | | VERIFIE |
| Invalidité-décès | 0,50 % jusqu'à 1,85 PASS | min. 37 % PASS | VERIFIE |
| AF | même barème | | VERIFIE |
| CSG-CRDS | 9,7 % | | VERIFIE |
| CFP | 0,25 % du PASS | | VERIFIE |

**Périmètre proposé (décision D11).** Un champ « régime » avec deux valeurs : **SSI** et **Cipav**. Les autres libéraux réglementés : base CNAVPL (mêmes 8,73 + 1,87 %) et complémentaire approchée par la Cipav, `HYPOTHESE`, signalée dans le formulaire. **Médecins conventionnés (PAMC, participation de la CPAM) et avocats (CNBF) : plus tard**, avec le même traitement approché et un avertissement. Les 8 sections ont chacune un barème : le coût de collecte ne se justifie pas à ce stade.

**OpenFisca** : `vieillesse_profession_liberale`, `retraite_complementaire_profession_liberale`, `maladie_maternite_profession_liberale`, `formation_profession_liberale` : recoupement possible (taux 2026 à contrôler).

**Test** : cas `mon-entreprise` (API Urssaf), déjà la méthode pour l'artisan.

**Complexité** : S (SSI), M (Cipav).

### 5.4 Micro-entrepreneur

| Activité | Cotisations 2026 | Avec versement libératoire | Abattement fiscal | VFL IR | Statut |
|---|---|---|---|---|---|
| Vente, hébergement (BIC) | 12,3 % | 13,3 % | 71 % | 1 % | VERIFIE |
| Services (BIC) | 21,2 % | 22,9 % | 50 % | 1,7 % | VERIFIE |
| Libéral SSI (BNC) | **25,6 %** | 27,8 % | 34 % | 2,2 % | VERIFIE |
| Libéral Cipav (BNC) | 23,2 % | 25,4 % | 34 % | 2,2 % | VERIFIE |

Sources : SP F36232 (vérif. 01/01/2026), SP F23267 (13/05/2026), Urssaf.

**Piège.** Une page Urssaf ancienne donne **26,1 %** pour 2026 (calendrier initial) : remplacé par 25,6 %. Plusieurs sources récentes concordent.

**VFL** : RFR N-2 < 29 579 € (1 part), 59 158 € (couple), 73 947,50 € (couple 1 enfant), 88 737 € (2 enfants) (SP F23267). **Acre** : taux minoré passé de 50 % à 75 % des taux au 01/07/2026 (19,2 % en BNC). `A_VERIFIER` sur le texte. **CFP micro** : SP liste la formation dans le champ couvert, Urssaf la présente à part : `A_VERIFIER`.

**Formule.**
```
cotisations = taux × CA          (CSG-CRDS incluses, ventilation non publiée ici)
sans VFL : revenu imposable = CA × (1 − abattement), au barème
avec VFL : impôt = tauxVFL × CA, CA exclu du barème (mais compté au RFR)
```

**Comparaison avec `selfEmployed.ts`** : aucune réutilisation possible (assiette = CA, pas de minimum, forfait global).

**Ventilation.** `borneLevies` sépare cotisations et CSG. **Proposition** : ligne globale « cotisations micro ». **Décision D12.**

**Ressources des aides** : CA − abattement fiscal pour APL, RSA et prime d'activité (règle OpenFisca `rpns_auto_entrepreneur_benefice`, brochure APL pour le principe) ; `A_VERIFIER` pour RSA et PPA.

**Champs** : CA annuel (pas le net), catégorie d'activité, option VFL.

**OpenFisca** : `rpns_auto_entrepreneur_chiffre_affaires`, `rpns_auto_entrepreneur_benefice`, `cotisations_non_salarie_micro_social`, `microsocial`.

**Test publié** : abattements SP F23267 : CA 65 000 € BNC : 42 900 € imposables ; CA 65 000 € BIC services : 32 500 € ; CA 175 000 € vente : 50 750 €. Cotisations : 65 000 × 25,6 % = 16 640 € (dérivé).

**Complexité** : M.

### 5.5 Étudiant, alternant, chômage, sans activité

- **Étudiant** : pas de cotisation spécifique ; petit job = salarié. Prime d'activité si revenus > seuil de L512-3 (CSS L842-2, 3°, même seuil `apprenticeThreshold`, à confirmer pour l'étudiant, `A_VERIFIER`). RSA exclu sauf parent isolé. APL : forfait de ressources 8 600 / 6 900 €. Bourse (§3.11).
- **Alternant** : déjà géré (`salaryContributions(..., apprentice)`, `apprentice` à exposer). Le contrat de professionnalisation n'a pas les mêmes exonérations : proposer « apprenti » seulement, `HYPOTHESE`.
- **Au chômage indemnisé** : ARE saisie (§3.5). **Non indemnisé** : ressources nulles, ASS si case (§3.4), RSA.
- **Sans activité** : existe.

**Complexité** : S.

### 5.6 Pension d'invalidité

| Paramètre | Valeur | Source | En vigueur | Statut |
|---|---|---|---|---|
| Catégorie 1 | 30 % du salaire moyen (10 meilleures années) ; min. 338,31 € ; max. 1 201,50 € | SP F672 | 2026-04-01 | VERIFIE |
| Catégorie 2 | 50 % ; min. 338,31 € ; max. 2 002,50 € | SP F672 | 2026-04-01 | VERIFIE |
| Catégorie 3 | 50 % + MTP (40 %) ; min. 1 636,76 € ; max. 3 300,95 € | SP F672 | 2026-04-01 | VERIFIE |
| MTP | 1 298,44 €/mois, sans prélèvement | DSS 2026/46 ; SP F672 | 2026-04-01 | VERIFIE |
| Réduction de capacité | ≥ 2/3 | SP F672 | — | VERIFIE |
| Prélèvements | IR, CSG, CRDS, Casa ; 4 taux de CSG (0 ; 3,8 ; 6,6 ; 8,3 %) | SP F672, F2971 | 2026 | VERIFIE |

**Formule.** Montant saisi, pas calculé. Prélèvements : **`pensionLevies()` réutilisable** (mêmes taux), sans la cotisation de 1 % sur complémentaire (`complementaryHealth` à 0 pour l'invalidité, `A_VERIFIER`). Imposable (abattement de 10 % des pensions supposé, `A_VERIFIER`).

**Interaction.** RSA : comptée. ASPA : comptée. AAH : différentielle. Prime d'activité : revenu de remplacement selon R844-2, 1° ; or OpenFisca l'insère dans ses ressources et une réponse ministérielle de 2019 évoque un seuil similaire à celui de l'AAH : **`A_VERIFIER`**, à trancher en lisant D843-4 et L842-8.

**OpenFisca** : `pensions_invalidite`.

**Complexité** : S.

### 5.7 Handicap (case + taux)

| Effet | Règle | Source | Statut |
|---|---|---|---|
| Demi-part IR | Carte d'invalidité ≥ 80 % ou CMI invalidité (pension militaire ou rente AT ≥ 40 %). 1/2 part par conjoint handicapé, chacun. Une seule fois. | impots.gouv dépliant « Personnes en situation de handicap » | VERIFIE |
| Plafond de l'avantage | Demi-part invalidité : plafond spécifique **1 801 €** ; plafond général 1 807 € | BOFiP BOI-IR-LIQ-20-20-20-20260407 ; dépliant | VERIFIE (revenus 2025) |
| Abattement | Invalide quel que soit l'âge : 2 822 € si RNG ≤ 17 670 € ; 1 411 € jusqu'au seuil moyen | Dépliant ; déjà `pension.elderlyAllowance` | VERIFIE |
| AAH | 80 % ou 50-79 % + RSDAE | §3.2 | VERIFIE |
| Enfant handicapé à charge | 1 part (hors champ v1.1), abattement 6 855 € | impots.gouv | A_VERIFIER |

**Effets.** `taxParts` : + 0,5 si la case « carte ≥ 80 % » est cochée ; **le taux saisi ne suffit pas toujours**, car la carte résulte d'une décision. `HYPOTHESE` : taux ≥ 80 % vaut carte. `elderlyAllowance` : à ouvrir aux invalides. Bourses : 4 points. PAJE/CMG : majoration non modélisée. APL : pas de dégressivité si AAH.

**Complexité** : S.

---

## 6. Champs à ajouter au formulaire

| Champ | Portée | Utilisé par |
|---|---|---|
| `status` étendu | adulte | tout |
| `publicSector` (État, territoriale, hospitalière) + `bonusShare?` | adulte | agent public |
| `liberalRegime` (SSI, Cipav) | adulte | libéral |
| `microActivity`, `microTurnover`, `microLiberatoire` | adulte | micro |
| `areMonthly` (brut) | adulte | chômage |
| `assEligible` | adulte | ASS |
| `disabilityRate`, `rsdae` | adulte | AAH, IR |
| `invalidityPension`, `invalidityCategory?` | adulte | invalidité |
| `tenure` ajoute `free` ; `rent`, `zone` | foyer | APL, RSA, PPA |
| `childrenAges` (tranches) | foyer | CF, ARS, PAJE, AF |
| `alimonyReceived`, `otherParentAbsent` | foyer | ASF |
| `parentsRbg`, `distanceBand` | étudiant | bourses |

**Formulaire chargé** : proposer le dépliage conditionnel, et garder le stockage en localStorage (migration : valeurs par défaut pour les anciennes clés).

---

## 7. Sources à ajouter à `sources.json`

Déjà présentes (à mettre à jour, `accessed` = 2026-11-07) : `sp-f19778-rsa`, `sp-f12242-aah`, `sp-f16871-aspa`, `sp-f14860-are`, `sp-f12006-apl`, `sp-f2971-csg-crds-remplacement`, `sp-f2882-prime-activite`, `sp-f10009-apa`, `sp-f12214-bourse-criteres-sociaux`, `dss-2026-46-bmaf`, `dss-2025-177-plafonds`, `legifrance-css-r844`, `urssaf-taux-ac-plnr-2026`, `sp-cfp-entrepreneurs-individuels`.

| Identifiant proposé | Titre | URL |
|---|---|---|
| `legifrance-decret-2026-220-rsa` | Décret 2026-220, RSA | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053733826 |
| `legifrance-decret-2026-229-aah` | Décret 2026-229, AAH | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053734356 |
| `legifrance-decret-2026-219-ass` | Décret 2026-219, ASS | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053733811 |
| `legifrance-casf-r262` | CASF R262-1 à R262-121 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074069/LEGISCTA000006160902/ |
| `legifrance-casf-r262-11` | CASF R262-11 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043281883 |
| `legifrance-css-d821-9` | CSS D821-9 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023097737 |
| `legifrance-css-l842` | CSS L842-1 à L842-8 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006073189/LEGISCTA000006156393/ |
| `legifrance-arrete-apl-2019` | Arrêté du 27/09/2019 consolidé | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000039160329/2026-10-20 |
| `legifrance-arrete-apl-20260928` | Arrêté du 28/09/2026 | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054913928 |
| `legifrance-decret-2025-1401-apl` | Décret 2025-1401 | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053202812 |
| `dgaln-brochure-apl-2024` | Éléments de calcul, avril 2024 | https://www.ecologie.gouv.fr/sites/default/files/documents/Brochure-bareme-2024-APL.pdf |
| `sp-f12484-ass` | ASS | https://www.service-public.gouv.fr/particuliers/vosdroits/F12484 |
| `sp-f815-asf` | ASF | https://www.service-public.gouv.fr/particuliers/vosdroits/F815 |
| `sp-f13214-cf` | Complément familial | https://www.service-public.gouv.fr/particuliers/vosdroits/F13214 |
| `sp-f1878-ars` | ARS | https://www.service-public.gouv.fr/particuliers/vosdroits/F1878 |
| `sp-f2552-paje-base` | PAJE base | https://www.service-public.gouv.fr/particuliers/vosdroits/F2552 |
| `sp-f10027-c2s` | C2S | https://www.service-public.gouv.fr/particuliers/vosdroits/F10027 |
| `ameli-c2s` | C2S, ameli | https://www.ameli.fr/assure/droits-demarches/difficultes-acces-droits-soins/complementaire-sante/complementaire-sante-solidaire |
| `sp-f33667-cheque-energie` | Chèque énergie | https://www.service-public.gouv.fr/particuliers/vosdroits/F33667 |
| `sp-a17885-cheque-energie-2026` | Actualité 2026 | https://www.service-public.gouv.fr/particuliers/actualites/A17885 |
| `bercy-cheque-energie-2026` | Communiqué 01/04/2026 | https://presse.economie.gouv.fr/le-guichet-de-demande-du-cheque-energie-ouvre-le-1er-avril-2026/ |
| `legifrance-arrete-bourses-plafonds-2026` | Arrêté du 26/03/2026 | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053788150 |
| `bo-esr-9-2026-bourses` | Circulaire 2026-2027, BO n° 9 | https://www.enseignementsup-recherche.gouv.fr/sites/default/files/bulletin-officiel-n-9-du-26-f-vrier-2026-39525.pdf |
| `sp-f14202-pch` | PCH | https://www.service-public.gouv.fr/particuliers/vosdroits/F14202 |
| `sp-f345-cmg` | CMG | https://www.service-public.gouv.fr/particuliers/vosdroits/F345 |
| `sp-f672-invalidite` | Pension d'invalidité | https://www.service-public.gouv.fr/particuliers/vosdroits/F672 |
| `sp-f468-cotisations-fonctionnaire` | Cotisations du fonctionnaire | https://www.service-public.gouv.fr/particuliers/vosdroits/F468 |
| `sp-f12387-rafp` | RAFP | https://www.service-public.gouv.fr/particuliers/vosdroits/F12387 |
| `rafp-calcul-cotisations` | RAFP, employeurs | https://www.rafp.fr/employeur/calcul-et-versement-des-cotisations |
| `cnracl-taux-cotisation` | Taux CNRACL | https://www.cnracl.retraites.fr/actif/ma-carriere-mes-droits/la-cotisation-cnracl-obligatoire/les-taux-de-cotisation |
| `legifrance-decret-2025-1341` | Contribution employeur État | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053175170 |
| `urssaf-taux-secteur-public` | Taux secteur public | https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-public.html |
| `dgafp-ra-2026-remunerations` | Rapport annuel 2026, rémunérations | https://www.fonction-publique.gouv.fr/files/files/publications/vue-rapport-annuel/2026/ra_2026_remu_niveaux.pdf |
| `msa-bareme-2026` | Barème non-salariés agricoles 2026 | https://www.msa.fr/lfp/documents/11566/41428048/Bar%C3%A8me+des+cotisations+et+contributions+sociales+des+non+salari%C3%A9s+agricoles+2026 |
| `msa-cotisations-exploitant` | Cotisations du chef d'exploitation | https://www.msa.fr/lfp/exploitant/cotisations-et-contributions |
| `msa-reforme-assiette` | Réforme de l'assiette | https://www.msa.fr/lfp/exploitant/reforme-assiette-sociale |
| `urssaf-taux-plr-cipav` | Taux Cipav | https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-plr-cipav.html |
| `urssaf-taux-plr-hors-cipav` | Taux hors Cipav | https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-plr-hors-cipav.html |
| `sp-f31233-liberal` | Protection sociale du libéral | https://entreprendre.service-public.gouv.fr/vosdroits/F31233 |
| `sp-f36232-micro-cotisations` | Cotisations micro | https://entreprendre.service-public.gouv.fr/vosdroits/F36232 |
| `sp-f23267-micro-fiscal` | Régime micro-fiscal | https://entreprendre.service-public.gouv.fr/vosdroits/F23267 |
| `impots-depliant-handicap` | Dépliant handicap | https://www.impots.gouv.fr/sites/default/files/media/3_Documentation/depliants/nid_4004_gp_125.pdf |
| `bofip-boi-ir-liq-20-20-20` | Plafonnement du quotient familial | https://bofip.impots.gouv.fr/bofip/2494-PGP.html/identifiant=BOI-IR-LIQ-20-20-20-20260407 |

---

## 8. Liste A_VERIFIER

1. **Bourses** : table de 144 plafonds à relire sur l'annexe Légifrance (lecture par modèle, non recoupée).
2. **Chèque énergie** : barème et tranches pour 2026 (page SP datée d'octobre 2025).
3. **APL** : art. 3 et 4 (95 €, 2 589 €) ; montants RLS 2026 ; libellé « zone 1 bis » ; barème CAF non lu.
4. **RSA** : seuil de 6 € (article actuel) ; R262-10-1 (forfait ASF) ; biens non productifs de revenus.
5. **ASPA** : décret de revalorisation ; fiscalité.
6. **ASS** : articles du code du travail ; CSG, IR.
7. **RSA, ASPA, ASS, bourses, chèque énergie** : base de non-imposition exacte (CGI 81).
8. **ASF** : portée du taux plein (orphelin).
9. **CF** : modalités du différentiel (R522-2) et non-cumul avec la PAJE.
10. **ARS** : article du différentiel (R543-6-1 cité par OpenFisca).
11. **Pension d'invalidité** : traitement exact dans la prime d'activité ; `complementaryHealth`.
12. **AAH** : modalités de l'évaluation trimestrielle.
13. **Agent public** : militaires 82,28 ou 126,07 % ; parts de primes hors IR et SFT ; AT ; indemnité de résidence.
14. **MSA** : plafond de la cotisation invalidité.
15. **Micro** : CFP ; Acre au 01/07/2026 ; ressources RSA et PPA ; ventilation.
16. **Étudiant** : seuil exact de L842-2, 3°.
17. **`selfEmployed.baseAllowanceMin/MaxPassMultiple`** : décret 2024-688.
18. **C2S** : règles propres aux bénéficiaires AAH et ASPA.
19. **Handicap** : abattement 6 855 € (enfant).

---

## 9. Décisions pour le mainteneur

| # | Sujet | Recommandation |
|---|---|---|
| D1 | C2S : valeur monétaire ? | Non. Afficher le droit et la participation, sans l'ajouter aux prestations. |
| D2 | Bourses : ressources des parents | Champ « revenu brut global des parents » et distance, facultatifs ; sans saisie, pas de bourse calculée. |
| D3 | Âges des enfants | Remplacer `childrenFrom14` par des tranches d'âge. Nécessaire à CF, ARS, PAJE. Migration du localStorage. |
| D4 | ASF | Case explicite « l'autre parent ne verse pas de pension ». Pas de versement par défaut. |
| D5 | ARE et ASS | ARE brute saisie, retenue SJR ignorée (`HYPOTHESE`, faible) ; case ASS « fin de droits ». |
| D6 | Patrimoine | Non saisi : ASPA et APL sans patrimoine, RSA sans biens dormants. Signalé en Méthodologie. |
| D7 | Interactions et curseurs | Garder le §13.3 (pas de recalcul croisé). Le dire dans Bilan et Méthodologie. |
| D8 | Primes agents publics | Champ facultatif prérempli (25,4 %, ou versant). Hypothèse sinon. |
| D9 | Incidence patronale des agents publics | Les 82,28 % financent aussi un équilibre de régime. Ne pas les imputer à l'agent sans arbitrage. Deux options : même règle d'incidence avec une note, ou imputation limitée au taux du privé (`HYPOTHESE`). Le choix change le total des prélèvements affiché : à trancher par le mainteneur, et à expliquer en Méthodologie. |
| D10 | Acceptation ±1 % sans cas publié | Accepter pour MSA, Cipav et agent public un cas « barème officiel + calcul manuel » ou mon-entreprise. |
| D11 | Périmètre libéraux | SSI et Cipav ; autres par approximation signalée ; PAMC et CNBF plus tard. |
| D12 | Micro : ventilation | Une ligne globale, pas de répartition inventée. |
| D13 | Date de référence des aides | APL au 1/10/2026, le reste au 1/4/2026, dans `asOf`. Une note : avril 2027 appellera une mise à jour. |
| D14 | Hors métropole | Métropole seule, comme la v1. Indiquer l'écart DOM (C2S, APL, ARS, CF). |
| D15 | Existant E1, E2 | Corriger à l'Étape 16 ; recalculer `docs/reference-profiles.md`. |

---

## 10. Complexité (ordre proposé)

| Lot | Éléments | Complexité | OpenFisca |
|---|---|---|---|
| 1 | ASPA, ASS, ASF, ARS, PAJE, CF | S chacun | oui |
| 2 | Pension d'invalidité, ARE (prélèvements), handicap | S | oui |
| 3 | RSA, AAH | M | oui |
| 4 | APL | **L** | oui, au 2026-10-01 |
| 5 | Bourses, chèque énergie, C2S | M, S, M | oui |
| 6 | Agent public, micro, libéral | M, M, S-M | partiel |
| 7 | Agriculteur | M | **non** |
| Transverse | Tranches d'âge (D3), formulaire conditionnel, nouveau `CustomHousehold`, `compare.py` | M-L | — |

**Risques principaux.**
1. Le formulaire devient long : le dépliage conditionnel est indispensable.
2. L'étape 16 touche les profils de référence si E1 et E2 sont corrigés.
3. La non-prise en compte du patrimoine et de l'historique peut surestimer l'ASS, l'ASPA et le RSA pour certains foyers : à signaler.
