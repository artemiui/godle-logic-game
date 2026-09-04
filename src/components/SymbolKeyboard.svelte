<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { notationStore } from '../stores/auth';
  import { NOTATION_CONFIGS } from '../logic/latex';

  const dispatch = createEventDispatcher<{
    insert: string;
    backspace: void;
    clear: void;
  }>();

  $: config = NOTATION_CONFIGS[$notationStore] || NOTATION_CONFIGS.standard;

  $: opKeys = [
    { label: config.not.trim(), val: config.not.trim(), name: 'Negation' },
    { label: config.and.trim(), val: config.and.trim(), name: 'Conjunction' },
    { label: config.or.trim(), val: config.or.trim(), name: 'Disjunction' },
    { label: config.implies.trim(), val: config.implies.trim(), name: 'Conditional' },
    { label: config.iff.trim(), val: config.iff.trim(), name: 'Biconditional' },
    { label: '(', val: '(', name: 'Open Paren' },
    { label: ')', val: ')', name: 'Close Paren' },
  ];

  const varKeys = ['P', 'Q', 'R', 'S', 'T', 'A', 'B', 'C'];
</script>

<div class="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/40 flex flex-wrap items-center justify-between gap-3">
  <!-- Connectives -->
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="text-[10px] font-sans uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mr-1">
      Connectives:
    </span>
    {#each opKeys as key}
      <button
        type="button"
        on:click={() => dispatch('insert', key.val)}
        title={key.name}
        class="h-8 min-w-8 px-2 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 font-serif text-base border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white transition-colors flex items-center justify-center cursor-pointer"
      >
        {key.label}
      </button>
    {/each}
  </div>

  <!-- Variables & Actions -->
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="text-[10px] font-sans uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mr-1">
      Atoms:
    </span>
    {#each varKeys as v}
      <button
        type="button"
        on:click={() => dispatch('insert', v)}
        class="h-8 w-8 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 font-serif font-bold text-sm border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white transition-colors flex items-center justify-center cursor-pointer"
      >
        {v}
      </button>
    {/each}

    <button
      type="button"
      on:click={() => dispatch('backspace')}
      title="Backspace"
      class="h-8 px-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-sans text-xs hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
    >
      ⌫ Del
    </button>
    <button
      type="button"
      on:click={() => dispatch('clear')}
      title="Clear Input"
      class="h-8 px-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-sans text-xs hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
    >
      Clear
    </button>
  </div>
</div>
