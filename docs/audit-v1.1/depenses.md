# Audit des dépenses : niveau 3 par groupe COFOG (Étape 13)

Consulté le 07/11/2026. Montants en Md€, année 2024, sauf mention. Document de recherche : aucun fichier du dépôt modifié.

## 1. Résultat

- 69 groupes : **14** en postes concrets, **3** mixtes (nature + un poste concret), **42** par nature, **10** sans niveau 3.
- **314 leviers de niveau 3**, lignes « Autres » comprises. La somme des postes égale le groupe dans chaque cas (contrôlé par script), et aucune ligne n'est négative.
- Toutes les prestations demandées ont un montant 2024 lu dans une source officielle, sauf les réserves du §5.
- Limite principale : **aucune table officielle de passage entre les comptes de la protection sociale (CPS) et la COFOG n'a été trouvée**. Le rattachement d'un poste à un groupe est donc une déduction, étayée par les recoupements du §3.

### Lecture des statuts

- **VERIFIE** : valeur lue dans la source pour 2024, même périmètre que le groupe (Eurostat).
- **montant VERIFIE ; rattachement HYPOTHESE** : le montant est lu dans la source, son affectation à ce groupe COFOG est déduite.
- **HYPOTHESE (montant PLF, pas exécution)** : crédits de paiement du PLF 2024. Ce n'est ni la LFI votée ni l'exécution.
- **A_VERIFIER** : point à confirmer, voir §7.

### Codes de source

| Code | Source |
|---|---|
| E | Eurostat `gov_10a_exp`, S13, nature (`na_item`) |
| E-S | Eurostat `gov_10a_exp`, sous-secteur S1313, TE, non consolidé |
| CPS | DREES, comptes de la protection sociale, jeu 305, secteurs publics S13111, S13112, S1313, S13141, S13142, sauf mention S15 |
| CNS | DREES, comptes de la santé, `cns_financement`, financeur f100 (administrations publiques) |
| PLF | Crédits de paiement PLF 2024, data.economie.gouv.fr |
| SEN | Sénat, rapport n° 743 (2024-2025), annexe 33 |

## 2. Eurostat : nature et sous-secteurs

**Codes utiles.** D1 Personnel, P2 Achats, P51G Investissement, D3 Subventions, D62 Prestations en espèces, D632 Prestations en nature, D7 Transferts courants, D9 Transferts en capital, D4 Revenus de la propriété, NP Actifs non produits, D29_D5_D8 Autres impôts.

**La nature à quatre lignes ne suffit pas partout.**

| Cas | Groupes | Constat | Traitement proposé |
|---|---|---|---|
| Tout en D632 | 07.1, 07.2 | 100 % en D632 : D1, P2 et P51G nuls | Postes concrets |
| Prestations dominantes | 10.1 à 10.7 | D62 et D632 dominent | Postes concrets |
| Intérêts | 01.7 | D4 = 60,166 et P2 négatif (−1,296) : une ligne Achats négative est impossible avec des bornes 0 à 2× | Pas de niveau 3, voir P5 |
| « Autres » > 25 % du groupe | 02.3, 04.1, 04.2, 04.3, 04.4, 04.5, 04.6, 04.7, 04.9, 05.3, 05.5, 06.1, 06.6, 07.4, 07.6, 08.4, 09.5, 09.8 | Subventions, transferts ou aides | Lignes supplémentaires Subventions (D3), Transferts (D7 + D9), Prestations et aides (D62 + D632). **Écart à la règle §13.2, à valider (P1)** |
| Stocks | 02.1 | P5 − P51G = 1,274 (stocks militaires) | Reste dans « Autres » |
| NP négatif | 06.1 | NP = −0,134 rendrait « Autres » négatif | Ligne unique « Transferts et autres » |
| Montant nul | 03.5, 06.5, 08.5, 09.7, 10.8 | TE = 0 | Pas de niveau 3 |

**Sous-secteurs : oui, disponibles.** `gov_10a_exp` croise `cofog99`, `na_item` et `sector` (S13, S1311, S1312, S1313, S1314) ; S1312 est sans objet en France. La requête `geo=FR&unit=MIO_EUR&time=2024` renvoie tout en une fois (7 840 valeurs). **Les sous-secteurs ne sont pas consolidés entre eux** : leur somme dépasse S13. Exemple : 01.8 vaut 45,698 en S1311 et 0,000 en S13. Les codes `D7_S13xx` et `D9_S13xx` permettent de suivre ces flux. Un montant de sous-secteur reste utile quand un groupe est porté par un seul acteur (03.2, 05.1, 01.3), pas pour une somme.

## 3. Recoupement CPS et COFOG

Les prestations publiques des CPS se comparent à D62 + D632 du groupe.

| Groupe | D62 + D632 | CPS public | Écart | Lecture |
|---|---:|---:|---:|---|
| 07.1 + 07.2 | 135,504 | 135,33 | −0,17 | Ville, cliniques, Camieg, C2S, médico-social hors handicap |
| 10.1 | 53,556 | 54,278 | +0,72 | IJ, invalidité et AT-MP. S'y ajoute D7 = 23,730, proche des 21,248 versés par les ISBLSM (handicap et Esat) |
| 10.2 | 372,933 | 370,278 | −2,65 | Vieillesse |
| 10.3 | 40,255 | 41,275 | +1,02 | Survie |
| 10.5 | 41,800 | 43,497 | +1,70 | Emploi |
| 10.6 | 16,372 | 16,059 | −0,31 | Logement |
| 10.7 | 29,074 | 26,953 | −2,12 | Pauvreté, hors bourses du supérieur (2,603) |

Le risque Famille ne se compare pas de la même façon : 10.4 a D62 + D632 = 46,498 contre 55,836 en CPS public, car une partie passe par la rémunération (D1) et les services (crèches, ASE).

Bourses : D62 de 09.6 = 2,696 pour 2,603 de bourses du supérieur, et D62 de 09.2 = 1,406 pour 1,252 de bourses du primaire et du secondaire. Elles sont donc placées en 09.x et non en 10.x, contre la classification des CPS.

## 4. Tableaux par fonction

### 01 Services généraux des administrations publiques

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 01.1 | Organes exécutifs et législatifs, affaires financières et fiscales, affaires étrangères | 42,818 | Mixte (nature + poste) | Personnel | 12,533 | E | VERIFIE | `spending.cofog.01.1.compensation` |
|  | | |  | Achats | 3,361 | E | VERIFIE | `spending.cofog.01.1.purchases` |
|  | | |  | Investissement | 0,762 | E | VERIFIE | `spending.cofog.01.1.investment` |
|  | | |  | Contribution au budget de l'UE (PSR-UE) | 22,300 | SEN | montant VERIFIE ; rattachement A_VERIFIER | `spending.cofog.01.1.eu-contribution` |
|  | | |  | Autres transferts | 3,596 | E | HYPOTHESE (D7+D9 moins PSR-UE) | `spending.cofog.01.1.transfers` |
|  | | |  | Autres | 0,267 | calculé | HYPOTHESE | `spending.cofog.01.1.other` |
| 01.2 | Aide économique extérieure | 4,881 | Postes concrets | Solidarité à l'égard des pays en développement (P209) | 2,828 | PLF | HYPOTHESE (part PLF × groupe) | `spending.cofog.01.2.development-p209` |
|  | | |  | Aide économique et financière (P110) | 1,925 | PLF | HYPOTHESE (part PLF × groupe) | `spending.cofog.01.2.development-p110` |
|  | | |  | Autres | 0,129 | calculé | HYPOTHESE | `spending.cofog.01.2.other` |
| 01.3 | Services généraux | 53,780 | Par nature | Personnel | 27,836 | E | VERIFIE | `spending.cofog.01.3.compensation` |
|  | | |  | Achats | 11,215 | E | VERIFIE | `spending.cofog.01.3.purchases` |
|  | | |  | Investissement | 10,238 | E | VERIFIE | `spending.cofog.01.3.investment` |
|  | | |  | Autres | 4,491 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.01.3.other` |
| 01.4 | Recherche fondamentale | 19,881 | Par nature | Personnel | 6,809 | E | VERIFIE | `spending.cofog.01.4.compensation` |
|  | | |  | Achats | 2,220 | E | VERIFIE | `spending.cofog.01.4.purchases` |
|  | | |  | Investissement | 10,035 | E | VERIFIE | `spending.cofog.01.4.investment` |
|  | | |  | Autres | 0,816 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.01.4.other` |
| 01.5 | R&D concernant des services généraux des administrations publiques | 0,006 | Pas de niveau 3 | < 0,5 Md€ | | | | |
| 01.6 | Services généraux des administrations publiques n.c.a. | 0,867 | Par nature | Personnel | 0,224 | E | VERIFIE | `spending.cofog.01.6.compensation` |
|  | | |  | Achats | 0,239 | E | VERIFIE | `spending.cofog.01.6.purchases` |
|  | | |  | Investissement | 0,215 | E | VERIFIE | `spending.cofog.01.6.investment` |
|  | | |  | Autres | 0,189 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.01.6.other` |
| 01.7 | Opérations concernant la dette publique | 58,870 | Pas de niveau 3 | Arbitrage : charge d'intérêts sortante du calcul de dette, voir P5 | | | | |
| 01.8 | Transferts de caractère général entre administrations publiques | 0,000 | Pas de niveau 3 | < 0,5 Md€ | | | | |

### 02 Défense

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 02.1 | Défense militaire | 47,702 | Par nature | Personnel | 18,263 | E | VERIFIE | `spending.cofog.02.1.compensation` |
|  | | |  | Achats | 18,150 | E | VERIFIE | `spending.cofog.02.1.purchases` |
|  | | |  | Investissement | 9,233 | E | VERIFIE | `spending.cofog.02.1.investment` |
|  | | |  | Autres | 2,056 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.02.1.other` |
| 02.2 | Défense civile | 0,229 | Pas de niveau 3 | < 0,5 Md€ | | | | |
| 02.3 | Aide militaire à des pays étrangers | 2,007 | Par nature | Personnel | 0,511 | E | VERIFIE | `spending.cofog.02.3.compensation` |
|  | | |  | Achats | 0,589 | E | VERIFIE | `spending.cofog.02.3.purchases` |
|  | | |  | Investissement | 0,093 | E | VERIFIE | `spending.cofog.02.3.investment` |
|  | | |  | Transferts | 0,812 | E | VERIFIE | `spending.cofog.02.3.transfers` |
|  | | |  | Autres | 0,000 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.02.3.other` |
| 02.4 | R&D concernant la défense | 1,682 | Par nature | Personnel | 1,254 | E | VERIFIE | `spending.cofog.02.4.compensation` |
|  | | |  | Achats | 0,265 | E | VERIFIE | `spending.cofog.02.4.purchases` |
|  | | |  | Investissement | 0,153 | E | VERIFIE | `spending.cofog.02.4.investment` |
|  | | |  | Autres | 0,009 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.02.4.other` |
| 02.5 | Défense n.c.a. | 2,580 | Par nature | Personnel | 1,312 | E | VERIFIE | `spending.cofog.02.5.compensation` |
|  | | |  | Achats | 0,492 | E | VERIFIE | `spending.cofog.02.5.purchases` |
|  | | |  | Investissement | 0,499 | E | VERIFIE | `spending.cofog.02.5.investment` |
|  | | |  | Autres | 0,277 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.02.5.other` |

### 03 Ordre et sécurité publics

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 03.1 | Services de police | 28,896 | Postes concrets | Police nationale (P176) | 12,933 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.03.1.national-police` |
|  | | |  | Gendarmerie nationale (P152) | 10,393 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.03.1.gendarmerie` |
|  | | |  | Collectivités locales (polices municipales) | 3,235 | E-S | VERIFIE (S1313, non consolidé) | `spending.cofog.03.1.local-police` |
|  | | |  | Autres | 2,336 | calculé | HYPOTHESE | `spending.cofog.03.1.other` |
| 03.2 | Services de protection civile | 7,937 | Postes concrets | Collectivités locales (dont SDIS) | 7,090 | E-S | VERIFIE (S1313, non consolidé) | `spending.cofog.03.2.local-fire-rescue` |
|  | | |  | Sécurité civile (P161) | 0,735 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.03.2.civil-security` |
|  | | |  | Autres | 0,113 | calculé | HYPOTHESE | `spending.cofog.03.2.other` |
| 03.3 | Tribunaux | 8,295 | Postes concrets | Justice judiciaire (P166) | 4,544 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.03.3.courts` |
|  | | |  | Protection judiciaire de la jeunesse (P182) | 1,126 | PLF | HYPOTHESE, rattachement A_VERIFIER | `spending.cofog.03.3.youth-justice` |
|  | | |  | Accès au droit, aide juridictionnelle (P101) | 0,734 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.03.3.legal-aid` |
|  | | |  | Juridictions administratives (P165) | 0,583 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.03.3.administrative-courts` |
|  | | |  | Autres | 1,307 | calculé | HYPOTHESE | `spending.cofog.03.3.other` |
| 03.4 | Administration pénitentiaire | 5,120 | Par nature | Personnel | 3,082 | E | VERIFIE | `spending.cofog.03.4.compensation` |
|  | | |  | Achats | 1,301 | E | VERIFIE | `spending.cofog.03.4.purchases` |
|  | | |  | Investissement | 0,610 | E | VERIFIE | `spending.cofog.03.4.investment` |
|  | | |  | Autres | 0,127 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.03.4.other` |
| 03.5 | R&D concernant l'ordre et la sécurité publics | 0,000 | Pas de niveau 3 | montant nul | | | | |
| 03.6 | Ordre et sécurité publics n.c.a. | 1,865 | Par nature | Personnel | 0,968 | E | VERIFIE | `spending.cofog.03.6.compensation` |
|  | | |  | Achats | 0,433 | E | VERIFIE | `spending.cofog.03.6.purchases` |
|  | | |  | Investissement | 0,260 | E | VERIFIE | `spending.cofog.03.6.investment` |
|  | | |  | Autres | 0,203 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.03.6.other` |

### 04 Affaires économiques

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 04.1 | Tutelle de l'économie générale, des échanges et de l'emploi | 45,257 | Par nature | Personnel | 3,752 | E | VERIFIE | `spending.cofog.04.1.compensation` |
|  | | |  | Achats | 2,840 | E | VERIFIE | `spending.cofog.04.1.purchases` |
|  | | |  | Investissement | 0,755 | E | VERIFIE | `spending.cofog.04.1.investment` |
|  | | |  | Subventions | 19,951 | E | VERIFIE | `spending.cofog.04.1.subsidies` |
|  | | |  | Transferts | 17,687 | E | VERIFIE | `spending.cofog.04.1.transfers` |
|  | | |  | Autres | 0,273 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.1.other` |
| 04.2 | Agriculture, sylviculture, pêche et chasse | 6,199 | Par nature | Personnel | 1,937 | E | VERIFIE | `spending.cofog.04.2.compensation` |
|  | | |  | Achats | 1,034 | E | VERIFIE | `spending.cofog.04.2.purchases` |
|  | | |  | Investissement | 0,231 | E | VERIFIE | `spending.cofog.04.2.investment` |
|  | | |  | Subventions | 1,415 | E | VERIFIE | `spending.cofog.04.2.subsidies` |
|  | | |  | Transferts | 1,289 | E | VERIFIE | `spending.cofog.04.2.transfers` |
|  | | |  | Autres | 0,292 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.2.other` |
| 04.3 | Combustibles et énergie | 15,461 | Par nature | Personnel | 0,476 | E | VERIFIE | `spending.cofog.04.3.compensation` |
|  | | |  | Achats | 1,415 | E | VERIFIE | `spending.cofog.04.3.purchases` |
|  | | |  | Investissement | 1,851 | E | VERIFIE | `spending.cofog.04.3.investment` |
|  | | |  | Subventions | 10,532 | E | VERIFIE | `spending.cofog.04.3.subsidies` |
|  | | |  | Transferts | 1,060 | E | VERIFIE | `spending.cofog.04.3.transfers` |
|  | | |  | Autres | 0,127 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.3.other` |
| 04.4 | Industries extractives et manufacturières, construction | 1,625 | Par nature | Personnel | 0,172 | E | VERIFIE | `spending.cofog.04.4.compensation` |
|  | | |  | Achats | 0,134 | E | VERIFIE | `spending.cofog.04.4.purchases` |
|  | | |  | Investissement | 0,058 | E | VERIFIE | `spending.cofog.04.4.investment` |
|  | | |  | Subventions | 1,246 | E | VERIFIE | `spending.cofog.04.4.subsidies` |
|  | | |  | Autres | 0,015 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.4.other` |
| 04.5 | Transports | 60,689 | Par nature | Personnel | 8,064 | E | VERIFIE | `spending.cofog.04.5.compensation` |
|  | | |  | Achats | 14,784 | E | VERIFIE | `spending.cofog.04.5.purchases` |
|  | | |  | Investissement | 16,668 | E | VERIFIE | `spending.cofog.04.5.investment` |
|  | | |  | Subventions | 13,636 | E | VERIFIE | `spending.cofog.04.5.subsidies` |
|  | | |  | Transferts | 6,213 | E | VERIFIE | `spending.cofog.04.5.transfers` |
|  | | |  | Autres | 1,323 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.5.other` |
| 04.6 | Communications | 1,621 | Par nature | Achats | 0,086 | E | VERIFIE | `spending.cofog.04.6.purchases` |
|  | | |  | Investissement | 0,796 | E | VERIFIE | `spending.cofog.04.6.investment` |
|  | | |  | Subventions | 0,663 | E | VERIFIE | `spending.cofog.04.6.subsidies` |
|  | | |  | Autres | 0,075 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.6.other` |
| 04.7 | Autres branches d'activité | 11,183 | Par nature | Personnel | 2,002 | E | VERIFIE | `spending.cofog.04.7.compensation` |
|  | | |  | Achats | 2,029 | E | VERIFIE | `spending.cofog.04.7.purchases` |
|  | | |  | Investissement | 1,626 | E | VERIFIE | `spending.cofog.04.7.investment` |
|  | | |  | Subventions | 3,541 | E | VERIFIE | `spending.cofog.04.7.subsidies` |
|  | | |  | Transferts | 1,494 | E | VERIFIE | `spending.cofog.04.7.transfers` |
|  | | |  | Autres | 0,491 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.7.other` |
| 04.8 | R&D concernant les affaires économiques | 21,429 | Par nature | Personnel | 3,093 | E | VERIFIE | `spending.cofog.04.8.compensation` |
|  | | |  | Achats | 4,454 | E | VERIFIE | `spending.cofog.04.8.purchases` |
|  | | |  | Investissement | 9,999 | E | VERIFIE | `spending.cofog.04.8.investment` |
|  | | |  | Autres | 3,883 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.8.other` |
| 04.9 | Affaires économiques n.c.a. | 2,609 | Par nature | Personnel | 0,830 | E | VERIFIE | `spending.cofog.04.9.compensation` |
|  | | |  | Achats | 0,509 | E | VERIFIE | `spending.cofog.04.9.purchases` |
|  | | |  | Investissement | 0,099 | E | VERIFIE | `spending.cofog.04.9.investment` |
|  | | |  | Transferts | 1,084 | E | VERIFIE | `spending.cofog.04.9.transfers` |
|  | | |  | Autres | 0,087 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.04.9.other` |

### 05 Protection de l'environnement

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 05.1 | Gestion des déchets | 15,862 | Par nature | Personnel | 3,678 | E | VERIFIE | `spending.cofog.05.1.compensation` |
|  | | |  | Achats | 8,999 | E | VERIFIE | `spending.cofog.05.1.purchases` |
|  | | |  | Investissement | 2,413 | E | VERIFIE | `spending.cofog.05.1.investment` |
|  | | |  | Autres | 0,773 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.05.1.other` |
| 05.2 | Gestion des eaux usées | 5,200 | Par nature | Personnel | 0,587 | E | VERIFIE | `spending.cofog.05.2.compensation` |
|  | | |  | Achats | 1,587 | E | VERIFIE | `spending.cofog.05.2.purchases` |
|  | | |  | Investissement | 2,731 | E | VERIFIE | `spending.cofog.05.2.investment` |
|  | | |  | Autres | 0,295 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.05.2.other` |
| 05.3 | Lutte contre la pollution | 4,269 | Par nature | Personnel | 0,225 | E | VERIFIE | `spending.cofog.05.3.compensation` |
|  | | |  | Achats | 0,444 | E | VERIFIE | `spending.cofog.05.3.purchases` |
|  | | |  | Investissement | 0,655 | E | VERIFIE | `spending.cofog.05.3.investment` |
|  | | |  | Subventions | 2,229 | E | VERIFIE | `spending.cofog.05.3.subsidies` |
|  | | |  | Transferts | 0,698 | E | VERIFIE | `spending.cofog.05.3.transfers` |
|  | | |  | Autres | 0,018 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.05.3.other` |
| 05.4 | Préservation de la diversité biologique et protection de la nature | 1,678 | Par nature | Personnel | 0,567 | E | VERIFIE | `spending.cofog.05.4.compensation` |
|  | | |  | Achats | 0,441 | E | VERIFIE | `spending.cofog.05.4.purchases` |
|  | | |  | Investissement | 0,338 | E | VERIFIE | `spending.cofog.05.4.investment` |
|  | | |  | Autres | 0,332 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.05.4.other` |
| 05.5 | R&D dans le domaine de la protection de l'environnement | 1,760 | Par nature | Personnel | 0,366 | E | VERIFIE | `spending.cofog.05.5.compensation` |
|  | | |  | Achats | 0,306 | E | VERIFIE | `spending.cofog.05.5.purchases` |
|  | | |  | Investissement | 0,607 | E | VERIFIE | `spending.cofog.05.5.investment` |
|  | | |  | Subventions | 0,122 | E | VERIFIE | `spending.cofog.05.5.subsidies` |
|  | | |  | Transferts | 0,300 | E | VERIFIE | `spending.cofog.05.5.transfers` |
|  | | |  | Autres | 0,057 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.05.5.other` |
| 05.6 | Protection de l'environnement n.c.a. | 1,516 | Par nature | Personnel | 0,984 | E | VERIFIE | `spending.cofog.05.6.compensation` |
|  | | |  | Achats | 0,194 | E | VERIFIE | `spending.cofog.05.6.purchases` |
|  | | |  | Investissement | 0,203 | E | VERIFIE | `spending.cofog.05.6.investment` |
|  | | |  | Autres | 0,136 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.05.6.other` |

### 06 Logements et équipements collectifs

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 06.1 | Logement | 8,415 | Par nature | Personnel | 1,476 | E | VERIFIE | `spending.cofog.06.1.compensation` |
|  | | |  | Achats | 0,861 | E | VERIFIE | `spending.cofog.06.1.purchases` |
|  | | |  | Investissement | 0,563 | E | VERIFIE | `spending.cofog.06.1.investment` |
|  | | |  | Subventions | 1,020 | E | VERIFIE | `spending.cofog.06.1.subsidies` |
|  | | |  | Transferts et autres | 4,495 | E | VERIFIE (reste Eurostat, NP négatif inclus) | `spending.cofog.06.1.other` |
| 06.2 | Équipements collectifs | 27,230 | Par nature | Personnel | 6,758 | E | VERIFIE | `spending.cofog.06.2.compensation` |
|  | | |  | Achats | 5,072 | E | VERIFIE | `spending.cofog.06.2.purchases` |
|  | | |  | Investissement | 13,912 | E | VERIFIE | `spending.cofog.06.2.investment` |
|  | | |  | Autres | 1,488 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.06.2.other` |
| 06.3 | Alimentation en eau | 2,848 | Par nature | Personnel | 0,306 | E | VERIFIE | `spending.cofog.06.3.compensation` |
|  | | |  | Achats | 0,838 | E | VERIFIE | `spending.cofog.06.3.purchases` |
|  | | |  | Investissement | 1,532 | E | VERIFIE | `spending.cofog.06.3.investment` |
|  | | |  | Autres | 0,172 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.06.3.other` |
| 06.4 | Éclairage public | 1,819 | Par nature | Personnel | 0,067 | E | VERIFIE | `spending.cofog.06.4.compensation` |
|  | | |  | Achats | 0,844 | E | VERIFIE | `spending.cofog.06.4.purchases` |
|  | | |  | Investissement | 0,886 | E | VERIFIE | `spending.cofog.06.4.investment` |
|  | | |  | Autres | 0,022 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.06.4.other` |
| 06.5 | R&D dans le domaine du logement et des équipements collectifs | 0,000 | Pas de niveau 3 | montant nul | | | | |
| 06.6 | Logements et équipements collectifs n.c.a. | 1,817 | Par nature | Personnel | 0,196 | E | VERIFIE | `spending.cofog.06.6.compensation` |
|  | | |  | Achats | 0,209 | E | VERIFIE | `spending.cofog.06.6.purchases` |
|  | | |  | Investissement | 0,385 | E | VERIFIE | `spending.cofog.06.6.investment` |
|  | | |  | Subventions | 0,135 | E | VERIFIE | `spending.cofog.06.6.subsidies` |
|  | | |  | Transferts | 0,638 | E | VERIFIE | `spending.cofog.06.6.transfers` |
|  | | |  | Autres | 0,254 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.06.6.other` |

### 07 Santé

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 07.1 | Produits, appareils et matériels médicaux | 43,715 | Postes concrets | Médicaments (ville, y c. AT-MP et maternité) | 29,617 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.07.1.medicines` |
|  | | |  | Matériel, dispositifs médicaux | 9,121 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.07.1.medical-devices` |
|  | | |  | Autres | 4,976 | calculé | HYPOTHESE | `spending.cofog.07.1.other` |
| 07.2 | Services ambulatoires | 91,789 | Postes concrets | Soins de médecins | 16,620 | CNS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.07.2.doctors` |
|  | | |  | Soins dentaires | 6,212 | CNS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.07.2.dentists` |
|  | | |  | Soins infirmiers | 5,428 | CNS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.07.2.nurses` |
|  | | |  | Kinésithérapie | 4,384 | CNS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.07.2.physiotherapy` |
|  | | |  | Biologie et imagerie | 7,881 | CNS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.07.2.lab-imaging` |
|  | | |  | Transports sanitaires | 6,440 | CNS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.07.2.patient-transport` |
|  | | |  | Hospitalisation privée | 23,868 | CNS | montant VERIFIE ; rattachement A_VERIFIER | `spending.cofog.07.2.private-hospitals` |
|  | | |  | Ehpad et soins infirmiers à domicile (médico-social) | 16,118 | CPS | montant VERIFIE ; rattachement A_VERIFIER | `spending.cofog.07.2.care-homes` |
|  | | |  | Autres | 4,838 | calculé | HYPOTHESE | `spending.cofog.07.2.other` |
| 07.3 | Services hospitaliers | 109,338 | Par nature | Personnel | 63,811 | E | VERIFIE | `spending.cofog.07.3.compensation` |
|  | | |  | Achats | 30,808 | E | VERIFIE | `spending.cofog.07.3.purchases` |
|  | | |  | Investissement | 6,005 | E | VERIFIE | `spending.cofog.07.3.investment` |
|  | | |  | Autres | 8,714 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.07.3.other` |
| 07.4 | Services de santé publique | 7,958 | Par nature | Personnel | 3,180 | E | VERIFIE | `spending.cofog.07.4.compensation` |
|  | | |  | Achats | 1,581 | E | VERIFIE | `spending.cofog.07.4.purchases` |
|  | | |  | Investissement | 0,392 | E | VERIFIE | `spending.cofog.07.4.investment` |
|  | | |  | Transferts | 1,796 | E | VERIFIE | `spending.cofog.07.4.transfers` |
|  | | |  | Prestations et aides | 0,775 | E | VERIFIE | `spending.cofog.07.4.benefits` |
|  | | |  | Autres | 0,234 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.07.4.other` |
| 07.5 | R&D dans le domaine de la santé | 6,708 | Par nature | Personnel | 2,079 | E | VERIFIE | `spending.cofog.07.5.compensation` |
|  | | |  | Achats | 1,083 | E | VERIFIE | `spending.cofog.07.5.purchases` |
|  | | |  | Investissement | 3,360 | E | VERIFIE | `spending.cofog.07.5.investment` |
|  | | |  | Autres | 0,186 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.07.5.other` |
| 07.6 | Santé n.c.a. | 1,648 | Par nature | Personnel | 1,005 | E | VERIFIE | `spending.cofog.07.6.compensation` |
|  | | |  | Achats | 0,096 | E | VERIFIE | `spending.cofog.07.6.purchases` |
|  | | |  | Investissement | 0,109 | E | VERIFIE | `spending.cofog.07.6.investment` |
|  | | |  | Transferts | 0,402 | E | VERIFIE | `spending.cofog.07.6.transfers` |
|  | | |  | Autres | 0,037 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.07.6.other` |

### 08 Loisirs, culture et culte

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 08.1 | Services récréatifs et sportifs | 15,569 | Par nature | Personnel | 4,872 | E | VERIFIE | `spending.cofog.08.1.compensation` |
|  | | |  | Achats | 3,599 | E | VERIFIE | `spending.cofog.08.1.purchases` |
|  | | |  | Investissement | 4,730 | E | VERIFIE | `spending.cofog.08.1.investment` |
|  | | |  | Autres | 2,368 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.08.1.other` |
| 08.2 | Services culturels | 18,963 | Par nature | Personnel | 7,539 | E | VERIFIE | `spending.cofog.08.2.compensation` |
|  | | |  | Achats | 3,651 | E | VERIFIE | `spending.cofog.08.2.purchases` |
|  | | |  | Investissement | 3,677 | E | VERIFIE | `spending.cofog.08.2.investment` |
|  | | |  | Autres | 4,095 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.08.2.other` |
| 08.3 | Services de radiodiffusion, de télévision et d'édition | 7,560 | Postes concrets | France Télévisions | 2,523 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.08.3.france-televisions` |
|  | | |  | Radio France | 0,653 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.08.3.radio-france` |
|  | | |  | France Médias Monde | 0,299 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.08.3.france-medias-monde` |
|  | | |  | ARTE France | 0,294 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.08.3.arte` |
|  | | |  | INA et TV5 Monde | 0,187 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.08.3.ina-tv5` |
|  | | |  | Presse et médias (P180) | 0,377 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.08.3.press` |
|  | | |  | Livre et industries culturelles (P334) | 0,359 | PLF | HYPOTHESE (montant PLF, pas exécution) | `spending.cofog.08.3.books` |
|  | | |  | Collectivités locales | 1,060 | E-S | VERIFIE (S1313, non consolidé) | `spending.cofog.08.3.local` |
|  | | |  | Autres | 1,808 | calculé | HYPOTHESE | `spending.cofog.08.3.other` |
| 08.4 | Culte et autres services communautaires | 0,744 | Par nature | Personnel | 0,071 | E | VERIFIE | `spending.cofog.08.4.compensation` |
|  | | |  | Achats | 0,101 | E | VERIFIE | `spending.cofog.08.4.purchases` |
|  | | |  | Investissement | 0,090 | E | VERIFIE | `spending.cofog.08.4.investment` |
|  | | |  | Transferts | 0,479 | E | VERIFIE | `spending.cofog.08.4.transfers` |
|  | | |  | Autres | 0,003 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.08.4.other` |
| 08.5 | R&D dans le domaine des loisirs, de la culture et du culte | 0,000 | Pas de niveau 3 | montant nul | | | | |
| 08.6 | Loisirs, culture et culte n.c.a. | 0,232 | Pas de niveau 3 | < 0,5 Md€ | | | | |

### 09 Enseignement

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 09.1 | Enseignement préélémentaire et primaire | 42,176 | Par nature | Personnel | 34,256 | E | VERIFIE | `spending.cofog.09.1.compensation` |
|  | | |  | Achats | 2,511 | E | VERIFIE | `spending.cofog.09.1.purchases` |
|  | | |  | Investissement | 4,160 | E | VERIFIE | `spending.cofog.09.1.investment` |
|  | | |  | Autres | 1,250 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.09.1.other` |
| 09.2 | Enseignement secondaire | 63,779 | Mixte (nature + poste) | Personnel | 49,762 | E | VERIFIE | `spending.cofog.09.2.compensation` |
|  | | |  | Achats | 5,670 | E | VERIFIE | `spending.cofog.09.2.purchases` |
|  | | |  | Investissement | 4,523 | E | VERIFIE | `spending.cofog.09.2.investment` |
|  | | |  | Bourses primaire et secondaire | 1,252 | CPS | montant VERIFIE ; rattachement A_VERIFIER | `spending.cofog.09.2.school-grants` |
|  | | |  | Autres | 2,572 | calculé | HYPOTHESE | `spending.cofog.09.2.other` |
| 09.3 | Enseignement postsecondaire non supérieur | 1,156 | Par nature | Personnel | 0,651 | E | VERIFIE | `spending.cofog.09.3.compensation` |
|  | | |  | Achats | 0,413 | E | VERIFIE | `spending.cofog.09.3.purchases` |
|  | | |  | Investissement | 0,058 | E | VERIFIE | `spending.cofog.09.3.investment` |
|  | | |  | Autres | 0,034 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.09.3.other` |
| 09.4 | Enseignement supérieur | 12,308 | Par nature | Personnel | 7,417 | E | VERIFIE | `spending.cofog.09.4.compensation` |
|  | | |  | Achats | 1,952 | E | VERIFIE | `spending.cofog.09.4.purchases` |
|  | | |  | Investissement | 1,721 | E | VERIFIE | `spending.cofog.09.4.investment` |
|  | | |  | Autres | 1,218 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.09.4.other` |
| 09.5 | Enseignement non défini par niveau | 8,622 | Par nature | Personnel | 1,490 | E | VERIFIE | `spending.cofog.09.5.compensation` |
|  | | |  | Achats | 0,382 | E | VERIFIE | `spending.cofog.09.5.purchases` |
|  | | |  | Investissement | 0,076 | E | VERIFIE | `spending.cofog.09.5.investment` |
|  | | |  | Subventions | 0,694 | E | VERIFIE | `spending.cofog.09.5.subsidies` |
|  | | |  | Transferts | 1,102 | E | VERIFIE | `spending.cofog.09.5.transfers` |
|  | | |  | Prestations et aides | 4,843 | E | VERIFIE | `spending.cofog.09.5.benefits` |
|  | | |  | Autres | 0,035 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.09.5.other` |
| 09.6 | Services annexes à l'enseignement | 20,023 | Mixte (nature + poste) | Personnel | 9,789 | E | VERIFIE | `spending.cofog.09.6.compensation` |
|  | | |  | Achats | 2,886 | E | VERIFIE | `spending.cofog.09.6.purchases` |
|  | | |  | Investissement | 1,005 | E | VERIFIE | `spending.cofog.09.6.investment` |
|  | | |  | Bourses de l'enseignement supérieur | 2,603 | CPS | montant VERIFIE ; rattachement A_VERIFIER | `spending.cofog.09.6.higher-education-grants` |
|  | | |  | Autres | 3,740 | calculé | HYPOTHESE | `spending.cofog.09.6.other` |
| 09.7 | R&D dans le domaine de l'enseignement | 0,000 | Pas de niveau 3 | montant nul | | | | |
| 09.8 | Enseignement n.c.a. | 0,575 | Par nature | Personnel | 0,420 | E | VERIFIE | `spending.cofog.09.8.compensation` |
|  | | |  | Transferts | 0,142 | E | VERIFIE | `spending.cofog.09.8.transfers` |
|  | | |  | Autres | 0,013 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.09.8.other` |

### 10 Protection sociale

| Groupe | Libellé | Montant 2024 (Md€) | Méthode | Poste | Montant (Md€) | Source | Statut | Identifiant |
|---|---|---:|---|---|---:|---|---|---|
| 10.1 | Maladie et invalidité | 83,899 | Postes concrets | Indemnités journalières maladie | 11,825 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.sick-pay` |
|  | | |  | Congés longue durée agents de l'État | 0,331 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.long-sick-leave` |
|  | | |  | IJ AT-MP | 4,713 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.work-injury-sick-pay` |
|  | | |  | Rentes AT-MP | 5,817 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.work-injury-pensions` |
|  | | |  | Pensions d'invalidité | 9,488 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.disability-pensions` |
|  | | |  | AAH | 13,797 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.aah` |
|  | | |  | GRTH (travailleurs en Esat) | 1,566 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.grth` |
|  | | |  | ASI | 0,323 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.asi` |
|  | | |  | PCH moins de 60 ans | 2,252 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.pch` |
|  | | |  | AEEH | 1,593 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.aeeh` |
|  | | |  | AJPP | 0,260 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.1.ajpp` |
|  | | |  | Établissements et services handicap (ISBLSM, financement public) | 19,291 | CPS | montant VERIFIE (S15) ; financement public et rattachement HYPOTHESE | `spending.cofog.10.1.disability-services` |
|  | | |  | Ésat, accompagnement par le travail (ISBLSM) | 1,956 | CPS | montant VERIFIE (S15) ; financement public et rattachement HYPOTHESE | `spending.cofog.10.1.esat` |
|  | | |  | Autres | 10,685 | calculé | HYPOTHESE | `spending.cofog.10.1.other` |
| 10.2 | Vieillesse | 391,954 | Postes concrets | Pensions CNAV (droit direct) | 144,958 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.pensions-cnav` |
|  | | |  | Pensions Agirc-Arrco | 84,811 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.pensions-agirc-arrco` |
|  | | |  | Pensions fonctionnaires de l'État et militaires | 58,530 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.pensions-state` |
|  | | |  | Autres régimes spéciaux (composition A_VERIFIER) | 35,072 | CPS | montant VERIFIE ; composition A_VERIFIER | `spending.cofog.10.2.pensions-special-schemes` |
|  | | |  | Pensions MSA (exploitants et salariés) | 13,058 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.pensions-msa` |
|  | | |  | Pensions CNAVPL (libéraux) | 7,883 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.pensions-cnavpl` |
|  | | |  | Pensions Ircantec | 4,005 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.pensions-ircantec` |
|  | | |  | Minimum vieillesse (dont Aspa 3,994) | 4,941 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.minimum-old-age` |
|  | | |  | APA | 7,330 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.apa` |
|  | | |  | PCH 60 ans et plus | 1,082 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.pch-60-plus` |
|  | | |  | Aide sociale à l'hébergement personnes âgées | 2,069 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.elderly-housing-aid` |
|  | | |  | Crédits d'impôt dépendance | 1,119 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.2.dependency-tax-credits` |
|  | | |  | Autres | 27,096 | calculé | HYPOTHESE | `spending.cofog.10.2.other` |
| 10.3 | Survivants | 40,608 | Postes concrets | Réversion sans condition de ressources | 6,211 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.3.survivor-no-means-test` |
|  | | |  | Réversion avec condition de ressources | 11,435 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.3.survivor-means-tested` |
|  | | |  | Pensions de conjoint survivant, orphelins (fonction publique) | 5,837 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.3.survivor-civil-servants` |
|  | | |  | Réversion complémentaires obligatoires | 14,943 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.3.survivor-complementary` |
|  | | |  | Majorations sur réversion de base | 1,216 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.3.survivor-supplements` |
|  | | |  | Autres | 0,966 | calculé | HYPOTHESE | `spending.cofog.10.3.other` |
| 10.4 | Famille et enfants | 66,711 | Postes concrets | Allocations familiales | 13,732 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.family-allowances` |
|  | | |  | Complément familial | 2,524 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.family-supplement` |
|  | | |  | ASF | 3,253 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.asf` |
|  | | |  | Paje allocation de base | 3,016 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.paje-base` |
|  | | |  | Paje prime de naissance | 0,516 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.paje-birth` |
|  | | |  | CMG (assistante maternelle et emploi à domicile) | 7,273 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.cmg` |
|  | | |  | Prepare | 0,711 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.prepare` |
|  | | |  | ARS | 2,190 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.ars` |
|  | | |  | Crédits d'impôt garde d'enfants | 2,188 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.childcare-tax-credits` |
|  | | |  | Accueil des jeunes enfants (crèches) | 7,259 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.childcare-facilities` |
|  | | |  | Aide sociale à l'enfance (public + ISBLSM) | 11,262 | CPS | montant VERIFIE ; part ISBLSM HYPOTHESE | `spending.cofog.10.4.child-welfare` |
|  | | |  | IJ maternité, paternité, adoption | 3,334 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.maternity-pay` |
|  | | |  | Congés de naissance | 0,611 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.4.birth-leave` |
|  | | |  | Autres | 8,843 | calculé | HYPOTHESE | `spending.cofog.10.4.other` |
| 10.5 | Chômage | 48,521 | Postes concrets | ARE | 32,913 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.are` |
|  | | |  | ARE-Formation | 1,936 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.are-training` |
|  | | |  | ASP | 1,731 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.asp` |
|  | | |  | ASS, AER (avec prime de Noël) | 1,725 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.ass` |
|  | | |  | Activité partielle | 0,315 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.short-time-work` |
|  | | |  | Aide à la reprise ou création d'entreprise | 0,833 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.business-creation-aid` |
|  | | |  | Insertion professionnelle des jeunes | 0,882 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.youth-insertion` |
|  | | |  | Stages de formation des régions | 0,966 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.regional-training` |
|  | | |  | Placement France Travail | 0,688 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.5.job-placement` |
|  | | |  | Autres | 6,530 | calculé | HYPOTHESE | `spending.cofog.10.5.other` |
| 10.6 | Logement | 21,147 | Postes concrets | APL | 7,111 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.6.apl` |
|  | | |  | ALS | 5,525 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.6.als` |
|  | | |  | ALF | 3,323 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.6.alf` |
|  | | |  | Hébergement (public + ISBLSM) | 3,240 | CPS | montant VERIFIE ; rattachement à 10.6 A_VERIFIER | `spending.cofog.10.6.emergency-housing` |
|  | | |  | Autres | 1,947 | calculé | HYPOTHESE | `spending.cofog.10.6.other` |
| 10.7 | Exclusion sociale n.c.a. | 36,461 | Postes concrets | RSA | 11,984 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.7.rsa` |
|  | | |  | Prime de Noël (RSA) | 0,419 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.7.christmas-bonus` |
|  | | |  | Prime d'activité | 10,557 | CPS | montant VERIFIE ; rattachement HYPOTHESE | `spending.cofog.10.7.prime-activite` |
|  | | |  | Chèque énergie | 0,789 | CPS | montant VERIFIE ; rattachement A_VERIFIER (04.3 possible) | `spending.cofog.10.7.energy-voucher` |
|  | | |  | Action sociale communale (CCAS-CIAS) | 2,504 | CPS | montant VERIFIE ; rattachement A_VERIFIER | `spending.cofog.10.7.municipal-social-action` |
|  | | |  | Autres | 10,208 | calculé | HYPOTHESE | `spending.cofog.10.7.other` |
| 10.8 | R&D dans le domaine de la protection sociale | 0,000 | Pas de niveau 3 | montant nul | | | | |
| 10.9 | Protection sociale n.c.a. | 3,728 | Par nature | Personnel | 2,174 | E | VERIFIE | `spending.cofog.10.9.compensation` |
|  | | |  | Achats | 1,027 | E | VERIFIE | `spending.cofog.10.9.purchases` |
|  | | |  | Investissement | 0,190 | E | VERIFIE | `spending.cofog.10.9.investment` |
|  | | |  | Autres | 0,336 | calculé | VERIFIE (reste Eurostat) | `spending.cofog.10.9.other` |

## 5. Montants des prestations

Colonnes : montant CPS public 2024 (portail DREES) et, quand il existe, montant « Minima sociaux » (DREES, euros 2024). Les deux diffèrent par construction : la prime de Noël, le premier étage de l'ASV, les indus et les rappels sont traités autrement (note du fichier DREES).

| Prestation | CPS | Minima sociaux | Groupe |
|---|---:|---:|---|
| RSA socle | 11,984 | 12,358 (avec prime de Noël) | 10.7 |
| Prime de Noël (RSA et autres) | 0,419 | incluse | 10.7 |
| Prime d'activité | 10,557 | | 10.7 |
| AAH | 13,797 | 13,839 | 10.1 |
| ASI | 0,323 | 0,314 | 10.1 |
| Aspa | 3,994 | | 10.2 |
| Minimum vieillesse total | 4,941 | 4,586 (hors premier étage ASV) | 10.2 |
| ASS, AER | 1,680 | 1,713 (ASS, avec prime de Noël) | 10.5 |
| ARE | 32,913 | | 10.5 |
| ARE-Formation | 1,936 | | 10.5 |
| APL | 7,111 | | 10.6 |
| ALS | 5,525 | | 10.6 |
| ALF | 3,323 | | 10.6 |
| Allocations familiales | 13,732 | | 10.4 |
| Complément familial | 2,524 | | 10.4 |
| ASF | 3,253 | | 10.4 |
| ARS | 2,190 | | 10.4 |
| Paje base | 3,016 | | 10.4 |
| Paje prime de naissance | 0,516 | | 10.4 |
| Prepare | 0,711 | | 10.4 |
| CMG assistante maternelle | 5,939 | | 10.4 |
| CMG emploi à domicile | 1,334 | | 10.4 |
| Pensions d'invalidité | 9,488 | | 10.1 |
| PCH moins de 60 ans | 2,252 | | 10.1 |
| PCH 60 ans et plus | 1,082 | | 10.2 |
| APA | 7,330 | | 10.2 |
| IJ maladie | 11,825 | | 10.1 |
| IJ AT-MP | 4,713 | | 10.1 |
| IJ maternité | 3,334 | | 10.4 |
| Bourses du supérieur | 2,603 | | 09.6 (CPS : Pauvreté) |
| Bourses primaire et secondaire | 1,252 | | 09.2 (CPS : Famille) |
| ADA | 0,367 (tableau 4 PDF) | 0,378 | Dans « Autres » de 10.7 |

Retraites de droit direct par régime (CPS, E11-21.1, public = 352,334) : CNAV 144,958 ; Agirc-Arrco 84,811 ; État 58,530 ; autres régimes spéciaux 35,072 ; exploitants agricoles 8,744 ; CNAVPL 7,883 ; salariés agricoles 4,314 ; Ircantec 4,005 ; autres non-salariés 2,633 ; autres complémentaires 0,880 ; intervention sociale de l'État 0,504. Les trois derniers restent dans « Autres » de 10.2.

**Écartés de 10.4 :** supplément familial de traitement (2,358) et majorations familiales (1,097). Ils relèvent de la rémunération et sont très probablement comptés en D1 dans la fonction de l'employeur. Déduction, à confirmer.

## 6. Écarts de périmètre

1. **CPS plus large que les APU.** Le total CPS est de 933,161, dont 839,970 pour les secteurs publics. Les postes retiennent les seuls secteurs publics, ce qui écarte par exemple la retraite supplémentaire et les remboursements des organismes d'assurance. Exception : les établissements gérés par des ISBLSM (handicap 19,292, Esat 1,956, ASE 7,723, hébergement 3,182) sont retenus, car ils semblent financés sur fonds publics. Cette part n'est pas lue comme telle dans la source.
2. **Deux millésimes CPS.** Le portail (305, modifié le 18/12/2025) et le tableau 4 PDF diffèrent sur 2023 et 2024, pas sur 2022 : total 933,161 contre 932,548, allocations familiales 13,732 contre 13,790. Écart de 0,1 % sur le total. Cause non établie. Le portail est retenu car il est le seul à donner le secteur.
3. **Comptes de la santé.** Le jeu `cns_financement` date d'octobre 2026, donc d'un millésime plus récent que les CPS. Ses médicaments (26,25) sont sous ceux des CPS (29,62). Écart non expliqué ; hypothèse à vérifier : remises sur le médicament. Le poste 07.1 utilise les CPS, le 07.2 les CNS, sans double compte.
4. **07.2 et médico-social.** L'hospitalisation privée (23,87) est placée en 07.2 parce que 07.3 a D632 = 0. L'Ehpad et les Ssiad (16,12) y sont placés parce que le total 07.1 + 07.2 ne se boucle qu'avec eux. Déduction arithmétique.
5. **07.3 reste par nature.** Les CPS donnent 90,9 de versements aux hôpitaux publics contre 109,3 pour le groupe, qui mesure le coût de production. Des postes concrets laisseraient environ 17 Md€ en « Autres ».
6. **PLF, et non exécution.** Le jeu trouvé est le PLF 2024 ; aucun fichier d'exécution 2024 par programme n'a été trouvé en open data. Les rapports annuels de performances 2024 existent en PDF. Les crédits ne recouvrent pas les dépenses en comptabilité nationale.
7. **01.2 recalé.** Le PLF de la mission donne 5,93 pour un groupe de 4,88. Chaque programme est ramené à sa part × groupe.
8. **08.3.** Les avances à l'audiovisuel sont des concours publics, pas le coût des sociétés, qui ont aussi des recettes propres.
9. **Année.** Tous les montants sont 2024. Ils passent à l'année des comptes par `spending.scaling`, comme les groupes. Cela suppose que chaque poste évolue comme le total, ce qui est faux pour certaines prestations (ASF, AAH).
10. **Sous-secteurs non consolidés.** Les lignes E-S de 03.1, 03.2 et 08.3 sont additionnées à d'autres sources sans consolidation. Les « Autres » absorbent l'écart.

## 7. Liste A_VERIFIER

- Rattachement CPS vers COFOG de tous les postes de 10.x : demander à l'INSEE ou à la DREES une table de passage.
- 01.1 : PSR-UE entièrement en 01.1, en D7 (22,3 sur D7 = 23,933).
- 03.3 : PJJ en 03.3. Indice : 03.4 est déjà couvert par le P107 (5,003 sur 5,120).
- 07.1 : nature des 4,98 restants.
- 07.2 : hospitalisation privée et médico-social.
- 09.2 et 09.6 : bourses en 09.x.
- 10.1 : part publique du financement des ISBLSM ; AEEH en 10.1 plutôt qu'en 10.4.
- 10.2 : composition de « Autres régimes spéciaux » (CNRACL, SNCF, RATP, etc.). Le tableau détaillé 5 n'a pas pu être lu.
- 10.2 : recoupement avec *Les retraités et les retraites 2026* (`drees-rr-2026`), non ouvert ici.
- 10.6 : hébergement en 10.6 plutôt qu'en 10.7.
- 10.7 : chèque énergie en 10.7 plutôt qu'en 04.3 ; CCAS.
- 10.4 : supplément familial et majorations familiales hors du groupe.

## 8. Accès aux sources

- Le site `drees.solidarites-sante.gouv.fr` a rejeté les fichiers xlsx et le tableau 4 de mai 2026 (page « Request Rejected »). Une tentative sur l'hôte `www`, avec un en-tête Referer, a été bloquée par le contrôle de permissions de Claude Code. Elle n'a pas été renouvelée ni contournée. Le portail `data.drees` a servi à la place.
- Le tableau détaillé 2 (PDF) ne contient pas de texte extractible. Le tableau 5 n'a pas été téléchargé.
- Compte de l'éducation (DEPP) : non exploité. Seul le total de 197,1 Md€ pour 2024 a été vu, sur un périmètre différent (financeurs privés inclus). L'enseignement reste par nature, plus les bourses.
- Aide sociale départementale (`376`) : fichier téléchargé, non utilisé pour les montants.

## 9. Sources à enregistrer

| id | Titre | Éditeur | URL | Consulté |
|---|---|---|---|---|
| `eurostat-gov-10a-exp-nature` | General government expenditure by function (COFOG), France, tous secteurs et `na_item`, 2024 (mise à jour du 21/10/2026) | Eurostat | https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_exp?geo=FR&unit=MIO_EUR&time=2024 | 2026-11-07 |
| `drees-cps-opendata` | Les comptes de la protection sociale (jeu 305, modifié le 18/12/2025) | DREES | https://data.drees.solidarites-sante.gouv.fr/explore/dataset/305_les-comptes-de-la-protection-sociale/ | 2026-11-07 |
| `drees-cps-2025-td4` | Tableau détaillé 4, Prestations détaillées de protection sociale par risque de 2019 à 2024 | DREES | https://www.drees.solidarites-sante.gouv.fr/sites/default/files/2025-12/CPS2025%20-%20Tableau%20d%C3%A9taill%C3%A9%204%20-%20Prestations%20d%C3%A9taill%C3%A9es%20de%20protection%20sociale%20par%20risque%20de%202019%20%C3%A0%202024.pdf | 2026-11-07 |
| `drees-cns-financement` | Les comptes de la santé, répartition par financeur (modifié le 01/10/2026) | DREES | https://data.drees.solidarites-sante.gouv.fr/explore/dataset/cns_financement/ | 2026-11-07 |
| `drees-minima-sociaux-depenses` | Minima sociaux, données de dépenses par dispositif | DREES | https://data.drees.solidarites-sante.gouv.fr/api/explore/v2.1/catalog/datasets/336_minima-sociaux-rsa-et-prime-d-activite/attachments/minima_sociaux_donnees_de_depenses_par_dispositif_xlsx | 2026-11-07 |
| `plf2024-depenses-destination-nature` | PLF 2024, dépenses 2024 selon nomenclatures destination et nature | Ministère de l'Économie et des Finances | https://data.economie.gouv.fr/explore/dataset/plf-2024-depenses-2024-selon-nomenclatures-destination-et-nature/ | 2026-11-07 |
| `senat-reglement-2024-affaires-europeennes` | Rapport n° 743 (2024-2025), tome II, annexe 33, Affaires européennes | Sénat | https://www.senat.fr/rap/l24-743-233/l24-743-2331.pdf | 2026-11-07 |

## 10. Arbitrages à valider

- **P1. Lignes de nature supplémentaires.** Accepter Subventions, Transferts et Prestations et aides sur 18 groupes. Sans elles, « Autres » dépasse 25 % sur ces groupes.
- **P2. Seuil.** Pas de niveau 3 sous 0,5 Md€ (01.5, 01.8, 02.2, 08.6).
- **P3. Volume.** 314 leviers, c'est beaucoup. Regrouper les petits postes de 10.x ou réduire les 42 groupes par nature est possible sans changer la méthode.
- **P4. Lien avec les foyers (Étape 17).** Il faut décider quels postes agissent sur les foyers : le moteur met aujourd'hui à l'échelle la prime d'activité (10.7), les pensions (10.2) et les prestations familiales (10.4, 10.7). Les pensions par régime doivent être reliées aux profils retraités.
- **P5. 01.7.** Pas de niveau 3 : la charge d'intérêts est un résultat de la trajectoire de dette, pas un choix de poste. Variante : affichage par sous-secteur sans curseur (État 46,691 ; local 6,155 ; Sécurité sociale 6,213 ; somme 59,059 pour un groupe de 58,870, non consolidé).
- **P6. Millésimes.** Prendre le portail CPS comme référence, et remplacer les montants à la prochaine édition.
