# Audit v1.2 – Dépenses pré-engagées et « reste à vivre » (revenu arbitrable)

Recherche du 16/11/2026. Seules les pages et fichiers effectivement ouverts sont cités. Chaque chiffre renvoie à un tableau, une figure ou une page. Les calculs sont reproductibles avec les scripts du dossier de travail (`pre.py` à `pre5.py`, sur les CSV INSEE téléchargés).

Statuts utilisés (convention du projet) : **VERIFIE** (lu dans la source), **A_VERIFIER** (source identifiée mais pas lue en version en vigueur, ou lecture incertaine), **HYPOTHESE** (choix de modélisation ou calcul du projet).

---

## 1. Définitions officielles INSEE

### 1.1 Dépenses pré-engagées : page de définition

- URL : https://www.insee.fr/fr/metadonnees/definition/c1358. Page « Dépenses pré-engagées », dernière mise à jour 07/08/2026, lue le 16/11/2026. **VERIFIE**
- Texte (verbatim) :
  > Ensemble des dépenses des ménages réalisées dans le cadre d'un contrat difficilement renégociable à court terme. Elles sont définies comme suit :
  > - dépenses liées au logement (y compris, dans le cas de la comptabilité nationale, les loyers imputés), ainsi que celles relatives à l'eau, au gaz, à l'électricité et aux autres combustibles utilisés dans les habitations ;
  > - services de télécommunications ;
  > - frais de cantine ;
  > - services de télévision (redevance télévisuelle, abonnements à des chaînes payantes) ;
  > - assurances (hors assurance-vie) ;
  > - services financiers (y compris, dans le cas de la comptabilité nationale, les services d'intermédiation financière indirectement mesurés).
- **Loyers imputés** : inclus **uniquement en comptabilité nationale**. Ils figurent alors des deux côtés : dans le RDB, via l'excédent brut d'exploitation des ménages propriétaires, et dans la dépense pré-engagée. **Les SIFIM** (services d'intermédiation financière indirectement mesurés) sont aussi propres à la comptabilité nationale.
- Les **remboursements d'emprunts immobiliers** ne font **pas** partie de la définition INSEE. En comptabilité nationale, l'achat de logement est un investissement.

### 1.2 Revenu arbitrable

- Il n'existe **pas de page de glossaire INSEE dédiée** : la recherche sur insee.fr/metadonnees n'a rien donné.
- La définition officielle figure dans la publication des comptes nationaux annuels « Revenu et pouvoir d'achat des ménages en 2025 » (Insee Résultats, 29/05/2026) : https://www.insee.fr/fr/statistiques/8988851. **VERIFIE** (lecture de la page). Le revenu arbitrable y est défini comme le RDB diminué des dépenses pré-engagées. Il approche la marge de manœuvre que les ménages ressentent pour choisir librement leur consommation et leur épargne. Le pouvoir d'achat arbitrable rapporte l'évolution du revenu arbitrable à celle du prix des dépenses **non** pré-engagées.
- Formulation équivalente dans *France, portrait social* 2018, fiche 1.2, p. 142 : « Revenu « arbitrable » des ménages : différence entre leur revenu disponible brut et les dépenses de consommation « pré-engagées ». » Fichier : https://www.insee.fr/fr/statistiques/fichier/3646120/FPORSOC18i2_F1.2.pdf. **VERIFIE**

### 1.3 Comptabilité nationale et enquêtes ménages : les différences

| Point | Comptabilité nationale (INSEE, tableaux 2.102/2.103) | Enquêtes Budget de famille (INSEE, DREES 2018, France Stratégie 2021) |
|---|---|---|
| Revenu de référence | RDB (B6G) du secteur S14, y compris loyers imputés (via l'EBE) et entrepreneurs individuels | Revenu disponible du ménage (fiscal et social), sans loyer imputé |
| Loyers imputés | Inclus (226,8 Md€ en 2025, voir §4) | Exclus des deux côtés |
| Logement | Toute la fonction COICOP 04, y compris l'entretien courant (CP043) | Loyers + charges + eau + énergie (+ entretien selon la variante) |
| Loyers et aides au logement | Loyers bruts ; les aides sont des prestations dans le RDB | Le tableau INSEE TF106/TF107 publie des loyers **nets des aides**. DREES et France Stratégie prennent des **loyers bruts** et laissent les aides dans le revenu, pour éviter un double compte |
| Assurances | Service d'assurance (primes − indemnités) | Primes payées (montants bruts) |
| Services financiers | Y compris SIFIM | Frais bancaires facturés |
| Remboursements d'emprunt immobilier | Exclus | Exclus pour l'INSEE. **Inclus** par DREES 2018 et France Stratégie 2021, à la suite du rapport Quinet |
| Taxe foncière | Hors champ, c'est un impôt | Hors champ (DREES 2018, p. 12-13 : l'inclure créerait une asymétrie entre locataires et propriétaires) |

Sources de la colonne de droite :
- DREES, *Les Dossiers de la DREES* n° 25, mars 2018 (M. Lelièvre, N. Rémila), p. 12-13 : https://drees.solidarites-sante.gouv.fr/sites/default/files/2020-08/dd25_depenses_pre-engagees_quel_poids_dans_le_budget_des_menages.pdf. **VERIFIE**
- France Stratégie, *La Note d'analyse* n° 102, août 2021 (P.-Y. Cusset, A. G. Prada-Aranguren, A. Trannoy), p. 3-4 : https://www.strategie-plan.gouv.fr/files/files/Publications/2021/0831%20d%C3%A9penses%20pr%C3%A9engag%C3%A9es/fs-2021-na_102-depenses_pre-engagees.pdf. **VERIFIE**

---

## 2. Publications par niveau de vie, statut d'occupation, type de ménage et âge

### 2.1 Résultat de la recherche : aucune publication INSEE récente par décile

- **Comptes nationaux distribués** :
  - Insee Focus n° 338 « Consommation et épargne par catégories de ménages en 2022 » : https://www.insee.fr/fr/statistiques/8272803?sommaire=8071406, données https://www.insee.fr/fr/statistiques/fichier/8272803/if338.xlsx. Il ne publie **ni dépenses pré-engagées ni revenu arbitrable**. Il donne seulement les fonctions COICOP par **cinquième** (voir §2.4).
  - Insee Première n° 2022 (https://www.insee.fr/fr/statistiques/8275760) : rien sur ces deux notions.
  - « Comptes par catégories de ménage », 2023, publié le 16/04/2026 (https://www.insee.fr/fr/statistiques/8574663). Le tableau CND.102 (https://www.insee.fr/fr/statistiques/fichier/8574663/T_CND_102.xlsx) a été ouvert. Il contient les revenus, les prélèvements, les loyers réels et imputés, les aides au logement et le chèque énergie, mais **pas la consommation par poste**. **VERIFIE**
- ***France, portrait social*** (éditions 2024 et 2025, fiche « Consommation et épargne des ménages ») : seulement le niveau national (part dans le RDB), **pas de ventilation par niveau de vie**.
  - Édition 2025 : https://www.insee.fr/fr/statistiques/8612566
  - Édition 2024 : https://www.insee.fr/fr/statistiques/8242383?sommaire=8242421
- **Budget de famille** : **aucune enquête plus récente que 2017 n'est publiée**. Selon le CNIS (https://www.cnis.fr/enquetes/budget-de-famille/), la nouvelle édition est collectée en 2026 et ses premiers résultats sont annoncés pour 2028. **A_VERIFIER** : l'information vient d'un résumé de recherche, la page CNIS n'a pas été ouverte.
- **Publications d'analyse existantes**, toutes sur Budget de famille :
  - DREES 2018 sur Budget de famille 2011 (part dans le revenu disponible par catégorie de niveau de vie).
  - France Stratégie 2021 sur Budget de famille 2017 (part dans la dépense totale par niveau de vie × statut d'occupation, âge et type de ménage ; revenu arbitrable par UC).
  - Insee Analyses Réunion n° 47, 2020 (https://www.insee.fr/fr/statistiques/4764098). Même définition que les tableaux INSEE : loyers nets des aides, part dans la consommation. Réunion 29 %, « Province » 30 % (figure 2). **VERIFIE**

### 2.2 DREES 2018 (Budget de famille 2011) : part dans le revenu disponible

Graphique 9 et texte p. 23-24 :

| Catégorie | Part pré-engagée / revenu disponible | Part pré-engagée / dépense totale |
|---|---|---|
| Pauvres (< 60 % de la médiane) | 61 % | 38 % |
| Modestes non pauvres | 39 % | 34 % |
| Classes moyennes | 31 % | 30 % |
| Aisés (dernier quart) | 23 % | 26 % |
| Ensemble | 30 % | 30 % |

- Définition de l'étude : y compris les remboursements de prêts immobiliers, loyers bruts.
- Statut **VERIFIE** pour la lecture. Ces chiffres datent de 2011 et suivent la définition « DSDS + emprunts », plus large que celle de l'INSEE.

### 2.3 France Stratégie 2021 (Budget de famille 2017) : part dans la **dépense totale**

Définition de l'étude (p. 3) : loyers bruts, charges, eau, énergie, télécoms, télévision, cantine, assurances (y compris assurance-vie, note 9) et services financiers, **plus les remboursements d'emprunts immobiliers**. Les chiffres sont **VERIFIE** pour la lecture, mais leur définition est plus large que celle de l'INSEE.

- Ensemble : 32 % de la dépense totale. Ménages pauvres : 41 %. Ménages aisés : 28 % (conclusion, p. 12).
- Les pré-engagées des ménages pauvres pèsent 41 % de leur dépense mais **60 % de leur revenu disponible** (p. 7).
- Graphique 1 : **dépenses pré-engagées de logement** / dépense totale selon le statut d'occupation (2017).

  | Catégorie | Propriétaires non accédants | Accédants | Locataires parc social | Locataires parc privé |
  |---|---|---|---|---|
  | Pauvres | 13 % | 30 % | 36 % | 40 % |
  | Modestes non pauvres | 13 % | 28 % | 34 % | 34 % |
  | Classes moyennes | 11 % | 28 % | 29 % | 29 % |
  | Aisés | 11 % | 30 % | 26 % | 28 % |
  | Ensemble | 11 % | 29 % | 32 % | 31 % |

  La ligne « pauvres » est confirmée par le texte p. 5. Les autres lignes ont été lues dans l'extraction du graphique : **A_VERIFIER** visuellement.
- Graphique 3 : part pré-engagée totale / dépense totale selon la configuration familiale.

  | Catégorie | Personne seule | Famille monoparentale | Couple sans enfant | Couple avec enfant(s) |
  |---|---|---|---|---|
  | Pauvres | 44 % | 45 % | 34 % | 39 % |
  | Modestes non pauvres | 42 % | 40 % | 32 % | 35 % |
  | Classes moyennes | 36 % | 33 % | 27 % | 32 % |
  | Aisés | 35 % | 27 % | 23 % | 29 % |
  | Ensemble | 38 % | 37 % | 26 % | 32 % |

  La ligne « ensemble » et la valeur 44 % sont confirmées par le texte p. 6-7. Les autres valeurs ont été lues dans l'extraction : **A_VERIFIER**.
- Âge (texte p. 7) : 34 % avant 30 ans, 28 % entre 60 et 74 ans, 31 % après 75 ans. Le poids des complémentaires santé dans la dépense totale passe de moins de 3 % avant 60 ans à 4,5 % entre 60 et 74 ans, puis 7 % après 75 ans.
- Tableau 1 (régression, p. 11) :
  - élasticité des dépenses pré-engagées par UC au revenu disponible par UC = **0,211** ;
  - un couple a des dépenses pré-engagées par UC 15 % plus faibles qu'une personne seule (note 16) ;
  - par rapport à un propriétaire non accédant : accédant +117 %, locataire du parc privé +88 %, locataire du parc social +54 %.
- Tableau 3 (p. 12), déciles 2017 en €/mois :

  | Décile | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 |
  |---|---|---|---|---|---|---|---|---|---|
  | Niveau de vie | 925 | 1 157 | 1 350 | 1 520 | 1 700 | 1 891 | 2 127 | 2 437 | 3 005 |
  | Revenu arbitrable par UC | 377 | 605 | 794 | 960 | 1 131 | 1 312 | 1 526 | 1 833 | 2 338 |

  Rapport D9/D1 : 3,25 pour le niveau de vie, 6,20 pour le revenu arbitrable.

### 2.4 Comptes nationaux distribués 2022 (Insee Focus n° 338, if338.xlsx) : par cinquième de niveau de vie

**VERIFIE.** Figures 1a et 1b du fichier, figure 2 pour le RDN.

| Cinquième | Logement, eau, énergie (y c. loyers imputés), % de la consommation | Logement (€/UC) | Communications (€/UC) | Consommation (€/UC) | RDN (€/UC) |
|---|---|---|---|---|---|
| C1 | 33,9 % | 6 300 | 900 | 18 500 | 14 400 |
| C2 | 30,5 % | 7 000 | 1 000 | 22 900 | 23 000 |
| C3 | 29,5 % | 8 000 | 1 100 | 27 000 | 28 900 |
| C4 | 27,2 % | 8 800 | 1 100 | 32 300 | 35 700 |
| C5 | 24,5 % | 10 600 | 1 300 | 43 000 | 58 800 |
| Ensemble | 28,2 % | 8 100 | 1 100 | 28 800 | 32 200 |

- Les assurances et les services financiers ne sont pas isolés : ils sont inclus dans « biens et services divers ». La division « communications » comprend aussi les équipements.
- Calcul indicatif, **HYPOTHESE** : (logement + communications) / RDN = 50 % (C1), 35 % (C2), 31 % (C3), 28 % (C4), 20 % (C5), 29 % (ensemble). Le calcul est incomplet (sans assurances ni cantines). Il est gonflé par les loyers imputés et par un RDN **net** de consommation de capital fixe.

---

## 3. Calcul à partir de Budget de famille 2017 (TF106, TF107, TF105, TF102)

Fichiers téléchargés le 16/11/2026, en € par ménage et par an, France entière, 2017 :

- https://www.insee.fr/fr/statistiques/fichier/4648335/TF106.csv (par décile)
- https://www.insee.fr/fr/statistiques/fichier/4648335/TF107.csv (statut d'occupation × quintile)
- https://www.insee.fr/fr/statistiques/fichier/4648335/TF105.csv (type de ménage)
- https://www.insee.fr/fr/statistiques/fichier/4648335/TF102.csv (âge de la personne de référence)
- Libellés : https://www.insee.fr/fr/statistiques/fichier/4648335/metadonnees_bdf2017.csv
- Page de la publication : https://www.insee.fr/fr/statistiques/4648335 (Insee Résultats, 15/09/2020)

### 3.1 Correspondance entre postes pré-engagés et codes de la nomenclature Budget de famille

| Poste INSEE | Code(s) et libellé (métadonnées) | Remarque |
|---|---|---|
| Logement : loyers | 041 « Loyers d'habitation (nets des aides au logement) » (04111 résidence principale + 04121 autres résidences) | **Nets des aides** ; pas de loyer imputé (pas de code 042) |
| Logement : eau | 0443 « Factures d'eau » | Comprend l'assainissement |
| Logement : charges | 0444 « Charges collectives » | Mélange chauffage collectif, eau, entretien, ascenseur, etc. |
| Énergie du logement | 045 = 0450 électricité + gaz non dissociables, 0451 électricité, 0452 gaz, 0453 combustibles liquides, 045A combustibles solides | |
| Logement : entretien (variante) | 043 « Travaux courants d'entretien » | Inclus en comptabilité nationale (CP043) |
| Télécommunications | 0813 « Services de téléphone, internet, recharges » | |
| Télévision | non isolable : abonnements dans 0942 « Services culturels » | La redevance a été supprimée en 2022 (voir §5) |
| Cantines | 1112 « Cantines scolaire et professionnelle » | |
| Assurances hors vie | 1252 logement, 1253 santé, 1254 transports, 1255 autres | 1251 assurance vie exclue |
| Services financiers | 126 | |
| Hors champ (non retenus) | 131A impôts et taxes du logement, 132 remboursements de prêts immobiliers | Variantes DREES et France Stratégie |

Le dénominateur est `CTOTALE`, la « consommation – champ comptabilité nationale ». Contrôle : Σ des divisions 01 à 12 = CTOTALE à 1 € près dans les cinq tableaux.

### 3.2 Résultats par décile (TF106)

Définition stricte, sans le poste 043.

| Décile | Loyers 041 | Eau + charges 044 | Énergie 045 | Télécoms 0813 | Cantines 1112 | Assurances 1252-1255 | Services financiers 126 | **Σ pré-engagées** | Conso CTOTALE | **Part** | Part avec 043 | Part hors loyer / conso hors loyer |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | 1 870 | 728 | 967 | 567 | 258 | 1 199 | 108 | **5 697** | 16 123 | **35,3 %** | 35,7 % | 26,9 % |
| D2 | 1 936 | 834 | 1 123 | 573 | 277 | 1 635 | 124 | **6 502** | 18 322 | **35,5 %** | 35,8 % | 27,9 % |
| D3 | 2 128 | 775 | 1 193 | 573 | 247 | 1 887 | 127 | **6 930** | 20 071 | **34,5 %** | 34,9 % | 26,8 % |
| D4 | 2 210 | 757 | 1 279 | 614 | 299 | 2 150 | 139 | **7 448** | 22 638 | **32,9 %** | 33,3 % | 25,6 % |
| D5 | 2 227 | 689 | 1 281 | 611 | 339 | 2 225 | 138 | **7 510** | 23 787 | **31,6 %** | 32,2 % | 24,5 % |
| D6 | 2 161 | 771 | 1 348 | 652 | 346 | 2 450 | 152 | **7 880** | 27 081 | **29,1 %** | 30,3 % | 22,9 % |
| D7 | 1 874 | 793 | 1 449 | 643 | 379 | 2 523 | 153 | **7 814** | 29 059 | **26,9 %** | 27,9 % | 21,9 % |
| D8 | 1 949 | 844 | 1 427 | 666 | 380 | 2 664 | 163 | **8 093** | 32 645 | **24,8 %** | 25,5 % | 20,0 % |
| D9 | 1 792 | 932 | 1 530 | 710 | 437 | 2 806 | 181 | **8 388** | 35 867 | **23,4 %** | 23,8 % | 19,4 % |
| D10 | 2 074 | 1 216 | 1 925 | 741 | 615 | 3 304 | 196 | **10 071** | 48 353 | **20,8 %** | 21,5 % | 17,3 % |
| Ensemble | 2 022 | 834 | 1 353 | 635 | 358 | 2 286 | 148 | **7 636** | 27 408 | **27,9 %** | 28,5 % | 22,1 % |

- Montants lus : **VERIFIE**. Agrégats et parts : **HYPOTHESE** (calcul du projet).
- Exemple, D1 : (1 870 + 728 + 967 + 567 + 258 + 258 + 493 + 374 + 74 + 108) / 16 123 = 5 697 / 16 123 = 35,3 %.
- Cohérence avec la seule mention INSEE trouvée : « en France métropolitaine ce sont les ménages les plus modestes qui supportent la charge la plus lourde (35 % de leurs dépenses) ». Cette phrase vient d'un résumé de recherche d'Insee Analyses Réunion n° 47 ; elle n'a pas été retrouvée dans le texte de la page : **A_VERIFIER**.

### 3.3 Résultats par statut d'occupation × quintile (TF107)

L = locataires, P = propriétaires, accédants compris. Les remboursements d'emprunt ne sont pas inclus.

| Groupe | Conso | Loyer 041 | Σ pré-engagées | **Part / conso** | Part avec 043 | Hors loyer / conso hors loyer | dont énergie 045 / conso hors loyer | Loyer / conso |
|---|---|---|---|---|---|---|---|---|
| L1 | 16 542 | 3 023 | 6 732 | **40,7 %** | 40,9 % | 27,4 % | 6,3 % | 18,3 % |
| L2 | 21 125 | 4 409 | 8 863 | **42,0 %** | 42,1 % | 26,6 % | 5,7 % | 20,9 % |
| L3 | 25 639 | 5 651 | 10 442 | **40,7 %** | 41,0 % | 24,0 % | 4,6 % | 22,0 % |
| L4 | 30 681 | 6 485 | 11 427 | **37,2 %** | 37,5 % | 20,4 % | 3,8 % | 21,1 % |
| L5 | 42 374 | 9 253 | 14 985 | **35,4 %** | 35,5 % | 17,3 % | 3,1 % | 21,8 % |
| L (ensemble) | 24 075 | 5 000 | 9 486 | **39,4 %** | 39,6 % | 23,5 % | 4,8 % | 20,8 % |
| P1 | 18 361 | 36 | 5 042 | **27,5 %** | 28,0 % | 27,3 % | 7,4 % | 0,2 % |
| P2 | 21 565 | 57 | 5 609 | **26,0 %** | 26,6 % | 25,8 % | 7,0 % | 0,3 % |
| P3 | 25 308 | 78 | 6 014 | **23,8 %** | 25,1 % | 23,5 % | 6,2 % | 0,3 % |
| P4 | 30 920 | 99 | 6 577 | **21,3 %** | 22,4 % | 21,0 % | 5,3 % | 0,3 % |
| P5 | 42 058 | 111 | 7 796 | **18,5 %** | 19,2 % | 18,3 % | 4,5 % | 0,3 % |
| P (ensemble) | 29 579 | 83 | 6 433 | **21,7 %** | 22,6 % | 21,5 % | 5,5 % | 0,3 % |

- Les parts de loyer (18,3 %, 20,9 %, 21,8 %) sont celles déjà utilisées dans `consumption.json` pour les profils locataires, ce qui confirme la cohérence.
- Le poste 132 (remboursements de prêts immobiliers, hors champ) vaut en moyenne 4 301 € pour les propriétaires et 7 079 € en P5.

Détail par poste (€ par ménage, TF107) :

| Code | L1 | L2 | L3 | L4 | L5 | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0443 eau | 153 | 164 | 160 | 140 | 124 | 275 | 300 | 316 | 325 | 364 |
| 0444 charges | 759 | 810 | 808 | 882 | 1 023 | 287 | 270 | 269 | 413 | 692 |
| 0450 élec + gaz | 127 | 146 | 127 | 134 | 168 | 105 | 145 | 146 | 184 | 354 |
| 0451 électricité | 521 | 546 | 567 | 578 | 617 | 768 | 771 | 841 | 903 | 978 |
| 0452 gaz | 174 | 216 | 185 | 161 | 187 | 200 | 270 | 285 | 305 | 361 |
| 0453 fioul | 26 | 30 | 28 | 29 | 32 | 200 | 223 | 193 | 173 | 141 |
| 045A solides | 9 | 14 | 9 | 9 | 15 | 83 | 94 | 92 | 81 | 70 |
| 0813 télécoms | 558 | 587 | 635 | 634 | 699 | 589 | 599 | 629 | 662 | 732 |
| 1112 cantines | 241 | 235 | 283 | 312 | 517 | 311 | 309 | 379 | 407 | 528 |
| 1252 assur. logement | 227 | 267 | 286 | 286 | 326 | 373 | 395 | 404 | 437 | 525 |
| 1253 assur. santé | 438 | 773 | 889 | 903 | 1 032 | 974 | 1 251 | 1 305 | 1 373 | 1 512 |
| 1254 assur. transports | 311 | 474 | 572 | 646 | 639 | 589 | 656 | 781 | 872 | 943 |
| 1255 autres assur. | 57 | 70 | 99 | 95 | 184 | 123 | 126 | 148 | 174 | 292 |
| 126 services financiers | 107 | 123 | 142 | 132 | 169 | 130 | 142 | 147 | 168 | 193 |

### 3.4 Type de ménage (TF105) et âge (TF102)

| Groupe | Conso | Part pré-engagée / conso | Hors loyer / conso hors loyer | Loyer / conso | Énergie 045 / conso hors loyer | Assur. santé 1253 / conso hors loyer |
|---|---|---|---|---|---|---|
| **Personnes seules** | 17 314 | **35,6 %** | **26,0 %** | 13,0 % | 6,6 % | 4,8 % |
| Familles monoparentales | 23 908 | 31,3 % | 23,8 % | 9,8 % | 5,3 % | 3,3 % |
| Couples sans enfant | 30 756 | 25,1 % | 21,2 % | 5,0 % | 5,5 % | 5,3 % |
| Couples avec enfants | 38 453 | 24,4 % | 20,2 % | 5,3 % | 4,5 % | 3,4 % |
| Âge < 25 ans | 19 580 | 33,7 % | 18,8 % | 18,4 % | 4,1 % | 1,8 % |
| Âge 65-74 ans | 24 531 | 28,2 % | 24,5 % | 4,9 % | 6,3 % | 6,6 % |
| Âge ≥ 75 ans | 18 878 | 35,1 % | 30,7 % | 6,3 % | 8,4 % | 8,9 % |
| Ensemble | 27 408 | 27,9 % | 22,1 % | 7,4 % | 5,3 % | 4,3 % |

Les montants lus sont **VERIFIE** et les parts sont **HYPOTHESE** (calcul). Les tableaux ne croisent pas type de ménage et niveau de vie, ni âge et statut d'occupation.

### 3.5 Limites du calcul

1. Le dénominateur est la **consommation**, pas le revenu disponible : TF106/TF107 ne publient pas de revenu.
2. Les loyers sont **nets** des aides au logement.
3. Les assurances sont des primes brutes (la complémentaire santé pèse lourd chez les âgés).
4. La télévision payante n'est pas isolable.
5. Les montants sont ceux de 2017.
6. Les tableaux portent sur des ménages de toutes tailles, alors que les profils du projet sont des personnes seules. TF105 montre une part hors loyer plus élevée pour les personnes seules (26,0 % contre 22,1 %).

---

## 4. Comptabilité nationale (macro), année des comptes 2025

Source : « Revenu et pouvoir d'achat des ménages en 2025 », comptes nationaux annuels, base 2020, publiés le 29/05/2026 (https://www.insee.fr/fr/statistiques/8988851). Fichiers téléchargés :

- Tableau 2.102 : https://www.insee.fr/fr/statistiques/fichier/8988851/t_2102_fr.xlsx (fichier créé le 22/05/2026)
- Tableau 2.103 : https://www.insee.fr/fr/statistiques/fichier/8988851/t_2103_fr.xlsx (fichier créé le 26/05/2026)
- Détail : « Consommation des ménages en 2025 », https://www.insee.fr/fr/statistiques/fichier/8988813/T_DEP_PRE_ENG_fr.xlsx (page https://www.insee.fr/fr/statistiques/8988813)

Toutes les valeurs ci-dessous sont **VERIFIE**.

| Agrégat (Md€ courants) | 2023 | 2024 | **2025** |
|---|---|---|---|
| RDB des ménages (B6G) | 1 779,879 | 1 868,043 | **1 876,863** |
| Dépense pré-engagée (CPDPE) | 538,317 | 561,850 | **569,301** |
| Revenu arbitrable (RARBI) | 1 241,562 | 1 306,194 | **1 307,562** |
| Part pré-engagée / RDB (%) | 30,245 | 30,077 | **30,333** |
| Part pré-engagée / dépense de consommation (%) | 36,312 | 36,791 | **36,826** |
| dont logement / RDB (%) | 22,697 | 22,684 | **23,072** |
| dont assurances hors vie et services financiers / RDB (%) | 4,683 | 4,554 | **4,395** |
| dont télévision et télécoms / RDB (%) | 2,204 | 2,165 | **2,174** |
| dont cantines / RDB (%) | 0,660 | 0,675 | **0,692** |
| Pouvoir d'achat du RDB (%) | | 2,717 | **−0,366** |
| Pouvoir d'achat arbitrable (%) | | 3,773 | **−1,051** |
| Pouvoir d'achat arbitrable par UC (%) | | 3,247 | **−1,371** |

Détail 2025 (T_DEP_PRE_ENG, M€) :

| Poste | M€ |
|---|---|
| CP04 logement, eau, énergie (total) | 433 027,7 |
| CP041 loyers effectifs | 80 072,0 |
| CP042 **loyers imputés** | **226 828,7** |
| CP043 entretien et réparation | 33 514,4 |
| CP0441 alimentation en eau | 5 593,6 |
| CP0442 ordures ménagères | 6 084,9 |
| CP0443 eaux usées | 7 899,0 |
| CP0444 services divers liés au logement | 7 031,0 |
| CP0451 électricité | 39 014,2 |
| CP0452 gaz | 18 121,2 |
| CP0453 combustibles liquides | 2 843,6 |
| CP0454 combustibles solides | 3 051,6 |
| CP0455 autres énergies (chaleur, froid) | 2 973,5 |
| CP083 services d'information et de communication | 40 801,3 |
| CP1112 cantines | 12 986,9 |
| CP1212 assurance santé | 17 326,5 |
| CP1213 assurance logement | 9 111,7 |
| CP1214 assurance transports | 11 236,9 |
| CP1219 autres assurances | 3 192,0 |
| CP122 services financiers | 41 617,6 |

- Contrôle : 433 027,7 + 40 801,3 + 12 986,9 + 82 484,7 = 569 300,6 M€ = CPDPE.
- Les loyers imputés pèsent **39,8 %** du total pré-engagé (226,8 / 569,3). **HYPOTHESE** (calcul).
- Hors loyers imputés, le total pré-engagé vaut 342,5 Md€, soit 18,2 % du RDB. **HYPOTHESE**, indicatif seulement : le RDB contient lui aussi les loyers imputés, nets des charges et des intérêts, et on ne peut pas les en retirer simplement.
- Pour comparaison, les chiffres de *France, portrait social* 2025 sont plus anciens et révisés depuis : 30,3 % du RDB en 2024, dont logement 22,8 %.

---

## 5. Taxes portant sur les postes pré-engagés (scénarios TVA et accises)

| Poste | Régime 2026 | Statut | Source |
|---|---|---|---|
| Loyer d'habitation (location nue) | Exonéré de TVA (CGI art. 261 D 4°) | A_VERIFIER (article non ouvert) | https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069577 (CGI, art. 261 D) |
| Électricité ≤ 36 kVA : abonnement **et** consommation | **20 % sur toute la facture depuis le 1er août 2025** (avant : 5,5 % sur l'abonnement et la CTA). La hausse a été compensée par une baisse de l'accise | VERIFIE | Guide MTE 2026 sur la fiscalité des énergies, §I.1, p. 6 : https://www.ecologie.gouv.fr/sites/default/files/documents/Guide%202026%20sur%20fiscalit%C3%A9%20des%20%C3%A9nergies%202026.pdf ; BOI-RES-TVA-000209, version du 26/08/2026 : https://bofip.impots.gouv.fr/bofip/14705-PGP.html/identifiant=BOI-RES-TVA-000209-20260826 ; loi n° 2025-127 du 14/02/2025, art. 20 |
| Gaz naturel en réseau : abonnement et consommation | **20 % sur toute la facture depuis le 1er août 2025** | VERIFIE | Mêmes sources |
| Fioul et produits pétroliers | 20 % sur le continent (13 % en Corse) | VERIFIE | Guide MTE 2026, p. 6 |
| Accise électricité ménages | 30,85 €/MWh (01/02 au 31/07/2026), puis **30,62 €/MWh** depuis le 01/08/2026 | VERIFIE (déjà dans `taxRules.json`) | Guide MTE 2026, annexe 3 |
| Accise gaz naturel combustible | 16,39 €/MWh (01/02 au 31/07/2026), puis **16,66 €/MWh** depuis le 01/08/2026 | VERIFIE | Guide MTE 2026, tableau des combustibles et annexe 3 |
| Accise fioul domestique | 16,39 (01/02 au 31/07/2026), puis 16,66 depuis le 01/08/2026 | VERIFIE | Guide MTE 2026, tableau p. 25 et annexe 3 |
| Contribution tarifaire d'acheminement (CTA) | Hors leviers | — | Guide MTE 2026, §I.2 |
| Réseaux de chaleur | 5,5 % sur l'abonnement, et sur la fourniture si la chaleur est renouvelable à 50 % ou plus (CGI 278-0 bis B) | A_VERIFIER | Légifrance, CGI art. 278-0 bis |
| Bois de chauffage | 10 % | A_VERIFIER | Légifrance, CGI art. 279 |
| Eau potable par réseau | **5,5 %** (CGI 278-0 bis A 1°) | VERIFIE (BOI-TVA-LIQ-30-20-30 §20, version du 19/09/2014) | https://bofip.impots.gouv.fr/bofip/699-PGP.html |
| Assainissement : redevances | **10 %** (CGI 279 b) | VERIFIE (même BOI, §10) | Idem |
| Télécoms, internet | 20 % (taux normal par défaut) | A_VERIFIER | — |
| Abonnements de télévision linéaire | 10 % (CGI 279 b octies). La vidéo à la demande est au taux normal | A_VERIFIER (le BOFiP n'a pas été lu directement) | Recherche sur bofip.impots.gouv.fr, série BOI-TVA-LIQ-30-20 |
| Redevance audiovisuelle | Supprimée en 2022 (LFR 2022) | A_VERIFIER | Légifrance, loi n° 2022-1157 du 16/08/2022 |
| Cantine scolaire servie par un prestataire | 5,5 % (CGI 278-0 bis E). En régie communale, les sommes versées par les familles ne sont pas soumises à la TVA | A_VERIFIER | BOI-TVA-LIQ-30-20-10-20 : https://bofip.impots.gouv.fr/bofip/256-PGP.html |
| Cantine d'entreprise | 10 % (CGI 279 a bis, sous conditions) | A_VERIFIER | Idem |
| Assurances | Exonérées de TVA (CGI 261 C 2°), soumises à la TSCA (CGI art. 991 et 1001) : 9 % pour les contrats sans tarif spécial, 18 % pour les véhicules terrestres à moteur, taux compris entre 7 % et 33 % selon les contrats | Taux de 9 % et fourchette 7-33 % : VERIFIE ; 18 % auto : A_VERIFIER | https://www.collectivites-locales.gouv.fr/gerer-les-finances-publiques-locales/fiscalite-locale/fiscalite-indirecte-locale/taxe-sur-les-conventions-dassurance |
| Complémentaire santé | Pas de TSCA ; taxe de solidarité additionnelle (CSS art. L. 862-4), 13,27 % pour les contrats responsables | 13,27 % : A_VERIFIER | Légifrance, CSS L862-4 |
| Services financiers | Exonérés de TVA (CGI 261 C 1°) | A_VERIFIER | Légifrance |

Conséquences pour le simulateur :

- Seuls les leviers **TVA** (taux normal, intermédiaire et réduit) et **accises sur l'électricité, le gaz et le fioul** touchent des postes pré-engagés.
- L'énergie du logement est **entièrement au taux normal** depuis août 2025. L'ancien taux de 5,5 % sur l'abonnement ne doit plus être modélisé.
- Les loyers, les assurances et les services financiers ne sont touchés par aucun levier du projet. La TSCA et la TSA ne sont pas des leviers.

---

## 6. Méthode recommandée

### 6.1 Principes

Toutes les règles de cette section sont des **HYPOTHESE** : ce sont des choix de modélisation.

1. **Concept** : on suit la définition INSEE en version **enquêtes ménages**.
   - Pas de loyer imputé : le revenu disponible du projet n'en contient pas, pas plus que la consommation des profils.
   - Pas de remboursement d'emprunt.
   - Postes retenus : loyer + charges et eau + énergie du logement + télécoms + cantine + assurances hors vie + services financiers.
   - La télévision payante est omise faute de donnée isolée ; sa part est négligeable.
   - Dans l'interface, l'indicateur s'appellerait « reste à vivre (revenu arbitrable, définition INSEE hors loyers imputés) ». La méthodologie doit expliquer l'écart avec les 30,3 % de la comptabilité nationale (§4).
2. **Revenu** : on utilise `disposableIncome` du projet (`profiles.ts`), qui contient les aides au logement et les autres aides monétaires. Deux points d'attention :
   - Il **déduit la taxe foncière**. Ce n'est pas la convention INSEE ; c'est la variante France Stratégie (encadré 3). Voir les questions ouvertes.
   - Il ne contient pas les services en nature, et ne doit pas les contenir.
3. **Loyer brut** : le loyer pré-engagé est le loyer **avant** aide au logement, puisque l'aide est déjà dans le revenu (convention DREES 2018 et France Stratégie 2021). Ce loyer brut est **figé** dans les scénarios, car le bail ne change pas. Une baisse de l'aide au logement réduit donc le reste à vivre d'autant.
4. **Volumes figés** : les dépenses pré-engagées de référence sont calculées une fois, dans le scénario de référence.
   - Dans un scénario, seules les taxes qui les grèvent les font varier, avec une répercussion intégrale, cohérente avec l'incidence statique du projet.
   - Elles ne doivent **pas** être recalculées comme une part de la consommation du scénario. Sinon, une baisse de revenu ferait baisser mécaniquement le loyer.
5. **Effet d'un scénario**, pour chaque poste i :
   - TVA : D_i,scén = D_i,réf × (1 + t_i,scén) / (1 + t_i,réf).
   - Accise : D_énergie,scén = D_énergie,réf + q × Δaccise × (1 + TVA_scén), avec q le volume en MWh (ou en hL pour le fioul) = D_énergie,réf / prix TTC.
   - Le prix TTC de référence par kWh (électricité au tarif réglementé et gaz) est **A_VERIFIER**. Sources à lire : délibérations de la CRE sur les tarifs réglementés de vente de février et d'août 2026 (https://www.cre.fr), et SDES, prix de l'électricité et du gaz des ménages, base Pégase.
   - Variante sans prix unitaire : appliquer à la dépense d'énergie la variation relative déjà calculée par le moteur pour les accises (`shareOfEnergySpending`, `householdWeight`), restreinte aux produits du logement. HYPOTHESE.
6. **Reste à vivre** = revenu disponible du scénario − Σ D_i du scénario.

### 6.2 Profils de référence (loyer non décrit)

- D_réf = conso_réf × part, avec la part du groupe TF107 qui correspond au statut d'occupation déjà défini dans `profiles.json`. Correspondance proposée, cohérente avec les notes de `consumption.json` :
  - student, apprentice : L1 ;
  - smic, employee1800 : L2 ;
  - artisan : L3 ;
  - cadre3k : L4 ;
  - rentier5m, fortune100m : L5 ;
  - retiree1000 : P1, ou la tranche d'âge 65-74 ans ;
  - retiree2500 : P3 ;
  - cadre10k : P5.
- Ventilation par poste (§3.3) : loyer, eau, charges, électricité, gaz, fioul, télécoms, cantine, assurances, services financiers. Cette ventilation permet d'appliquer le bon taux de TVA et la bonne accise à chaque poste.
- Loyer brut des locataires = part de loyer × consommation (loyer **net**, TF107) + `housingAid` de référence du profil.
- Ajustement optionnel pour les personnes seules : multiplier les postes hors loyer par 26,0 / 22,1 = 1,18 (TF105). HYPOTHESE, à discuter, car le facteur est calculé tous niveaux de vie confondus.
- Retraités : la part d'assurance santé est forte (6,6 % de la consommation hors loyer entre 65 et 74 ans). Le groupe P1 la mélange avec les actifs. Variante : remplacer le poste 1253 par la valeur de la tranche d'âge 65-74 ans de TF102.
- Profils à `annualAmount` fixé (étudiant, rentier, fortune) : appliquer la même part à ce montant.
- Les parts vont de 35 % à 42 % pour les locataires et de 18 % à 28 % pour les propriétaires (part de la consommation, 2017).

### 6.3 Foyer de l'utilisateur (« Votre foyer ») : loyer saisi

- Loyer : le loyer saisi (hors charges) × 12, dans le cas d'un locataire. Il est brut, car le moteur ajoute déjà l'aide au logement au revenu. VERIFIE au sens où c'est une donnée de l'utilisateur.
- Charges et eau (0443 + 0444) et autres postes hors loyer : part de la consommation hors loyer du groupe TF107 de même statut d'occupation et de même quintile, choisi selon le niveau de vie par UC, comme `closestPattern` le fait déjà. Ces parts sont lues dans le tableau du §3.3, colonne « hors loyer / conso hors loyer », poste par poste. HYPOTHESE.
- Mise à l'échelle selon la taille du foyer : les montants TF107 sont par ménage moyen. Il faut appliquer les parts à la consommation propre du foyer, qui dépend déjà de ses unités de consommation (UC), et non des montants absolus. HYPOTHESE.
- Propriétaire : pas de loyer. Les remboursements d'emprunt sont exclus (définition INSEE). On peut afficher un message indiquant qu'ils ne sont pas comptés.
- Cantines : le poste 1112 regroupe les cantines scolaires et professionnelles. Pour un foyer avec enfants, la part du groupe TF107 les inclut déjà en moyenne. Variante : utiliser TF105 (couples avec enfants, 941 € par an). HYPOTHESE.

### 6.4 Liste des valeurs et de leur statut

| Valeur | Statut | Lien |
|---|---|---|
| Définition « dépenses pré-engagées » (6 postes) | VERIFIE | https://www.insee.fr/fr/metadonnees/definition/c1358 |
| Définition « revenu arbitrable » | VERIFIE | https://www.insee.fr/fr/statistiques/8988851 |
| Agrégats 2025 : RDB 1 876,863, DPE 569,301, revenu arbitrable 1 307,562 Md€ ; 30,333 % ; postes | VERIFIE | t_2102_fr.xlsx, t_2103_fr.xlsx, T_DEP_PRE_ENG_fr.xlsx (§4) |
| Loyers imputés 2025 : 226,8 Md€ (39,8 % de la DPE) | VERIFIE pour le montant, HYPOTHESE pour la part | T_DEP_PRE_ENG_fr.xlsx |
| Montants Budget de famille 2017 par poste (TF102, TF105, TF106, TF107) | VERIFIE | Liens du §3 |
| Parts pré-engagées calculées (§3) | HYPOTHESE (calcul à partir de sources vérifiées) | Idem |
| Correspondance profils ↔ groupes TF107 | HYPOTHESE | — |
| Facteur personnes seules 1,18 | HYPOTHESE | TF105 |
| Loyer brut des profils = loyer net TF107 + `housingAid` | HYPOTHESE | — |
| Volumes pré-engagés figés dans les scénarios | HYPOTHESE | — |
| DREES 2018 : 61 / 39 / 31 / 23 % du revenu disponible | VERIFIE (Budget de famille 2011, définition plus large) | dd25 p. 23-24 |
| France Stratégie 2021 : 41 % / 60 % pour les pauvres ; graphiques 1 et 3 ; tableau 3 | VERIFIE pour le texte et les tableaux ; A_VERIFIER pour les valeurs lues seulement dans les graphiques | fs-2021-na_102 |
| Comptes nationaux distribués 2022 : logement par cinquième | VERIFIE | if338.xlsx |
| TVA de 20 % sur toute la facture d'électricité et de gaz depuis le 01/08/2025 | VERIFIE | Guide MTE 2026 p. 6 ; BOI-RES-TVA-000209 |
| Accises électricité, gaz et fioul 2026 | VERIFIE | Guide MTE 2026 |
| Eau 5,5 %, assainissement 10 % | VERIFIE | BOI-TVA-LIQ-30-20-30 |
| Répartition eau et assainissement dans la facture d'eau : 41,5 % / 58,5 % (comptabilité nationale 2025 : 5 593,6 / 7 899,0 M€) | HYPOTHESE | T_DEP_PRE_ENG_fr.xlsx |
| Télécoms 20 %, télévision 10 %, cantines 5,5 % ou 10 %, réseaux de chaleur 5,5 %, bois 10 % | A_VERIFIER | Légifrance, CGI art. 278-0 bis, 279 et 261 |
| Exonérations des loyers, des assurances et des services financiers | A_VERIFIER | Légifrance, CGI art. 261 C et 261 D |
| TSCA 9 % par défaut, fourchette 7-33 % | VERIFIE | collectivites-locales.gouv.fr |
| TSCA auto 18 %, TSA santé 13,27 % | A_VERIFIER | Légifrance, CGI art. 1001 ; CSS L862-4 |
| Prix TTC par kWh d'électricité et de gaz (pour le volume en MWh) | A_VERIFIER | CRE (tarifs réglementés 2026), SDES Pégase |
| Budget de famille 2026 en cours de collecte, résultats en 2028 | A_VERIFIER | https://www.cnis.fr/enquetes/budget-de-famille/ |

---

## 7. Questions ouvertes

1. **Taxe foncière** : le revenu disponible du projet la déduit, alors que les dépenses pré-engagées INSEE l'excluent du revenu comme de la dépense. Faut-il la remettre dans le revenu pour le reste à vivre (convention INSEE stricte) ou garder la déduction (variante France Stratégie) ? Le choix change l'écart entre locataires et propriétaires.
2. **Dénominateur** : les données Budget de famille donnent la part de la **consommation**. Pour les ménages modestes, la consommation dépasse le revenu (taux d'épargne nette de −29 % en C1 dans les comptes distribués 2022 ; 146 % du revenu disponible pour les pauvres chez France Stratégie). Appliquer la part à la consommation du projet (revenu disponible × (1 − taux d'épargne)) donne des dépenses pré-engagées plus faibles que la réalité observée. Faut-il plutôt caler sur une part du **revenu** (DREES 2011) ?
3. **Millésime 2017** : faut-il revaloriser les montants 2017 en 2026 ? Option proposée : garder des **parts**, qui s'appliquent à la consommation 2026, plutôt que des montants. L'énergie a fortement changé depuis (prix et TVA de 2022 à 2025) ; on peut caler la part d'énergie sur le rapport de la comptabilité nationale (CP045 2025 / CP045 2017). Ce rapport n'est pas encore calculé, il faut le tableau 2017 en base 2020.
4. **Assurances** : les primes brutes de l'enquête diffèrent du service d'assurance de la comptabilité nationale. On garde les primes, plus proches du ressenti des ménages.
5. **Remboursements d'emprunt** : faut-il afficher une variante « y compris crédit immobilier » ? Elle n'est pas INSEE, mais c'est celle de DREES et de France Stratégie, et elle se calcule avec le poste 132 de TF107.
6. **Télévision payante** : on l'omet, ou on l'impute avec une part nationale (CP083 inclut la télévision et la vidéo à la demande).
7. **Graphiques de France Stratégie** : relire visuellement les graphiques 1 à 3, pages 6 et 7 du PDF.
8. **Textes juridiques** : lire les articles du CGI en vigueur (261 C, 261 D, 278-0 bis, 279) et de la CSS (L862-4) sur Légifrance. La lecture automatique de Légifrance a échoué : l'URL d'article essayée renvoyait vers l'article 197.
9. **Prix unitaires de l'énergie** : il faut le prix TTC par kWh pour convertir une variation d'accise en euros. Sinon, utiliser la variante relative du §6.1, point 5.
