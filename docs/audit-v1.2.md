# Audit des données de la v1.2 (étape 20)

Consultation des sources : 16 novembre 2026. Ce document fait la synthèse de trois audits détaillés, qui
contiennent chaque valeur, sa source, son lien et son statut :

- [Reste à vivre : dépenses pré-engagées et revenu arbitrable](audit-v1.2/reste-a-vivre.md)
- [Barème de l'impôt sur le revenu : seuils et tranche ajoutée](audit-v1.2/bareme-ir.md), calculs dans
  `scripts/estimates/ir-thresholds.py`
- [Lignes des profils et curseurs](audit-v1.2/lignes-profils.md)

Aucun code de l'application ni fichier de données n'a été modifié. Rien n'entre dans `src/data/` avant validation.
Les étapes 21 (bloc collé) et 22 (vues des répartitions) n'ont pas besoin de données nouvelles.

## Résultat

| Sujet | Constat |
|---|---|
| Reste à vivre | Définition INSEE claire, mais **aucune part pré-engagée publiée par l'INSEE par niveau de vie**. Seule source utilisable : Budget de famille 2017, en part de la consommation (27,9 % en moyenne, de 35,3 % au 1er décile à 20,8 % au 10e) |
| Barème de l'IR | Distribution DGFiP par taux marginal (seuils exacts) trouvée. Un modèle calé retrouve exactement les sensibilités LexImpact des taux ; seuils fiables à ±15–30 %, tranche ajoutée incertaine d'un facteur 2 à 4 au-delà de 500 k€ par part |
| Lignes des profils | Table ligne → curseurs établie par lecture du code et vérifiée par balayage des 450 curseurs ; 3 lignes n'ont aucun curseur |

## Fiabilité : ce qu'il faut savoir

1. **Reste à vivre : données de 2017.** L'enquête Budget de famille suivante est collectée en 2026, avec des
   résultats annoncés pour 2028 (CNIS, à vérifier). Les parts pré-engagées par niveau de vie sont donc calculées
   par nous depuis les tableaux INSEE 2017 (`HYPOTHESE`). Les études DREES (2018) et France Stratégie (2021)
   recoupent l'ordre de grandeur, mais avec une définition plus large (emprunts immobiliers compris).
2. **Comptabilité nationale non comparable aux profils.** En 2025, les dépenses pré-engagées pèsent 30,3 % du
   revenu disponible brut, mais 40 % d'entre elles sont des loyers imputés aux propriétaires, absents des profils.
   Ce chiffre sera cité en Méthodologie, pas utilisé dans le calcul.
3. **TVA sur l'énergie : 20 % sur toute la facture d'électricité et de gaz depuis le 1er août 2025** (BOFiP
   BOI-RES-TVA-000209). Le taux réduit sur l'abonnement ne doit plus être modélisé ; à vérifier dans `taxRules.json`
   à l'étape 25.
4. **Seuils du barème : le calage repose sur LexImpact.** Les sensibilités actuelles des taux viennent de
   simulations LexImpact (législation 2027). Le modèle de distribution les retrouve exactement, mais l'effet d'un
   seuil ou d'une tranche ajoutée reste une extrapolation tant que les 18 simulations listées dans l'annexe
   (§2, S1 à S18) n'ont pas été lancées. Elles se demandent avec une adresse électronique sur
   https://socio-fiscal.leximpact.an.fr et se partagent par lien, comme les sources existantes. Priorité :
   S1, S4, S7, S10, S13, S15 à S17.
5. **Aucun comptage officiel ouvert au-delà de 250 k€ de revenu par part.** La queue des hauts revenus est un
   modèle de Pareto (exposant 2,03 issu du calage, `HYPOTHESE`).
6. **Lignes des profils : les interactions sont fortes là où il y a des seuils.** La part « Effets combinés » va
   de −23 % (impôt du SMIC, décote) à 100 % (prime d'activité) ; elle est exacte par construction mais devra
   être expliquée dans la fenêtre.
7. **Limites d'accès.** Légifrance n'a pas pu être lu automatiquement (taux de TVA des télécoms, cantines,
   abonnements télé : `A_VERIFIER`). L'éditeur de barème de LexImpact n'a été vu que dans son code : l'ajout d'une
   tranche est à confirmer à la main. Plusieurs valeurs de France Stratégie ont été lues sur des graphiques.

## Constats sur le site en ligne

Relevés pendant l'audit, sans lien direct avec la v1.2 :

- un étudiant décrit dans « Votre foyer » ne reçoit pas le coût par étudiant de l'enseignement supérieur dans ses
  services publics, contrairement au profil type « Étudiant » ;
- la ligne « CSG, CRDS et CASA sur la pension » contient aussi la cotisation maladie de 1 % sur la retraite
  complémentaire : son libellé est incomplet ;
- le curseur d'accise sur le fioul domestique et cinq groupes de dépenses sans montant (03.5, 06.5, 08.5, 09.7,
  10.8) ne font varier aucune ligne de profil.

## Décisions à prendre

Chaque décision a une recommandation ; le détail est dans l'annexe citée.

### Reste à vivre ([annexe](audit-v1.2/reste-a-vivre.md) §6 et §7)

| N° | Question | Recommandation |
|---|---|---|
| R1 | Définition | INSEE, version enquêtes : sans loyers imputés ni remboursements d'emprunt ; télévision payante omise (non isolable) |
| R2 | Part pré-engagée rapportée à quoi ? | À la consommation, comme la source : appliquée à la consommation du profil, déjà tirée de Budget de famille 2017 |
| R3 | Profils types (loyer non décrit) | Part par décile de niveau de vie, tous statuts d'occupation (TF106) : pas d'hypothèse locataire ou propriétaire |
| R4 | Votre foyer | Loyer saisi (brut, aide au logement comprise dans le revenu) + parts hors loyer du décile le plus proche |
| R5 | Actualisation 2017 → 2026 | Recaler chaque poste par son indice des prix INSEE (énergie, loyers, télécoms, assurances), `HYPOTHESE` |
| R6 | Effet du scénario | Prélèvements et prestations par le revenu disponible ; TVA et accises par la variation déjà calculée sur l'énergie de chaque profil (pas besoin de prix au kWh) ; volumes figés |
| R7 | Taxe foncière | Laisser le revenu disponible du projet tel quel (taxe foncière déduite, comme en comptabilité nationale) et le dire en Méthodologie |
| R8 | Variante avec emprunt immobilier | Non : hors définition INSEE |

### Barème de l'IR ([annexe](audit-v1.2/bareme-ir.md) §4 et §5)

| N° | Question | Recommandation |
|---|---|---|
| B1 | Modèle de rendement | Distribution des parts par quotient (DGFiP, foyers par taux marginal), Pareto par morceaux, calée exactement sur les sensibilités LexImpact des taux ; seuils et tranche ajoutée `HYPOTHESE` |
| B2 | Simulations LexImpact | Le mainteneur lance au moins S1, S4, S7, S10, S13, S15 à S17 avant l'étape 24 ; le modèle est recalé dessus |
| B3 | Bornes des seuils | 0 à 2 fois le seuil, et toujours entre les seuils voisins effectifs (le curseur s'arrête au voisin) |
| B4 | Tranche ajoutée | Seuil par défaut 2 fois le seuil de la tranche à 45 %, de ce seuil à 10 fois ce seuil ; taux de 0 à 90 % comme les autres, inactive à 45 % |
| B5 | Indexation | Un seuil modifié est absolu ; l'indexation s'applique aux autres seuils, à la décote et aux plafonds du quotient familial. Son rendement reste celui d'aujourd'hui (environ 2,0 Md€ par point), réparti entre seuils (modèle) et décote et quotient (reste, `HYPOTHESE`) |
| B6 | Calcul | Le barème est calculé d'un bloc (taux, seuils, tranche ajoutée), plus par addition d'effets de curseurs |

### Lignes des profils ([annexe](audit-v1.2/lignes-profils.md) §3 à §6)

| N° | Question | Recommandation |
|---|---|---|
| L1 | Trois lignes sans curseur (cotisations d'indépendant, cotisations et versement libératoire du micro-entrepreneur) | Ligne non cliquable avec la mention « aucun curseur ne la modifie » ; critère de l'étape 23 adapté en conséquence |
| L2 | Effet par curseur | Remettre le curseur à sa valeur de référence (et non le retirer, à cause des montants de fonction, groupe et poste qui se recouvrent), calcul au clic sur le seul profil concerné |
| L3 | Table ligne → curseurs | Motifs d'identifiants (par exemple `incomeTax.*`), testés par un balayage : aucun curseur hors de la table ne fait varier la ligne |
| L4 | Lignes détaillées sans changement du moteur | Services publics par fonction ; cotisations une par une (avec une ligne pour la réduction générale) ; CSG, CRDS et CASA séparées ; impôt sur le revenu avant décote et décote |
| L5 | Lignes détaillées avec changement du moteur | Cotisations d'indépendant détaillées ; montants par adulte dans « Votre foyer » à deux adultes. Les cotisations du micro-entrepreneur restent une ligne (taux global) |
| L6 | TVA et accises (plus de 50 curseurs) | Deux sous-lignes : « effet des taux » et « effet de la consommation » (les curseurs qui changent le revenu) |
| L7 | Cotisations patronales qui bougent avec les cotisations salariales (salaire net fixé, brut recalculé) | Garder ce choix du modèle et l'expliquer dans la fenêtre de la ligne |
| L8 | Constats sur le site en ligne (étudiant de « Votre foyer », libellé de la ligne pension, curseurs sans effet) | Corriger à l'étape 23 ; exclure de la table les curseurs sans effet |

Arbitrages retenus le 16 novembre 2026 (PLAN.MD §14.7) : toutes les recommandations, sauf R8, remplacée par un
champ « remboursement mensuel de l'emprunt immobilier » pour les propriétaires de « Votre foyer ».
