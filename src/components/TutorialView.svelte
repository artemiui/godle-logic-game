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
        sandboxFeedback = { valid: true, message: `Valid. This follows by ${currentRule.name}` };
      } else {
        sandboxFeedback = { valid: false, message: `${res.error}` };
      }
    } catch (err: any) {
      sandboxFeedback = { valid: false, message: `${err.message || 'This formula could not be read'}` };
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

<div class="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 space-y-8">
  <header class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="space-y-2">
        <span class="font-sans text-meta font-medium text-ink-2">Rules</span>
        <h1 class="page-title">Copi’s 19 rules</h1>
        <p class="font-sans text-caption text-ink-2">9 rules of inference for whole lines, 10 rules of replacement for any part of a line</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="seg" role="group" aria-label="Category">
        <button type="button" class="seg-item" aria-pressed={selectedCategory === 'all'} on:click={() => (selectedCategory = 'all')}>All <span class="text-ink-3 tabular-nums ml-1">19</span></button>
        <button type="button" class="seg-item" aria-pressed={selectedCategory === 'inference'} on:click={() => (selectedCategory = 'inference')}>Inference <span class="text-ink-3 tabular-nums ml-1">9</span></button>
        <button type="button" class="seg-item" aria-pressed={selectedCategory === 'replacement'} on:click={() => (selectedCategory = 'replacement')}>Replacement <span class="text-ink-3 tabular-nums ml-1">10</span></button>
      </div>
      <div class="relative w-full sm:w-64">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" bind:value={searchQuery} placeholder="Search" aria-label="Search rules" class="field pl-9" />
      </div>
    </div>
  </header>

  <section class="panel p-6 sm:p-8 space-y-6">
    <div class="flex items-center justify-between gap-4">
      <h2 class="font-serif text-xl text-ink">How a proof works</h2>
      <button type="button" on:click={() => (showGettingStarted = !showGettingStarted)} class="link font-sans text-meta">
        {showGettingStarted ? 'Hide' : 'Show'}
      </button>
    </div>

    {#if showGettingStarted}
      <ol class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <li class="space-y-2">
          <span class="font-serif text-2xl leading-none text-ink-3 tabular-nums">1</span>
          <h3 class="font-sans text-sm font-medium text-ink">Read the premises and the conclusion</h3>
          <p class="font-sans text-caption text-ink-2">Each problem gives numbered premises and a conclusion after <span class="font-serif">∴</span>. The main connectives tell you what has to be taken apart, combined or rewritten.</p>
        </li>
        <li class="space-y-2">
          <span class="font-serif text-2xl leading-none text-ink-3 tabular-nums">2</span>
          <h3 class="font-sans text-sm font-medium text-ink">Cite lines and name a rule</h3>
          <p class="font-sans text-caption text-ink-2">Write the next line, name the rule that licenses it, and cite the one or two lines it comes from. Each valid line can be cited later.</p>
        </li>
        <li class="space-y-2">
          <span class="font-serif text-2xl leading-none text-ink-3 tabular-nums">3</span>
          <h3 class="font-sans text-sm font-medium text-ink">Reach the conclusion</h3>
          <p class="font-sans text-caption text-ink-2">When a line matches the conclusion, the proof is done. Any route works as long as every line follows.</p>
        </li>
      </ol>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-line font-sans text-caption text-ink-2">
        <p>Inference rules apply to whole lines, one way. Replacement rules are equivalences (<span class="font-serif">≡</span>) and apply anywhere inside a line.</p>
        <button type="button" on:click={() => activeTabStore.set('wordle')} class="btn btn-secondary btn-sm shrink-0">Try today’s problem</button>
      </div>
    {/if}
  </section>

  <div class="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-6 items-start">
    <nav class="panel overflow-hidden md:sticky md:top-20" aria-label="Rules">
      <div class="max-h-[640px] overflow-y-auto divide-y divide-line">
        {#each filteredRules as rule}
          <button
            type="button"
            on:click={() => { activeRuleId = rule.id; sandboxFormulaInput = ''; sandboxFeedback = null; }}
            aria-current={activeRuleId === rule.id ? 'true' : undefined}
            class="w-full flex items-center justify-between gap-4 min-h-[52px] px-4 py-2 text-left cursor-pointer transition-colors duration-150 {activeRuleId === rule.id ? 'bg-raised' : 'hover:bg-raised/60'}"
          >
            <span class="min-w-0">
              <span class="block font-sans text-sm text-ink truncate {activeRuleId === rule.id ? 'font-medium' : ''}">{rule.name}</span>
              <span class="block font-serif text-caption text-ink-3 truncate">{rule.copiSchema}</span>
            </span>
            <span class="font-sans text-meta text-ink-3 shrink-0">{rule.abbreviation}</span>
          </button>
        {:else}
          <p class="px-4 py-8 text-center font-sans text-caption text-ink-3">No rule matches “{searchQuery}”</p>
        {/each}
      </div>
    </nav>

    <article class="panel p-6 sm:p-8 space-y-8">
      <header class="space-y-4">
        <p class="font-sans text-meta text-ink-3">
          {currentRule.category === 'inference' ? 'Rule of inference · whole lines only' : 'Rule of replacement · any part of a line'}
          <span class="mx-2">·</span>cites {currentRule.requiredPremiseCount} {currentRule.requiredPremiseCount === 1 ? 'line' : 'lines'}
        </p>
        <h2 class="font-serif text-3xl text-ink leading-tight">
          {currentRule.name} <span class="font-sans text-base text-ink-3 ml-1">{currentRule.abbreviation}</span>
        </h2>
        <div class="px-4 py-4 rounded-xl bg-raised font-serif text-xl text-ink">{currentRule.copiSchema}</div>
      </header>

      <p class="font-serif text-lg leading-relaxed text-ink">{currentRule.description}</p>

      <section class="space-y-3">
        <h3 class="label">Example</h3>
        <ol class="rounded-xl border border-line divide-y divide-line font-serif text-lg text-ink">
          {#each currentRule.example.inputs as inp, idx}
            <li class="grid grid-cols-[40px_1fr] items-center min-h-[48px] pr-4">
              <span class="text-right pr-3 font-sans text-caption text-ink-3 tabular-nums">{idx + 1}.</span>
              <span>{inp}</span>
            </li>
          {/each}
          <li class="grid grid-cols-[40px_1fr] items-center min-h-[48px] pr-4 bg-raised/50">
            <span class="text-right pr-3 text-ink-3">∴</span>
            <span>{currentRule.example.result}</span>
          </li>
        </ol>
        <p class="font-sans text-caption text-ink-2">{currentRule.example.explanation}</p>
      </section>

      <section class="space-y-4 pt-8 border-t border-line">
        <div class="flex items-center justify-between">
          <h3 class="font-sans text-sm font-medium text-ink">Try it</h3>
          <button type="button" on:click={prefillExample} class="link font-sans text-meta">Fill in the example</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4 font-sans">
          <div class="space-y-2">
            <label for="tutorial-practice-formula" class="label block">Formula</label>
            <input id="tutorial-practice-formula" type="text" bind:value={sandboxFormulaInput} on:input={handleFormulaInput}
              maxlength="250" placeholder={currentRule.example.result} class="field font-serif text-base" />
          </div>
          <div class="space-y-2">
            <label for="tutorial-practice-citations" class="label block">Cites</label>
            <input id="tutorial-practice-citations" type="text" bind:value={sandboxCitationLine} placeholder="1, 2" class="field tabular-nums" />
          </div>
        </div>
        <button type="button" on:click={testRuleSandbox} class="btn btn-primary w-full">Check</button>
        {#if sandboxFeedback}
          <p class="flex items-center gap-3 min-h-[40px] px-4 rounded-lg font-sans text-caption {sandboxFeedback.valid ? 'bg-raised text-ink' : 'border border-ink text-ink'}" role="status">
            {#if sandboxFeedback.valid}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            {/if}
            {sandboxFeedback.message}
          </p>
        {/if}
      </section>
    </article>
  </div>
</div>
