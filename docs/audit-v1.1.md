# Audit des données de la v1.1 (étape 13)

Consultation des sources : 7 novembre 2026. Ce document fait la synthèse de trois audits détaillés, qui
contiennent chaque valeur, chaque source et chaque calcul :

- [Dépenses de niveau 3 et prestations](audit-v1.1/depenses.md)
- [Aides et situations du foyer](audit-v1.1/foyer.md)
- [Postes, niveau Essentiel et fenêtres explicatives](audit-v1.1/postes-essentiel-explications.md)

Aucun code ni fichier de données n'a été modifié. Rien n'entre dans `src/data/` avant validation.

## Résultat

| Sujet | Constat |
|---|---|
| Curseurs | 22 en Essentiel, 131 en Détaillé (133 avec les 2 macro), 314 de plus en Expert, soit 447 au total |
| Groupes de dépenses (69) | 14 en postes concrets, 3 mixtes, 42 par nature, 10 sans niveau 3 |
| Prestations | Toutes celles du plan ont un montant 2024 lu dans une source officielle (DREES), avec des réserves sur leur rattachement |
| Aides du foyer | 13 calculables, PCH, APA et CMG en explication seule |
| Situations | Toutes faisables ; l'agriculteur n'a pas de contrôle OpenFisca |
| Postes | Chiffre possible sur 46 groupes (17 en coût direct, 29 en coût moyen du versant), aucun sur 23 |
| Fenêtres « ? » | 133 à compléter (27 impôts, 25 cotisations, 79 dépenses, 2 macro) |

## Fiabilité : ce qu'il faut savoir

1. **Le rattachement des prestations aux groupes est une déduction.** Aucune table officielle de passage entre
   les comptes de la protection sociale et la COFOG n'a été trouvée. Les montants sont sourcés, le rattachement est
   `HYPOTHESE` ; les totaux se recoupent bien (07.1 + 07.2 : 135,33 contre 135,50 Md€). L'INSEE ou la DREES
   pourraient fournir cette table sur demande.
2. **Les postes de l'État viennent du PLF 2024**, pas de l'exécution : marqués `HYPOTHESE`.
3. **Le coût moyen d'un poste est toujours dérivé** (`HYPOTHESE`) : dépense de personnel ÷ effectifs sourcés. Le contrôle
   global est bon (5,72 M de postes implicites pour 5,80 M d'équivalents temps plein), sur des périmètres
   différents. La défense reste à expliquer (1,65 Md€ d'écart).
4. **Tous les montants de niveau 3 sont de 2024** et passent à 2025 par le même coefficient, ce qui est inexact pour les
   prestations dont l'évolution diffère du total.
5. **Limites d'accès.** caf.fr bloque la lecture automatique : aucun exemple CAF, barème APL recoupé avec OpenFisca
   seulement. Légifrance n'a été lu que par extraction automatique : les 144 plafonds des bourses restent à relire ligne à ligne.
   Le site de la DREES a rejeté plusieurs fichiers : les données viennent de son portail open data, et le tableau détaillé 5 n'a pas été lu.
6. **À vérifier :** 19 points côté foyer, 12 côté dépenses et 11 côté postes (dont 03.2, 10.5 et le taux CAS Pensions 2025). Aucun
   n'entrera comme `VERIFIE` sans lecture de la source.

## Constats sur le site en ligne

Deux écarts du moteur actuel, à corriger à l'étape 16, relevés dans le code ; leur base légale est à relire avant correction :

- les ressources de la prime d'activité comptent la majoration pour âge des allocations familiales, qui en serait exclue
  (CSS R844-5, 3°) ;
- les allocations familiales sont comptées avant CRDS (0,5 %) dans le revenu disponible.

## Conséquences à connaître

- Calculer l'APL fera **baisser la prime d'activité** des locataires aidés, par le forfait logement. C'est la règle légale.
- Le patrimoine n'est pas saisi : l'ASPA, l'ASS et le RSA peuvent être surestimés pour certains foyers. Signalé en Méthodologie.
- Le formulaire « Votre foyer » devient long : les champs doivent s'afficher selon la situation choisie.

## Décisions

Les décisions de détail sont dans chaque annexe avec une recommandation (D1 à D15, P1 à P6, 1 à 13). Les arbitrages
sont consignés dans PLAN.MD §13.10.
