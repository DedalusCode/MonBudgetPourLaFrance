// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Every source file carries the AGPL-3.0 SPDX header (see LICENSE). */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FOLDERS = ['src', 'scripts', 'tests', 'config', '.github'];
const SOURCE = /\.(ts|js|svelte|css|py|yml)$/;
/** Source files at the root of the project. */
const ROOT_FILES = ['index.html', 'vite.config.ts', 'svelte.config.js', 'eslint.config.js'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE.test(entry.name) ? [path] : [];
  });
}

describe('licence headers', () => {
  it('every source file declares AGPL-3.0-or-later', () => {
    const files = [
      ...FOLDERS.flatMap((folder) => sourceFiles(join(ROOT, folder))),
      ...ROOT_FILES.map((file) => join(ROOT, file)),
    ];
    const missing = files.filter(
      (file) => !readFileSync(file, 'utf8').includes('SPDX-License-Identifier: AGPL-3.0-or-later'),
    );
    expect(missing).toEqual([]);
  });
});
