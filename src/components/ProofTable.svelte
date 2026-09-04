<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Formula, ProofStep } from '../types/logic';
  import { RULE_MAP } from '../logic/rules';
  import { formulasEqual } from '../logic/ast';
  import LaTeX from './LaTeX.svelte';

  export let steps: ProofStep[] = [];
  export let conclusion: Formula;
  export let isComplete: boolean = false;
  export let canUndo: boolean = true;

  const dispatch = createEventDispatcher<{
    undoStep: void;
    citeLine: number;
  }>();

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
  <!-- Minimal Statement to Prove Banner -->
  <div class="border-b border-neutral-900 dark:border-neutral-100 pb-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-1">
          Statement to Prove
        </span>
        <div class="font-serif text-3xl sm:text-4xl text-neutral-950 dark:text-neutral-50 flex items-baseline gap-3 tracking-tight">
          <span class="font-sans text-xl sm:text-2xl text-neutral-500 dark:text-neutral-400 font-light">∴</span>
          <LaTeX formula={conclusion} />
        </div>
      </div>

      {#if hasReachedConclusion || isComplete}
        <div class="font-sans text-xs uppercase tracking-widest border border-neutral-950 dark:border-white px-3.5 py-1.5 self-start text-neutral-950 dark:text-white font-semibold">
          ■ Q.E.D. — Proved
        </div>
      {/if}
    </div>
  </div>

  <!-- Formal Deduction Proof Sequence -->
  <div class="w-full">
    <!-- Table Header -->
    <div class="grid grid-cols-12 text-[10px] font-sans uppercase tracking-wider text-neutral-600 dark:text-neutral-300 pb-2 border-b border-neutral-200 dark:border-neutral-800">
      <div class="col-span-2 sm:col-span-1 text-center">Line</div>
      <div class="col-span-7 sm:col-span-8 px-3">Formula</div>
      <div class="col-span-3 text-right pr-2">Justification</div>
    </div>

    <!-- Proof Lines -->
    <div class="divide-y divide-neutral-100 dark:divide-neutral-900/80 font-serif">
      {#each steps as step}
        {@const isTarget = formulasEqual(step.formula, conclusion)}
        <div class="grid grid-cols-12 py-3 sm:py-3.5 items-baseline transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-900/40 group {
          isTarget ? 'bg-neutral-100/60 dark:bg-neutral-900 font-medium' : ''
        }">
          <!-- Line Number (Clickable to quickly cite) -->
          <button
            type="button"
            on:click={() => dispatch('citeLine', step.stepNumber)}
            title="Click to cite line {step.stepNumber}"
            class="col-span-2 sm:col-span-1 text-center font-sans text-xs text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white cursor-pointer"
          >
            {String(step.stepNumber).padStart(2, '0')}.
          </button>

          <!-- Formula -->
          <div class="col-span-7 sm:col-span-8 px-3 text-lg sm:text-xl text-neutral-950 dark:text-neutral-100 flex items-center flex-wrap gap-2">
            <LaTeX formula={step.formula} />
            {#if isTarget}
              <span class="text-[9px] font-sans uppercase tracking-wider border border-neutral-950 dark:border-white px-1.5 py-0.5 ml-2 font-bold">
                Proven
              </span>
            {/if}
          </div>

          <!-- Justification -->
          <div class="col-span-3 text-right pr-2 font-sans text-xs text-neutral-600 dark:text-neutral-400">
            {#if step.rule === 'premise'}
              <span class="uppercase tracking-wider text-[11px] text-neutral-600 dark:text-neutral-300">Premise</span>
            {:else}
              <span class="text-neutral-800 dark:text-neutral-200">{formatJustification(step)}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Bottom Proof Metadata & Actions -->
    <div class="pt-4 flex items-center justify-between font-sans text-xs text-neutral-600 dark:text-neutral-300 border-t border-neutral-200 dark:border-neutral-800">
      <span>
        {steps.length} {steps.length === 1 ? 'line' : 'lines'} recorded
      </span>

      {#if canUndo && steps.filter(s => s.rule !== 'premise').length > 0 && !hasReachedConclusion}
        <button
          type="button"
          on:click={() => dispatch('undoStep')}
          class="text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white underline cursor-pointer transition-colors"
        >
          [ ↩ Undo Last Step ]
        </button>
      {/if}
    </div>
  </div>
</div>
