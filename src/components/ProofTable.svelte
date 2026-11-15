<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Formula, ProofStep } from '../types/logic';
  import { RULE_MAP } from '../logic/rules';
  import { formulasEqual } from '../logic/ast';
  import LaTeX from './LaTeX.svelte';
  import { formulaToString } from '../logic/latex';
  import { notationStore } from '../stores/auth';

  export let steps: ProofStep[] = [];
  export let conclusion: Formula;
  export let isComplete: boolean = false;
  export let canUndo: boolean = true;
  export let hibernated: boolean = false;

  const dispatch = createEventDispatcher<{
    undoStep: void;
    citeLine: number;
    insertFormula: string;
  }>();

  let actionLine: number | null = null;
  $: if (hibernated || isComplete) actionLine = null;

  $: hasReachedConclusion = steps.some(s => formulasEqual(s.formula, conclusion));

  function formatJustification(step: ProofStep): string {
    if (step.rule === 'premise') return 'Premise';
    const ruleObj = RULE_MAP.get(step.rule);
    const abbrev = ruleObj ? ruleObj.abbreviation : step.rule;
    const lines = step.citations.join(', ');
    return lines ? `${lines}  ${abbrev}` : abbrev;
  }
</script>

<div class="space-y-6">
  <!-- Conclusion: the one large thing on the page -->
  <div class="flex items-end justify-between gap-4">
    <div class="min-w-0">
      <span class="label block mb-2">Prove</span>
      <div class="font-serif text-4xl sm:text-5xl leading-none text-ink flex items-baseline gap-4">
        <span class="text-ink-3 text-3xl sm:text-4xl select-none" aria-hidden="true">∴</span>
        <LaTeX formula={conclusion} {hibernated} />
      </div>
    </div>
  </div>

  <!-- Proof sheet -->
  <div class="panel overflow-hidden">
    <ol class="font-serif">
      {#each steps as step, i}
        {@const isTarget = formulasEqual(step.formula, conclusion)}
        {@const lastPremise = step.rule === 'premise' && steps[i + 1] && steps[i + 1].rule !== 'premise'}
        <li class="grid grid-cols-[48px_1fr_auto] sm:grid-cols-[64px_1fr_160px] items-center min-h-[56px] transition-colors duration-150 hover:bg-raised/60 {
          i > 0 ? 'border-t border-line' : ''
        } {lastPremise ? 'border-b border-b-line-strong' : ''}">
          <!-- Line number cites the line -->
          <button
            type="button"
            on:click={() => dispatch('citeLine', step.stepNumber)}
            title="Cite line {step.stepNumber}"
            class="h-full flex items-center justify-end pr-4 font-sans text-caption tabular-nums text-ink-3 hover:text-ink cursor-pointer transition-colors"
          >
            {step.stepNumber}.
          </button>

          <!-- Formula -->
          <div class="py-3 pr-3 text-xl sm:text-[22px] text-ink flex items-center flex-wrap gap-3 min-w-0">
            <button
              type="button"
              class="text-left cursor-pointer border-b border-dotted border-line-strong hover:border-ink-3 transition-colors"
              aria-label="Actions for formula on line {step.stepNumber}"
              aria-expanded={actionLine === step.stepNumber}
              on:click={() => actionLine = actionLine === step.stepNumber ? null : step.stepNumber}
              on:keydown={(event) => { if (event.key === 'Escape') actionLine = null; }}
            >
              <LaTeX formula={step.formula} {hibernated} />
            </button>
            {#if actionLine === step.stepNumber && !isComplete}
              <div class="inline-flex items-center p-0.5 gap-0.5 rounded-lg border border-line bg-card shadow-[0_8px_24px_rgba(0,0,0,0.06)] font-sans">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm h-7 px-2.5 rounded-md"
                  aria-label="Use formula from line {step.stepNumber} in input"
                  on:click={() => {
                    dispatch('insertFormula', formulaToString(step.formula, $notationStore));
                    actionLine = null;
                  }}
                >Use</button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm h-7 px-2.5 rounded-md"
                  aria-label="Cite line {step.stepNumber}"
                  on:click={() => {
                    dispatch('citeLine', step.stepNumber);
                    actionLine = null;
                  }}
                >Cite</button>
              </div>
            {/if}
          </div>

          <!-- Margin justification -->
          <div class="h-full flex items-center justify-end gap-2 pl-4 pr-4 sm:pr-6 border-l border-line">
            {#if step.rule === 'premise'}
              <span class="margin-note text-ink-3">Premise</span>
            {:else}
              <span class="margin-note">{formatJustification(step)}</span>
            {/if}
            {#if isTarget}
              <span class="font-serif text-lg leading-none text-ink" title="Conclusion reached">∎</span>
            {/if}
          </div>
        </li>
      {/each}
    </ol>

    <!-- Sheet footer -->
    <div class="flex items-center justify-between h-12 px-4 sm:px-6 border-t border-line bg-raised/40 font-sans text-caption text-ink-3">
      {#if hasReachedConclusion || isComplete}
        <span class="text-ink font-medium">Q.E.D.</span>
      {:else}
        <span class="tabular-nums">{steps.length} {steps.length === 1 ? 'line' : 'lines'}</span>
      {/if}

      {#if canUndo && steps.filter(s => s.rule !== 'premise').length > 0 && !hasReachedConclusion}
        <button type="button" on:click={() => dispatch('undoStep')} class="btn btn-ghost btn-sm -mr-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
          Undo last line
        </button>
      {/if}
    </div>
  </div>
</div>
