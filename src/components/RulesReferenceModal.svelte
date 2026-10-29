<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { COPI_RULES } from '../logic/rules';
  import type { RuleId, RuleDefinition } from '../types/logic';
  import { notationStore } from '../stores/auth';

  export let isOpen: boolean = false;
  export let activeRuleId: RuleId | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    selectRule: RuleId;
  }>();

  let searchQuery: string = '';
  let selectedCategory: 'all' | 'inference' | 'replacement' = 'all';

  $: filteredRules = COPI_RULES.filter(r => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;
    return (
      matchesCategory &&
      (r.name.toLowerCase().includes(q) ||
        r.abbreviation.toLowerCase().includes(q) ||
        r.copiSchema.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q))
    );
  });

  function handleSelect(rule: RuleDefinition) {
    dispatch('selectRule', rule.id);
    dispatch('close');
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-reference-title"
      class="w-full max-w-4xl max-h-[90vh] bg-[#FAFAFA] dark:bg-[#0E0E0E] border border-neutral-300 dark:border-neutral-800 shadow-2xl rounded-xl flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100"
    >
      <!-- Modal Header -->
      <div class="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-950">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-500 font-semibold">Copi's 19 Rules of Deduction</span>
          </div>
          <h2 id="rules-reference-title" class="font-serif text-lg sm:text-xl font-medium text-neutral-950 dark:text-white">
            Rules of Inference & Replacement
          </h2>
        </div>

        <button
          type="button"
          on:click={() => dispatch('close')}
          aria-label="Close Reference Guide"
          class="p-1.5 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Controls: Search & Category Filter -->
      <div class="p-4 border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-100/70 dark:bg-neutral-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search by name, symbol, abbreviation"
            class="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-all font-sans"
          />
          <svg class="w-4 h-4 absolute left-3 top-2.5 text-neutral-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {#if searchQuery}
            <button
              type="button"
              on:click={() => (searchQuery = '')}
              class="absolute right-2.5 top-2 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            >
              ✕
            </button>
          {/if}
        </div>

        <!-- Filter Category Tabs -->
        <div class="flex items-center gap-1 self-start sm:self-auto bg-neutral-200/70 dark:bg-neutral-800/70 p-1 rounded-lg text-xs font-sans">
          <button
            type="button"
            on:click={() => (selectedCategory = 'all')}
            class="px-2.5 py-1 rounded-md transition-all cursor-pointer {selectedCategory === 'all' ? 'bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white font-medium shadow-xs' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'}"
          >
            All (19)
          </button>
          <button
            type="button"
            on:click={() => (selectedCategory = 'inference')}
            class="px-2.5 py-1 rounded-md transition-all cursor-pointer {selectedCategory === 'inference' ? 'bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white font-medium shadow-xs' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'}"
          >
            Inference (9)
          </button>
          <button
            type="button"
            on:click={() => (selectedCategory = 'replacement')}
            class="px-2.5 py-1 rounded-md transition-all cursor-pointer {selectedCategory === 'replacement' ? 'bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white font-medium shadow-xs' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'}"
          >
            Replacement (10)
          </button>
        </div>
      </div>

      <!-- Rule Grid / Cards Scrollable Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {#if filteredRules.length === 0}
          <div class="text-center py-12 text-neutral-500 font-sans text-xs">
            No rules matching "{searchQuery}". Try searching for abbreviations (MP, MT, DEM) or rule names.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {#each filteredRules as rule}
              {@const isSelected = activeRuleId === rule.id}
              <div
                class="group p-4 rounded-xl border transition-all duration-200 bg-white/70 dark:bg-neutral-950/70 flex flex-col justify-between {
                  isSelected
                    ? 'border-neutral-900 dark:border-neutral-100 ring-1 ring-neutral-900 dark:ring-neutral-100'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                }"
              >
                <div>
                  <!-- Header: Abbreviation and name -->
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                        {rule.abbreviation}
                      </span>
                      <h3 class="font-serif text-base font-semibold text-neutral-950 dark:text-white">
                        {rule.name}
                      </h3>
                    </div>
                  </div>

                  <!-- Schema Display -->
                  <div class="my-2.5 p-2 rounded-lg bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800/80 text-center">
                    <span class="font-serif text-sm font-medium text-neutral-900 dark:text-neutral-100 tracking-wide">
                      {rule.copiSchema}
                    </span>
                  </div>

                  <!-- Description -->
                  <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans mb-3">
                    {rule.description}
                  </p>
                </div>

                <!-- Footer Action -->
                <div class="mt-3.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between">
                  <span class="text-[10px] font-sans text-neutral-400 uppercase tracking-wider">
                    {rule.category === 'inference' ? 'Inference' : 'Replacement'}
                  </span>

                  <button
                    type="button"
                    on:click={() => handleSelect(rule)}
                    class="px-3 py-1 rounded-md text-xs font-sans font-medium transition-all cursor-pointer flex items-center gap-1.5 {
                      isSelected
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 shadow-xs'
                    }"
                  >
                    <span>{isSelected ? 'Current Rule' : 'Select Rule'}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="p-3.5 px-5 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between text-xs font-sans text-neutral-500">
        <span class="hidden sm:inline">Tip: Click <strong>Select Rule</strong> to immediately populate your deduction input.</span>
        <button
          type="button"
          on:click={() => dispatch('close')}
          class="px-4 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors ml-auto cursor-pointer"
        >
          Close Guide [Esc]
        </button>
      </div>
    </div>
  </div>
{/if}
