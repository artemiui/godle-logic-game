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

<div class="border border-line p-3 bg-raised/50 flex flex-wrap items-center justify-between gap-3 rounded-xl">
  <!-- Connectives -->
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="text-meta font-sans text-ink-2 mr-1">
      Connectives:
    </span>
    {#each opKeys as key}
      <button
        type="button"
        on:click={() => dispatch('insert', key.val)}
        title={key.name}
        class="h-8 min-w-8 px-2 bg-card text-ink font-serif text-base border border-line-strong hover:border-ink transition-colors flex items-center justify-center cursor-pointer rounded-lg"
      >
        {key.label}
      </button>
    {/each}
  </div>

  <!-- Variables & Actions -->
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="text-meta font-sans text-ink-2 mr-1">
      Atoms:
    </span>
    {#each varKeys as v}
      <button
        type="button"
        on:click={() => dispatch('insert', v)}
        class="h-8 w-8 bg-card text-ink font-serif font-medium text-sm border border-line-strong hover:border-ink transition-colors flex items-center justify-center cursor-pointer rounded-lg"
      >
        {v}
      </button>
    {/each}

    <button
      type="button"
      on:click={() => dispatch('backspace')}
      title="Backspace"
      class="h-8 px-2.5 bg-raised text-ink font-sans text-xs hover:bg-line-strong transition-colors cursor-pointer rounded-lg"
    >
      ⌫ Del
    </button>
    <button
      type="button"
      on:click={() => dispatch('clear')}
      title="Clear Input"
      class="h-8 px-2 bg-raised text-ink font-sans text-xs hover:bg-line-strong transition-colors cursor-pointer rounded-lg"
    >
      Clear
    </button>
  </div>
</div>
