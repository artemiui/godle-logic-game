<script lang="ts">
  import { onMount } from 'svelte';
  import confetti from 'canvas-confetti';
  import type { Problem, ProofStep, RuleId, Formula } from '../types/logic';
  import { getDailyProblem } from '../logic/presets';
  import { validateProofStep } from '../logic/checker';
  import { formulasEqual } from '../logic/ast';
  import { authStore } from '../stores/auth';
  import ProofTable from './ProofTable.svelte';
  import StepInput from './StepInput.svelte';
  import ShareModal from './ShareModal.svelte';

  type Difficulty = 'easy' | 'medium' | 'hard';

  let selectedDifficulty: Difficulty = 'easy';
  let dateStr: string = new Date().toISOString().split('T')[0];
  let problem: Problem = getDailyProblem(dateStr, selectedDifficulty);
  let steps: ProofStep[] = problem.premises.map((p, idx) => ({
    stepNumber: idx + 1,
    formula: p,
    rule: 'premise' as const,
    citations: [],
    isPremise: true,
  }));
  let isWon: boolean = false;
  let showShareModal: boolean = false;
  let errorMessage: string = '';
  let hintMessage: string = '';
  let isRequestingHint: boolean = false;
  let startTime: number = Date.now();
  let durationSeconds: number = 0;
  let copiedShareText: boolean = false;

  let isSaved: boolean = false;
  let isSavingTheorem: boolean = false;
  let saveFeedback: string = '';

  let stepInputComponent: any;

  let completedStages: Record<Difficulty, boolean> = {
    easy: false,
    medium: false,
    hard: false,
  };

  function checkIfSaved() {
    if (!problem) return;
    try {
      const local = JSON.parse(localStorage.getItem('goodle_local_saved_proofs') || '[]');
      isSaved = local.some((p: any) => p.title === problem.title);
    } catch {
      isSaved = false;
    }
  }

  $: if (problem) {
    checkIfSaved();
  }

  async function saveToSandboxLibrary() {
    if (isSavingTheorem || isSaved || !problem) return;
    isSavingTheorem = true;
    saveFeedback = '';

    const newSaved = {
      id: 'saved-' + Date.now(),
      title: problem.title,
      difficulty: problem.difficulty || 'medium',
      premises: problem.premises,
      conclusion: problem.conclusion,
      notes: problem.author ? `Community theorem by @${problem.author}` : `Daily problem (${dateStr})`,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    try {
      const local = JSON.parse(localStorage.getItem('goodle_local_saved_proofs') || '[]');
      if (!local.some((p: any) => p.title === newSaved.title)) {
        local.unshift(newSaved);
        localStorage.setItem('goodle_local_saved_proofs', JSON.stringify(local));
      }
    } catch {}

    // Save to server if authenticated
    const token = $authStore.token || localStorage.getItem('goodle_token');
    if (token && $authStore.user) {
      try {
        await fetch('/api/user/saved-proofs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
            title: problem.title,
            difficulty: problem.difficulty || 'medium',
            premises: problem.premises,
            conclusion: problem.conclusion,
            notes: newSaved.notes,
          }),
        });
      } catch {}
    }

    isSavingTheorem = false;
    isSaved = true;
    saveFeedback = 'Saved to Sandbox Library!';
    setTimeout(() => (saveFeedback = ''), 3000);
  }

  async function removeFromSandboxLibrary() {
    if (isSavingTheorem || !isSaved || !problem) return;
    isSavingTheorem = true;
    saveFeedback = '';

    // Remove from localStorage
    try {
      const local = JSON.parse(localStorage.getItem('goodle_local_saved_proofs') || '[]');
      const updated = local.filter((p: any) => p.title !== problem.title);
      localStorage.setItem('goodle_local_saved_proofs', JSON.stringify(updated));
    } catch {}

    // Remove from server if authenticated
    const token = $authStore.token || localStorage.getItem('goodle_token');
    if (token && $authStore.user) {
      try {
        await fetch('/api/user/saved-proofs/' + encodeURIComponent(problem.title), {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
      } catch {}
    }

    isSavingTheorem = false;
    isSaved = false;
    saveFeedback = 'Removed from Sandbox Library';
    setTimeout(() => (saveFeedback = ''), 3000);
  }

  function toggleSaveToSandboxLibrary() {
    if (isSaved) {
      removeFromSandboxLibrary();
    } else {
      saveToSandboxLibrary();
    }
  }

  async function initProblem(diff: Difficulty) {
    selectedDifficulty = diff;
    let loadedProb: Problem = getDailyProblem(dateStr, diff);
    try {
      const res = await fetch(`/api/wordle/today?date=${dateStr}&difficulty=${diff}`);
      if (res.ok) {
        const data = await res.json();
        if (data.problem) {
          loadedProb = data.problem;
        }
      }
    } catch {}

    problem = loadedProb;
    steps = problem.premises.map((p, idx) => ({
      stepNumber: idx + 1,
      formula: p,
      rule: 'premise' as const,
      citations: [],
      isPremise: true,
    }));
    isWon = false;
    errorMessage = '';
    hintMessage = '';
    startTime = Date.now();
    copiedShareText = false;
  }

  onMount(() => {
    initProblem('easy');
  });

  $: hasReachedConclusion = steps.some(s => formulasEqual(s.formula, problem.conclusion));

  function handleAddStep(event: CustomEvent<{ formula: Formula; formulaRaw: string; ruleId: RuleId; citations: number[] }>) {
    errorMessage = '';
    const { formula, ruleId, citations } = event.detail;

    const checkResult = validateProofStep(steps, formula, ruleId, citations);
    if (!checkResult.valid) {
      errorMessage = checkResult.error || 'Invalid logical inference or replacement.';
      return;
    }

    const newStep: ProofStep = {
      stepNumber: steps.length + 1,
      formula,
      rule: ruleId,
      citations,
    };

    steps = [...steps, newStep];

    if (formulasEqual(formula, problem.conclusion)) {
      handleWin();
    }
  }

  function handleUndo() {
    if (steps.filter(s => s.rule !== 'premise').length === 0) return;
    steps = steps.slice(0, -1);
    isWon = false;
    errorMessage = '';
  }

  function handleCiteLine(event: CustomEvent<number>) {
    if (stepInputComponent && typeof stepInputComponent.toggleCitation === 'function') {
      stepInputComponent.toggleCitation(event.detail);
    }
  }

  async function handleWin() {
    isWon = true;
    completedStages[selectedDifficulty] = true;
    durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    try {
      confetti({ particleCount: 40, spread: 50 });
    } catch {}
  }

  async function requestHint() {
    if (isWon || isRequestingHint) return;
    isRequestingHint = true;
    hintMessage = '';
    try {
      const res = await fetch('/api/logic/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          conclusion: problem.conclusion,
        })
      });
      const data = await res.json();
      hintMessage = data.hint || 'No hint available for this step.';
    } catch {
      hintMessage = 'Hint service unavailable.';
    } finally {
      isRequestingHint = false;
    }
  }

  function generateShareCard(): string {
    const stageNames: Record<Difficulty, string> = {
      easy: 'Novice',
      medium: 'Adept',
      hard: 'Master',
    };
    const deductionSteps = steps.filter(s => s.rule !== 'premise').length;
    const squares = '■ '.repeat(Math.min(deductionSteps, 8));
    const authorLine = (problem.author || problem.creator_username) ? `\nTheorem by: @${problem.author || problem.creator_username}` : '';
    return `gödle • ${dateStr}\nStage: ${stageNames[selectedDifficulty]}${authorLine}\nSolved in ${deductionSteps} steps (${durationSeconds}s)\n${squares}`;
  }

  function copyShareCard() {
    navigator.clipboard.writeText(generateShareCard());
    copiedShareText = true;
    setTimeout(() => (copiedShareText = false), 3000);
  }

  function nextStage() {
    if (selectedDifficulty === 'easy') initProblem('medium');
    else if (selectedDifficulty === 'medium') initProblem('hard');
  }
</script>

<div class="max-w-3xl mx-auto py-8 sm:py-12 px-4 space-y-8">
  <!-- Minimal Header & Stages Bar -->
  <div class="space-y-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
    <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
      <div>
        <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-1">
          Daily Problem • {dateStr}
        </span>
        <div class="flex items-center gap-2.5 flex-wrap">
          <h1 class="text-xl sm:text-2xl font-serif font-normal text-neutral-950 dark:text-neutral-50 tracking-tight">
            {problem.title}
          </h1>
          <button
            type="button"
            on:click={toggleSaveToSandboxLibrary}
            disabled={isSavingTheorem}
            title={isSaved ? "Saved to Sandbox Library (click to remove)" : "Save theorem to Sandbox Library"}
            class="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-sans transition-colors cursor-pointer {
              isSaved
                ? 'border-emerald-600/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }"
          >
            {#if isSaved}
              <svg class="group-hover:hidden" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <svg class="hidden group-hover:block" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span class="group-hover:hidden">Saved</span>
              <span class="hidden group-hover:inline">Remove</span>
            {:else if isSavingTheorem}
              <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              <span>Updating...</span>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span>Save</span>
            {/if}
          </button>
        </div>
        {#if saveFeedback}
          <div class="text-[11px] font-sans text-emerald-600 dark:text-emerald-400 mt-0.5">
            ✓ {saveFeedback}
          </div>
        {/if}
        {#if problem.author || problem.creator_username}
          <div class="text-xs font-sans text-neutral-600 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
            <span class="text-[10px] font-sans uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Community
            </span>
            <span>
              Submitted by <strong class="text-neutral-900 dark:text-white">@{problem.author || problem.creator_username}</strong>
            </span>
          </div>
        {/if}
      </div>

      <!-- Hint action icon -->
      <button
        type="button"
        on:click={requestHint}
        disabled={isWon || isRequestingHint}
        title={isRequestingHint ? 'Analyzing…' : 'Request Hint'}
        class="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer self-start sm:self-auto transition-colors disabled:opacity-40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{isRequestingHint ? 'animate-pulse' : ''}"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
      </button>
    </div>

    <!-- Stage Switcher: Minimal Typographic Tabs -->
    <div class="flex items-center gap-2 pt-1 font-sans text-xs">
      <button
        type="button"
        on:click={() => initProblem('easy')}
        class="py-1.5 px-3 border transition-all cursor-pointer flex items-center gap-1.5 {
          selectedDifficulty === 'easy'
            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
            : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
        }"
      >
        <span>01 Novice</span>
        {#if completedStages.easy}<span class="text-[10px]">✓</span>{/if}
      </button>

      <button
        type="button"
        on:click={() => initProblem('medium')}
        class="py-1.5 px-3 border transition-all cursor-pointer flex items-center gap-1.5 {
          selectedDifficulty === 'medium'
            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
            : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
        }"
      >
        <span>02 Adept</span>
        {#if completedStages.medium}<span class="text-[10px]">✓</span>{/if}
      </button>

      <button
        type="button"
        on:click={() => initProblem('hard')}
        class="py-1.5 px-3 border transition-all cursor-pointer flex items-center gap-1.5 {
          selectedDifficulty === 'hard'
            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
            : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
        }"
      >
        <span>03 Master</span>
        {#if completedStages.hard}<span class="text-[10px]">✓</span>{/if}
      </button>
    </div>

    <!-- Hint Footnote if Loaded -->
    {#if hintMessage}
      <div class="py-2 px-3 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex items-baseline justify-between text-xs font-sans">
        <div>
          <span class="text-neutral-600 dark:text-neutral-300 uppercase mr-1">Hint:</span>
          <span class="text-neutral-900 dark:text-neutral-100">{hintMessage}</span>
        </div>
        <button
          type="button"
          on:click={() => (hintMessage = '')}
          class="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white ml-2 cursor-pointer"
        >
          ✕
        </button>
      </div>
    {/if}
  </div>

  <!-- Error feedback message -->
  {#if errorMessage}
    <div class="py-2.5 px-3.5 border border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-900 text-xs font-sans text-neutral-950 dark:text-neutral-50 flex items-center justify-between">
      <span>• {errorMessage}</span>
      <button type="button" on:click={() => (errorMessage = '')} class="underline ml-3 cursor-pointer">dismiss</button>
    </div>
  {/if}

  <!-- Minimalist Proof Table (Premises & Conclusion) -->
  <ProofTable
    {steps}
    conclusion={problem.conclusion}
    isComplete={isWon || hasReachedConclusion}
    on:undoStep={handleUndo}
    on:citeLine={handleCiteLine}
  />

  <!-- Deduction Step Input Bar (Shown only if not completed) -->
  {#if !isWon && !hasReachedConclusion}
    <StepInput
      bind:this={stepInputComponent}
      existingSteps={steps}
      on:submitStep={handleAddStep}
    />
  {/if}

  <!-- Minimal Completion Banner -->
  {#if isWon || hasReachedConclusion}
    <div class="border border-neutral-900 dark:border-white p-6 bg-white dark:bg-neutral-950 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-0.5">
            Validation Complete
          </span>
          <h3 class="font-serif text-2xl text-neutral-950 dark:text-neutral-50">
            Statement Formally Proven
          </h3>
        </div>
        <div class="font-sans text-xs text-neutral-600 dark:text-neutral-300">
          {steps.filter(s => s.rule !== 'premise').length} steps · {durationSeconds}s
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          on:click={() => (showShareModal = true)}
          class="h-9 px-4 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-sans text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>Share Proof Certificate</span>
          <span class="text-[10px] opacity-70">↗</span>
        </button>

        <button
          type="button"
          on:click={copyShareCard}
          class="h-9 px-3.5 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-800 dark:text-neutral-200 font-sans text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          {copiedShareText ? '✓ Copied' : 'Quick Copy Text'}
        </button>

        {#if selectedDifficulty !== 'hard'}
          <button
            type="button"
            on:click={nextStage}
            class="h-9 px-4 border border-neutral-900 dark:border-white text-neutral-950 dark:text-white font-sans text-xs uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            Next Stage →
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Proof Sharing Modal with LaTeX and Image Rendering -->
  <ShareModal
    isOpen={showShareModal}
    {problem}
    {steps}
    mode="wordle"
    difficulty={selectedDifficulty}
    {durationSeconds}
    date={dateStr}
    on:close={() => (showShareModal = false)}
  />
</div>
