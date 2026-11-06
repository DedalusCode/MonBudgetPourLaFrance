<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // Style selector (four designs) and light/dark switch; choices kept in this browser.
  import {
    DEFAULT_STYLE,
    isStyle,
    MODE_KEY,
    modeFor,
    STYLE_KEY,
    STYLES,
    type Mode,
    type Style,
  } from '../state/theme.ts';
  import { browser, readStored, writeStored } from '../state/storage.ts';

  const storedStyle = browser ? readStored(STYLE_KEY) : null;
  const initialStyle: Style = isStyle(storedStyle) ? storedStyle : DEFAULT_STYLE;
  let style = $state<Style>(initialStyle);
  let mode = $state<Mode>(browser ? modeFor(initialStyle, readStored(MODE_KEY)) : 'light');

  $effect(() => {
    document.documentElement.dataset['style'] = style;
    document.documentElement.dataset['theme'] = mode;
  });

  function changeStyle(event: Event) {
    const next = (event.currentTarget as HTMLSelectElement).value;
    if (!isStyle(next)) return;
    style = next;
    writeStored(STYLE_KEY, next);
    mode = modeFor(next, readStored(MODE_KEY));
  }

  function toggleMode() {
    mode = mode === 'dark' ? 'light' : 'dark';
    writeStored(MODE_KEY, mode);
  }
</script>

<div class="theme-picker">
  <label class="style">
    <span class="visually-hidden">Apparence du site</span>
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M8 1a7 7 0 1 0 0 14c.8 0 1.3-.6 1.3-1.3 0-.4-.1-.7-.4-1-.2-.2-.3-.5-.3-.8 0-.7.6-1.3 1.3-1.3h1.6A3.5 3.5 0 0 0 15 7.1C15 3.7 11.9 1 8 1Zm-4 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm2-3a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm2 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
      />
    </svg>
    <select value={style} onchange={changeStyle}>
      {#each STYLES as option (option.id)}
        <option value={option.id}>{option.label}</option>
      {/each}
    </select>
    <svg class="chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
      <path d="M1 1l4 4 4-4" />
    </svg>
  </label>
  <button type="button" class="mode btn" aria-pressed={mode === 'dark'} onclick={toggleMode}>
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      {#if mode === 'dark'}
        <path d="M6.2 1.2a6.8 6.8 0 1 0 8.6 8.6A5.6 5.6 0 0 1 6.2 1.2Z" />
      {:else}
        <circle cx="8" cy="8" r="3.2" />
        <path
          d="M8 .5v2M8 13.5v2M.5 8h2M13.5 8h2M2.7 2.7l1.4 1.4M11.9 11.9l1.4 1.4M2.7 13.3l1.4-1.4M11.9 4.1l1.4-1.4"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      {/if}
    </svg>
    <span class="mode-label">Mode sombre</span>
  </button>
</div>

<style>
  .theme-picker {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .style {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .style svg {
    position: absolute;
    left: 0.6rem;
    fill: var(--color-header-accent);
    pointer-events: none;
  }

  .style .chevron {
    left: auto;
    right: 0.75rem;
    fill: none;
    stroke: var(--color-header-text);
    stroke-width: 1.5;
  }

  select {
    max-width: 15rem;
    text-overflow: ellipsis;
    font-size: 0.9rem;
    padding: 0 2rem 0 2.1rem;
    border-color: var(--color-header-border);
    border-radius: var(--radius-pill);
    background: var(--color-header-bg);
    color: var(--color-header-text);
    appearance: none;
    cursor: pointer;
  }

  select option {
    background: var(--color-bg);
    color: var(--color-text);
  }

  .mode {
    font-size: 0.9rem;
    border-color: var(--color-header-border);
    background: var(--color-header-bg);
    color: var(--color-header-text);
    border-radius: var(--radius-pill);
  }

  .mode svg {
    fill: var(--color-header-accent);
  }

  .mode[aria-pressed='true'] {
    border-color: var(--color-header-accent);
  }

  /* Phones: icon-only switch (the label stays for screen readers), compact select. */
  @media (max-width: 52rem) {
    .mode {
      width: var(--tap-size);
      padding: 0;
    }

    .mode-label {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    select {
      max-width: 14rem;
    }
  }
</style>
