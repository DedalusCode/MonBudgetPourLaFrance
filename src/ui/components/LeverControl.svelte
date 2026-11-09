<!-- SPDX-FileCopyrightText: 2026 Mon budget pour la France contributors
     SPDX-License-Identifier: AGPL-3.0-or-later -->
<script lang="ts">
  // One lever: slider and numeric field kept in sync, reference value, help, reset.
  import type { ScenarioStore } from '../state/scenario.svelte.ts';
  import { fieldSuffix, formatField, formatLeverValue, parseField } from '../format.ts';
  import { shownAmount, sliderImpactText } from '../impactText.ts';

  let {
    store,
    id,
    inherited,
    badge = 'modifié',
    value: valueOverride,
    modified: modifiedOverride,
    onCommit,
    onReset,
  }: {
    store: ScenarioStore;
    id: string;
    /** Value followed when not set (a COFOG group follows its division). */
    inherited?: number;
    badge?: string;
    /** Shown value when it is not the lever's own (e.g. a division's total). */
    value?: number;
    modified?: boolean;
    onCommit?: (value: number) => void;
    onReset?: () => void;
  } = $props();

  const lever = $derived(store.lever(id));
  const base = $derived(inherited ?? lever.reference);
  const value = $derived(valueOverride ?? store.levers[id] ?? base);
  const modified = $derived(modifiedOverride ?? store.isModified(id));
  /** Spending moved by a parent lever (a group following its function) changes too. */
  const changed = $derived.by(() => {
    if (modified) return true;
    if (lever.unit !== 'billions') return false;
    const { amount, reference } = shownAmount(store.model, store.result, lever);
    return Math.abs(amount - reference) >= 0.0005;
  });
  const impact = $derived(
    changed ? sliderImpactText(store.model, store.result, lever, value) : null,
  );

  let draft = $state<string | null>(null);
  let message = $state<{ kind: 'error' | 'info'; text: string } | null>(null);

  const fieldText = $derived(draft ?? formatField(lever, value));
  /** Position (0–100) of a value on the slider, for the filled track and the reference mark. */
  const position = (x: number) =>
    lever.max === lever.min
      ? 0
      : Math.min(100, Math.max(0, ((x - lever.min) / (lever.max - lever.min)) * 100));
  const fieldId = $derived(`lever-${id.replaceAll('.', '-')}`);

  function commit(next: number) {
    if (onCommit) onCommit(next);
    else store.setRelativeTo(id, next, base);
  }

  function onSlider(event: Event) {
    draft = null;
    message = null;
    commit(Number((event.currentTarget as HTMLInputElement).value));
  }

  function onFieldChange() {
    if (draft === null) return;
    const parsed = parseField(lever, draft, store.extendedBounds);
    if (!parsed.ok) {
      message = { kind: 'error', text: parsed.error };
      return;
    }
    message = parsed.clamped
      ? {
          kind: 'info',
          text: `Valeur ramenée à ${formatLeverValue(lever, parsed.value)}, borne du curseur. Les paramètres avancés permettent d’étendre les bornes.`,
        }
      : null;
    draft = null;
    commit(parsed.value);
  }

  function reset() {
    draft = null;
    message = null;
    if (onReset) onReset();
    else store.reset(id);
  }
</script>

<div class="lever" class:modified>
  <div class="head">
    <label for={fieldId}>{lever.label}</label>
    {#if modified}<span class="badge">{badge}</span>{/if}
    <button
      type="button"
      class="help-button icon-button"
      aria-haspopup="dialog"
      onclick={() => store.openInfo(id)}
    >
      <span aria-hidden="true">?</span><span class="visually-hidden"
        >En savoir plus : {lever.label}</span
      >
    </button>
  </div>

  <div class="controls">
    <span class="range">
      <input
        type="range"
        min={lever.min}
        max={lever.max}
        step={lever.step}
        {value}
        style:--fill={`${position(value)}%`}
        aria-label={`${lever.label} (curseur)`}
        aria-valuetext={formatLeverValue(lever, value)}
        oninput={onSlider}
      />
      <span class="ref-mark" style:--at={position(base)} aria-hidden="true"></span>
    </span>
    <span class="field">
      <input
        id={fieldId}
        type="text"
        inputmode="decimal"
        value={fieldText}
        aria-invalid={message?.kind === 'error'}
        aria-describedby={message ? `${fieldId}-message` : undefined}
        oninput={(e) => (draft = e.currentTarget.value)}
        onchange={onFieldChange}
        onkeydown={(e) => {
          if (e.key === 'Enter') onFieldChange();
        }}
      />
      <span class="suffix" aria-hidden="true">{fieldSuffix(lever)}</span>
    </span>
    <button type="button" class="reset icon-button" disabled={!modified} onclick={reset}>
      <span aria-hidden="true">↺</span><span class="visually-hidden"
        >Réinitialiser : {lever.label}</span
      >
    </button>
  </div>

  <p class="reference">
    {#if lever.unit === 'billions'}
      Montant actuel : {formatLeverValue(lever, lever.reference)}
    {:else}
      Référence : {formatLeverValue(lever, base)}
    {/if}
  </p>
  {#if impact}<p class="impact">{impact}</p>{/if}
  {#if message}
    <p
      class={message.kind}
      id={`${fieldId}-message`}
      role={message.kind === 'error' ? 'alert' : 'status'}
    >
      {message.text}
    </p>
  {/if}
</div>

<style>
  .lever {
    padding: var(--space-3) var(--space-2) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    border-left: 3px solid transparent;
  }

  .lever.modified {
    border-left-color: var(--color-accent);
    background: var(--color-accent-soft);
  }

  .head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  label {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .badge {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.1rem var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--color-highlight);
    color: var(--color-on-highlight);
  }

  .icon-button {
    --tap-size: 2rem;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .range {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
  }

  input[type='range'] {
    width: 100%;
    margin: 0;
  }

  /* Current-law value, under the track. */
  .ref-mark {
    position: absolute;
    left: calc(var(--thumb-size) / 2 + (100% - var(--thumb-size)) * var(--at) / 100);
    bottom: 0.15rem;
    width: 2px;
    height: 0.45rem;
    margin-left: -1px;
    background: var(--color-text-muted);
    pointer-events: none;
  }

  .field {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .field input {
    width: 5.5rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .field input[aria-invalid='true'] {
    border-color: var(--color-error);
  }

  .suffix {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .reference {
    margin: var(--space-1) 0 0;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .impact {
    margin: var(--space-1) 0 0;
    font-size: 0.82rem;
    color: var(--color-text);
  }

  .error,
  .info {
    margin: var(--space-1) 0 0;
    font-size: 0.8rem;
  }

  .error {
    color: var(--color-error);
  }
</style>
