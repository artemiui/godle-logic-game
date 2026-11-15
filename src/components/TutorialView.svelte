<script lang="ts">
  import { tick } from 'svelte';
  import { COPI_RULES } from '../logic/rules';
  import { safeParseFormula } from '../logic/parser';
  import { validateProofStep } from '../logic/checker';
  import { formulasEqual } from '../logic/ast';
  import { replaceFormulaKeywords } from '../logic/latex';
  import { buildLesson, loadProgress, saveProgress, type Lesson } from '../logic/lessons';
  import { activeTabStore, notationStore } from '../stores/auth';
  import LaTeX from './LaTeX.svelte';

  const INTRO = 'intro';
  const STEPS = ['Pattern', 'Example', 'Spot it', 'Use it'];
  const PIECE = safeParseFormula('A v B').formula;

  const inference = COPI_RULES.filter(r => r.category === 'inference');
  const replacement = COPI_RULES.filter(r => r.category === 'replacement');
  const units = [
    { title: 'Inference', sub: 'Whole lines, one way', rules: inference },
    { title: 'Replacement', sub: 'Any part of a line, both ways', rules: replacement },
  ];
  const order = [INTRO, ...COPI_RULES.map(r => r.id as string)];

  let done: string[] = loadProgress();
  let current: string = order.find(id => !done.includes(id)) ?? INTRO;

  // Lesson state
  let step = 0;
  let revealed = 0;
  let picked: number | null = null;
  let checked = false;
  let practiceInput = '';
  let practiceResult: { ok: boolean; message: string } | null = null;
  let practiceTries = 0;
  let showAnswer = false;
  let finished = false;
  let practiceEl: HTMLInputElement | null = null;

  $: rule = COPI_RULES.find(r => r.id === current) ?? null;
  $: lesson = rule ? buildLesson(rule) : null;
  $: ruleCount = COPI_RULES.filter(r => done.includes(r.id)).length;
  $: nextId = order[order.indexOf(current) + 1] ?? null;
  $: nextName = nextId ? COPI_RULES.find(r => r.id === nextId)?.name : null;
  $: pickedChoice = lesson && picked !== null ? lesson.choices[picked] : null;

  function open(id: string) {
    current = id;
    step = 0;
    revealed = 0;
    picked = null;
    checked = false;
    practiceInput = '';
    practiceResult = null;
    practiceTries = 0;
    showAnswer = false;
    finished = false;
    tick().then(() => document.getElementById('lesson')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  function complete(id: string) {
    if (!done.includes(id)) {
      done = [...done, id];
      saveProgress(done);
    }
  }

  function goNext() {
    if (nextId) open(nextId);
  }

  async function toPractice() {
    step = 3;
    await tick();
    practiceEl?.focus();
  }

  function checkPractice(l: Lesson) {
    const parsed = safeParseFormula(practiceInput);
    if (!parsed.formula) {
      practiceResult = { ok: false, message: parsed.error || 'This formula could not be read' };
      return;
    }
    const steps = l.practice.premises.map((formula, i) => ({
      stepNumber: i + 1, formula, rule: 'premise' as const, citations: [], isPremise: true,
    }));
    const cites = l.practice.premises.map((_, i) => i + 1);
    const res = validateProofStep(steps, parsed.formula, l.rule.id, cites);
    if (res.valid || formulasEqual(parsed.formula, l.practice.answer)) {
      practiceResult = { ok: true, message: `That follows by ${l.rule.name}` };
      finished = true;
      complete(l.rule.id);
    } else {
      practiceTries += 1;
      practiceResult = { ok: false, message: res.error || `That does not follow by ${l.rule.name}` };
    }
  }

  function handlePracticeInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const cursor = target.selectionStart ?? target.value.length;
    const res = replaceFormulaKeywords(target.value, cursor, $notationStore);
    if (res.changed) {
      practiceInput = res.text;
      target.value = res.text;
      target.setSelectionRange(res.cursor, res.cursor);
      tick().then(() => target?.setSelectionRange(res.cursor, res.cursor));
    }
    practiceResult = null;
  }

  const check = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  const arrow = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 space-y-8">
  <header class="space-y-4">
    <span class="font-sans text-meta font-medium text-ink-2">Rules</span>
    <h1 class="page-title">Learn Copi’s 19 rules</h1>
    <div class="flex items-center gap-4 max-w-md">
      <div class="flex-1 h-1 rounded-full bg-raised overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="19" aria-valuenow={ruleCount} aria-label="Rules learned">
        <div class="h-full bg-ink rounded-full transition-transform duration-500 ease-out origin-left" style="transform: scaleX({ruleCount / 19})"></div>
      </div>
      <span class="font-sans text-caption text-ink-2 tabular-nums shrink-0">{ruleCount} of 19 learned</span>
    </div>
  </header>

  <div class="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
    <!-- Course map -->
    <nav class="panel overflow-hidden order-2 md:order-1 md:sticky md:top-20" aria-label="Lessons">
      <div class="max-h-[360px] md:max-h-[calc(100vh-128px)] overflow-y-auto py-2">
        <button type="button" on:click={() => open(INTRO)} aria-current={current === INTRO ? 'step' : undefined}
          class="w-full flex items-center gap-3 h-10 px-4 text-left font-sans text-sm cursor-pointer transition-colors duration-150 {current === INTRO ? 'bg-raised text-ink font-medium' : 'text-ink-2 hover:text-ink hover:bg-raised/60'}">
          <span class="w-5 h-5 shrink-0 rounded-full flex items-center justify-center {done.includes(INTRO) ? 'bg-ink text-paper' : current === INTRO ? 'border-2 border-ink' : 'border border-line-strong'}">{#if done.includes(INTRO)}{@html check}{/if}</span>
          <span class="truncate">How a proof works</span>
        </button>

        {#each units as unit}
          <div class="px-4 pt-6 pb-2">
            <p class="font-sans text-caption font-medium text-ink">{unit.title}</p>
            <p class="font-sans text-meta text-ink-3">{unit.sub}</p>
          </div>
          {#each unit.rules as r}
            <button type="button" on:click={() => open(r.id)} aria-current={current === r.id ? 'step' : undefined}
              class="w-full flex items-center gap-3 h-10 px-4 text-left font-sans text-sm cursor-pointer transition-colors duration-150 {current === r.id ? 'bg-raised text-ink font-medium' : 'text-ink-2 hover:text-ink hover:bg-raised/60'}">
              <span class="w-5 h-5 shrink-0 rounded-full flex items-center justify-center {done.includes(r.id) ? 'bg-ink text-paper' : current === r.id ? 'border-2 border-ink' : 'border border-line-strong'}">{#if done.includes(r.id)}{@html check}{/if}</span>
              <span class="truncate flex-1">{r.name}</span>
              <span class="text-meta text-ink-3 shrink-0">{r.abbreviation}</span>
            </button>
          {/each}
        {/each}
      </div>
    </nav>

    <!-- Lesson -->
    <article id="lesson" class="panel order-1 md:order-2 scroll-mt-20 overflow-hidden">
      {#if current === INTRO}
        <div class="p-6 sm:p-10 space-y-8 min-h-[440px]">
          <div class="space-y-2">
            <span class="label">Start here</span>
            <h2 class="font-serif text-3xl sm:text-4xl text-ink leading-tight">How a proof works</h2>
          </div>
          <ol class="space-y-6">
            {#each [
              ['You start with premises', 'Numbered lines you are allowed to assume, and a conclusion after ∴ that you have to reach.'],
              ['Each new line needs a reason', 'Write a line, name the rule that allows it, and cite the lines it comes from.'],
              ['You stop at the conclusion', 'When a line matches the conclusion, the proof is done. Any route counts if every line follows.'],
            ] as [title, body], i}
              <li class="grid grid-cols-[40px_1fr] gap-4">
                <span class="font-serif text-3xl leading-none text-ink-3 tabular-nums">{i + 1}</span>
                <div class="space-y-1">
                  <h3 class="font-sans text-base font-medium text-ink">{title}</h3>
                  <p class="font-sans text-sm text-ink-2">{body}</p>
                </div>
              </li>
            {/each}
          </ol>
          <p class="font-sans text-sm text-ink-2 pt-6 border-t border-line">
            Each lesson teaches one rule in four short steps: see the pattern, watch it work, spot it, then use it yourself.
          </p>
        </div>
        <footer class="flex items-center justify-end gap-3 px-6 sm:px-10 py-4 border-t border-line bg-raised/40">
          <button type="button" class="btn btn-primary" on:click={() => { complete(INTRO); goNext(); }}>
            Start with Modus Ponens {@html arrow}
          </button>
        </footer>

      {:else if lesson && rule}
        <!-- Step track -->
        <div class="px-6 sm:px-10 pt-6 sm:pt-8 space-y-4">
          <div class="flex items-baseline justify-between gap-4">
            <p class="font-sans text-meta text-ink-3">
              {rule.category === 'inference' ? 'Inference' : 'Replacement'} · {rule.abbreviation}
            </p>
            {#if done.includes(rule.id) && !finished}
              <span class="inline-flex items-center gap-1 font-sans text-meta text-ink-2">{@html check} Learned</span>
            {/if}
          </div>
          <div class="grid grid-cols-4 gap-2" aria-label="Lesson steps">
            {#each STEPS as label, i}
              <button type="button" on:click={() => { if (i <= step || done.includes(rule.id)) step = i; }}
                class="text-left space-y-2 {i <= step || done.includes(rule.id) ? 'cursor-pointer' : 'cursor-default'}"
                aria-current={i === step ? 'step' : undefined}>
                <span class="block h-1 rounded-full transition-colors duration-300 {i < step || finished ? 'bg-ink' : i === step ? 'bg-ink-3' : 'bg-raised'}"></span>
                <span class="block font-sans text-meta {i === step && !finished ? 'text-ink font-medium' : 'text-ink-3'}">{label}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="p-6 sm:p-10 min-h-[400px]">
          {#if finished}
            <div class="lesson-in space-y-6 text-center py-12">
              <span class="block font-serif text-6xl leading-none text-ink" aria-hidden="true">∎</span>
              <div class="space-y-2">
                <h2 class="font-serif text-3xl text-ink">{rule.name}, learned</h2>
                <p class="font-sans text-sm text-ink-2 tabular-nums">{ruleCount} of 19 rules</p>
              </div>
            </div>

          {:else if step === 0}
            <div class="lesson-in space-y-8">
              <h2 class="font-serif text-3xl sm:text-4xl text-ink leading-tight">{rule.name}</h2>
              <div class="rounded-xl bg-raised px-6 py-8 text-center font-serif text-2xl sm:text-3xl text-ink">{rule.copiSchema}</div>
              <p class="font-serif text-xl leading-relaxed text-ink">{rule.description}</p>
              <p class="font-sans text-sm text-ink-2">
                {#if rule.category === 'inference'}
                  Works on whole lines only and cites {rule.requiredPremiseCount} {rule.requiredPremiseCount === 1 ? 'line' : 'lines'}.
                {:else}
                  An equivalence, so it can rewrite any part of a line in either direction. It cites 1 line.
                {/if}
                The small letters stand for any statement at all.
              </p>
            </div>

          {:else if step === 1}
            <div class="lesson-in space-y-6">
              <h2 class="font-serif text-2xl text-ink">Watch it work</h2>
              <ol class="rounded-xl border border-line divide-y divide-line font-serif text-xl text-ink overflow-hidden">
                {#each lesson.premises as p, i}
                  {#if i < revealed}
                    <li class="lesson-in grid grid-cols-[48px_1fr_auto] items-center min-h-[56px]">
                      <span class="text-right pr-4 font-sans text-caption text-ink-3 tabular-nums">{i + 1}.</span>
                      <span><LaTeX formula={p} /></span>
                      <span class="pr-6 margin-note text-ink-3">Premise</span>
                    </li>
                  {/if}
                {/each}
                {#if revealed > lesson.premises.length}
                  <li class="lesson-in grid grid-cols-[48px_1fr_auto] items-center min-h-[56px] bg-raised/50">
                    <span class="text-right pr-4 font-sans text-caption text-ink-3 tabular-nums">{lesson.premises.length + 1}.</span>
                    <span><LaTeX formula={lesson.result} /></span>
                    <span class="pr-6 margin-note">{lesson.premises.map((_, i) => i + 1).join(', ')}  {rule.abbreviation}</span>
                  </li>
                {/if}
                {#if revealed === 0}
                  <li class="px-6 py-8 font-sans text-sm text-ink-3 text-center">Reveal the premises one at a time</li>
                {/if}
              </ol>
              {#if revealed > lesson.premises.length}
                <p class="lesson-in font-sans text-sm text-ink-2">{rule.example.explanation}</p>
              {/if}
            </div>

          {:else if step === 2}
            <div class="lesson-in space-y-6">
              <div class="space-y-2">
                <h2 class="font-serif text-2xl text-ink">Which line follows by {rule.name}?</h2>
                <p class="font-sans text-sm text-ink-2">Pick one, then check</p>
              </div>
              <ol class="rounded-xl bg-raised/60 divide-y divide-line font-serif text-xl text-ink">
                {#each lesson.premises as p, i}
                  <li class="grid grid-cols-[48px_1fr] items-center min-h-[52px]">
                    <span class="text-right pr-4 font-sans text-caption text-ink-3 tabular-nums">{i + 1}.</span>
                    <span><LaTeX formula={p} /></span>
                  </li>
                {/each}
              </ol>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Choices">
                {#each lesson.choices as c, i}
                  {@const isPicked = picked === i}
                  {@const win = checked && c.correct && pickedChoice?.correct}
                  {@const miss = checked && isPicked && !c.correct}
                  <button type="button" role="radio" aria-checked={isPicked}
                    disabled={checked}
                    on:click={() => (picked = i)}
                    class="flex items-center justify-between gap-3 min-h-[64px] px-5 rounded-xl border text-left font-serif text-xl cursor-pointer transition-[border-color,background-color,color,opacity,transform] duration-150 active:scale-[0.99] disabled:cursor-default
                      {win ? 'border-ink bg-ink text-paper' : miss ? 'border-line-strong bg-card text-ink-3 line-through' : isPicked ? 'border-ink bg-card text-ink ring-1 ring-ink' : 'border-line-strong bg-card text-ink hover:border-ink-3'}">
                    <span><LaTeX formula={c.formula} /></span>
                    {#if win}{@html check}{/if}
                  </button>
                {/each}
              </div>
              {#if checked && pickedChoice}
                <p class="lesson-in font-sans text-sm {pickedChoice.correct ? 'text-ink' : 'text-ink-2'}" role="status">
                  {#if pickedChoice.correct}
                    Right. {rule.example.explanation}
                  {:else}
                    Not this one. There is a row of the truth table where every given line is true and this one is false, so it does not follow.
                  {/if}
                </p>
              {/if}
            </div>

          {:else if step === 3}
            <div class="lesson-in space-y-6">
              <div class="space-y-2">
                <h2 class="font-serif text-2xl text-ink">Now you write it</h2>
                <p class="font-sans text-sm text-ink-2">
                  Same rule, bigger pieces. Here <span class="font-serif text-base text-ink">{#if PIECE}<LaTeX formula={PIECE} />{/if}</span>
                  sits where the rule had <span class="font-serif text-base text-ink">P</span>. Write the line {rule.name} gives you.
                </p>
              </div>
              <ol class="rounded-xl border border-line divide-y divide-line font-serif text-xl text-ink overflow-hidden">
                {#each lesson.practice.premises as p, i}
                  <li class="grid grid-cols-[48px_1fr_auto] items-center min-h-[56px]">
                    <span class="text-right pr-4 font-sans text-caption text-ink-3 tabular-nums">{i + 1}.</span>
                    <span><LaTeX formula={p} /></span>
                    <span class="pr-6 margin-note text-ink-3">Premise</span>
                  </li>
                {/each}
                <li class="grid grid-cols-[48px_1fr_auto] items-center min-h-[72px] bg-raised/50">
                  <span class="text-right pr-4 font-sans text-caption text-ink-3 tabular-nums">{lesson.practice.premises.length + 1}.</span>
                  <input
                    bind:this={practiceEl}
                    bind:value={practiceInput}
                    on:input={handlePracticeInput}
                    on:keydown={(e) => { if (e.key === 'Enter' && practiceInput.trim() && lesson) checkPractice(lesson); }}
                    aria-label="Your line"
                    placeholder="Type your line"
                    class="field h-11 font-serif text-xl"
                  />
                  <span class="pl-4 pr-6 margin-note">{lesson.practice.premises.map((_, i) => i + 1).join(', ')}  {rule.abbreviation}</span>
                </li>
              </ol>
              {#if practiceResult}
                <p class="lesson-in flex items-center gap-2 font-sans text-sm {practiceResult.ok ? 'text-ink' : 'text-ink-2'}" role="status">
                  {#if practiceResult.ok}{@html check}{/if}
                  {practiceResult.message}
                </p>
              {/if}
              {#if practiceTries > 0 && !practiceResult?.ok}
                {#if showAnswer}
                  <p class="font-sans text-sm text-ink-2">One answer: <span class="font-serif text-lg text-ink"><LaTeX formula={lesson.practice.answer} /></span></p>
                {:else}
                  <button type="button" class="link font-sans text-sm" on:click={() => (showAnswer = true)}>Show an answer</button>
                {/if}
              {/if}
            </div>
          {/if}
        </div>

        <!-- Action bar -->
        <footer class="flex items-center justify-between gap-3 px-6 sm:px-10 py-4 border-t border-line bg-raised/40">
          {#if finished}
            <button type="button" class="btn btn-ghost" on:click={() => activeTabStore.set('wordle')}>Try today’s problem</button>
            {#if nextId}
              <button type="button" class="btn btn-primary" on:click={goNext}>Next: {nextName} {@html arrow}</button>
            {:else}
              <span class="font-sans text-sm text-ink-2">All 19 rules learned</span>
            {/if}
          {:else}
            <button type="button" class="btn btn-ghost {step === 0 ? 'invisible' : ''}" on:click={() => (step = Math.max(0, step - 1))}>Back</button>
            {#if step === 0}
              <button type="button" class="btn btn-primary" on:click={() => (step = 1)}>Continue</button>
            {:else if step === 1}
              {#if revealed <= lesson.premises.length}
                <button type="button" class="btn btn-primary" on:click={() => (revealed += 1)}>
                  {revealed < lesson.premises.length ? 'Show next line' : 'Apply the rule'}
                </button>
              {:else}
                <button type="button" class="btn btn-primary" on:click={() => (step = 2)}>Continue</button>
              {/if}
            {:else if step === 2}
              {#if !checked}
                <button type="button" class="btn btn-primary" disabled={picked === null} on:click={() => (checked = true)}>Check</button>
              {:else if pickedChoice?.correct}
                <button type="button" class="btn btn-primary" on:click={toPractice}>Continue</button>
              {:else}
                <button type="button" class="btn btn-primary" on:click={() => { picked = null; checked = false; }}>Try again</button>
              {/if}
            {:else if step === 3}
              <button type="button" class="btn btn-primary" disabled={!practiceInput.trim()} on:click={() => lesson && checkPractice(lesson)}>Check</button>
            {/if}
          {/if}
        </footer>
      {/if}
    </article>
  </div>
</div>

<style>
  @keyframes lesson-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: none; }
  }
  .lesson-in { animation: lesson-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both; }
  @media (prefers-reduced-motion: reduce) {
    .lesson-in { animation: none; }
  }
</style>
