# Contribuer à « Mon budget pour la France »

Merci de votre intérêt pour le projet. Les contributions les plus utiles sont les signalements
d'erreurs de données, les propositions de leviers et les remarques sur la clarté ou la neutralité
des textes. Il n'est pas nécessaire de savoir programmer pour contribuer.

## Signaler un problème ou proposer une idée

Ouvrez une [issue](https://github.com/DedalusCode/MonBudgetPourLaFrance/issues/new/choose) avec
le modèle adapté :

- **Erreur de donnée** : une valeur fausse, périmée ou mal sourcée (taux, barème, montant de
  dépense, résultat d'un profil). Indiquez la valeur affichée, la valeur attendue et une **source
  officielle** (Légifrance, BOFiP, service-public.fr, INSEE, Eurostat, Urssaf, PLF…).
- **Proposition de levier** : un paramètre à ajouter. Indiquez sa valeur actuelle, sa source et,
  si possible, une source qui chiffre son rendement ou son assiette : sans elle, l'effet sur les
  recettes ne peut pas être calculé.
- Pour un bug d'affichage, d'accessibilité ou une question, ouvrez une issue libre en décrivant
  le navigateur, l'appareil et, si possible, le lien du scénario (bouton « Partager »).

Les issues ne sont pas le lieu pour débattre de l'opportunité d'une mesure : le simulateur montre
des effets, il ne recommande rien.

## Règles du projet

Elles sont détaillées dans [PLAN.MD](PLAN.MD) ; les principales :

- **Aucun chiffre sans source.** Toute valeur fiscale, budgétaire ou statistique a la forme
  `{ value, unit, sourceId, asOf, status, note }` et renvoie à une entrée de
  `src/data/sources.json` (URL officielle et date de consultation). Une valeur non vérifiable est
  marquée `A_VERIFIER` ; un choix de modélisation est marqué `HYPOTHESE`, avec sa justification
  dans `note`.
- **Neutralité.** Les leviers sont des paramètres, pas des propositions : bornes de 0 à 2 fois la
  valeur actuelle quand c'est possible, aucun scénario attribué à un parti, aucun texte qui
  qualifie une mesure de bonne ou de mauvaise ou qui ne présente qu'un sens d'une variation.
  Préférez les termes officiels (« cotisations », pas « charges »).
- **Identifiants de leviers stables.** Un identifiant publié (`vat.standard`,
  `spending.cofog.07.1`…) n'est jamais renommé ni réutilisé : les liens partagés en dépendent. Un
  levier supprimé est marqué `deprecated`. Un nouveau levier est ajouté à
  `tests/fixtures/lever-ids.json` et reçoit son texte explicatif dans `src/data/explanations.json`.
- **Accessibilité.** Le rouge et le vert ne portent jamais seuls l'information (signe et flèche
  obligatoires) ; contrastes WCAG AA ; tout est utilisable au clavier.
- **Langues.** Code, commentaires et identifiants en anglais ; textes de l'interface en français.
- **Licence.** Chaque nouveau fichier source commence par les deux lignes SPDX
  (`SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors` et
  `SPDX-License-Identifier: AGPL-3.0-or-later`). En contribuant, vous acceptez que votre code soit
  publié sous AGPL-3.0-or-later et vos données sous Licence Ouverte 2.0.

## Proposer une modification

1. Créez une branche à partir de `main` et installez le projet (`npm install`, Node.js 22.18 ou
   plus récent).
2. Faites une modification ciblée : une pull request par sujet.
3. Ajoutez ou mettez à jour les tests. Un calcul de ménage se teste de préférence sur un cas chiffré
   officiel (`tests/fixtures/`), avec sa source.
4. Vérifiez que tout passe, comme en CI :

   ```sh
   npm run lint
   npm run typecheck
   npm run validate:data
   npm run test:coverage
   npm run build
   ```

   Si vous modifiez les données ou le calcul des profils, régénérez aussi le bilan de référence :
   `npm run docs:profiles`.
5. Si le changement est visible sur le site, ajoutez une ligne dans [CHANGELOG.md](CHANGELOG.md),
   sous la prochaine version, dans la bonne rubrique (Données ou Méthode si les chiffres changent).
6. Décrivez dans la pull request ce qui change, pourquoi, et les sources utilisées.

La procédure de mise à jour annuelle des données (loi de finances, comptes publics, ventilation
COFOG) est décrite dans le [README](README.md#mettre-à-jour-les-données-à-chaque-loi-de-finances).
