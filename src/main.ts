// SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mount } from 'svelte';
import App from './ui/App.svelte';
import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/nunito';
import '@fontsource-variable/space-grotesk';
import './ui/app.css';

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app mount point');

export default mount(App, { target });
