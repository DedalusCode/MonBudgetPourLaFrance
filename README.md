# Mon budget pour la France

Simulateur budgétaire citoyen, statique et open source. Il montre l'effet mécanique
immédiat des principaux leviers de prélèvements et de dépenses publiques sur :

1. les grands agrégats (recettes, dépenses, solde, dette, en Md€ et en % du PIB) ;
2. onze profils types de ménages, et le foyer que décrit l'utilisateur.

> Cet outil est une version volontairement simplifiée, conçue pour que chacun comprenne les
> grands mécanismes du budget public. Il ne remplace pas les chiffrages officiels.

Site : <https://dedaluscode.github.io/MonBudgetPourLaFrance/>. La conception, les choix de
méthode et la feuille de route sont décrits dans [PLAN.MD](PLAN.MD).

## Lancement local

Prérequis : Node.js 22.18 ou plus récent (les scripts sont exécutés directement en TypeScript) (la version utilisée en CI est indiquée dans `.nvmrc`).

```sh
npm install
npm run dev            # serveur de développement
npm test               # tests (Vitest) ; npm run test:watch en continu
npm run test:coverage  # tests avec couverture (≥ 90 % sur le moteur, exécuté en CI)
npm run lint           # ESLint + Prettier ; npm run format corrige la mise en forme
npm run typecheck      # svelte-check (TypeScript strict)
npm run validate:data  # schémas des données, sources, nombre de valeurs à vérifier
npm run docs:profiles  # régénère docs/reference-profiles.md (bilan des profils types)
npm run build          # build de production dans dist/ ; npm run preview pour le servir
```

## Déploiement sur GitHub Pages

Le workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) exécute le lint,
la vérification des types, les tests et le build à chaque push et pull request, puis
déploie le site à chaque push sur `main`.

**Activation (une seule fois) :** dans le dépôt GitHub, ouvrir
**Settings → Pages → Build and deployment → Source** et choisir **GitHub Actions**.

Le site est servi sous `https://<compte>.github.io/<nom-du-dépôt>/`. Le chemin de base est
transmis à Vite par la variable d'environnement `BASE_PATH` (voir `vite.config.ts`) ;
le workflow la renseigne automatiquement avec le nom du dépôt.

## Pile technique

Vite, TypeScript (strict), Svelte 5, Vitest, Zod, d3-hierarchy.

## Données

Les données sont dans `src/data/*.json`. Chaque valeur chiffrée a la forme
`{ value, unit, sourceId, asOf, status, note }`. `status` vaut `VERIFIE`, `A_VERIFIER` ou `HYPOTHESE`,
et toute source citée doit figurer dans `src/data/sources.json`. Les schémas sont dans
`src/engine/schemas.ts`. `npm run validate:data` les vérifie (exécuté en CI) et affiche le
nombre de valeurs encore à vérifier ; `node scripts/validate-data.ts --list` les liste une à une.

## Validation croisée avec OpenFisca-France

Les cotisations, la CSG, l'impôt sur le revenu (avec quotient familial), la prime d'activité et
les allocations familiales calculés par le simulateur sont comparés à ceux d'
[OpenFisca-France](https://github.com/openfisca/openfisca-france), le moteur de calcul
socio-fiscal ouvert de référence, sur les profils salariés et retraités et sur cinq foyers avec
enfants.

```sh
npm run openfisca:export                                   # cas et résultats du simulateur
python3 -m venv .venv && .venv/bin/pip install -r scripts/openfisca-check/requirements.txt
.venv/bin/python scripts/openfisca-check/compare.py        # rapport dans scripts/openfisca-check/out/
```

Le workflow [.github/workflows/openfisca-check.yml](.github/workflows/openfisca-check.yml)
exécute cette comparaison à chaque push, sans bloquer le déploiement, et publie le rapport
(artefact `rapport-openfisca` et résumé du job). Les écarts dont la cause est connue y sont
expliqués (prestations que le simulateur ne modélise pas, règle appliquée différemment).

## Licence

- **Code** : [GNU Affero General Public License v3.0](LICENSE) ou toute version ultérieure
  (`AGPL-3.0-or-later`). Une version modifiée mise en ligne doit publier son code source.
- **Données** (`src/data/`) et documentation : [Licence Ouverte / Open Licence 2.0](LICENSE-DATA.md)
  d'Etalab. Toute réutilisation doit mentionner la source et la date de mise à jour. Les données
  publiques reprises restent soumises aux conditions de leurs producteurs (INSEE, DGFiP, Urssaf…),
  cités dans `src/data/sources.json`.
