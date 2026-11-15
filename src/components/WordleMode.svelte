<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { celebrate } from "../logic/celebrate";
  import { playVictorySound } from '../logic/sound';
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
    saveFeedback = 'Saved to your library';
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
    saveFeedback = 'Removed from your library';
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
      errorMessage = checkResult.error || 'That line does not follow by this rule';
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
    playVictorySound();
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
      celebrate(40, 50);
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
      hintMessage = data.hint || 'No hint for this line';
    } catch {
      hintMessage = 'Hints are unavailable right now';
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

  const STAGES: { id: Difficulty; label: string }[] = [
    { id: 'easy', label: 'Novice' },
    { id: 'medium', label: 'Adept' },
    { id: 'hard', label: 'Master' },
  ];

  $: stageLabel = STAGES.find(st => st.id === selectedDifficulty)?.label ?? '';
  $: nextStageLabel = selectedDifficulty === 'easy' ? 'Adept' : selectedDifficulty === 'medium' ? 'Master' : '';
  $: prettyDate = new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  $: derivedCount = steps.filter(s => s.rule !== 'premise').length;

  function formatDuration(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    return `${m}m ${String(sec % 60).padStart(2, '0')}s`;
  }
</script>

<div class="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 space-y-8">
  <!-- Masthead -->
  <header class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 space-y-2">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-sans text-meta text-ink-3">
          <span class="font-medium text-ink-2">Daily · {prettyDate}</span>
          <span class="tabular-nums">New set in {countdownStr}</span>
        </div>
        <h1 class="page-title">{problem.title}</h1>
        {#if problem.author || problem.creator_username}
          <p class="font-sans text-caption text-ink-2">
            Community theorem by <span class="text-ink font-medium">@{problem.author || problem.creator_username}</span>
          </p>
        {/if}
      </div>

      <div class="flex items-center gap-1 shrink-0 -mr-2">
        <button
          type="button"
          on:click={toggleSaveToSandboxLibrary}
          disabled={isSavingTheorem}
          aria-pressed={isSaved}
          title={isSaved ? 'Saved to your library. Click to remove' : 'Save to your library'}
          class="btn-icon disabled:opacity-40 {isSaved ? 'text-ink' : ''}"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button
          type="button"
          on:click={requestHint}
          disabled={isWon || isStageSolved || isRequestingHint}
          title={isRequestingHint ? 'Looking for a hint' : 'Hint'}
          class="btn-icon disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="seg" role="group" aria-label="Stage">
        {#each STAGES as stage}
          <button
            type="button"
            on:click={() => initProblem(stage.id)}
            aria-pressed={selectedDifficulty === stage.id}
            class="seg-item inline-flex items-center gap-2"
          >
            {stage.label}
            {#if completedStages[stage.id]}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-label="solved"><polyline points="20 6 9 17 4 12"/></svg>
            {/if}
          </button>
        {/each}
      </div>
      {#if saveFeedback}
        <span class="font-sans text-meta text-ink-2" aria-live="polite">{saveFeedback}</span>
      {/if}
    </div>

    {#if hintMessage}
      <div class="flex items-start justify-between gap-4 px-4 py-3 rounded-xl bg-raised font-sans text-caption">
        <p class="text-ink"><span class="text-ink-3 mr-2">Hint</span>{hintMessage}</p>
        <button type="button" on:click={() => (hintMessage = '')} class="btn-icon w-6 h-6 -mr-1 shrink-0" aria-label="Dismiss hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    {/if}
  </header>

  {#if errorMessage}
    <div class="flex items-center justify-between gap-4 min-h-[44px] px-4 rounded-xl border border-ink bg-card font-sans text-caption text-ink" role="alert">
      <span>{errorMessage}</span>
      <button type="button" on:click={() => (errorMessage = '')} class="link shrink-0">Dismiss</button>
    </div>
  {/if}

  <ProofTable
    {steps}
    conclusion={problem.conclusion}
    isComplete={isWon || isStageSolved || hasReachedConclusion}
    canUndo={!isStageSolved}
    {hibernated}
    on:undoStep={handleUndo}
    on:citeLine={handleCiteLine}
    on:insertFormula={(event) => stepInputComponent?.insertFormula(event.detail)}
  />

  {#if !isWon && !hasReachedConclusion && !isStageSolved}
    <StepInput
      bind:this={stepInputComponent}
      existingSteps={steps}
      {hibernated}
      on:submitStep={handleAddStep}
    />
  {/if}

  {#if isWon || hasReachedConclusion || isStageSolved}
    <section class="panel p-6 sm:p-8 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="space-y-2">
          <span class="label">{stageLabel} solved</span>
          <h2 class="font-serif text-3xl text-ink leading-tight">Proved in {derivedCount} {derivedCount === 1 ? 'line' : 'lines'}</h2>
        </div>
        <dl class="font-sans text-caption text-ink-2 sm:text-right space-y-1">
          {#if durationSeconds > 0}
            <div><dt class="inline text-ink-3 mr-1">Time </dt><dd class="inline tabular-nums text-ink">{formatDuration(durationSeconds)}</dd></div>
          {/if}
          <div><dt class="inline text-ink-3 mr-1">Next set in </dt><dd class="inline tabular-nums text-ink">{countdownStr}</dd></div>
        </dl>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-6 border-t border-line">
        {#if nextStageLabel}
          <button type="button" on:click={nextStage} class="btn btn-primary">
            Next: {nextStageLabel}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
          <button type="button" on:click={() => (showShareModal = true)} class="btn btn-secondary">Share proof</button>
        {:else}
          <button type="button" on:click={() => (showShareModal = true)} class="btn btn-primary">Share proof</button>
        {/if}
        <button type="button" on:click={copyShareCard} class="btn btn-ghost">
          {copiedShareText ? 'Copied' : 'Copy as text'}
        </button>
        {#if !nextStageLabel}
          <span class="font-sans text-caption text-ink-2 sm:ml-auto">All three stages done for today</span>
        {/if}
      </div>
    </section>
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
