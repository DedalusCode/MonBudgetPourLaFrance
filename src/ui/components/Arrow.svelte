<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Direction arrow paired with a +/− sign: colour never carries meaning alone.
  let { direction }: { direction: 'up' | 'down' } = $props();
</script>

<svg
  class="arrow"
  data-direction={direction}
  viewBox="0 0 12 12"
  width="12"
  height="12"
  aria-hidden="true"
  focusable="false"
>
  {#if direction === 'up'}
    <path d="M6 1 L11 7 H7.5 V11 H4.5 V7 H1 Z" />
  {:else}
    <path d="M6 11 L1 5 H4.5 V1 H7.5 V5 H11 Z" />
  {/if}
</svg>

<style>
  .arrow {
    fill: currentColor;
    flex-shrink: 0;
  }
</style>
