<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { themeStore, isSettingsOpen } from '../stores/theme';
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
      title: 'Modern Math (Standard)',
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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-neutral-950 border border-neutral-900 dark:border-neutral-200 text-neutral-900 dark:text-neutral-100 shadow-2xl p-6 sm:p-8 space-y-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-1">
            00 / System Preferences
          </span>
          <h2 id="settings-title" class="text-xl font-bold tracking-tight uppercase font-sans">
            Utilities & Notation
          </h2>
        </div>
        <button
          type="button"
          on:click={() => { isSettingsOpen.set(false); dispatch('close'); }}
          class="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white text-xs font-sans tracking-wider transition-colors cursor-pointer px-2 py-1"
          aria-label="Close preferences"
        >
          [ ✕ Close ]
        </button>
      </div>

      <!-- Theme Mode -->
      <div class="space-y-3">
        <div class="flex items-baseline justify-between">
          <span class="text-xs font-sans uppercase tracking-wider font-semibold text-neutral-700 dark:text-neutral-300">
            Appearance
          </span>
          <span class="text-[11px] font-sans text-neutral-600 dark:text-neutral-300">
            {$themeStore === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 font-sans text-xs">
          <button
            type="button"
            on:click={() => themeStore.set('light')}
            class="py-2.5 px-3 border transition-all text-center flex items-center justify-center gap-2 cursor-pointer {
              $themeStore === 'light'
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
                : 'border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500'
            }"
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
            class="py-2.5 px-3 border transition-all text-center flex items-center justify-center gap-2 cursor-pointer {
              $themeStore === 'dark'
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
                : 'border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500'
            }"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>Dark</span>
          </button>
        </div>
      </div>

      <!-- Notation Selector -->
      <div class="space-y-3">
        <div class="flex items-baseline justify-between">
          <span class="text-xs font-sans uppercase tracking-wider font-semibold text-neutral-700 dark:text-neutral-300">
            Symbolic Logic Notation
          </span>
          <span class="text-[11px] font-sans text-neutral-600 dark:text-neutral-300">
            {NOTATION_CONFIGS[$notationStore]?.name || 'Standard'}
          </span>
        </div>

        <div class="space-y-2">
          {#each notationOptions as opt}
            <button
              type="button"
              on:click={() => notationStore.set(opt.id)}
              class="w-full text-left p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer {
                $notationStore === opt.id
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 font-medium'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
              }"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {
                    $notationStore === opt.id
                      ? 'bg-neutral-900 dark:bg-white'
                      : 'border border-neutral-400 dark:border-neutral-600'
                  }"></span>
                  <span class="text-xs font-sans font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
                    {opt.title}
                  </span>
                </div>
                <div class="text-[11px] font-sans text-neutral-600 dark:text-neutral-300 pl-4 mt-0.5">
                  {opt.subtitle}
                </div>
              </div>

              <div class="pl-4 sm:pl-0 font-serif text-sm text-neutral-800 dark:text-neutral-200">
                <LaTeX formula={previewFormula} style={opt.id} />
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Footer Note -->
      <div class="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-sans text-neutral-600 dark:text-neutral-300">
        <span>Preferences persist automatically</span>
        <button
          type="button"
          on:click={() => { isSettingsOpen.set(false); dispatch('close'); }}
          class="underline hover:text-black dark:hover:text-white cursor-pointer font-bold"
        >
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
