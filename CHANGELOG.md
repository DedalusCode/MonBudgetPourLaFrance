# Nouveautés

Toutes les évolutions notables du simulateur sont consignées ici. Ce fichier suit
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le site l'affiche dans sa page
« Nouveautés ». Les versions suivent [SemVer](https://semver.org/lang/fr/) : majeure quand
le format des scénarios partagés change de façon incompatible, mineure pour une
fonctionnalité ou de nouveaux leviers, corrective pour une correction.

Rubriques utilisées, dans cet ordre : **Ajouté**, **Modifié**, **Données** (valeurs ou
sources mises à jour), **Méthode** (règle de calcul ou hypothèse modifiée), **Corrigé**,
**Retiré**. Les rubriques Données et Méthode signalent les changements qui font varier
les chiffres affichés.

Règles d'écriture :
- une ligne par changement, commencée par « - » ; une suite de ligne est indentée de deux espaces ;
- texte simple, sans mise en forme ni montant en Md€ ;
- ton neutre : décrire ce qui change, sans le juger.

## [1.1.0] - 2026-11-09

### Ajouté
- Niveau de détail Essentiel, Détaillé ou Expert : changer de niveau masque des curseurs sans
  effacer aucune modification, et un lien partagé s'ouvre au niveau qui montre tous ses leviers.
- Troisième niveau des dépenses (niveau Expert) : 314 postes sous les 69 groupes, dont les
  prestations sociales (RSA, prime d'activité, prestations familiales, ARE, AAH, minimum
  vieillesse, aides au logement, bourses, retraites, etc.).
- Affichage des dépenses en arbre (par défaut) ou en cartes, à partir du niveau Détaillé.
- Votre foyer : nouveaux statuts (alternant, agent public, artisan ou commerçant, agriculteur,
  profession libérale, micro-entrepreneur, étudiant, retraité, au chômage, sans activité),
  handicap et pension d'invalidité.
- Votre foyer : aides calculées selon les revenus, en supposant qu'elles sont demandées
  (prestations familiales, prime d'activité, RSA, AAH, ASPA, ASS, aides au logement, bourses,
  chèque énergie, complémentaire santé solidaire).
- Curseurs des cotisations des employeurs publics.
- Fenêtre « Bilan » : la liste des mesures du scénario avec l'effet de chacune, les totaux et
  l'effet sur les profils, sans score ni verdict.
- Texte d'impact sous chaque curseur modifié, avec un ordre de grandeur en postes à temps plein
  pour les dépenses de personnel.
- Rubrique « Ce que change une variation » (à la hausse, à la baisse) dans toutes les fenêtres
  explicatives ; les postes par nature reprennent une définition du SEC 2010.
- Page « Nouveautés » et numéro de version en bas de page.

### Modifié
- Cartes des profils : trois blocs, prélèvements payés, part patronale et prestations et
  services reçus.
- Profil « Patrimoine de 5 M€, revenus du capital » : nouveau libellé.

### Données
- Détail des postes de niveau 3 repris de l'audit des données (DREES, comptes de la santé,
  PLF, Eurostat par nature), avec leurs sources.
- Effectifs et coûts moyens des postes publics (Eurostat, RAP 2024, INSEE, DREES, DGSCGC).

### Méthode
- Les aides selon les revenus s'appliquent aussi aux profils types, par le même calcul que
  Votre foyer ; l'aide au logement des profils reste un montant fixe.
- Chaque prestation suit son propre poste de dépense ; les bourses suivent le groupe
  « Services annexes à l’enseignement » (09.6).
- Cotisations des agents publics imputées en totalité à l'agent, comme pour les salariés du privé.
- Trois limites ajoutées : liens entre prestations, non-recours, ordre de grandeur des postes.

## [1.0.0] - 2026-11-06

### Ajouté
- Première version publique du simulateur.
- Leviers : impôt sur le revenu, CSG, prélèvement forfaitaire unique, TVA, accises sur
  l'énergie, impôt sur les sociétés, IFI, cotisations sociales, taxe foncière, et dépenses des
  10 fonctions et 69 groupes de la classification COFOG.
- Synthèse : recettes, dépenses, solde et trajectoire de la dette sur cinq ans.
- Treemap des dépenses et des recettes, avec un tableau équivalent.
- Onze profils types et Votre foyer : prélèvements payés, prestations et services reçus.
- Partage du scénario par l'adresse de la page, export et import en JSON.
- Pages Méthodologie, Sources et À propos ; quatre thèmes graphiques, clairs et sombres.
