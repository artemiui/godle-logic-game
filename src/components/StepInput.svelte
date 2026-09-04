<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Formula, RuleId, ProofStep } from '../types/logic';
  import { COPI_RULES, RULE_MAP } from '../logic/rules';
  import { safeParseFormula } from '../logic/parser';
  import LaTeX from './LaTeX.svelte';
  import SymbolKeyboard from './SymbolKeyboard.svelte';

  export let existingSteps: ProofStep[] = [];
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    submitStep: {
      formula: Formula;
      formulaRaw: string;
      ruleId: RuleId;
      citations: number[];
    };
  }>();

  let formulaText: string = '';
  let selectedRuleId: RuleId = 'MP';
  let citationInput: string = '';
  let validationError: string = '';
  let showKeyboard: boolean = false;

  $: selectedRule = RULE_MAP.get(selectedRuleId);
  $: parsed = safeParseFormula(formulaText);

  const inferenceRules = COPI_RULES.filter(r => r.category === 'inference');
  const replacementRules = COPI_RULES.filter(r => r.category === 'replacement');

  function handleInsertSymbol(event: CustomEvent<string>) {
    formulaText += event.detail;
  }

  function handleBackspace() {
    formulaText = formulaText.slice(0, -1);
  }

  function handleClear() {
    formulaText = '';
  }

  export function toggleCitation(stepNum: number) {
    const current = parseCitations();
    let updated: number[];
    if (current.includes(stepNum)) {
      updated = current.filter(n => n !== stepNum);
    } else {
      updated = [...current, stepNum].sort((a, b) => a - b);
    }
    citationInput = updated.join(', ');
  }

  function parseCitations(): number[] {
    if (!citationInput.trim()) return [];
    return citationInput
      .split(/[,;\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
  }

  function handleSubmit() {
    validationError = '';
    if (!formulaText.trim()) {
      validationError = 'Please enter a derived formula.';
      return;
    }

    if (!parsed.formula) {
      validationError = parsed.error || 'Syntax error in logical statement.';
      return;
    }

    const citations = parseCitations();
    if (!selectedRule) {
      validationError = 'Please select an inference or replacement rule.';
      return;
    }

    if (citations.length !== selectedRule.requiredPremiseCount) {
      validationError = `${selectedRule.name} requires exactly ${selectedRule.requiredPremiseCount} cited line(s).`;
      return;
    }

    dispatch('submitStep', {
      formula: parsed.formula,
      formulaRaw: formulaText.trim(),
      ruleId: selectedRuleId,
      citations,
    });

    formulaText = '';
    citationInput = '';
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<div class="border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-950 space-y-4">
  <div class="flex items-center justify-between">
    <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300">
      Step {String(existingSteps.length + 1).padStart(2, '0')} / Deduction Input
    </span>
    <button
      type="button"
      on:click={() => (showKeyboard = !showKeyboard)}
      title={showKeyboard ? 'Hide Keypad' : 'Show Keypad'}
      class="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer transition-colors {showKeyboard ? 'text-black dark:text-white' : ''}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>
    </button>
  </div>

  <!-- Formula Input & Live KaTeX preview -->
  <div class="space-y-2">
    <div class="relative">
      <input
        type="text"
        bind:value={formulaText}
        on:keydown={handleKeyDown}
        placeholder="Enter formula, e.g. B  or  P ⊃ (P • Q)  or  ~P ∨ Q"
        {disabled}
        class="w-full h-11 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-neutral-100 font-serif text-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
      />
    </div>

    <!-- Live KaTeX Preview -->
    {#if formulaText.trim()}
      <div class="py-1.5 px-3 bg-neutral-100/70 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-sans">
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-neutral-600 dark:text-neutral-300 uppercase">Preview:</span>
          {#if parsed.formula}
            <div class="font-serif text-base text-neutral-950 dark:text-neutral-100">
              <LaTeX formula={parsed.formula} />
            </div>
          {:else}
            <span class="text-rose-600 dark:text-rose-400 italic text-[11px]">{parsed.error}</span>
          {/if}
        </div>
        {#if selectedRule}
          <div class="text-[11px] text-neutral-600 dark:text-neutral-300">
            via {selectedRule.abbreviation}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Keypad Toggleable Area -->
  {#if showKeyboard}
    <SymbolKeyboard
      on:insert={handleInsertSymbol}
      on:backspace={handleBackspace}
      on:clear={handleClear}
    />
  {/if}

  <!-- Rule & Citation Controls Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
    <!-- Rule Select -->
    <div class="sm:col-span-6 space-y-1">
      <label for="step-rule-select" class="block text-[10px] font-sans uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
        Justification Rule
      </label>
      <select
        id="step-rule-select"
        bind:value={selectedRuleId}
        {disabled}
        class="w-full h-9 px-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-neutral-100 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white cursor-pointer"
      >
        <optgroup label="── 9 Rules of Inference ──">
          {#each inferenceRules as r}
            <option value={r.id}>{r.abbreviation} — {r.name}</option>
          {/each}
        </optgroup>
        <optgroup label="── 10 Rules of Replacement ──">
          {#each replacementRules as r}
            <option value={r.id}>{r.abbreviation} — {r.name}</option>
          {/each}
        </optgroup>
      </select>
    </div>

    <!-- Citations Input -->
    <div class="sm:col-span-6 space-y-1">
      <div class="flex items-center justify-between">
        <label for="step-citation-input" class="block text-[10px] font-sans uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
          Cited Lines ({selectedRule?.requiredPremiseCount || 1} required)
        </label>
        <span class="text-[10px] font-sans text-neutral-600 dark:text-neutral-300">click lines below</span>
      </div>
      <input
        id="step-citation-input"
        type="text"
        bind:value={citationInput}
        placeholder="e.g. 1, 3"
        {disabled}
        class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-neutral-100 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
      />
    </div>
  </div>

  <!-- Available Line Chips -->
  {#if existingSteps.length > 0}
    <div class="flex flex-wrap items-center gap-1.5 pt-1">
      <span class="text-[10px] font-sans text-neutral-600 dark:text-neutral-300 uppercase mr-1">Cite:</span>
      {#each existingSteps as step}
        {@const isSelected = parseCitations().includes(step.stepNumber)}
        <button
          type="button"
          on:click={() => toggleCitation(step.stepNumber)}
          class="h-6 px-2 text-[11px] font-sans border transition-all cursor-pointer {
            isSelected
              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
              : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white'
          }"
        >
          {String(step.stepNumber).padStart(2, '0')}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Validation Error -->
  {#if validationError}
    <div class="py-2 px-3 border border-neutral-400 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900 text-xs font-sans text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
      <span>•</span>
      <span>{validationError}</span>
    </div>
  {/if}

  <!-- Submit Action -->
  <button
    type="button"
    on:click={handleSubmit}
    {disabled}
    class="w-full h-10 bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-950 font-sans text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <span>Derive Step</span>
    <span class="opacity-60 text-[10px]">[ Enter ↵ ]</span>
  </button>
</div>
