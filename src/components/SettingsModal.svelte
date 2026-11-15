<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { themeStore, isSettingsOpen, soundEnabledStore, soundVolumeStore } from '../stores/theme';
  import { notationStore } from '../stores/auth';
  import { NOTATION_CONFIGS } from '../logic/latex';
  import type { NotationStyle, Formula } from '../types/logic';
  import LaTeX from './LaTeX.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  const notationOptions: { id: NotationStyle; title: string; subtitle: string; sample: string }[] = [
    {
      id: 'standard',
      title: 'Modern',
      subtitle: 'Negation ¬, conjunction ∧, arrow →, equivalence ↔',
      sample: '(P ∧ Q) → (R ∨ ¬S)',
    },
    {
      id: 'whitehead',
      title: 'Whitehead & Russell',
      subtitle: 'Principia: tilde ~, center dot ·, horseshoe ⊃',
      sample: '(P · Q) ⊃ (R ∨ ~S)',
    },
  ];

  const previewFormula: Formula = {
    type: 'implies',
    left: {
      type: 'and',
      left: { type: 'atom', name: 'P' },
      right: { type: 'atom', name: 'Q' },
    },
    right: {
      type: 'or',
      left: { type: 'atom', name: 'R' },
      right: {
        type: 'not',
        operand: { type: 'atom', name: 'S' },
      },
    },
  };

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      isSettingsOpen.set(false);
      dispatch('close');
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      isSettingsOpen.set(false);
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if $isSettingsOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-lg bg-card border border-line text-ink  p-6 sm:p-8 space-y-6 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-line pb-4">
        <div>
          <span class="text-meta font-sans text-ink-2 block mb-1">
            Preferences
          </span>
          <h2 id="settings-title" class="text-xl font-medium tracking-tight font-sans">
            Settings
          </h2>
        </div>
        <button
          type="button"
          on:click={() => { isSettingsOpen.set(false); dispatch('close'); }}
          class="btn-icon -mr-2 shrink-0"
          aria-label="Close preferences"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Theme Mode -->
      <div class="space-y-3">
        <div class="flex items-baseline justify-between">
          <span class="text-xs font-sans font-semibold text-ink-2">
            Appearance
          </span>
          <span class="text-meta font-sans text-ink-2">
            {$themeStore === 'dark' ? 'Dark' : 'Light'}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 font-sans text-xs">
          <button
            type="button"
            on:click={() => themeStore.set('light')}
            class="py-2.5 px-3 border transition-colors text-center flex items-center justify-center gap-2 cursor-pointer {
 $themeStore === 'light'
 ? 'bg-ink text-paper border-ink font-medium'
 : 'border-line-strong text-ink-2 hover:border-ink-3'
 } rounded-lg"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>Light</span>
          </button>

          <button
            type="button"
            on:click={() => themeStore.set('dark')}
            class="py-2.5 px-3 border transition-colors text-center flex items-center justify-center gap-2 cursor-pointer {
 $themeStore === 'dark'
 ? 'bg-ink text-paper border-ink font-medium'
 : 'border-line-strong text-ink-2 hover:border-ink-3'
 } rounded-lg"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>Dark</span>
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3">
        <span id="sound-setting-label" class="text-xs font-sans font-semibold text-ink-2">Sounds</span>
        <button
          type="button"
          role="switch"
          aria-checked={$soundEnabledStore}
          aria-labelledby="sound-setting-label"
          on:click={() => soundEnabledStore.update(enabled => !enabled)}
          class="px-4 py-2 border border-line-strong text-xs font-sans cursor-pointer hover:border-ink rounded-lg"
        >
          {$soundEnabledStore ? 'On' : 'Off'}
        </button>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-sans text-ink-2">
          <label for="sound-volume">Volume</label>
          <span class="tabular-nums">{$soundVolumeStore}%</span>
        </div>
        <input
          id="sound-volume"
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={$soundVolumeStore}
          disabled={!$soundEnabledStore}
          aria-valuetext={`${$soundVolumeStore}%`}
          class="w-full accent-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      <!-- Notation Selector -->
      <div class="space-y-3">
        <div class="flex items-baseline justify-between">
          <span class="text-xs font-sans font-semibold text-ink-2">
            Notation
          </span>
          <span class="text-meta font-sans text-ink-2">
            {NOTATION_CONFIGS[$notationStore]?.name || 'Standard'}
          </span>
        </div>

        <div class="space-y-2">
          {#each notationOptions as opt}
            <button
              type="button"
              on:click={() => notationStore.set(opt.id)}
              class="w-full text-left p-3 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer {
 $notationStore === opt.id
 ? 'border-ink bg-raised font-medium'
 : 'border-line hover:border-line-strong '
 } rounded-lg"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {
 $notationStore === opt.id
 ? 'bg-ink '
 : 'border border-line-strong '
 }"></span>
                  <span class="text-xs font-sans font-medium tracking-tight text-ink">
                    {opt.title}
                  </span>
                </div>
                <div class="text-meta font-sans text-ink-2 pl-4 mt-0.5">
                  {opt.subtitle}
                </div>
              </div>

              <div class="pl-4 sm:pl-0 font-serif text-sm text-ink">
                <LaTeX formula={previewFormula} style={opt.id} />
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Footer Note -->
      <div class="pt-3 border-t border-line flex items-center justify-between text-meta font-sans text-ink-2">
        <span>Saved on this device</span>
        <button
          type="button"
          on:click={() => { isSettingsOpen.set(false); dispatch('close'); }}
          class="underline hover:text-ink cursor-pointer font-medium"
        >
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
