<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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

  export let hibernated: boolean = false;

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
  let isStageSolved: boolean = false;
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

  let countdownStr: string = '00:00:00';
  let countdownInterval: any = null;

  interface StageCompletion {
    solved: boolean;
    steps: ProofStep[];
    durationSeconds: number;
    solvedAt: string;
  }

  function loadLocalCompletions(date: string): Partial<Record<Difficulty, StageCompletion>> {
    try {
      const all = JSON.parse(localStorage.getItem('goodle_daily_completions') || '{}');
      return all[date] || {};
    } catch {
      return {};
    }
  }

  function saveLocalCompletion(date: string, diff: Difficulty, data: StageCompletion) {
    try {
      const all = JSON.parse(localStorage.getItem('goodle_daily_completions') || '{}');
      if (!all[date]) all[date] = {};
      all[date][diff] = data;
      localStorage.setItem('goodle_daily_completions', JSON.stringify(all));
    } catch {}
  }

  function getNextUtcMidnight(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  }

  function updateCountdown() {
    const now = new Date();
    const nextReset = getNextUtcMidnight();
    const diffMs = nextReset.getTime() - now.getTime();
    if (diffMs <= 0) {
      countdownStr = '00:00:00';
      const newDateStr = new Date().toISOString().split('T')[0];
      if (newDateStr !== dateStr) {
        dateStr = newDateStr;
        initProblem(selectedDifficulty);
      }
      return;
    }
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    countdownStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startCountdown() {
    stopCountdown();
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  $: if (hibernated) {
    stopCountdown();
  } else {
    if (!countdownInterval) {
      startCountdown();
    }
  }

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
    errorMessage = '';
    hintMessage = '';
    copiedShareText = false;

    // 1. Sync completed badges from local storage for today
    const localToday = loadLocalCompletions(dateStr);
    (['easy', 'medium', 'hard'] as Difficulty[]).forEach(d => {
      if (localToday[d]?.solved) {
        completedStages[d] = true;
      }
    });

    // 2. Check if selected stage is already solved locally
    const localStage = localToday[diff];
    if (localStage?.solved && localStage.steps?.length) {
      isStageSolved = true;
      isWon = true;
      steps = localStage.steps;
      durationSeconds = localStage.durationSeconds || 0;
    } else {
      isStageSolved = false;
      isWon = false;
      startTime = Date.now();
    }

    let loadedProb: Problem = getDailyProblem(dateStr, diff);

    // 3. Query server for today's problem and server-side completion record
    const token = $authStore.token || localStorage.getItem('goodle_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/wordle/today?date=${dateStr}&difficulty=${diff}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.problem) {
          loadedProb = data.problem;
        }
        if (Array.isArray(data.completedDifficulties)) {
          data.completedDifficulties.forEach((d: Difficulty) => {
            completedStages[d] = true;
          });
        }
        if (data.isSolved) {
          isStageSolved = true;
          isWon = true;
          if (data.solvedSteps && Array.isArray(data.solvedSteps) && data.solvedSteps.length > 0) {
            steps = data.solvedSteps;
          }
          saveLocalCompletion(dateStr, diff, {
            solved: true,
            steps,
            durationSeconds: durationSeconds || 0,
            solvedAt: new Date().toISOString(),
          });
        }
      }
    } catch {}

    problem = loadedProb;

    // 4. If unsolved, initialize steps to problem premises
    if (!isStageSolved) {
      steps = problem.premises.map((p, idx) => ({
        stepNumber: idx + 1,
        formula: p,
        rule: 'premise' as const,
        citations: [],
        isPremise: true,
      }));
    }
  }

  onMount(() => {
    startCountdown();
    initProblem('easy');
  });

  onDestroy(() => {
    stopCountdown();
  });

  $: hasReachedConclusion = steps.some(s => formulasEqual(s.formula, problem.conclusion));

  function handleAddStep(event: CustomEvent<{ formula: Formula; formulaRaw: string; ruleId: RuleId; citations: number[] }>) {
    if (isStageSolved) return;
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
    if (isStageSolved) return;
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
    if (isStageSolved) return;
    isWon = true;
    isStageSolved = true;
    completedStages[selectedDifficulty] = true;
    durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    // Save to local storage
    saveLocalCompletion(dateStr, selectedDifficulty, {
      solved: true,
      steps,
      durationSeconds,
      solvedAt: new Date().toISOString(),
    });

    // Save to server
    const token = $authStore.token || localStorage.getItem('goodle_token');
    try {
      await fetch('/api/wordle/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          date: dateStr,
          difficulty: selectedDifficulty,
          stepCount: steps.filter(s => s.rule !== 'premise').length,
          durationSeconds,
          steps,
        }),
      });
    } catch {}

    try {
      confetti({ particleCount: 40, spread: 50 });
    } catch {}
  }

  async function requestHint() {
    if (isWon || isStageSolved || isRequestingHint) return;
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
    return `gödle by A. Arcega • ${dateStr}\nStage: ${stageNames[selectedDifficulty]}${authorLine}\nSolved in ${deductionSteps} steps (${durationSeconds}s)\n${squares}\nhttps://godle-logic-game.vercel.app`;
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
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300">
            Daily Problem • {dateStr}
          </span>
          <span class="text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
            • Reset in {countdownStr} (00:00 UTC)
          </span>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <h1 class="text-xl sm:text-2xl font-serif font-normal text-neutral-950 dark:text-neutral-50 tracking-tight">
            {problem.title}
          </h1>
          {#if isStageSolved}
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-sans font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Solved</span>
            </span>
          {/if}
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
        disabled={isWon || isStageSolved || isRequestingHint}
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
        {#if completedStages.easy}<span class="text-[11px] text-emerald-500 dark:text-emerald-400 font-bold">✓</span>{/if}
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
        {#if completedStages.medium}<span class="text-[11px] text-emerald-500 dark:text-emerald-400 font-bold">✓</span>{/if}
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
        {#if completedStages.hard}<span class="text-[11px] text-emerald-500 dark:text-emerald-400 font-bold">✓</span>{/if}
      </button>
    </div>

    <!-- Stage Solved Callout Banner -->
    {#if isStageSolved}
      <div class="py-2.5 px-3.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
        <div class="flex items-center gap-2">
          <span class="font-sans font-semibold uppercase tracking-wider text-[10px] bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 px-1.5 py-0.5 rounded">
            ✓ Solved
          </span>
          <span class="text-neutral-800 dark:text-neutral-200">
            Stage {selectedDifficulty === 'easy' ? '01 (Novice)' : selectedDifficulty === 'medium' ? '02 (Adept)' : '03 (Master)'} completed for today.
          </span>
        </div>
        <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
          <span class="font-sans text-neutral-500">Next challenge in:</span>
          <span class="font-bold text-neutral-900 dark:text-neutral-100">{countdownStr}</span>
        </div>
      </div>
    {/if}

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
    isComplete={isWon || isStageSolved || hasReachedConclusion}
    canUndo={!isStageSolved}
    {hibernated}
    on:undoStep={handleUndo}
    on:citeLine={handleCiteLine}
  />

  <!-- Deduction Step Input Bar (Shown only if not completed) -->
  {#if !isWon && !hasReachedConclusion && !isStageSolved}
    <StepInput
      bind:this={stepInputComponent}
      existingSteps={steps}
      {hibernated}
      on:submitStep={handleAddStep}
    />
  {/if}

  <!-- Minimal Completion Banner -->
  {#if isWon || hasReachedConclusion || isStageSolved}
    <div class="border border-neutral-900 dark:border-white p-6 bg-white dark:bg-neutral-950 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300">
              Validation Complete
            </span>
            <span class="text-[10px] font-sans uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800/40">
              Stage {selectedDifficulty === 'easy' ? '01' : selectedDifficulty === 'medium' ? '02' : '03'} Solved
            </span>
          </div>
          <h3 class="font-serif text-2xl text-neutral-950 dark:text-neutral-50">
            Statement Formally Proven
          </h3>
        </div>
        <div class="font-sans text-xs text-neutral-600 dark:text-neutral-300 sm:text-right">
          <div>{steps.filter(s => s.rule !== 'premise').length} deduction {steps.filter(s => s.rule !== 'premise').length === 1 ? 'step' : 'steps'}{durationSeconds > 0 ? ` · ${durationSeconds}s` : ''}</div>
          <div class="font-mono text-[11px] text-neutral-600 dark:text-neutral-300 mt-1 flex items-center gap-1.5 sm:justify-end">
            <span class="font-sans text-neutral-500">Next daily reset:</span>
            <span class="font-bold text-neutral-900 dark:text-neutral-100">{countdownStr}</span>
            <span class="text-[10px] text-neutral-400 font-sans">(00:00 UTC)</span>
          </div>
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

        {#if selectedDifficulty === 'easy'}
          <button
            type="button"
            on:click={nextStage}
            class="h-9 px-4 border border-neutral-900 dark:border-white text-neutral-950 dark:text-white font-sans text-xs uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            Proceed to Stage 02 Adept →
          </button>
        {:else if selectedDifficulty === 'medium'}
          <button
            type="button"
            on:click={nextStage}
            class="h-9 px-4 border border-neutral-900 dark:border-white text-neutral-950 dark:text-white font-sans text-xs uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            Proceed to Stage 03 Master →
          </button>
        {:else}
          <div class="text-xs font-sans text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 ml-auto sm:ml-0">
            <span class="font-medium text-emerald-600 dark:text-emerald-400">✓ All daily stages completed</span>
          </div>
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
