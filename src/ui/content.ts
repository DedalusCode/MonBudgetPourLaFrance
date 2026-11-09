// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** French texts shown in several places of the interface. */

/** What the tool does not take into account (PLAN.MD §9). */
export const LIMITS: readonly string[] = [
  "Les changements de comportement : optimisation fiscale, départs ou arrivées de contribuables, variation de la consommation, du travail ou de l'investissement.",
  "Les effets sur la croissance : une variation des impôts ou des dépenses peut modifier l'activité économique, donc les recettes futures.",
  'Les effets de calendrier : certaines mesures produisent leurs effets sur plusieurs années.',
  'La diversité réelle des situations : les profils types sont des cas fictifs, pas des personnes réelles.',
  "Les liens entre prestations : chaque prestation est modifiée seule ; en réalité, baisser l'une peut en augmenter une autre (le RSA d'un foyer dont l'allocation chômage diminue, par exemple).",
  "Le non-recours : les aides de « Votre foyer » sont calculées comme si toutes étaient demandées, alors qu'une partie des personnes qui y ont droit ne les demandent pas.",
  "L'organisation des services : les postes à temps plein affichés sont un ordre de grandeur mécanique, qui ne dit pas comment la variation se ferait (départs, recrutements, rémunérations).",
];
