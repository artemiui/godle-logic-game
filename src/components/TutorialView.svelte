<script lang="ts">
  import { tick } from 'svelte';
  import { COPI_RULES } from '../logic/rules';
  import type { RuleDefinition, Formula } from '../types/logic';
  import { parseFormula } from '../logic/parser';
  import { validateProofStep } from '../logic/checker';
  import { activeTabStore, notationStore } from '../stores/auth';
  import { replaceFormulaKeywords } from '../logic/latex';
  import LaTeX from './LaTeX.svelte';

  let searchQuery: string = '';
  let selectedCategory: 'all' | 'inference' | 'replacement' = 'all';
  let activeRuleId: string = 'MP';
  let showGettingStarted: boolean = true;

  let sandboxFormulaInput: string = '';
  let sandboxCitationLine: string = '1, 2';
  let sandboxFeedback: { valid?: boolean; message?: string } | null = null;

  $: filteredRules = COPI_RULES.filter(r => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesQuery = !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  $: currentRule = COPI_RULES.find(r => r.id === activeRuleId) || COPI_RULES[0];

  function testRuleSandbox() {
    sandboxFeedback = null;
    try {
      const parsedFormula = parseFormula(sandboxFormulaInput.trim());
      const mockSteps = currentRule.example.inputs.map((inp, idx) => ({
        stepNumber: idx + 1,
        formula: parseFormula(inp),
        rule: 'premise' as const,
        citations: [],
        isPremise: true,
      }));

      const citations = sandboxCitationLine
        .split(/[,;\s]+/)
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n));

      const res = validateProofStep(mockSteps, parsedFormula, currentRule.id, citations);
      if (res.valid) {
        sandboxFeedback = { valid: true, message: `✓ Valid deduction under ${currentRule.name}.` };
      } else {
        sandboxFeedback = { valid: false, message: `✕ ${res.error}` };
      }
    } catch (err: any) {
      sandboxFeedback = { valid: false, message: `✕ ${err.message || 'Invalid formula'}` };
    }
  }

  function prefillExample() {
    sandboxFormulaInput = currentRule.example.result;
    sandboxCitationLine = currentRule.example.inputs.map((_, i) => i + 1).join(', ');
    testRuleSandbox();
  }

  function handleFormulaInput(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target) return;
    const cursor = target.selectionStart ?? target.value.length;
    const res = replaceFormulaKeywords(target.value, cursor, $notationStore);
    if (res.changed) {
      sandboxFormulaInput = res.text;
      target.value = res.text;
      target.setSelectionRange(res.cursor, res.cursor);
      tick().then(() => target?.setSelectionRange(res.cursor, res.cursor));
    }
  }
</script>

<div class="max-w-5xl mx-auto py-8 sm:py-12 px-4 space-y-8">
  <!-- Minimalist Editorial Masthead -->
  <div class="border-b border-neutral-900 dark:border-neutral-100 pb-6 space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-1">
          04 / Formal Deductive Canon
        </span>
        <h1 class="text-2xl sm:text-3xl font-serif font-normal text-neutral-950 dark:text-neutral-50 tracking-tight">
          Copi's 19 Rules of Deduction
        </h1>
      </div>

      <div class="text-xs font-sans text-neutral-600 dark:text-neutral-300">
        9 Inference Rules • 10 Replacement Rules
      </div>
    </div>

    <!-- Category Filter & Search -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-2 font-sans text-xs">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          on:click={() => (selectedCategory = 'all')}
          class="px-2.5 py-1 border transition-colors cursor-pointer {
            selectedCategory === 'all'
              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
          }"
        >
          All 19 Rules
        </button>
        <button
          type="button"
          on:click={() => (selectedCategory = 'inference')}
          class="px-2.5 py-1 border transition-colors cursor-pointer {
            selectedCategory === 'inference'
              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
          }"
        >
          9 Inference
        </button>
        <button
          type="button"
          on:click={() => (selectedCategory = 'replacement')}
          class="px-2.5 py-1 border transition-colors cursor-pointer {
            selectedCategory === 'replacement'
              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
          }"
        >
          10 Replacement
        </button>
      </div>

      <!-- Search Input -->
      <div class="w-full sm:w-60">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Filter rules..."
          class="w-full h-8 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
        />
      </div>
    </div>
  </div>

  <!-- How to Get Started Section -->
  <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-500">Primer</span>
        <span class="w-1 h-1 rounded-full bg-neutral-400"></span>
        <h2 class="font-serif text-lg sm:text-xl font-medium text-neutral-950 dark:text-white">
          How to Construct a Proof
        </h2>
      </div>
      <button
        type="button"
        on:click={() => (showGettingStarted = !showGettingStarted)}
        class="text-[11px] font-sans text-neutral-500 hover:text-neutral-950 dark:hover:text-white cursor-pointer underline transition-colors"
      >
        {showGettingStarted ? 'Hide Guide' : 'Show Guide'}
      </button>
    </div>

    {#if showGettingStarted}
      <!-- 3 Intuitive Steps -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
        <!-- Step 1 -->
        <div class="p-4 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] font-sans text-neutral-500">
            <span>PHASE 01</span>
            <span class="font-serif italic font-bold">Inspect Goal</span>
          </div>
          <div class="font-serif text-sm font-semibold text-neutral-950 dark:text-white">
            1. Read Premises & Conclusion
          </div>
          <p class="text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans text-[11px]">
            Every puzzle provides numbered premises and a target conclusion (<span class="font-serif italic">∴</span>). Look at the operators to determine what must be detached, combined, or transformed.
          </p>
        </div>

        <!-- Step 2 -->
        <div class="p-4 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] font-sans text-neutral-500">
            <span>PHASE 02</span>
            <span class="font-serif italic font-bold">Cite & Derive</span>
          </div>
          <div class="font-serif text-sm font-semibold text-neutral-950 dark:text-white">
            2. Cite Lines & Apply Rule
          </div>
          <p class="text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans text-[11px]">
            Click 1 or 2 existing lines from your proof to cite them. Select a valid rule from Copi's 19, type your deduced proposition, and submit. Each valid step becomes a new line available for future citations.
          </p>
        </div>

        <!-- Step 3 -->
        <div class="p-4 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] font-sans text-neutral-500">
            <span>PHASE 03</span>
            <span class="font-serif italic font-bold">Conclude</span>
          </div>
          <div class="font-serif text-sm font-semibold text-neutral-950 dark:text-white">
            3. Reach the Conclusion
          </div>
          <p class="text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans text-[11px]">
            Once a derived step matches the target conclusion structurally, the deduction is sealed (Q.E.D.). You can solve each puzzle in multiple valid ways as long as every step is sound.
          </p>
        </div>
      </div>

      <!-- Golden Rule Callout -->
      <div class="pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-neutral-600 dark:text-neutral-400">
        <div class="flex items-center gap-2">
          <span class="font-sans text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200">Key Rule</span>
          <span><strong>Inference (1–9):</strong> One-way deduction on whole lines only. <strong>Replacement (10–19):</strong> Two-way equivalence (<span class="font-serif italic">≡</span>) on whole lines or any sub-part.</span>
        </div>
        <button
          type="button"
          on:click={() => activeTabStore.set('wordle')}
          class="self-start sm:self-auto text-neutral-950 dark:text-white font-medium underline hover:opacity-75 cursor-pointer font-sans text-[11px]"
        >
          Try a Daily Deduction →
        </button>
      </div>
    {/if}
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
    <!-- Left List of Rules -->
    <div class="md:col-span-4 space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
      {#each filteredRules as rule}
        <button
          type="button"
          on:click={() => {
            activeRuleId = rule.id;
            sandboxFormulaInput = '';
            sandboxFeedback = null;
          }}
          class="w-full p-2.5 text-left border transition-colors cursor-pointer {
            activeRuleId === rule.id
              ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-neutral-900'
              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
          }"
        >
          <div class="flex items-baseline justify-between font-sans text-xs">
            <span class="font-bold text-neutral-950 dark:text-neutral-50">{rule.name}</span>
            <span class="text-[10px] text-neutral-600 dark:text-neutral-300">{rule.abbreviation}</span>
          </div>
          <div class="text-[11px] font-sans text-neutral-700 dark:text-neutral-300 truncate mt-1">
            {rule.copiSchema}
          </div>
        </button>
      {/each}
    </div>

    <!-- Right Rule Details Panel -->
    <div class="md:col-span-8 space-y-6 border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-950">
      <div class="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div class="flex items-center gap-3 font-sans text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">
          <span>{currentRule.category === 'inference' ? 'Rule of Inference (Whole lines only)' : 'Rule of Replacement (Sub-expressions allowed)'}</span>
          <span>•</span>
          <span>Requires {currentRule.requiredPremiseCount} cited line(s)</span>
        </div>
        <h2 class="font-serif text-2xl text-neutral-950 dark:text-neutral-50">
          {currentRule.name} <span class="font-sans text-base font-normal text-neutral-600 dark:text-neutral-300">({currentRule.abbreviation})</span>
        </h2>
        <div class="mt-2 py-2 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-sans text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {currentRule.copiSchema}
        </div>
      </div>

      <!-- Explanation -->
      <div class="space-y-2">
        <h3 class="text-[10px] font-sans uppercase tracking-widest text-neutral-600 dark:text-neutral-300">
          Theoretical Principle
        </h3>
        <p class="font-serif text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
          {currentRule.description}
        </p>
      </div>

      <!-- Worked Example -->
      <div class="space-y-2">
        <h3 class="text-[10px] font-sans uppercase tracking-widest text-neutral-600 dark:text-neutral-300">
          Walkthrough Example
        </h3>
        <div class="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900 font-sans text-xs space-y-1.5">
          <div class="text-[10px] text-neutral-600 dark:text-neutral-300 uppercase">Given Premise Line(s):</div>
          {#each currentRule.example.inputs as inp, idx}
            <div class="pl-2 border-l border-neutral-900 dark:border-white">
              {idx + 1}. {inp}
            </div>
          {/each}
          <div class="text-[10px] text-neutral-600 dark:text-neutral-300 uppercase pt-2">Yields:</div>
          <div class="pl-2 border-l border-neutral-900 dark:border-white font-bold">
            ∴ {currentRule.example.result}
          </div>
          <div class="text-[11px] font-serif italic text-neutral-600 dark:text-neutral-300 pt-1">
            {currentRule.example.explanation}
          </div>
        </div>
      </div>

      <!-- Interactive Mini Practice -->
      <div class="space-y-3 pt-2">
        <div class="flex items-center justify-between font-sans text-xs">
          <span class="text-[10px] uppercase tracking-widest text-neutral-600 dark:text-neutral-300">Practice Sandbox</span>
          <button
            type="button"
            on:click={prefillExample}
            class="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white underline cursor-pointer"
          >
            Prefill with example
          </button>
        </div>

        <div class="p-3.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-3 font-sans text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label for="tutorial-practice-formula" class="block text-[10px] uppercase text-neutral-600 dark:text-neutral-300 mb-1">Derived Formula</label>
              <input
                id="tutorial-practice-formula"
                type="text"
                bind:value={sandboxFormulaInput}
                on:input={handleFormulaInput}
                maxlength="250"
                placeholder="e.g. {currentRule.example.result}"
                class="w-full h-8 px-2.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 font-serif text-sm"
              />
            </div>
            <div>
              <label for="tutorial-practice-citations" class="block text-[10px] uppercase text-neutral-600 dark:text-neutral-300 mb-1">Citations</label>
              <input
                id="tutorial-practice-citations"
                type="text"
                bind:value={sandboxCitationLine}
                placeholder="e.g. 1, 2"
                class="w-full h-8 px-2.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 font-sans text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            on:click={testRuleSandbox}
            class="w-full h-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 uppercase tracking-wider text-xs cursor-pointer hover:bg-black"
          >
            Check Deduction
          </button>

          {#if sandboxFeedback}
            <div class="p-2 border {sandboxFeedback.valid ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800' : 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'}">
              {sandboxFeedback.message}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
