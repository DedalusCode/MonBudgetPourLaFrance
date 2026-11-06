// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

export default ts.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', '.venv/', 'scripts/openfisca-check/out/'] },
  js.configs.recommended,
  ...ts.configs.strict,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  { languageOptions: { globals: globals.browser } },
  // Node runs the scripts, the tests and the tool configuration.
  {
    files: ['scripts/**', 'tests/**', 'config/**', '*.config.*'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: ['.svelte'],
        svelteConfig,
      },
    },
  },
);
