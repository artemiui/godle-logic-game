<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import confetti from 'canvas-confetti';
  import type { Problem, ProofStep, RuleId, Formula } from '../types/logic';
  import { generateProblem, formatProblemShareString, encodeProblemToShareCode, decodeProblemFromShareCode } from '../logic/generator';
  import { validateProofStep } from '../logic/checker';
  import { formulasEqual } from '../logic/ast';
  import ProofTable from './ProofTable.svelte';
  import StepInput from './StepInput.svelte';
  import ShareModal from './ShareModal.svelte';

  let seedInput: string = '';
  let activeSeed: string = '';
  let seedStatusMessage: string = '';
  let problem: Problem | null = null;
  let steps: ProofStep[] = [];
  let hearts: number = 3;
  const maxHearts: number = 3;
  let isPlaying: boolean = false;
  let isGameOver: boolean = false;
  let isWon: boolean = false;
  let showShareModal: boolean = false;
  let errorMessage: string = '';
  let penaltyShake: boolean = false;
  let shareTextCopied: boolean = false;

  let timer: number = 0;
  let timerInterval: any = null;
  let score: number = 0;

  let stepInputComponent: any;

  function generateRandomSeed(): string {
    return `omega-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function prepareSeed(seedStr?: string) {
    if (timerInterval) clearInterval(timerInterval);
    const newSeed = seedStr || generateRandomSeed();
    activeSeed = newSeed;
    seedInput = newSeed;
    problem = null;
    steps = [];
    hearts = 3;
    isPlaying = false;
    isGameOver = false;
    isWon = false;
    errorMessage = '';
    seedStatusMessage = '';
    penaltyShake = false;
    shareTextCopied = false;
    timer = 0;
  }

  function handleLoadCustomSeed() {
    const trimmed = seedInput.trim();
    if (!trimmed) return;
    activeSeed = trimmed;
    const decoded = decodeProblemFromShareCode(trimmed);
    if (decoded) {
      seedStatusMessage = `Loaded challenge "${decoded.title}". Press Start Solving to begin.`;
    } else {
      seedStatusMessage = `Seed #${trimmed} loaded. Press Start Solving to begin.`;
    }
  }

  function handleGenerateRandomSeed() {
    const rnd = generateRandomSeed();
    activeSeed = rnd;
    seedInput = rnd;
    seedStatusMessage = `Generated seed #${rnd}. Press Start Solving to begin.`;
  }

  function handleSeedKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLoadCustomSeed();
    }
  }

  function startFrenzy() {
    if (timerInterval) clearInterval(timerInterval);
    const trimmed = seedInput.trim() || activeSeed || generateRandomSeed();
    activeSeed = trimmed;
    seedInput = trimmed;

    const decoded = decodeProblemFromShareCode(trimmed);
    if (decoded) {
      problem = decoded;
    } else {
      problem = generateProblem(trimmed, 'medium');
    }

    steps = problem.premises.map((p, idx) => ({
      stepNumber: idx + 1,
      formula: p,
      rule: 'premise' as const,
      citations: [],
      isPremise: true,
    }));

    hearts = 3;
    isGameOver = false;
    isWon = false;
    errorMessage = '';
    penaltyShake = false;
    shareTextCopied = false;
    timer = 0;
    isPlaying = true;

    timerInterval = setInterval(() => {
      if (!isGameOver && !isWon) {
        timer++;
      }
    }, 1000);
  }

  function abortToSetup() {
    if (timerInterval) clearInterval(timerInterval);
    isPlaying = false;
    isGameOver = false;
    isWon = false;
    timer = 0;
    seedStatusMessage = `Challenge exited. Active seed: #${activeSeed}.`;
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSeed = params.get('seed');
    prepareSeed(urlSeed || undefined);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  function handleAddStep(event: CustomEvent<{ formula: Formula; formulaRaw: string; ruleId: RuleId; citations: number[] }>) {
    if (!isPlaying || isGameOver || isWon || !problem) return;
    errorMessage = '';
    const { formula, ruleId, citations } = event.detail;

    const checkResult = validateProofStep(steps, formula, ruleId, citations);

    if (!checkResult.valid) {
      hearts = Math.max(0, hearts - 1);
      errorMessage = `[Penalty: Heart Lost] ` + (checkResult.error || 'Invalid logical inference.');
      penaltyShake = true;
      setTimeout(() => (penaltyShake = false), 600);

      if (hearts <= 0) {
        isGameOver = true;
        if (timerInterval) clearInterval(timerInterval);
      }
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
      handleFrenzyVictory();
    }
  }

  function handleFrenzyVictory() {
    isWon = true;
    if (timerInterval) clearInterval(timerInterval);
    score = Math.max(100, hearts * 500 + Math.max(0, 1000 - timer * 8));

    try {
      confetti({ particleCount: 50, spread: 60 });
    } catch {}

    try {
      fetch('/api/frenzy/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('goodle_token') ? { Authorization: 'Bearer ' + localStorage.getItem('goodle_token') } : {})
        },
        body: JSON.stringify({
          seed: activeSeed,
          heartsLeft: hearts,
          score,
          timeSeconds: timer,
          won: true,
        })
      });
    } catch {}
  }

  function handleCiteLine(event: CustomEvent<number>) {
    if (stepInputComponent && typeof stepInputComponent.toggleCitation === 'function') {
      stepInputComponent.toggleCitation(event.detail);
    }
  }

  function copyFormattedStatement() {
    if (!problem) return;
    const formatted = formatProblemShareString(problem);
    const url = `${window.location.origin}?mode=frenzy&seed=${encodeProblemToShareCode(problem)}`;
    const fullShare = `⚡ gödle frenzy [Seed: ${activeSeed}]\n\n${formatted}\n\nCan you prove it in 3 hearts?\nPlay: ${url}`;
    navigator.clipboard.writeText(fullShare);
    shareTextCopied = true;
    setTimeout(() => (shareTextCopied = false), 3000);
  }
</script>

<div class="max-w-3xl mx-auto py-8 sm:py-12 px-4 space-y-8 {penaltyShake ? 'animate-shake' : ''}">
  <!-- Status Bar Header -->
  <div class="border-b border-neutral-200 dark:border-neutral-800 pb-5 space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
      <div>
        <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-1">
          02 / Frenzy Speed Mode {isPlaying ? `· Seed: #${activeSeed}` : ''}
        </span>
        <h1 class="text-xl sm:text-2xl font-serif font-normal text-neutral-950 dark:text-neutral-50 tracking-tight">
          {isPlaying && problem ? problem.title : 'Speed Run Challenge'}
        </h1>
      </div>

      <!-- Hearts & Timer Counter -->
      <div class="flex items-center gap-4 font-sans text-xs self-start sm:self-auto">
        <!-- Hearts -->
        <div class="flex items-center gap-1 text-sm tracking-widest" title="{hearts} of 3 hearts remaining">
          {#each Array(maxHearts) as _, idx}
            <span class="{idx < hearts ? 'text-neutral-950 dark:text-white font-bold' : 'text-neutral-300 dark:text-neutral-700'}">
              {idx < hearts ? '♥' : '♡'}
            </span>
          {/each}
        </div>

        <!-- Timer -->
        <div class="border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 {isPlaying ? 'text-neutral-800 dark:text-neutral-200 font-bold' : 'text-neutral-400 dark:text-neutral-500'}">
          {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
        </div>
      </div>
    </div>

    {#if isPlaying}
      <!-- Active Run Sub-bar with exit option -->
      <div class="flex items-center justify-between font-sans text-xs pt-1 border-t border-neutral-100 dark:border-neutral-900">
        <span class="text-neutral-500 dark:text-neutral-400 text-[11px]">
          Seed #{activeSeed} · Timer active
        </span>
        <button
          type="button"
          on:click={abortToSetup}
          class="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white underline cursor-pointer"
        >
          [ Exit to Setup ]
        </button>
      </div>
    {/if}
  </div>

  <!-- Initial Setup State: Statements and solving panels are hidden, timer is turned off, user can load seed -->
  {#if !isPlaying}
    <div class="border border-neutral-900 dark:border-white p-6 sm:p-8 bg-white dark:bg-neutral-950 space-y-6">
      <div class="space-y-1 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block">
          Setup & Seed Configuration
        </span>
        <h2 class="font-serif text-2xl text-neutral-950 dark:text-neutral-50">
          Load Challenge Seed
        </h2>
        <p class="font-sans text-xs text-neutral-600 dark:text-neutral-400 max-w-lg pt-1">
          Specify a challenge seed or randomize. The logical premises, statement to prove, and timer remain hidden until you click Start Solving.
        </p>
      </div>

      <!-- Seed Input & Actions -->
      <div class="space-y-2">
        <label for="frenzy-setup-seed" class="block text-[10px] font-sans uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
          Seed Identifier
        </label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            id="frenzy-setup-seed"
            type="text"
            bind:value={seedInput}
            on:keydown={handleSeedKeyDown}
            placeholder="e.g. omega-4821 or share code"
            class="h-10 flex-1 px-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-neutral-100 font-sans text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-white"
          />
          <div class="flex items-center gap-2">
            <button
              type="button"
              on:click={handleLoadCustomSeed}
              class="h-10 px-4 border border-neutral-900 dark:border-white font-sans text-xs uppercase tracking-wider text-neutral-950 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              Load Seed
            </button>
            <button
              type="button"
              on:click={handleGenerateRandomSeed}
              class="h-10 px-3 border border-neutral-300 dark:border-neutral-700 font-sans text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:border-neutral-500 transition-colors cursor-pointer"
              title="Generate a new random seed"
            >
              Randomize
            </button>
          </div>
        </div>

        {#if seedStatusMessage}
          <div class="text-xs font-sans text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 pt-1">
            <span>✓</span>
            <span>{seedStatusMessage}</span>
          </div>
        {/if}
      </div>

      <!-- Specification Badges -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-sans">
        <div class="border border-neutral-200 dark:border-neutral-800 p-3">
          <span class="text-[10px] uppercase text-neutral-500 dark:text-neutral-400 block mb-0.5">Active Seed</span>
          <span class="font-bold text-neutral-950 dark:text-neutral-50 truncate block">#{activeSeed}</span>
        </div>
        <div class="border border-neutral-200 dark:border-neutral-800 p-3">
          <span class="text-[10px] uppercase text-neutral-500 dark:text-neutral-400 block mb-0.5">Hearts</span>
          <span class="font-bold text-neutral-950 dark:text-neutral-50 block">3 Lives (1 lost per invalid step)</span>
        </div>
        <div class="border border-neutral-200 dark:border-neutral-800 p-3">
          <span class="text-[10px] uppercase text-neutral-500 dark:text-neutral-400 block mb-0.5">Timer Status</span>
          <span class="font-bold text-neutral-950 dark:text-neutral-50 block">Turned Off (Starts on click)</span>
        </div>
      </div>

      <!-- Start Button -->
      <div class="pt-2">
        <button
          type="button"
          on:click={startFrenzy}
          class="w-full h-12 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-sans text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Start Solving</span>
          <span>→</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- Active Solving State: Statements and solving panels are revealed, timer runs -->
  {#if isPlaying && problem}
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
      isComplete={isWon}
      canUndo={false}
      on:citeLine={handleCiteLine}
    />

    <!-- Deduction Input (active if neither game over nor won) -->
    {#if !isWon && !isGameOver}
      <StepInput
        bind:this={stepInputComponent}
        existingSteps={steps}
        on:submitStep={handleAddStep}
      />
    {/if}

    <!-- Game Over Screen -->
    {#if isGameOver}
      <div class="border border-neutral-900 dark:border-white p-6 bg-white dark:bg-neutral-950 space-y-4">
        <div class="border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-1">
            Outcome
          </span>
          <h3 class="font-serif text-2xl text-neutral-950 dark:text-neutral-50">
            All Hearts Exhausted
          </h3>
          <p class="font-sans text-xs text-neutral-600 dark:text-neutral-300 mt-1">
            3 invalid deduction steps made. Try this seed again or load a new seed.
          </p>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button
            type="button"
            on:click={startFrenzy}
            class="h-9 px-4 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-sans text-xs uppercase tracking-wider cursor-pointer"
          >
            Retry This Seed
          </button>
          <button
            type="button"
            on:click={() => prepareSeed()}
            class="h-9 px-4 border border-neutral-900 dark:border-white font-sans text-xs uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            Change / New Seed
          </button>
        </div>
      </div>
    {/if}

    <!-- Victory Banner -->
    {#if isWon}
      <div class="border border-neutral-900 dark:border-white p-6 bg-white dark:bg-neutral-950 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div>
            <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-0.5">
              Validation Complete
            </span>
            <h3 class="font-serif text-2xl text-neutral-950 dark:text-neutral-50">
              Frenzy Solved · Score: {score}
            </h3>
          </div>
          <div class="font-sans text-xs text-neutral-600 dark:text-neutral-300">
            {hearts} hearts remaining · {timer}s
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            on:click={() => (showShareModal = true)}
            class="h-9 px-4 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-sans text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
          >
            <span>Share Proof Certificate</span>
            <span class="text-[10px] opacity-70">↗</span>
          </button>

          <button
            type="button"
            on:click={copyFormattedStatement}
            class="h-9 px-3.5 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-800 dark:text-neutral-200 font-sans text-xs uppercase tracking-wider cursor-pointer"
          >
            {shareTextCopied ? '✓ Copied' : 'Quick Copy Text'}
          </button>

          <button
            type="button"
            on:click={() => prepareSeed()}
            class="h-9 px-4 border border-neutral-900 dark:border-white font-sans text-xs uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            New Challenge →
          </button>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Proof Sharing Modal with LaTeX and Image Rendering -->
  <ShareModal
    isOpen={showShareModal}
    {problem}
    {steps}
    mode="frenzy"
    difficulty="frenzy"
    durationSeconds={timer}
    {score}
    heartsLeft={hearts}
    seed={activeSeed}
    on:close={() => (showShareModal = false)}
  />
</div>
