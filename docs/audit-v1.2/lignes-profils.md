# Audit v1.2 — Lignes des cartes de profil → curseurs (PLAN.MD §14.3)

Analyse en lecture seule du moteur (branche `feat/v1.1`, 16 novembre 2026). Aucun fichier du dépôt modifié.

## 0. Méthode

1. **Lecture du code** : chemin de chaque ligne depuis `profileView.ts` jusqu'aux modules `household/`, et chemin de chaque levier par `applyToRules` (`levers.ts`), `ScenarioFactors` (`simulate.ts:156-159`, `benefitItems.ts`), `groupAmounts` (`spendingAmountsFor`, `levers.ts:571-606`) et `inKind.ts`.
2. **Balayage empirique**, pour confirmer et compléter la lecture : 450 leviers × 6 valeurs (min, −25 %, −2 %, +2 %, +25 %, max). Ils sont appliqués aux 11 profils et à 24 foyers « Votre foyer » : salariés, couple avec enfants, parent isolé, chômeur + retraité, indépendant + fonctionnaire, micro, étudiant boursier + apprenti, AAH/ASS, exploitant agricole, ASPA, foyer sans revenu, hauts revenus, etc. Une ligne est dite « touchée » si |Δ| > 0,005 €. Les scripts sont dans le dossier temporaire de la session (`sens/sens.ts`, `sens2.ts`, `loo.ts`, `loo2.ts`) et ne font pas partie du dépôt.
   - Pour chaque ligne, la colonne « observé » donne le nombre de leviers effectivement vus en mouvement. La colonne « table » donne la liste issue de la lecture du code. Elle est plus large que l'observé, parce que certains effets n'existent que pour des situations non couvertes par l'échantillon (CEHR d'un retraité aisé, IFI au-delà de 2,57 M€…).

## 1. Constats préalables (ils conditionnent la table)

| # | Constat | Référence |
|---|---|---|
| C1 | **Le brut est recalculé dans le scénario** à partir du net cible, avec les règles du scénario, pour les profils `targetNetMonthly` (employee1800, cadre3k, cadre10k) et pour tous les salariés, apprentis et fonctionnaires de « Votre foyer ». Conséquence : un curseur de cotisation salariale ou de CSG laisse le net inchangé, augmente le brut, donc **la ligne « Cotisations patronales »** (et le RGDU). Vérifié : cadre3k avec CSG activité +1 pt → brut 45 478 → 46 049 €, net 36 000 → 36 000 €, patronal 17 948 → 18 261 €. Pour `smic` et `apprentice` (brut fixe), le net baisse à la place. **À arbitrer par le mainteneur** : ce choix fait entrer 9 curseurs « salariaux » dans la table de la part patronale et rend l'effet peu intuitif. | `profiles.ts:31-32`, `profiles.ts:46-48`, `customHousehold.ts:228`, `publicAgent.ts` (`grossForNetPublic`) |
| C2 | `csg.activity.rate` ne modifie que le **taux global**. Le taux déductible reste fixe : toute la hausse va à la CSG non déductible, qui entre dans le revenu imposable. | `levers.ts:172-183`, `socialContrib.ts:103-106` |
| C3 | La CSG/CRDS sur pensions, chômage et invalidité n'a **aucun curseur de taux**. Les taux `rules.pension.csgRates` et `rules.unemployment.*` ne sont touchés par aucun `applyToRules`. Le taux CRDS (`rules.crds.rate`) n'a pas non plus de curseur. | `pension.ts:47-63`, `replacement.ts:29-34` |
| C4 | **Aucun curseur** n'agit sur les cotisations des indépendants (`rules.selfEmployed`) ni sur celles des micro-entrepreneurs (`rules.micro`). Le brut d'un indépendant est recalculé à revenu imposable fixé. Ce revenu ne dépend pas du taux de CSG global (C2), donc le brut ne bouge pas. | `selfEmployed.ts:84-97`, `selfEmployed.ts:200-209`, `micro.ts:25-45` |
| C5 | Les leviers de dépense sont **hiérarchiques** : un poste remplace son groupe, un groupe remplace sa fonction. Une prestation suit le facteur de ses postes (`BENEFIT_ITEMS`), qui dépend donc des trois niveaux : fonction, groupe et poste. | `levers.ts:571-606`, `benefitItems.ts:15-41`, `benefitItems.ts:49-65` |
| C6 | Le **revenu consommé dépend du revenu disponible** : `profiles.ts:243-247`, et `customHousehold.ts:394` avec en plus un **changement discret de structure de consommation** par `closestPattern`. La TVA et les accises dépendent donc de presque tous les curseurs qui changent le revenu disponible. Exception : le profil `student`, dont la consommation est un montant fixé (`annualAmount`). | `profiles.ts:246-247`, `customHousehold.ts:390-404` |
| C7 | L'accise `energyExcise.heatingOil.rate` a un `householdWeight` = 0 (HYPOTHESE) : **aucun effet sur les ménages**. | `levers.ts:262`, `taxRules.json` |
| C8 | Cinq groupes ont une référence nulle (`03.5`, `06.5`, `08.5`, `09.7`, `10.8`), donc min = max = 0 : ces curseurs sont inertes. Le seul groupe de la fonction 10 réparti en nature est `10.8`, nul : **`spending.cofog.10` n'agit pas sur « Services publics reçus »**. | `levers.ts:447-449`, `inKindAllocation.json` |
| C9 | Le poste `09.6.higher-education-grants` a un **double effet** : sur la bourse (`studentGrant`) et sur « Services publics reçus », car le groupe 09.6 est réparti par habitant. Les postes de nature `benefits` de 07.4 et 09.5 sont aussi comptés en nature. | `benefitItems.ts:40`, `inKindAllocation.json` |
| C10 | Les leviers `macro.*` n'agissent sur aucune ligne de carte : ils ne servent qu'à la projection de la dette. | `simulate.ts:197-198` |
| C11 | Le taux du PFU et `csg.capital.rate` changent le revenu disponible, donc la TVA, mais pas le revenu fiscal de référence. La CSG déductible sur les revenus fonciers utilise `deductibleRate`, que le curseur ne modifie pas. | `levers.ts:184-209`, `capitalTax.ts:45` |
| C12 | `AmountLine` n'a **pas d'identifiant** (seulement `label`), et les lignes sont indexées par libellé dans `ProfileCard.svelte` (lignes 159 et 177). L'étape 23 devra ajouter `id` à `AmountLine`. | `profileView.ts:17-23` |

## 2. Ensembles réutilisés (notation)

| Nom | Contenu | Nb |
|---|---|---|
| `IR` | `incomeTax.bracket1..5.rate`, `incomeTax.indexation`. À écrire comme motif `incomeTax.*` pour accueillir les seuils et la tranche ajoutée de l'étape 24. | 6 |
| `E_SAL` | `socialContributions.employee{OldAgeCapped,OldAgeUncapped,SupplementaryT1,CegT1,SupplementaryT2,CegT2,Cet}.rate`, soit le motif `socialContributions.employee*` | 7 |
| `E_PUB` | `socialContributions.publicEmployeePension.rate` | 1 |
| `R_SAL` | `socialContributions.employer*` (Health, Family, OldAgeCapped/Uncapped, SupplementaryT1/T2, CegT1/T2, Cet, Unemployment, Ags, WorkAccidents, Autonomy, Fnal, Training, ApprenticeshipTax, SocialDialogue, HousingConstruction) | 18 |
| `R_PUB` | `socialContributions.publicEmployer{State,Local}Pension.rate` | 2 |
| `ACT` (revenus d'activité nets) | `csg.activity.rate` + `E_SAL`. Agit sur le net à brut fixe (smic, apprenti au-dessus de l'exonération) et sur le revenu net d'un indépendant. | 8 |
| `S(poste)` | chaîne hiérarchique d'un poste : `spending.cofog.DD`, `spending.cofog.DD.G`, `spending.cofog.DD.G.poste` | 3 |
| `REMPL` (revenus de remplacement) | `S(10.2.pensions-cnav)` ∪ `S(10.2.pensions-agirc-arrco)` ∪ `S(10.5.are)` ∪ `S(10.1.disability-pensions)`, soit `spending.cofog.10`, `10.1`, `10.2`, `10.5` et les 4 postes | 8 |
| `RFR` (revenu fiscal de référence) | `csg.activity.rate` + `E_SAL` + `E_PUB` + `REMPL` (C1, C2) | 17 |
| `FAM_RES` (prestations familiales comptées comme ressources) | `spending.cofog.10.4`, `10.4.family-allowances`, `10.4.family-supplement`, `10.4.paje-base`, `10.4.asf` | 5 |
| `LOG` (aide au logement, forfait logement) | `spending.cofog.10.6`, `10.6.apl`, `10.6.als`, `10.6.alf` | 4 |
| `PRESTA` | les 19 chaînes `BENEFIT_ITEMS` : `spending.cofog.09`, `09.6`, `10`, `10.1`, `10.2`, `10.4`, `10.5`, `10.6`, `10.7` et les 19 postes | 28 |
| `DISP` (revenu disponible → consommation, C6) | `IR`, `csg.activity.rate`, `csg.capital.rate`, `capitalIncome.flatTaxIncomeRate`, `E_SAL`, `E_PUB`, `wealthTax.*` (6), `propertyTax.change`, `PRESTA` | 52 |

## 3. Table ligne → curseurs

« Direct » = le curseur entre dans la formule de la ligne ; « indirect » = il passe par le brut recalculé, le revenu fiscal, les ressources d'une aide ou la consommation. Chaque ligne indique où elle peut apparaître : P = profils types (avec leur liste), F = « Votre foyer ».

### 3.1 Prélèvements (`borne`, `incidence.ts:31-97`)

| Ligne (id) | Où | Curseurs directs | Curseurs indirects (pourquoi) | Table | Observé |
|---|---|---|---|---|---|
| `employeeContributions` | P smic, employee1800, cadre3k, cadre10k ; F | `E_SAL`, `E_PUB` | `csg.activity.rate` (brut recalculé, C1) | **9** | 9 |
| `csgCrdsSalary` | idem | `csg.activity.rate` | `E_SAL`, `E_PUB` (brut recalculé ; aussi la base CRDS) | **9** | 9 |
| `employerContributions` (ligne du tableau **et** bloc « Part patronale ») | P apprentice, smic, employee1800, cadre3k, cadre10k ; F | `R_SAL`, `R_PUB` | `E_SAL`, `E_PUB`, `csg.activity.rate` (brut recalculé, C1 ; le RGDU dépend du brut) | **29** | 29 |
| `selfEmployedContributions` | P artisan ; F (indépendant, agricole, libéral) | — | — (C4) | **0** | 0 |
| `microContributions` | F | — | — (C4) | **0** | 0 |
| `csgCrdsSelfEmployed` | P artisan ; F | `csg.activity.rate` | — | **1** | 1 |
| `csgCrdsPension` (comprend aussi la contribution maladie de 1 % sur la retraite complémentaire, `incidence.ts:57-64`) | P retiree2500 (et retiree1000 quand sa pension double) ; F | — (C3) | `S(10.2.pensions-cnav)` ∪ `S(10.2.pensions-agirc-arrco)` : le montant et la tranche de CSG suivent la pension | **4** | 4 |
| `csgCrdsReplacement` | F seulement | — (C3) | `S(10.5.are)` ∪ `S(10.1.disability-pensions)` (montant) ; `csg.activity.rate`, `E_SAL`, `E_PUB` (tranche de CSG par le revenu d'activité, `household/index.ts:94-101`) | **14** | 5 |
| `incomeTax` | P employee1800, retiree2500, artisan, cadre3k, cadre10k, rentier5m (smic et retiree1000 selon le scénario) ; F | `IR` | `csg.activity.rate`, `E_SAL`, `E_PUB` (net imposable, C1-C2) ; `REMPL` (pension, ARE et invalidité imposables) | **23** | 23 |
| `microFlatIncomeTax` | F | — | — (C4) | **0** | 0 |
| `highIncomeContribution` (CEHR) | P fortune100m ; F | — (aucun curseur sur le barème de la CEHR ; l'indexation ne touche pas ses seuils) | `RFR` | **17** | 8 |
| `highIncomeMinimumTax` (CDHR) | P fortune100m ; F | — (curseurs CDHR absents à dessein) | `RFR` ; `IR` et `capitalIncome.flatTaxIncomeRate`, car l'impôt déjà payé est déduit (`household/index.ts:118-124`) : l'effet est **de sens inverse** | **24** | 2 |
| `flatTax` (PFU, part impôt) | P rentier5m, fortune100m | `capitalIncome.flatTaxIncomeRate` | — | **1** | 1 |
| `capitalSocialLevies` | P rentier5m, fortune100m | `csg.capital.rate` (décale tout le taux global, `levers.ts:191-196`) | — | **1** | 1 |
| `wealthTax` (IFI) | P rentier5m | `wealthTax.*` (5 tranches + seuil) | — | **6** | 3 |
| `vat` | P tous ; F | `vat.*` (4) | `DISP` (C6) ; pour `student`, seulement les 4 taux | **56** | 53 |
| `energyExcise` | P tous ; F | `energyExcise.{diesel,petrol,petrolE10,electricity,naturalGas}.rate` (5) ; `heatingOil` sans effet (C7) | `DISP` | **57** | 54 |
| `propertyTax` | P retiree1000, retiree2500, cadre10k, rentier5m ; F propriétaire | `propertyTax.change` (par `ScenarioFactors.propertyTax`, `simulate.ts:158`, `profiles.ts:103`) | — | **1** | 1 |
| `corporateTax` (part supportée) | P rentier5m, fortune100m | `corporateTax.standardRate` | — | **1** | 1 |

### 3.2 Prestations et services reçus (`profileView.ts:126-156`)

| Ligne (id proposé) | Où | Curseurs directs | Curseurs indirects (pourquoi) | Table | Observé |
|---|---|---|---|---|---|
| `aids.studentGrant` | F (étudiant avec données des parents) | `S(09.6.higher-education-grants)` | — (revenu des parents saisi) | **3** | 3 |
| `invalidityPension` | F | `S(10.1.disability-pensions)` | — | **3** | 3 |
| `aids.aah` | F | `S(10.1.aah)` | `csg.activity.rate`, `E_SAL`, `E_PUB` (revenu catégoriel), `S(10.5.are)`, `S(10.2.pensions-*)`, `10.1.disability-pensions`, `10.5.ass` (comparaison ASS/AAH, `householdAids.ts:189-194`) | **19** | 9 |
| `pension` (pension de retraite brute) | P retiree1000, retiree2500 ; F | `S(10.2.pensions-cnav)` ∪ `S(10.2.pensions-agirc-arrco)` (`profiles.ts:86-89`) | — | **4** | 4 |
| `aids.aspa` | P retiree1000 (retiree2500 si la pension baisse) ; F | `S(10.2.minimum-old-age)` | pensions (`10.2.pensions-*`), `S(10.5.are)`, `10.1`, `10.1.disability-pensions`, `ACT` (revenus du couple) | **17** | 5 |
| `familyAllowances` | F avec enfants | `S(10.4.family-allowances)` | `RFR` (modulation selon les ressources) | **19** | 4 |
| `aids.supportAllowance` (ASF) | F parent isolé | `S(10.4.asf)` | — (pas de condition de ressources) | **3** | 3 |
| `aids.familySupplement` | F ≥ 3 enfants | `S(10.4.family-supplement)` | `RFR` ; `ACT` (condition de deux revenus) | **19** | 5 |
| `aids.backToSchool` | F | `S(10.4.ars)` | `RFR` | **19** | 3 |
| `aids.youngChild` (PAJE de base) | F | `S(10.4.paje-base)` | `RFR` ; `ACT` | **19** | 3 |
| `unemploymentBenefit` | F | `S(10.5.are)` | — | **3** | 3 |
| `aids.ass` | F | `S(10.5.ass)` | ressources de l'autre adulte : `ACT`, `REMPL` ; `10.1.aah` (comparaison) | **18** | 3 |
| `housingAid` | P student (valeur de données × facteur) ; F locataire | `LOG` + `spending.cofog.10` | F seulement : `RFR` (ressources), `10.1.aah` (abattement AAH), `S(09.6.higher-education-grants)` (boursier) | **profils 5 ; foyer 25** | 19 |
| `activityBonus` (prime d'activité) | P smic, employee1800 ; F | `S(10.7.prime-activite)` | `ACT` (revenus d'activité), `REMPL`, `FAM_RES`, `10.5.ass`, `10.1.aah`, `10.2.minimum-old-age` (ressources), `LOG` (forfait logement) — **pas l'IR** | **30** | 20 |
| `aids.rsa` | F (et les retraités types si leur pension est coupée) | `S(10.7.rsa)` | mêmes ressources que la prime d'activité (sans la prime) | **30** | 6 |
| `aids.energyCheck` | P student, apprentice, retiree1000 ; F | `S(10.7.energy-voucher)` | `RFR` | **19** | 11 |
| `inKind` (« Services publics reçus ») | P tous ; F | `spending.cofog.01`–`09`, leurs groupes répartis par habitant (54, hors 01.7, 01.8 et groupes nuls) et tous leurs postes (242) | — | **305** | 305 |
| (texte) Complémentaire santé solidaire | P et F | — | ressources : `ACT`, `REMPL`, `FAM_RES`, ASS/AAH/ASPA, `LOG`, `S(10.7.rsa)` | ~30 | 16 |

### 3.3 Lignes gouvernées par beaucoup de curseurs

`inKind` (305), `energyExcise` (57), `vat` (56), `activityBonus` (30), `aids.rsa` (30), `employerContributions` (29), `housingAid` du foyer (25), `highIncomeMinimumTax` (24), `incomeTax` (23). Pour ces lignes, une liste plate est illisible. La fenêtre devrait regrouper les curseurs :
- « Services publics reçus » : par fonction, ce qui découle du découpage du §4.1.
- TVA et accises : « taux » (4 ou 5 curseurs) puis « par le revenu disponible ». Ce second groupe se replie et s'affiche seulement s'il contient un curseur modifié.
- Aides sous condition de ressources : « montant de l'aide » (chaîne S) puis « par les ressources du foyer ».

### 3.4 Forme proposée pour la table

Il faut une table de **motifs**, pas d'identifiants en dur. Le motif `incomeTax.*` couvre ainsi les leviers ajoutés à l'étape 24. La table est résolue au chargement contre le catalogue, sans les leviers `deprecated` ni les leviers inertes (min = max). Elle reste un module pur `engine/lineLevers.ts`, sans dépendance à l'interface. Exemple :

```ts
const RFR = ['csg.activity.rate', 'socialContributions.employee*', 'socialContributions.publicEmployeePension.rate', ...REMPL];
export const LINE_LEVERS: Record<LineId, { direct: string[]; indirect: string[] }> = {
  incomeTax: { direct: ['incomeTax.*'], indirect: [...without(RFR, ['spending.cofog.10.1.aah'])] },
  ...
};
```

**Tests proposés** :
- (a) Toute ligne a au moins un curseur, avec une liste explicite d'exceptions : `selfEmployedContributions`, `microContributions`, `microFlatIncomeTax`.
- (b) **Complétude** : pour chaque levier, à min et à max, sur les 11 profils et un jeu de foyers, toute ligne qui bouge doit avoir ce levier dans sa table. C'est le balayage de cet audit ; il prend environ 37 s pour 450 leviers × 6 valeurs × 35 sujets, donc à réduire à 2 valeurs.
- (c) Tous les identifiants issus des motifs existent dans le catalogue.

## 4. Découpage des lignes

### 4.1 Déjà calculé par le moteur (aucun changement de moteur)

| Découpage | Où c'est calculé | Curseurs par sous-ligne |
|---|---|---|
| « Services publics reçus » **par fonction** (puis par groupe en Expert) | `InKindResult.byDivision` et `byGroup` (`inKind.ts:14-20`), sommés pour le foyer (`customHousehold.ts:257`). La fonction 10 vaut toujours 0 (C8) et n'est pas affichée. | 01 : 28 · 02 : 23 · 03 : 26 · 04 : 58 · 05 : 35 · 06 : 29 · 07 : 38 · 08 : 28 · 09 : 40. Chaque fonction n'a que ses propres curseurs (vérifié). |
| Cotisations salariales et patronales **par cotisation** | `SalaryResult.lines` (`socialContrib.ts:79-90`) : un `id` par cotisation, **identique** au levier `socialContributions.<id>.rate`. | 1 curseur direct par ligne + 9 indirects (C1). **Ajouter une ligne négative « Réduction générale (RGDU) »** (`employerRelief`, `socialContrib.ts:96-100`, sans curseur, mais elle bouge avec le brut) pour que la somme retombe sur `employerContributions`. |
| Fonctionnaires | `publicAgentContributions` : lignes `publicPension`, `rafp`, `state*`/`local*`, `rafpEmployer` (`publicAgent.ts:24-35`) | Curseurs seulement pour `publicPension`, `statePension` et `localPension` ; les autres lignes n'en ont aucun. |
| CSG / CRDS / CASA (profils à une personne) | `levies.salary.csgDeductible`, `csgNonDeductible`, `crds` ; `levies.pension.csg*`, `crds`, `casa`, `complementaryHealth` (`pension.ts:47-63`) ; `levies.selfEmployed.*` ; `levies.unemployment.*` et `levies.invalidity.*` | CSG du salaire ou de l'indépendant : `csg.activity.rate` (+ brut). CRDS : **aucun curseur direct** (C3), seulement la base. CASA et 1 % maladie : seulement `S(pensions)`. |
| IR : « impôt avant décote » et « décote » | `IncomeTaxResult.grossTax` et `decote` (`incomeTax.ts:88-92, 118-119`) ; par foyer fiscal pour « Votre foyer » (`taxes[].ir`) | Rend lisibles les interactions de la décote (§5.3) : l'indexation agit aussi sur les plafonds de la décote (`levers.ts:162-169`). |

### 4.2 Changements de moteur nécessaires

1. **« Votre foyer » à deux adultes** : `CustomHouseholdResult.levies` est celui du **seul premier adulte** (`customHousehold.ts:445`). Les sous-lignes CSG/CRDS/CASA et par cotisation ne peuvent donc pas être tirées du résultat. Proposition : `BorneLevy` reçoit `parts?: { id: string; amount: number }[]`, rempli par `borneLevies` et sommé par identifiant dans la boucle `customHousehold.ts:408-412`. Le même canal sert aux profils.
2. **Cotisations d'indépendant** : santé, famille, retraite de base, complémentaire, invalidité, indemnités journalières et formation sont additionnées sans être rendues (`selfEmployed.ts:84-97`, `schemeContributions`). Il faut renvoyer le détail. Ces sous-lignes n'ont pas de curseur (C4), donc l'intérêt est informatif seulement.
3. **Micro-entrepreneur** : le taux est global (CSG et CRDS comprises, `micro.ts:3-6`). On ne peut pas le découper sans données supplémentaires. Ne pas le découper.
4. **Libellé à corriger** : « CSG, CRDS et CASA sur la pension » contient aussi la contribution maladie de 1 % sur la retraite complémentaire (`incidence.ts:63`). Le découpage la ferait apparaître ; sinon, il faut corriger le libellé.

### 4.3 Autres lignes qui gagneraient à être découpées

- **TVA** et **accises** : séparer « effet des taux » et « effet de la consommation ». L'effet de consommation vaut `consumptionTax(consommation du scénario, règles de référence) − référence` ; l'effet des taux est le reste. Cela regroupe les 52 curseurs `DISP` en une sous-ligne et laisse 4 ou 5 curseurs à la sous-ligne « taux ». Il faut exposer la consommation de référence et la règle de calcul (petit changement dans `consumptionTax.ts:26-31`). On pourrait ensuite découper la TVA par taux (4 termes déjà calculés puis additionnés) et les accises par produit (`share0 × householdWeight × tarif/référence`, `levers.ts:262`).
- **Prélèvements sociaux sur le capital** : CSG sur le capital et autres prélèvements. Le curseur décale le taux global, et seul le total est rendu (`capitalTax.ts:43-44`).
- **Part patronale** : afficher la réduction générale (RGDU) à part (voir §4.1).
- Les autres lignes (pension, ARE, invalidité, ASF, bourse) ont 3 ou 4 curseurs : ne pas les découper.

## 5. Effet par curseur (« tous sauf celui-ci ») et « Effets combinés »

### 5.1 Définition : remettre le curseur à sa valeur de référence plutôt que le retirer

Retirer le levier de la liste fausse le calcul pour les dépenses (C5). Si la fonction 10 et le groupe 10.4 sont modifiés, retirer le groupe fait suivre au groupe le facteur de la fonction, et non sa référence. Mesures sur le scénario S3 :

| Méthode | Allocations familiales, parent isolé : variation 365 € | Bilan du scénario `busy` (450 leviers) |
|---|---|---|
| Levier **retiré** | effet du groupe 730 €, effets combinés −365 € (−100 %) | services en nature : effets combinés de 59 à 103 % de la variation |
| Levier **remis à la référence** | effets combinés ≈ 0 | services en nature : effets combinés < 1 € |

La remise à la référence suit la règle d'attribution de `spendingAttribution.ts`, où chaque montant est fixé par un seul levier. Pour un levier fiscal, les deux méthodes sont identiques.

### 5.2 Coût mesuré (Node 24, cette machine ; le navigateur est 2 à 5 fois plus lent sur mobile)

| Mesure | Temps |
|---|---|
| `simulate()` complet (11 profils + agrégats + attribution) | 1,4 à 1,8 ms |
| Préparation du scénario (`structuredClone(rules)` + `spendingAmountsFor` + `benefitFactors`) | 0,36 ms |
| `computeProfile` pour un profil | 0,08 ms |
| `simulateHousehold` | 0,8 ms, dont la moitié pour recalculer la référence à chaque appel (`simulate.ts:250`) ; elle peut être mise en cache |
| Effet par curseur pour 8 leviers, avec `simulate` complet | 26 ms |
| Effet par curseur pour 450 leviers (pire cas) | 1,0 s avec `simulate` ; ≈ 0,2 s avec une fonction limitée à un profil |

**Proposition** : une fonction de moteur `lineEffects(model, scenario, subject)` qui calcule **tous les effets de toutes les lignes d'un sujet** (profil ou foyer).
- Une seule passe par levier modifié, sur ce seul sujet : ≈ 0,45 ms par levier pour un profil et ≈ 0,4 ms pour un foyer, référence mise en cache.
- Ne parcourir que les leviers modifiés présents dans la table de la ligne. Les autres ont un effet nul par construction, ce que le test (b) vérifie.
- Calcul au clic, jamais sur l'événement `input` d'un curseur ; mise en cache par (scénario, sujet). Cas courant de 5 à 20 leviers modifiés : 2 à 10 ms.
- **« Services publics reçus » est linéaire** dans les montants des groupes. L'effet exact s'obtient sans aucune simulation : Σ sur les groupes de (montant par habitant pondéré × variation attribuée au levier), et les effets combinés sont nuls. Il faut que `attributeSpending` rende la variation par levier et **par groupe** ; aujourd'hui `byLever` est agrégé.

### 5.3 Où les interactions sont fortes (mesures, effets combinés / variation de la ligne)

| Cas | Effets combinés | Cause |
|---|---|---|
| IR du smic : tranche 2 ×1,5, tranche 1 à 1 %, indexation −5 % | −23 % | Décote (`incomeTax.ts:89-92`) : seuil d'entrée dans l'impôt et plafonds indexés. |
| IR d'un couple marié (S2) | +10 % | Décote du couple et quotient familial. |
| TVA et accises de « Votre foyer » (S2, couple) | **+86 %** | Changement discret de structure de consommation (`closestPattern`, `customHousehold.ts:394`). Un saut, pas une interaction continue. |
| Prime d'activité du parent isolé (scénario `busy`) | **100 %** | Seuil : la prime tombe à 0, et aucun levier remis seul à la référence ne la rétablit. |
| Prime d'activité, autres cas | −5 à +50 % | Produit « barème × facteur du poste » (`householdAids.ts:276-288`) et ressources prises en compte. |
| Aide au logement du parent isolé (S1) | −60 % | Ressources de l'aide (revenu fiscal) et paliers du barème. |
| Chèque énergie (retiree1000, S1) | +33 % | Tranches de revenu fiscal. |
| Cotisations, CSG, part patronale (salariés à net fixé) | −1 à −3 % | Brut recalculé (C1) : les taux se multiplient entre eux. |
| ASPA, pension × tranche de CSG | ≤ 2 % après remise à la référence | — |

Affichage : la ligne « Effets combinés » n'apparaît que si son montant arrondi est d'au moins 1 €. Son texte est neutre, par exemple : « Les curseurs agissent ensemble, par exemple par la décote ou les seuils des aides ; cet écart n'est attribué à aucun d'eux. »

**Le critère d'acceptation de l'étape 23 est vrai par construction** : les effets combinés sont définis comme le reste. Le test utile est plutôt :
- un scénario à un seul levier donne un effet égal à la variation de la ligne et des effets combinés nuls ;
- les effets combinés de « Services publics reçus » sont nuls ;
- aucun levier hors de la table n'a d'effet.

## 6. Cas particuliers

1. **Lignes présentes selon le profil** (référence) :
   - Cotisations salariales et CSG du salaire : smic, employee1800, cadre3k, cadre10k. Part patronale : ces quatre profils et l'apprenti.
   - Cotisations d'indépendant et CSG de l'indépendant : artisan. CSG sur la pension : retiree2500.
   - IR : employee1800, retiree2500, artisan, cadre3k, cadre10k, rentier5m.
   - CEHR et CDHR : fortune100m. PFU, prélèvements sociaux et IS : rentier5m, fortune100m. IFI : rentier5m.
   - Taxe foncière : retiree1000, retiree2500, cadre10k, rentier5m.
   - Prime d'activité : smic, employee1800. ASPA : retiree1000. Chèque énergie : student, apprentice, retiree1000. Aide au logement : student. Pension : les deux retraités.
   - **Lignes qui n'apparaissent qu'avec un scénario** : IR (smic, retiree1000), CSG sur la pension (retiree1000), ASPA et chèque énergie (retiree2500), RSA (retraités dont la pension est coupée). Le filtre « avant ≥ 0,5 ou après ≥ 0,5 » (`profileView.ts:116, 156`) garde aussi les lignes qui tombent à 0 : elles restent cliquables.
   - Lignes propres à « Votre foyer » : allocations familiales et autres prestations familiales, ARE, ASS, AAH, invalidité, bourse, `csgCrdsReplacement`, lignes micro. Lignes propres aux profils : PFU, prélèvements sociaux sur le capital, IFI, IS (le foyer n'a ni capital ni patrimoine, `customHousehold.ts` `emptyInput`).
2. **Table non vide, mais rien ne bouge pour ce sujet** :
   - CEHR de fortune100m : son revenu fiscal ne contient que des revenus du capital, que rien ne modifie.
   - Part patronale de l'apprenti : seulement `R_SAL`, son brut est fixe.
   - TVA du profil student : seulement les 4 taux.
   - Proposition : afficher en tête les curseurs **modifiés** avec leur effet, en écrivant « sans effet sur cette ligne pour ce foyer » quand l'effet est nul, puis les autres curseurs de la table sous le titre « peuvent agir sur cette ligne », sans montant.
3. **Lignes sans aucun curseur** (C4) : `selfEmployedContributions`, `microContributions`, `microFlatIncomeTax`. Le critère « chaque ligne a au moins un curseur » (PLAN.MD, étape 23) **ne peut pas être tenu** sans nouveaux leviers. À arbitrer : ligne non cliquable avec une mention, ou fenêtre expliquant qu'aucun curseur ne la modifie dans cette version. Il faudra une exception explicite dans le test.
4. **Leviers inertes** : l'accise sur le fioul (C7) et les 5 groupes nuls (C8). Les exclure de la table, ou les montrer avec une note pour le fioul.
5. **Leviers `deprecated`** : aucun aujourd'hui (seul le champ existe, `levers.ts:46`). `LeverPanel` les masque (`LeverPanel.svelte:33`) : `focusLever` sur l'un d'eux ne trouverait pas de champ, `getElementById` rendrait null et il ne se passerait rien. Règle proposée :
   - la table résolue exclut les leviers dépréciés ;
   - un levier déprécié encore présent dans un scénario partagé (`migrateScenario` le garde s'il est connu) est affiché avec son effet, sans bouton « Ouvrir ».
6. **Niveaux de détail** (`detailLevel.ts:33-56`) :
   - Essentiel : 10 fonctions et 13 prélèvements. Détaillé : groupes et tous les prélèvements. Expert : postes.
   - Beaucoup de curseurs directs sont des postes Expert (`10.7.prime-activite`, `10.7.rsa`, `10.2.pensions-*`…). Au niveau Essentiel, seul `spending.cofog.10` est visible.
   - `store.focusLever(id)` (`scenario.svelte.ts:301-304`) appelle `show([id])`, donc `levelShowing`. Le niveau est **relevé pour la visite seulement** : `show` n'appelle pas `writeStored`, contrairement à `chooseDetailLevel`, `scenario.svelte.ts:266-269`.
   - `App.svelte:86` ouvre ensuite la feuille du bas sur téléphone, et `LeverPanel.svelte:114-131` vide la recherche, ouvre les accordéons (`keysFor`, y compris `item:` pour les postes) et met le focus sur `lever-<id>`.

   Propositions :
   - Lister tous les curseurs de la table quel que soit le niveau, dans l'ordre du panneau. Ceux qui sont masqués au niveau courant portent la mention « niveau Détaillé » ou « niveau Expert », regroupés et repliés (« N autres curseurs plus détaillés »).
   - Les curseurs modifiés sont toujours en tête, qu'ils soient visibles ou masqués.
   - Le clic **ferme d'abord le `<dialog>`** (modal : le reste de la page est inerte) **sans rendre le focus au bouton de la ligne**, contrairement à `LeverInfo`, puis appelle `focusLever`. Le changement de niveau est annoncé, par exemple « ouvre le niveau Expert ».
   - Test : pour chaque levier de chaque table, `levelShowing(level, [lever])` permet de l'afficher, et le champ `lever-<id>` existe dans le rendu.
7. **Écart relevé en marge** : pour un étudiant de « Votre foyer », les services en nature n'utilisent que la clé d'âge (`customHousehold.ts:427`), sans la clé `student`. Le coût par étudiant de 09.4 lui manque, alors qu'il compte pour le profil `student`. À vérifier avant de découper « Services publics reçus ».
