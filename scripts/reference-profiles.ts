// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Generates docs/reference-profiles.md: the reference balance of the profiles
 * (PLAN.MD §5.3). Usage: node scripts/reference-profiles.ts
 * A test fails when the committed file is out of date.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ProfileResult } from '../src/engine/profiles.ts';
import { referenceProfiles } from '../src/engine/reference.ts';
import { AID_LABELS, LEVY_LABELS } from '../src/ui/labels.ts';
import type { AidId } from '../src/engine/householdAids.ts';
import { loadDatasetFromDisk } from './lib/dataset.ts';
import type { Dataset } from '../src/engine/types.ts';

export const OUTPUT = fileURLToPath(new URL('../docs/reference-profiles.md', import.meta.url));

const euros = (x: number) =>
  `${Math.round(x)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
const percent = (x: number) =>
  Number.isFinite(x) ? `${(x * 100).toFixed(1).replace('.', ',')} %` : '—';

export function renderReferenceProfiles(data: Dataset): string {
  const results = referenceProfiles(data);
  const labels = new Map(data.profiles.profiles.map((p) => [p.id, p.label]));
  const header = `| | ${results.map((r) => labels.get(r.id)).join(' | ')} |`;
  const separator = `|---|${results.map(() => '---:').join('|')}|`;
  const row = (label: string, value: (r: ProfileResult) => string) =>
    `| ${label} | ${results.map(value).join(' | ')} |`;
  const levyIds = Object.keys(LEVY_LABELS).filter((id) =>
    results.some((r) => (r.borne.find((l) => l.id === id)?.amount ?? 0) > 0.5),
  );
  const aidIds = (Object.keys(AID_LABELS) as AidId[]).filter((id) =>
    results.some((r) => r.aids[id] > 0.5),
  );
  const cover = (r: ProfileResult) =>
    r.healthCover.status === 'free'
      ? 'gratuite'
      : r.healthCover.status === 'participation'
        ? `${euros(r.healthCover.monthlyParticipation)} par mois`
        : '—';
  const lines = [
    '# Bilan de référence des profils types',
    '',
    `Généré par \`node scripts/reference-profiles.ts\` à partir des données (version ${data.meta.dataVersion}) :`,
    'législation en vigueur et dépenses publiques de référence, sans aucun levier. Montants annuels.',
    '',
    header,
    separator,
    row('Salaire brut', (r) => euros(r.input.grossSalary)),
    row('Revenu fiscal de référence', (r) => euros(r.fiscalIncome)),
    row('Revenu économique', (r) => euros(r.economicIncome)),
    row('Revenu disponible', (r) => euros(r.disposableIncome)),
    row('Consommation', (r) => euros(r.consumption)),
    ...levyIds.map((id) =>
      row(LEVY_LABELS[id] ?? id, (r) => euros(r.borne.find((l) => l.id === id)?.amount ?? 0)),
    ),
    row('**Total des prélèvements supportés**', (r) => `**${euros(r.totalLevies)}**`),
    row('Pension de retraite (brute)', (r) => euros(r.pension)),
    row("Prime d'activité", (r) => euros(r.activityBonus)),
    row('Aide au logement', (r) => euros(r.housingAid)),
    ...aidIds.map((id) => row(AID_LABELS[id], (r) => euros(r.aids[id]))),
    row('Complémentaire santé solidaire (droit, non comptée)', cover),
    row('Services publics reçus', (r) => euros(r.inKind.total)),
    row('Taux de prélèvement global / revenu économique', (r) =>
      percent(r.totalLevies / r.economicIncome),
    ),
    row('Impôts personnels sur le revenu / revenu fiscal', (r) =>
      percent(r.personalIncomeTaxes / r.fiscalIncome),
    ),
    '',
    'Revenu économique : salaire super-brut, revenus du capital, bénéfices mis en réserve et impôt sur les',
    'sociétés supporté. Impôts personnels sur le revenu : impôt sur le revenu, CEHR, CDHR, PFU et',
    'prélèvements sociaux sur le capital. Toutes les hypothèses sont dans `src/data/` (statut `HYPOTHESE`,',
    'avec leur source).',
    '',
  ];
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(OUTPUT, renderReferenceProfiles(loadDatasetFromDisk()));
  console.log(`✓ ${OUTPUT}`);
}
