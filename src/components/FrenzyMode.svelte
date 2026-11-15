<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { celebrate } from "../logic/celebrate";
  import { playVictorySound } from '../logic/sound';
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
  export let hibernated: boolean = false;

  let timer: number = 0;
  let timerInterval: any = null;
  let score: number = 0;

  let stepInputComponent: any;

  $: if (hibernated) {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  } else if (isPlaying && !isGameOver && !isWon && !timerInterval) {
    timerInterval = setInterval(() => {
      if (!isGameOver && !isWon) {
        timer++;
      }
    }, 1000);
  }

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
      seedStatusMessage = `Loaded “${decoded.title}”`;
    } else {
      seedStatusMessage = `Loaded seed ${trimmed}`;
    }
  }

  function handleGenerateRandomSeed() {
    const rnd = generateRandomSeed();
    activeSeed = rnd;
    seedInput = rnd;
    seedStatusMessage = `New seed ${rnd}`;
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
    seedStatusMessage = `Run ended. Seed ${activeSeed} is still loaded`;
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
      errorMessage = (checkResult.error || 'That line does not follow by this rule') + ' · one heart lost';
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
    playVictorySound();
    isWon = true;
    if (timerInterval) clearInterval(timerInterval);
    score = Math.max(100, hearts * 500 + Math.max(0, 1000 - timer * 8));

    try {
      celebrate(50, 60);
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
    const url = `https://godle-logic-game.vercel.app?mode=frenzy&seed=${encodeProblemToShareCode(problem)}`;
    const fullShare = `⚡ gödle frenzy by A. Arcega [Seed: ${activeSeed}]\n\n${formatted}\n\nCan you prove it in 3 hearts?\nPlay: ${url}`;
    navigator.clipboard.writeText(fullShare);
    shareTextCopied = true;
    setTimeout(() => (shareTextCopied = false), 3000);
  }
</script>

<div class="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 space-y-8 {penaltyShake ? 'animate-shake' : ''}">
  <header class="flex items-start justify-between gap-4">
    <div class="min-w-0 space-y-2">
      <div class="font-sans text-meta text-ink-3">
        <span class="font-medium text-ink-2">Frenzy</span>
        {#if isPlaying}<span class="ml-3 tabular-nums">Seed {activeSeed}</span>{/if}
      </div>
      <h1 class="page-title">{isPlaying && problem ? problem.title : 'One proof, three hearts, the clock running'}</h1>
    </div>

    <div class="flex items-center gap-4 shrink-0 pt-6">
      <div class="flex items-center gap-1 text-ink" title="{hearts} of {maxHearts} hearts left" aria-label="{hearts} of {maxHearts} hearts left">
        {#each Array(maxHearts) as _, idx}
          <span class={idx < hearts ? 'text-ink' : 'text-ink-3'}><svg width="16" height="16" viewBox="0 0 24 24" fill="{idx < hearts ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></span>
        {/each}
      </div>
      <span class="font-sans text-base tabular-nums {isPlaying ? 'text-ink font-medium' : 'text-ink-3'}">
        {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
      </span>
    </div>
  </header>

  {#if isPlaying}
    <div class="flex items-center justify-between -mt-4 font-sans text-caption text-ink-3">
      <span>The clock stops when you reach the conclusion</span>
      <button type="button" on:click={abortToSetup} class="link">End run</button>
    </div>
  {/if}

  {#if !isPlaying}
    <section class="panel p-6 sm:p-8 space-y-8">
      <div class="space-y-2 max-w-lg">
        <h2 class="font-serif text-2xl text-ink">Choose a seed</h2>
        <p class="font-sans text-caption text-ink-2">
          The same seed always deals the same problem, so friends can race on it. The premises and the clock stay hidden until you start.
        </p>
      </div>

      <div class="space-y-2">
        <label for="frenzy-setup-seed" class="label block">Seed or share code</label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            id="frenzy-setup-seed"
            type="text"
            bind:value={seedInput}
            on:keydown={handleSeedKeyDown}
            placeholder="omega-4821"
            class="field h-10 flex-1"
          />
          <div class="flex items-center gap-2">
            <button type="button" on:click={handleLoadCustomSeed} class="btn btn-secondary h-10">Load</button>
            <button type="button" on:click={handleGenerateRandomSeed} class="btn btn-ghost h-10" title="Deal a random seed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>
              Random
            </button>
          </div>
        </div>
        {#if seedStatusMessage}
          <p class="font-sans text-meta text-ink-2" aria-live="polite">{seedStatusMessage}</p>
        {/if}
      </div>

      <dl class="grid grid-cols-1 sm:grid-cols-3 border-y border-line divide-y sm:divide-y-0 sm:divide-x divide-line font-sans">
        <div class="py-4 sm:pr-4 space-y-1">
          <dt class="label">Seed</dt>
          <dd class="text-sm text-ink font-medium truncate tabular-nums">{activeSeed}</dd>
        </div>
        <div class="py-4 sm:px-4 space-y-1">
          <dt class="label">Hearts</dt>
          <dd class="text-sm text-ink">3, one lost per invalid line</dd>
        </div>
        <div class="py-4 sm:pl-4 space-y-1">
          <dt class="label">Clock</dt>
          <dd class="text-sm text-ink">Starts when you do</dd>
        </div>
      </dl>

      <button type="button" on:click={startFrenzy} class="btn btn-primary btn-lg w-full">
        Start
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </section>
  {/if}

  {#if isPlaying && problem}
    {#if errorMessage}
      <div class="flex items-center justify-between gap-4 min-h-[44px] px-4 rounded-xl border border-ink bg-card font-sans text-caption text-ink" role="alert">
        <span>{errorMessage}</span>
        <button type="button" on:click={() => (errorMessage = '')} class="link shrink-0">Dismiss</button>
      </div>
    {/if}

    <ProofTable
      {steps}
      conclusion={problem.conclusion}
      isComplete={isWon}
      canUndo={false}
      {hibernated}
      on:citeLine={handleCiteLine}
      on:insertFormula={(event) => stepInputComponent?.insertFormula(event.detail)}
    />

    {#if !isWon && !isGameOver}
      <StepInput
        bind:this={stepInputComponent}
        existingSteps={steps}
        {hibernated}
        on:submitStep={handleAddStep}
      />
    {/if}

    {#if isGameOver}
      <section class="panel p-6 sm:p-8 space-y-6">
        <div class="space-y-2">
          <span class="label">Out of hearts</span>
          <h2 class="font-serif text-3xl text-ink leading-tight">Three lines did not follow</h2>
          <p class="font-sans text-caption text-ink-2">Try the same seed again, or deal a new one.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3 pt-6 border-t border-line">
          <button type="button" on:click={startFrenzy} class="btn btn-primary">Retry this seed</button>
          <button type="button" on:click={() => prepareSeed()} class="btn btn-secondary">New seed</button>
        </div>
      </section>
    {/if}

    {#if isWon}
      <section class="panel p-6 sm:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div class="space-y-2">
            <span class="label">Proved</span>
            <h2 class="font-serif text-3xl text-ink leading-tight">Score <span class="tabular-nums">{score}</span></h2>
          </div>
          <dl class="font-sans text-caption text-ink-2 sm:text-right space-y-1">
            <div><dt class="inline text-ink-3 mr-1">Hearts left </dt><dd class="inline tabular-nums text-ink">{hearts}</dd></div>
            <div><dt class="inline text-ink-3 mr-1">Time </dt><dd class="inline tabular-nums text-ink">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</dd></div>
          </dl>
        </div>
        <div class="flex flex-wrap items-center gap-3 pt-6 border-t border-line">
          <button type="button" on:click={() => prepareSeed()} class="btn btn-primary">
            New seed
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
          <button type="button" on:click={() => (showShareModal = true)} class="btn btn-secondary">Share proof</button>
          <button type="button" on:click={copyFormattedStatement} class="btn btn-ghost">{shareTextCopied ? 'Copied' : 'Copy as text'}</button>
        </div>
      </section>
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
