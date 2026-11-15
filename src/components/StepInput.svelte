<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type { Formula, RuleId, ProofStep } from '../types/logic';
  import { COPI_RULES, RULE_MAP } from '../logic/rules';
  import { safeParseFormula } from '../logic/parser';
  import { notationStore } from '../stores/auth';
  import { replaceFormulaKeywords } from '../logic/latex';
  import LaTeX from './LaTeX.svelte';
  import SymbolKeyboard from './SymbolKeyboard.svelte';
  import RulesReferenceModal from './RulesReferenceModal.svelte';

  export let existingSteps: ProofStep[] = [];
  export let disabled: boolean = false;
  export let hibernated: boolean = false;

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
  let ruleText: string = '';
  let citationInput: string = '';
  let validationError: string = '';
  let showKeyboard: boolean = false;
  let showRulesReference: boolean = false;
  let inputElement: HTMLInputElement | null = null;

  export function insertFormula(text: string) {
    if (disabled) return;
    formulaText = text;
    validationError = '';
    tick().then(() => {
      inputElement?.focus();
      inputElement?.setSelectionRange(text.length, text.length);
      inputElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  $: selectedRule = RULE_MAP.get(selectedRuleId);
  $: parsed = safeParseFormula(formulaText);

  function normalizeRule(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  $: typedRule = ruleText.trim()
    ? COPI_RULES.find(rule => [rule.id, rule.abbreviation, rule.name]
        .some(value => normalizeRule(value) === normalizeRule(ruleText)))
    : undefined;
  $: if (typedRule) selectedRuleId = typedRule.id;

  function selectRule(ruleId: RuleId) {
    selectedRuleId = ruleId;
    ruleText = RULE_MAP.get(ruleId)?.name || '';
    validationError = '';
  }

  function handleFormulaInput(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target) return;
    const originalVal = target.value;
    const cursor = target.selectionStart ?? originalVal.length;

    const result = replaceFormulaKeywords(originalVal, cursor, $notationStore);
    if (result.changed) {
      formulaText = result.text;
      target.value = result.text;
      target.setSelectionRange(result.cursor, result.cursor);
      tick().then(() => {
        if (target) {
          target.setSelectionRange(result.cursor, result.cursor);
        }
      });
    }
  }

  function handleInsertSymbol(event: CustomEvent<string>) {
    const sym = event.detail;
    if (inputElement) {
      const start = inputElement.selectionStart ?? formulaText.length;
      const end = inputElement.selectionEnd ?? formulaText.length;
      formulaText = formulaText.slice(0, start) + sym + formulaText.slice(end);
      const newPos = start + sym.length;
      inputElement.focus();
      tick().then(() => {
        if (inputElement) {
          inputElement.setSelectionRange(newPos, newPos);
        }
      });
    } else {
      formulaText += sym;
    }
  }

  function handleBackspace() {
    if (inputElement && inputElement.selectionStart !== null) {
      const start = inputElement.selectionStart;
      const end = inputElement.selectionEnd ?? start;
      if (start !== end) {
        formulaText = formulaText.slice(0, start) + formulaText.slice(end);
        inputElement.focus();
        tick().then(() => inputElement?.setSelectionRange(start, start));
      } else if (start > 0) {
        formulaText = formulaText.slice(0, start - 1) + formulaText.slice(start);
        const newPos = start - 1;
        inputElement.focus();
        tick().then(() => inputElement?.setSelectionRange(newPos, newPos));
      }
    } else {
      formulaText = formulaText.slice(0, -1);
    }
  }

  function handleClear() {
    formulaText = '';
    if (inputElement) inputElement.focus();
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
    if (disabled) return;
    validationError = '';
    if (!typedRule) {
      validationError = 'Enter a rule abbreviation or name, like MP or Modus Ponens';
      return;
    }
    if (!formulaText.trim()) {
      validationError = 'Enter the formula for this line';
      return;
    }

    if (!parsed.formula) {
      validationError = parsed.error || 'This formula could not be read';
      return;
    }

    const citations = parseCitations();
    if (!selectedRule) {
      validationError = 'Choose a rule';
      return;
    }

    if (citations.length !== selectedRule.requiredPremiseCount) {
      validationError = `${selectedRule.name} cites ${selectedRule.requiredPremiseCount} ${selectedRule.requiredPremiseCount === 1 ? 'line' : 'lines'}`;
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
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // Ctrl+Enter (Cmd+Enter on Mac) adds the line from anywhere on the page, not only from a field.
  // Daily, Frenzy and Sandbox each keep an editor mounted, so only the visible one responds.
  function handleGlobalKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || e.repeat) return;
    if (disabled || hibernated || showRulesReference) return;
    if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
    e.preventDefault();
    handleSubmit();
  }
</script>

<svelte:window on:keydown={handleGlobalKeyDown} />

<div class="panel p-4 sm:p-6 space-y-4">
  <div class="flex items-center justify-between gap-4">
    <div class="flex items-baseline gap-3 min-w-0">
      <span class="font-sans text-sm font-medium text-ink tabular-nums">Line {existingSteps.length + 1}</span>
      <span class="hidden sm:inline font-sans text-meta text-ink-3 truncate">Type AND, OR, NOT, -&gt; and they become symbols</span>
    </div>
    <button
      type="button"
      on:click={() => (showKeyboard = !showKeyboard)}
      title={showKeyboard ? 'Hide symbol keypad' : 'Show symbol keypad'}
      aria-pressed={showKeyboard}
      class="btn-icon -mr-2 {showKeyboard ? 'bg-raised text-ink' : ''}"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>
    </button>
  </div>

  <!-- Formula -->
  <div class="space-y-2">
    <input
      bind:this={inputElement}
      type="text"
      bind:value={formulaText}
      on:input={handleFormulaInput}
      on:keydown={handleKeyDown}
      maxlength="250"
      aria-label="Formula"
      placeholder="P ⊃ (P • Q)"
      {disabled}
      class="field h-12 px-4 font-serif text-xl"
    />

    {#if formulaText.trim()}
      <div class="flex items-center justify-between gap-3 min-h-[36px] px-4 rounded-lg bg-raised font-sans text-caption">
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-ink-3">Reads as</span>
          {#if parsed.formula}
            <div class="font-serif text-base text-ink truncate">
              <LaTeX formula={parsed.formula} {hibernated} />
            </div>
          {:else}
            <span class="text-ink-2">{parsed.error}</span>
          {/if}
        </div>
        {#if typedRule}
          <span class="text-ink-3 whitespace-nowrap">by {typedRule.abbreviation}</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if showKeyboard}
    <SymbolKeyboard
      on:insert={handleInsertSymbol}
      on:backspace={handleBackspace}
      on:clear={handleClear}
    />
  {/if}

  <!-- Rule and citations -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="step-rule-input" class="label">Rule</label>
        <button
          type="button"
          on:click={() => (showRulesReference = true)}
          class="link font-sans text-meta"
          title="Open the rules guide"
        >Rules guide</button>
      </div>
      <input
        type="text"
        id="step-rule-input"
        aria-label="Rule"
        bind:value={ruleText}
        on:keydown={handleKeyDown}
        list="step-rule-suggestions"
        placeholder="MP or Modus Ponens"
        autocomplete="off"
        maxlength="80"
        aria-invalid={ruleText.trim() && !typedRule ? 'true' : undefined}
        {disabled}
        class="field"
      />
      <datalist id="step-rule-suggestions">
        {#each COPI_RULES as rule}
          <option value={rule.name}>{rule.abbreviation}</option>
        {/each}
      </datalist>
      {#if ruleText.trim()}
        <p class="font-sans text-meta text-ink-3" aria-live="polite">
          {typedRule ? `${typedRule.abbreviation} · ${typedRule.name}` : 'No rule by that name yet'}
        </p>
      {/if}
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="step-citation-input" class="label">
          Cites {selectedRule?.requiredPremiseCount || 1} {(selectedRule?.requiredPremiseCount || 1) === 1 ? 'line' : 'lines'}
        </label>
        <span class="font-sans text-meta text-ink-3">or click a line number</span>
      </div>
      <input
        id="step-citation-input"
        type="text"
        bind:value={citationInput}
        placeholder="1, 3"
        {disabled}
        class="field tabular-nums"
      />
    </div>
  </div>

  {#if existingSteps.length > 0}
    <div class="flex flex-wrap items-center gap-2">
      {#each existingSteps as step}
        {@const isSelected = parseCitations().includes(step.stepNumber)}
        <button
          type="button"
          on:click={() => toggleCitation(step.stepNumber)}
          aria-pressed={isSelected}
          title="Cite line {step.stepNumber}"
          class="h-8 min-w-[32px] px-2 rounded-lg font-sans text-caption tabular-nums border cursor-pointer transition-colors duration-150 {
            isSelected
              ? 'bg-ink text-paper border-ink'
              : 'border-line-strong text-ink-2 hover:text-ink hover:border-ink-3'
          }"
        >
          {step.stepNumber}
        </button>
      {/each}
    </div>
  {/if}

  {#if validationError}
    <div class="flex items-center gap-3 min-h-[40px] px-4 rounded-lg border border-line-strong bg-raised font-sans text-caption text-ink" role="alert">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0 text-ink-2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      <span>{validationError}</span>
    </div>
  {/if}

  <button
    type="button"
    on:click={handleSubmit}
    {disabled}
    class="btn btn-primary btn-lg w-full"
  >
    Add line
    <span class="kbd">{isMac ? '⌘' : 'Ctrl'} Enter</span>
  </button>
</div>

<RulesReferenceModal
  isOpen={showRulesReference}
  activeRuleId={selectedRuleId}
  on:selectRule={(e) => {
    selectRule(e.detail);
    showRulesReference = false;
  }}
  on:close={() => (showRulesReference = false)}
/>
