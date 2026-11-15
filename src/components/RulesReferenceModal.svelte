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
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 ">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-reference-title"
      class="w-full max-w-4xl max-h-[90vh] bg-paper border border-line-strong shadow-2xl rounded-xl flex flex-col overflow-hidden text-ink"
    >
      <!-- Modal Header -->
      <div class="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-card">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="text-meta font-sans text-ink-3 font-semibold">Copi's 19 Rules of Deduction</span>
          </div>
          <h2 id="rules-reference-title" class="font-serif text-lg sm:text-xl font-medium text-ink">
            Rules of Inference & Replacement
          </h2>
        </div>

        <button
          type="button"
          on:click={() => dispatch('close')}
          aria-label="Close Reference Guide"
          class="p-1.5 text-ink-3 hover:text-ink transition-colors cursor-pointer rounded-lg hover:bg-raised"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Controls: Search & Category Filter -->
      <div class="p-4 border-b border-line bg-raised/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search by name, symbol, abbreviation"
            class="w-full h-9 pl-9 pr-3 text-xs bg-card border border-line-strong rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors font-sans"
          />
          <svg class="w-4 h-4 absolute left-3 top-2.5 text-ink-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {#if searchQuery}
            <button aria-label="Close"
              type="button"
              on:click={() => (searchQuery = '')}
              class="btn-icon -mr-2 shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          {/if}
        </div>

        <!-- Filter Category Tabs -->
        <div class="flex items-center gap-1 self-start sm:self-auto bg-raised/70 p-1 rounded-lg text-xs font-sans">
          <button
            type="button"
            on:click={() => (selectedCategory = 'all')}
            class="px-2.5 py-1 rounded-md transition-colors cursor-pointer {selectedCategory === 'all' ? 'bg-card text-ink font-medium shadow-xs' : 'text-ink-2 hover:text-ink '}"
          >
            All (19)
          </button>
          <button
            type="button"
            on:click={() => (selectedCategory = 'inference')}
            class="px-2.5 py-1 rounded-md transition-colors cursor-pointer {selectedCategory === 'inference' ? 'bg-card text-ink font-medium shadow-xs' : 'text-ink-2 hover:text-ink '}"
          >
            Inference (9)
          </button>
          <button
            type="button"
            on:click={() => (selectedCategory = 'replacement')}
            class="px-2.5 py-1 rounded-md transition-colors cursor-pointer {selectedCategory === 'replacement' ? 'bg-card text-ink font-medium shadow-xs' : 'text-ink-2 hover:text-ink '}"
          >
            Replacement (10)
          </button>
        </div>
      </div>

      <!-- Rule Grid / Cards Scrollable Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {#if filteredRules.length === 0}
          <div class="text-center py-12 text-ink-3 font-sans text-xs">
            No rules matching "{searchQuery}". Try searching for abbreviations (MP, MT, DEM) or rule names.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {#each filteredRules as rule}
              {@const isSelected = activeRuleId === rule.id}
              <div
                class="group p-4 rounded-xl border transition-colors duration-200 bg-card/70 flex flex-col justify-between {
 isSelected
 ? 'border-ink ring-1 ring-ink '
 : 'border-line hover:border-line-strong '
 }"
              >
                <div>
                  <!-- Header: Abbreviation and name -->
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs font-medium px-2 py-0.5 rounded bg-ink text-paper">
                        {rule.abbreviation}
                      </span>
                      <h3 class="font-serif text-base font-semibold text-ink">
                        {rule.name}
                      </h3>
                    </div>
                  </div>

                  <!-- Schema Display -->
                  <div class="my-2.5 p-2 rounded-lg bg-raised/90 border border-line text-center">
                    <span class="font-serif text-sm font-medium text-ink">
                      {rule.copiSchema}
                    </span>
                  </div>

                  <!-- Description -->
                  <p class="text-xs text-ink-2 leading-relaxed font-sans mb-3">
                    {rule.description}
                  </p>
                </div>

                <!-- Footer Action -->
                <div class="mt-3.5 pt-2.5 border-t border-line flex items-center justify-between">
                  <span class="text-meta font-sans text-ink-3">
                    {rule.category === 'inference' ? 'Inference' : 'Replacement'}
                  </span>

                  <button
                    type="button"
                    on:click={() => handleSelect(rule)}
                    class="px-3 py-1 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-1.5 {
 isSelected
 ? 'bg-raised text-ink '
 : 'bg-ink hover:bg-ink/85 text-paper shadow-xs'
 }"
                  >
                    <span>{isSelected ? 'Selected' : 'Use this rule'}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="p-3.5 px-5 border-t border-line bg-card flex items-center justify-between text-xs font-sans text-ink-3">
        <span class="hidden sm:inline">Tip: Click <strong>Use this rule</strong> to immediately populate your deduction input.</span>
        <button
          type="button"
          on:click={() => dispatch('close')}
          class="px-4 py-1.5 rounded-md border border-line-strong hover:bg-raised text-ink-2 transition-colors ml-auto cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
