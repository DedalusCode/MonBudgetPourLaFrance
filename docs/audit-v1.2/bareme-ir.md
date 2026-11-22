# Audit v1.2 : barème de l'impôt sur le revenu (seuils et tranche ajoutée)

Étape 20, partie « barème de l'IR ». Recherche faite le 16 novembre 2026. Aucun fichier du dépôt n'a été modifié.
Calculs : `scripts/estimates/ir-thresholds.py` (bibliothèque standard seulement).

Statuts : **VERIFIE** = lu dans le fichier ou la page officielle citée ; **A_VERIFIER** = lu dans une source
secondaire, ou page non récupérée ; **HYPOTHESE** = choix de modélisation ou valeur calculée.

## 0. Point de départ dans le dépôt

| Élément | Valeur | Statut |
|---|---|---|
| Barème de référence du simulateur (`taxRules.json`, CGI art. 197, LFI 2026, revenus 2025) | seuils 0 / 11 600 / 29 579 / 84 577 / 181 917 € par part ; taux 0 / 11 / 30 / 41 / 45 % | VERIFIE (dépôt) |
| Décote | 897 € (personne seule) / 1 483 € (couple), taux 45,25 % | VERIFIE (dépôt) |
| Sensibilités LexImpact, +1 point (`revenues.json`, `bases`) | 0 % : 4,849 ; 11 % : 4,718 ; 30 % : 1,906 ; 41 % : 0,247 ; 45 % : 0,1438 Md€ | VERIFIE (dépôt) |
| Seuils de ces simulations LexImpact (législation 2027, PLF 2027, revenus 2026) | 11 844 / 30 200 / 86 353 / 185 737 € | VERIFIE (dépôt, notes) |
| Indexation (`indexationPoint`) | 2,0 Md€ par point (4,2 Md€ pour 2,1 %, évaluation préalable de l'art. 2 du PLF 2027) | HYPOTHESE (dépôt) |
| Script croisé `scripts/estimates/ir-brackets.py` (déciles de Statistiques n°41) | 11 % : 3,5 contre 4,72 Md€ (−26 %) | — |

Les seuils LexImpact valent ceux du simulateur × 1,021 (indexation de 2,1 % du PLF 2027) à l'euro près.

## 1. Distributions officielles disponibles

### 1.1 Foyers par taux marginal (la plus utile) : seuils exacts du barème
DGFiP, « Impôt sur le revenu : nombre de foyers et montant de l'impôt net par taux marginal de taxation du
barème », 2019 à 2024 : https://www.impots.gouv.fr/node/25519 (redirige vers
https://www.impots.gouv.fr/sites/default/files/media/9_statistiques/0_etudes_et_stats/1_statistiques/1_impots_particuliers/ir/nid_25519_ir_taux_marginal.xlsx),
téléchargé le 16/11/2026. Classement **par foyer**, selon le quotient familial (revenu net imposable / nombre
de parts). Champ : foyers soumis au barème (hors 209 000 foyers au taux fixe, surtout non-résidents). Impôt net
après crédits d'impôt hors PFO.

Revenus 2024 (onglet « 2024 ») :

| Quotient familial | TMI | Foyers (milliers) | Impôt net (M€) | Statut |
|---|---|---|---|---|
| ≤ 11 497 € | 0 % | 13 132,148 | −597,1 | VERIFIE |
| 11 497 – 29 315 € | 11 % | 20 930,797 | 12 657,8 | VERIFIE |
| 29 315 – 83 823 € | 30 % | 6 868,031 | 48 857,9 | VERIFIE |
| 83 823 – 180 294 € | 41 % | 434,112 | 17 791,4 | VERIFIE |
| > 180 294 € | 45 % | 61,476 | 12 541,0 | VERIFIE |
| Total | | 41 426,564 | 91 250,9 | VERIFIE |

D'où le nombre de foyers **au-dessus de chaque seuil** (calcul, HYPOTHESE de lecture) : 28 294 k, 7 364 k,
496 k, 61,5 k. C'est exactement la grandeur qui gouverne l'effet d'un déplacement de seuil (voir §4). Les
années 2019 à 2023 sont dans le même fichier (ex. 2023 : 61 k foyers au-delà de 177 106 €). Le nombre de parts
de ces foyers n'est **pas** publié.

### 1.2 Dixièmes de RFR par part, avec bornes et parts
DGFiP, « Impôt sur le revenu : répartition de l'impôt moyen par déciles de RFR par part » :
https://www.impots.gouv.fr/node/25518 (→ `.../ir/nid_25518_ir_deciles_rfr_par_part.xlsx`), onglet « a2024 »
(6e émission, revenus 2024). Classement **par part** (RFR / parts), effectifs en foyers.

| Dixième | Bornes RFR/part (k€) | Parts moyennes | RFR moyen/part (k€) | Impôt barème moyen/part (k€) |
|---|---|---|---|---|
| 1 | – 1,97 | 1,53 | 0,31 | 0 |
| 2 | 1,97 – 7,64 | 1,86 | 5,03 | 0,01 |
| 3 | 7,64 – 11,25 | 1,74 | 9,51 | 0 |
| 4 | 11,25 – 14,13 | 1,67 | 12,68 | 0 |
| 5 | 14,13 – 16,88 | 1,70 | 15,51 | 0,06 |
| 6 | 16,88 – 19,60 | 1,59 | 18,21 | 0,30 |
| 7 | 19,60 – 22,77 | 1,55 | 21,11 | 0,71 |
| 8 | 22,77 – 27,31 | 1,55 | 24,86 | 1,29 |
| 9 | 27,31 – 35,88 | 1,55 | 31,02 | 2,51 |
| 10 | > 35,88 | 1,60 | 67,31 | 10,05 |
| dont 1 % | > 89,68 | 1,73 | 216,35 | 33,29 |
| dont 0,1 % | > 301,76 | 1,82 | 896,81 | 89,72 |
| Ensemble | | 1,63 | 20,21 | 1,45 |

41,64 M foyers. Tout VERIFIE (lu dans le fichier). Remarque : la ligne du 1er dixième est décalée dans le
fichier (borne inférieure absente) ; lecture retenue ci-dessus, A_VERIFIER.

### 1.3 DGFiP Statistiques n°41 (novembre 2025), revenus 2024 (3e émission)
https://www.impots.gouv.fr/sites/default/files/media/9_statistiques/0_etudes_et_stats/0_publications/dgfip_statistiques/2025/num41_11/dgfip_stat_41.xlsx
(source `dgfip-stat-41-ir-2024`). Tableau 2 : RFR total 846,91 Md€, impôt au barème 98,84 Md€, hors barème
10,32 Md€ (+ CEHR 1,98) ; dernier dixième : RFR 272,66 Md€, impôt barème 67,14 Md€ ; dernier centième :
RFR 88,90 Md€, barème 24,01 Md€ ; dernier millième : RFR 38,14 Md€, barème 6,80 Md€ ; moyenne RFR/part du
millième 916 590 € ; cellule « nbpart » = 6 674 871,78 (vraisemblablement les parts du dernier dixième, soit
1,60 part par foyer, cohérent avec 1.2). VERIFIE (sauf l'interprétation de « nbpart » : A_VERIFIER). Ce fichier
ne donne que des moyennes par groupe, pas de bornes : c'est la faiblesse de `ir-brackets.py`.

### 1.4 IRCOM (par foyer, pas par part)
https://www.data.gouv.fr/fr/datasets/l-impot-sur-le-revenu-par-collectivite-territoriale/ ; fichier
« IRCOM 2025, revenus 2024 » :
https://static.data.gouv.fr/resources/limpot-sur-le-revenu-par-collectivite-territoriale-ircom/20260526-131537/ircom-2025-revenus-2024.zip
Tranches de **RFR par foyer** : 0–10 000, 10 001–12 000, 12 001–15 000, 15 001–20 000, 20 001–30 000,
30 001–50 000, 50 001–100 000, + de 100 000 € (VERIFIE, lu dans `ircom_communes_complet_revenus_2024.xlsx`).
Trop grossier en haut et sans parts : inutilisable pour le barème. Le total national est dans `national/national.xls`
(format .xls ancien, non lu faute de lecteur en bibliothèque standard).

### 1.5 Hauts revenus (250 k€, 500 k€, 1 M€)
**Non trouvé** : aucune publication officielle en libre accès ne donne le nombre de foyers ni le revenu au-delà
de 250 k€ / 500 k€ / 1 M€ par part. Seuls repères : dernier millième au-delà de 301,76 k€ de RFR par part
(1.2) ; 61,5 k foyers au-delà de 180 294 € de quotient (1.1) ; CDHR « environ 0,3 % des foyers » (gouvernement,
séance AN du 22/10/2024, https://www.assemblee-nationale.fr/dyn/17/comptes-rendus/seance/session-ordinaire-de-2024-2025/deuxieme-seance-du-mardi-22-octobre-2024 ;
A_VERIFIER, non relu). Les données POTE détaillées ne sont accessibles qu'au CASD (accès restreint).
Les déclarations nationales (https://data.economie.gouv.fr/explore/dataset/ir-declarations-2042-nat/information/)
donnent des totaux de cases, pas de distribution.

**Conclusion 1** : la distribution la plus fine utilisable est la combinaison (a) foyers au-dessus de chaque
seuil du barème (nid_25519, par foyer, en quotient familial, donc dans l'espace du barème) et (b) bornes de
dixièmes, P99, P99,9 de RFR par part avec parts moyennes (nid_25518). (a) est bien meilleur que les moyennes de
Statistiques n°41 pour estimer les bases par tranche (voir §4.2).

## 2. LexImpact socio-fiscal : seuils et tranche ajoutée

- L'interface (https://socio-fiscal.leximpact.an.fr) est une application JavaScript ; les pages de simulation
  ne sont pas lisibles sans navigateur (WebFetch ne voit que l'en-tête ; la page `/tutoriel` renvoie 404 le
  16/11/2026).
- Dans le code de l'application (paquet JS téléchargé le 16/11/2026, chunk de l'éditeur de paramètres), les
  barèmes (`Scale`, `brackets` = liste de `{rate, threshold}`) ont un éditeur avec un champ `threshold` modifiable
  et un bouton **« Ajouter un seuil »** (ou « Créer un barème »). Donc modifier un seuil et ajouter une tranche
  au-dessus de 45 % est possible dans l'interface. Statut : A_VERIFIER à la main (lu dans le code, pas testé).
- Les simulations budgétaires (sur données fiscales) sont **demandées** par l'interface (`/budgets/demands`,
  avec une adresse e-mail), puis mises en cache et partageables à l'adresse
  `https://socio-fiscal.leximpact.an.fr/budgets/simulations/<hash>`, comme les sources
  `leximpact-ir-tranche-*` existantes. A_VERIFIER : délai et éventuelle restriction d'accès.

### Simulations à lancer à la main (référence : PLF 2027, comme les sources existantes)
Seuils LexImpact de référence : 11 844 / 30 200 / 86 353 / 185 737 €. Une simulation = un seul paramètre modifié ;
lire « recettes d'IR de la simulation − 102,50 Md€ » comme pour les taux. Colonne « modèle » : prédiction du
modèle du §4 (Md€), à comparer.

| # | Modification | Valeur saisie | Modèle (Md€) |
|---|---|---|---|
| S1 | seuil 11 % +1 % | 11 962 | −0,67 |
| S2 | seuil 11 % +10 % | 13 028 | −6,31 |
| S3 | seuil 11 % −10 % | 10 660 | +7,29 |
| S4 | seuil 30 % +1 % | 30 502 | −0,76 |
| S5 | seuil 30 % +10 % | 33 220 | −6,78 |
| S6 | seuil 30 % −10 % | 27 180 | +8,35 |
| S7 | seuil 41 % +1 % | 87 217 | −0,065 |
| S8 | seuil 41 % +10 % | 94 988 | −0,58 |
| S9 | seuil 41 % −10 % | 77 718 | +0,77 |
| S10 | seuil 45 % +1 % | 187 594 | −0,006 |
| S11 | seuil 45 % +10 % | 204 311 | −0,054 |
| S12 | seuil 45 % −10 % | 167 163 | +0,069 |
| S13 | les 4 seuils +1 %, décote et plafonds QF inchangés | 11 962 / 30 502 / 87 217 / 187 594 | −1,51 |
| S14 | décote seule +1 % (plafonds personne seule et couple) | ×1,01 | (résidu de l'indexation) |
| S15 | tranche ajoutée 50 % au-delà de 250 000 € | seuil 250 000, taux 0,50 | +0,53 |
| S16 | tranche ajoutée 50 % au-delà de 500 000 € | 500 000 ; 0,50 | +0,26 |
| S17 | tranche ajoutée 50 % au-delà de 1 000 000 € | 1 000 000 ; 0,50 | +0,13 |
| S18 | tranche ajoutée 55 % au-delà de 250 000 € (linéarité) | 250 000 ; 0,55 | +1,06 |

Minimum utile si le temps manque : S1, S4, S7, S10 (pentes au point de référence), S13 et S15–S17 (queue).
S2/S3, S5/S6 mesurent la courbure (forme entre les seuils). Les prédictions S15–S17 sont les plus incertaines
(§4.4) : ce sont les plus importantes à lancer.

## 3. Autres estimations publiées

| Mesure | Chiffre | Source | Statut |
|---|---|---|---|
| Indexation de 2,1 % (PLF 2027, art. 2) | 4,2 Md€, soit 2,0 Md€ / point | `plf2027-evaluations-prealables` (dépôt) | HYPOTHESE (dépôt, non relu ici) |
| Indexation PLF 2025 / PLF 2026, par point | 1,85 / 1,9 Md€ | note du dépôt (`indexationPoint`) | A_VERIFIER (non relu ici) |
| Gel du barème PLF 2026 (≈ 1 % d'inflation) | 1,9 Md€ (Bercy), 200 000 nouveaux foyers imposables | Public Sénat, 14/10/2025 : https://www.publicsenat.fr/actualites/economie/budget-2026-avec-le-gel-du-bareme-de-limpot-sur-le-revenu-200-000-nouveaux-foyers-pourraient-devenir-imposables | A_VERIFIER (presse ; à confirmer dans l'évaluation préalable du PLF 2026, art. 2) |
| Indexation de la seule « première tranche » (≈ 1 %) | ≈ 700 M€ ; tout le barème ≈ 2 Md€ (A. de Montchalin, séance AN du 25/10/2025) | LCP : https://lcp.fr/index%2Ephp/actualites/bareme-de-l-impot-sur-le-revenu-les-deputes-retablissent-l-indexation-sur-l-inflation | A_VERIFIER (presse ; compte rendu officiel à relire) |
| Amendement Sénat I-177 rect. (PLF 2026) : seuil d'entrée 11 497 → 11 612 €, décote 889 → 882 € et 1 470 → 1 459 € | « préserve 1,7 Md€ sur 1,9 Md€ » du gel, soit ≈ 0,2 Md€ ; 200 000 foyers restent non imposables | https://www.senat.fr/enseance/2025-2026/138/Amdt_I-177.html | VERIFIE (lu) ; chiffrage de l'auteur |
| OFCE : gel total du barème | ≈ 1,2 Md€ | cité par recherche web, page OFCE non retrouvée | A_VERIFIER |
| Création de la tranche à 45 % au-delà de 150 000 € par part (PLF 2013, art. 3, revenus 2012) | 320 M€ par an, ≈ 50 000 contribuables | résumés de presse (ex. https://www.moneyvox.fr/actu/33373/assemblee-a-vote-une-nouvelle-tranche-impot-sur-le-revenu-a-45) ; texte du PLF lu (https://www.assemblee-nationale.fr/14/pdf/projets/pl0466.pdf, art. 3) sans le chiffrage | A_VERIFIER (évaluation préalable PLF 2013 non retrouvée) |
| Tranche à 50 % / 60 % au-delà de 250 000 € (amendements 2013, 2025) | aucun chiffrage dans les textes trouvés (ex. https://www.assemblee-nationale.fr/dyn/17/amendements/1906A/AN/218.pdf) | — | non trouvé |
| IPP, OFCE, Cour des comptes : nouvelle tranche du barème | non trouvé (l'OFCE chiffre 4 à 8 Md€ une « supertaxe » sur très hauts revenus, autre mesure) | — | non trouvé |

Les deux chiffres sur la « première tranche » divergent (0,7 contre ≈ 0,2 Md€) : le second inclut une baisse de
la décote et part d'un barème gelé ; aucun ne précise le champ. Le modèle (S1 : −0,67 Md€ pour +1 % du seuil
d'entrée) est proche du chiffre ministériel.

Ordre de grandeur historique (2013) : 320 M€ pour +4 points au-delà de 150 000 € donne une base de 8 Md€ de
revenu par part × parts au-delà du seuil (revenus 2012), à comparer aux 14,4 Md€ au-delà de 185 737 € de
LexImpact (revenus 2026). Les régimes diffèrent (revenus du capital au barème en 2013, PFU depuis 2018) :
comparaison indicative seulement.

## 4. Modèle proposé

### 4.1 Principe
Soit S(q) le nombre de **parts** dont le quotient familial dépasse q (parts des foyers concernés). Sans décote ni
plafonnement :

- impôt au barème = Σ_k r_k · ∫_{t_k}^{t_{k+1}} S(q) dq ;
- base d'un point de taux de la tranche k : B_k = ∫_{t_k}^{t_{k+1}} S(q) dq (ce que donne LexImpact) ;
- effet d'un déplacement du seuil k : dR/dt_k = −(r_k − r_{k−1}) · S(t_k) ;
- tranche ajoutée (seuil u, taux r) : ΔR = (r − r_4) · ∫_u^∞ S(q) dq.

S(q) est pris **par morceaux de Pareto** : S(q) = S_k (q/t_k)^(−a_k) sur [t_k, t_{k+1}], queue de Pareto au-delà
de t_4. Toutes les intégrales sont analytiques : S_k t_k / (a_k − 1) · (1 − (t_{k+1}/t_k)^(1−a_k)). Coût : quelques
dizaines d'opérations, sans grille ; compatible avec `simulate` < 5 ms.

### 4.2 Vérification de la forme avec les données DGFiP seules
Exposants de Pareto entre seuils tirés des effectifs de nid_25519 (revenus 2024, mêmes parts moyennes
supposées) : 1,438 (11 %→30 %), 2,569 (30 %→41 %), 2,725 (41 %→45 %). Avec un seul facteur d'échelle fixé sur la
base 11 % de LexImpact (471,8 Md€) :

| Tranche | Prédit (Md€ de base) | LexImpact | Écart |
|---|---|---|---|
| 30 % | 209,9 | 190,6 | +10 % |
| 41 % | 33,4 | 24,7 | +35 % |

Bien meilleur que `ir-brackets.py` (−26 % sur 11 %), mais l'écart croît vers le haut : les foyers des tranches
hautes ont moins de parts **effectives** (plafonnement du quotient familial, plus de personnes seules). D'où le
calage.

### 4.3 Calage exact sur LexImpact (HYPOTHESE)
Inconnues : S(t_1) et les exposants a_1…a_4. On fixe S(t_1) par la forme du 4.2 (51,9 M parts, soit
1,83 part effective par foyer au-dessus de t_1 avec les effectifs 2024), puis on résout tranche par tranche
S(t_{k+1}) pour que ∫ = B_k, et a_4 = 1 + S(t_4) t_4 / B_5. Résultat (espace LexImpact, seuils 2027) :

| | t_1 = 11 844 | t_2 = 30 200 | t_3 = 86 353 | t_4 = 185 737 |
|---|---|---|---|---|
| S(t_k), M parts | 51,88 | 13,50 | 0,694 | 0,0795 |
| parts effectives par foyer (effectifs 2024) | 1,83 | 1,83 | 1,40 | 1,29 |
| exposant de la tranche qui suit | 1,438 | 2,825 | 2,829 | 2,027 (queue) |

Les parts effectives sont plausibles (1,55 à 1,82 parts réelles selon 1.2 ; le plafonnement du QF les réduit en
haut ; la croissance 2024→2026 du nombre de foyers et l'amplification par la décote, ×1,4525 dans sa zone, les
gonflent en bas). La queue (a = 2,03 en quotient) est moins épaisse que celle du RFR par part (P99 → P99,9 :
89,68 → 301,76 k€, a ≈ 1,90 ; moyenne au-delà de P99,9 / P99,9 = 2,97, a ≈ 1,5), ce qui est attendu : le RFR
contient les revenus au PFU, hors barème.

Par construction, les sensibilités de taux sont **exactement** celles de LexImpact (4,718 / 1,906 / 0,247 /
0,144 Md€) et restent linéaires en taux : le critère d'acceptation « ±5 % » de l'étape 24 est tenu.

Conversion d'année : le simulateur garde son barème 2026 ; un seuil saisi t est porté dans l'espace du modèle par
t × (T_LEX,k / T_SIM,k) = t × 1,021 (HYPOTHESE, même convention que les taux aujourd'hui). La tranche ajoutée
utilise le facteur de t_4.

La tranche à 0 % (base 484,9 Md€, dominée par la décote) reste traitée à part : base linéaire
B_1(t_1) = B_1 + S(t_1) · (t_1 − T_1), utile seulement si le taux de 0 % est modifié (HYPOTHESE).

### 4.4 Résultats du modèle (statique, Md€, espace LexImpact)
- Seuils (+1 % / +10 % / −10 %) : t_1 −0,67 / −6,31 / +7,29 ; t_2 −0,76 / −6,78 / +8,35 ; t_3 −0,065 / −0,58 / +0,77 ;
  t_4 −0,006 / −0,054 / +0,069. Pente analytique au point de référence : −0,676 / −0,775 / −0,066 / −0,006.
- Les quatre seuils +1 % (sans décote ni QF) : −1,51 Md€, contre −2,0 Md€ par point pour l'indexation officielle
  (qui indexe aussi décote et plafonds QF et porte sur 2027). Résidu ≈ 0,49 Md€ / point attribué à la décote et
  aux plafonds du QF (HYPOTHESE, à confirmer par S13/S14).
- Tranche ajoutée, taux 50 / 55 / 60 % : au-delà de 250 000 € +0,53 / +1,06 / +1,59 ; de 500 000 € +0,26 / +0,52 /
  +0,78 ; de 1 000 000 € +0,13 / +0,26 / +0,38.
- Sensibilité à la queue (+5 points, en gardant B_5 = 14,38 Md€) : a = 1,6 / 2,0 / 2,5 donne au-delà de 250 k€
  0,60 / 0,53 / 0,46 ; de 500 k€ 0,40 / 0,27 / 0,16 ; de 1 M€ 0,26 / 0,13 / 0,06 Md€. Facteur 4 d'incertitude au-delà
  de 1 M€ sans simulation LexImpact.

### 4.5 Décote et quotient familial (approximations, HYPOTHESE)
- Décote : pas modélisée explicitement. Son effet sur les seuils bas est absorbé par le calage de S(t_1) sur la base
  11 % (même population que la hausse de taux). Pour l'indexation, le résidu de 0,49 Md€ / point la porte.
  Si les simulations S1/S14 sont faites, remplacer par un coefficient mesuré.
- Plafonnement du QF : traité par les « parts effectives » calées (1,40 et 1,29 en haut). On néglige la variation du
  plafonnement quand les seuils bougent (second ordre).
- Interaction taux × seuil : naturelle dans le modèle (R = Σ r_k ∫ S). L'effet n'est donc plus additif entre leviers
  de l'IR : le moteur doit calculer l'effet du barème **en bloc** (référence − scénario) et le répartir par levier
  « tous sauf celui-ci », l'écart en « Effets combinés » (comme prévu au §14.3).

### 4.6 Erreur attendue (HYPOTHESE)
| Effet | Erreur probable | Raison |
|---|---|---|
| Taux des tranches existantes | 0 au point de référence | calage exact |
| Seuils 11 % et 30 %, ±10 % | ±15 à 25 % | S(t) déduit de la base 11 %, décote non séparée ; recoupé par le chiffre de 0,7 Md€ (seuil d'entrée +1 %) |
| Seuils 41 % et 45 % | ±20 à 30 % | parts effectives de haut de barème non publiées |
| Indexation globale | 0 si le résidu décote/QF est gardé | calage sur 2,0 Md€ / point |
| Tranche ajoutée ≥ 500 k€ | facteur 2 (500 k€) à 4 (1 M€) | exposant de queue non publié en quotient |

Après S1–S18, l'erreur des seuils devrait tomber sous 10 % et celle de la tranche ajoutée sous 20 %
(interpolation entre 250 k€, 500 k€ et 1 M€).

## 5. Ordre des seuils, bornes et indexation

Proposition (seuils = valeurs absolues en € par part, PLAN §14.4) :

1. Seuil effectif de chaque tranche : t_k^eff = valeur fixée si le curseur a été touché, sinon référence ×
   (1 + indexation). La décote et les plafonds du QF suivent toujours l'indexation.
2. Bornes affichées du curseur k : [max(0, t_{k−1}^eff + 1 €), min(2 × référence, t_{k+1}^eff − 1 €)]. Le pas
   peut être 10 € (seuils publiés à l'euro).
3. Tranche ajoutée : `incomeTax.extraBracket.threshold` borné à [t_4^eff + 1 €, 2 × valeur par défaut] et
   `.rate` borné comme les autres taux (0 à 2 × 45 % = 90 %). Inactive tant que son taux vaut celui de la tranche
   du dessous (aucun effet, quel que soit le seuil). Valeur par défaut du seuil à arbitrer (ex. 2 × t_4 = 363 834 €,
   bornes jusqu'à 727 668 € ; ou une valeur ronde) : un choix de neutralité pour le mainteneur.
4. Scénario importé ou indexation qui casse l'ordre : le moteur ordonne en bloquant chaque seuil entre ses
   voisins effectifs (clamp dans l'ordre des indices), la tranche concernée devient vide ; un message l'indique.
   Les leviers ne sont jamais réécrits dans l'URL (le lien se rouvre à l'identique).
5. Rendement : effet du barème = R_modèle(t^eff, taux, tranche ajoutée) − R_modèle(référence) ;
   effet de l'indexation hors barème = −indexation × 100 × (2,0 − 1,51) Md€ (résidu décote/QF), plus l'effet des
   seuils non fixés déjà compris dans R_modèle. Au point de référence, toute l'indexation redonne 2,0 Md€ / point.
6. Ménages : `applyToRules` met les seuils effectifs dans `rules.incomeTax.brackets` et ajoute une 6e tranche si
   le taux ajouté diffère de 45 % (le calcul par foyer reste exact, l'estimation macro seule est modélisée).

## 6. Questions ouvertes
1. Lancer S1–S18 sur LexImpact (en priorité S1, S4, S7, S10, S13, S15–S17) et vérifier que l'éditeur accepte bien
   l'ajout d'un seuil (« Ajouter un seuil » lu dans le code, non testé).
2. Relire les évaluations préalables des PLF 2025, 2026, 2027 (article « barème ») pour confirmer 1,85 / 1,9 /
   2,0 Md€ par point et chercher un chiffrage séparé de la décote.
3. Confirmer le chiffre de 700 M€ (indexation de la seule première tranche) dans le compte rendu officiel de la
   séance AN du 25/10/2025, et son champ (seuil d'entrée seul ?).
4. Retrouver l'évaluation préalable de l'article 3 du PLF 2013 (320 M€, 50 000 contribuables) sur un site officiel.
5. Nombre de foyers au-delà de 250 k€ / 500 k€ / 1 M€ (RFR ou quotient) : non publié en libre accès ; à demander à
   la DGFiP ou à prendre de LexImpact (S15–S17).
6. Lecture de la ligne du 1er dixième de nid_25518 (colonne manquante) et de la cellule « nbpart » de
   Statistiques n°41.
7. Arbitrage : seuil par défaut et bornes de la tranche ajoutée (§5.3).

## 7. Liens à confirmer (récapitulatif)
- https://www.impots.gouv.fr/node/25519 (foyers par TMI, 2019–2024) — VERIFIE
- https://www.impots.gouv.fr/node/25518 (dixièmes de RFR par part, 2003–2024) — VERIFIE
- https://www.impots.gouv.fr/sites/default/files/media/9_statistiques/0_etudes_et_stats/0_publications/dgfip_statistiques/2025/num41_11/dgfip_stat_41.xlsx — VERIFIE
- https://www.impots.gouv.fr/node/28082 (page des tableaux statistiques de l'IR) — VERIFIE
- https://www.data.gouv.fr/fr/datasets/l-impot-sur-le-revenu-par-collectivite-territoriale/ (IRCOM) — VERIFIE
- https://socio-fiscal.leximpact.an.fr (éditeur de barème, simulations partagées) — A_VERIFIER à la main
- https://www.senat.fr/enseance/2025-2026/138/Amdt_I-177.html — VERIFIE
- https://lcp.fr/index%2Ephp/actualites/bareme-de-l-impot-sur-le-revenu-les-deputes-retablissent-l-indexation-sur-l-inflation — A_VERIFIER
- https://www.publicsenat.fr/actualites/economie/budget-2026-avec-le-gel-du-bareme-de-limpot-sur-le-revenu-200-000-nouveaux-foyers-pourraient-devenir-imposables — A_VERIFIER
- https://www.assemblee-nationale.fr/14/pdf/projets/pl0466.pdf (PLF 2013, texte de l'art. 3 sans chiffrage) — VERIFIE pour le texte seulement
- Évaluation préalable PLF 2027 (`plf2027-evaluations-prealables`, dépôt) — non relue ici
