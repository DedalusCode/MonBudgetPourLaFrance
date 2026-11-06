<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Share the scenario as a link, export it as JSON, import a JSON file (PLAN.MD §8.3).
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import { simulatorHash } from '../state/url.ts';

  let { store }: { store: ScenarioStore } = $props();

  let message = $state('');

  function shareUrl(): string {
    const { origin, pathname, search } = window.location;
    return `${origin}${pathname}${search}${simulatorHash(store.scenario)}`;
  }

  async function share() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      message = 'Lien copié : il restaure exactement ce scénario.';
    } catch {
      window.prompt('Copiez ce lien :', url);
      message = '';
    }
  }

  function exportJson() {
    const blob = new Blob([`${JSON.stringify(store.scenario, null, 2)}\n`], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scenario-mon-budget.json';
    link.click();
    // Revoked once the download has started, not synchronously (it could cancel it).
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  async function importJson(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const dropped = store.load(JSON.parse(await file.text()));
      message =
        dropped.length === 0
          ? 'Scénario importé.'
          : `Scénario importé ; leviers inconnus ignorés : ${dropped.join(', ')}.`;
    } catch {
      message = 'Ce fichier n’est pas un scénario valide.';
    }
  }
</script>

<div class="actions">
  <button type="button" class="btn btn-primary" onclick={share}>
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M12 10.5c-.8 0-1.5.3-2 .9L6 9.2a2.6 2.6 0 0 0 0-2.4l4-2.2a2.5 2.5 0 1 0-.6-1.3l-4 2.2a2.5 2.5 0 1 0 0 5l4 2.2A2.5 2.5 0 1 0 12 10.5Z"
      />
    </svg>
    Partager
  </button>
  <button type="button" class="btn" onclick={exportJson}>Exporter</button>
  <label class="import btn">
    Importer
    <input
      type="file"
      class="visually-hidden"
      accept="application/json,.json"
      onchange={importJson}
    />
  </label>
  <p class="message" role="status">{message}</p>
</div>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    justify-content: flex-end;
  }

  .btn {
    font-size: 0.9rem;
  }

  .import:focus-within {
    outline: 3px solid var(--color-focus);
    outline-offset: 2px;
  }

  .message {
    flex-basis: 100%;
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-align: right;
  }

  .message:empty {
    display: none;
  }
</style>
