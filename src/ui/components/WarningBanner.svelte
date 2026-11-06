<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Main warning (PLAN.MD §9): can be folded, never removed.
  let open = $state(true);
</script>

<div class="warning" role="note" aria-label="Avertissement">
  <div class="inner">
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm-.9 6v5h1.8V7H7.1Zm.9-3.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"
      />
    </svg>
    {#if open}
      <p>
        Cet outil est une version volontairement simplifiée, conçue pour que chacun comprenne les
        grands mécanismes du budget public. Il ne remplace pas les chiffrages officiels. Les
        résultats montrent l'effet mécanique immédiat de chaque levier, sans tenir compte des
        réactions qu'il pourrait provoquer.
      </p>
    {:else}
      <p>
        Outil volontairement simplifié : effets mécaniques immédiats, sans réactions des acteurs.
      </p>
    {/if}
    <button type="button" class="link-button" aria-expanded={open} onclick={() => (open = !open)}>
      {open ? 'Réduire' : 'Lire l’avertissement'}
    </button>
  </div>
</div>

<style>
  .warning {
    background: var(--color-warning-bg);
    border-bottom: var(--border-width) solid var(--color-warning-border);
    padding: var(--space-2) var(--space-4);
  }

  .inner {
    display: flex;
    gap: var(--space-2) var(--space-3);
    align-items: flex-start;
    max-width: var(--max-width);
    margin: 0 auto;
  }

  svg {
    flex-shrink: 0;
    margin-top: 0.15rem;
    fill: var(--color-warning-border);
  }

  p {
    flex: 1;
    margin: 0;
    font-size: 0.85rem;
  }

  .link-button {
    font-size: 0.85rem;
  }
</style>
