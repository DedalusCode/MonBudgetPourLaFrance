<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // "What the tool does not take into account" (PLAN.MD §9), folded by default.
  import { LIMITS } from '../content.ts';
</script>

<details class="limits">
  <summary>Ce que l'outil ne prend pas en compte</summary>
  <ul>
    {#each LIMITS as limit (limit)}<li>{limit}</li>{/each}
  </ul>
  <p>
    Les montants sont arrondis et reposent sur des hypothèses documentées dans la page Méthodologie.
  </p>
</details>

<style>
  .limits {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-2) var(--space-4);
  }

  summary {
    min-height: var(--tap-size);
    display: flex;
    align-items: center;
    font-weight: 600;
  }

  ul,
  p {
    font-size: 0.9rem;
  }
</style>
