<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { themeStore, toggleTheme } from '../stores/theme';
  import type { ActiveTab } from '../stores/auth';

  const dispatch = createEventDispatcher<{
    enter: void;
    navigate: ActiveTab;
  }>();

  // Step-by-step interactive tableau state
  let selectedTree: 'syllogism' | 'tautology' = 'syllogism';
  let activeStep: number = 6;
  const maxStepsSyllogism = 6;
  const maxStepsTautology = 7;

  let isAutoPlaying = false;
  let autoplayInterval: ReturnType<typeof setInterval> | null = null;

  $: maxSteps = selectedTree === 'syllogism' ? maxStepsSyllogism : maxStepsTautology;

  function setTree(tree: 'syllogism' | 'tautology') {
    selectedTree = tree;
    activeStep = tree === 'syllogism' ? maxStepsSyllogism : maxStepsTautology;
    stopAutoplay();
  }

  function stepForward() {
    if (activeStep < maxSteps) {
      activeStep += 1;
    } else {
      activeStep = 1;
    }
  }

  function stepBack() {
    if (activeStep > 1) {
      activeStep -= 1;
    }
  }

  function resetSteps() {
    activeStep = 1;
    stopAutoplay();
  }

  function toggleAutoplay() {
    if (isAutoPlaying) {
      stopAutoplay();
    } else {
      isAutoPlaying = true;
      if (activeStep >= maxSteps) activeStep = 0;
      autoplayInterval = setInterval(() => {
        if (activeStep < maxSteps) {
          activeStep += 1;
        } else {
          stopAutoplay();
        }
      }, 1200);
    }
  }

  function stopAutoplay() {
    isAutoPlaying = false;
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      autoplayInterval = null;
    }
  }

  let mounted = false;
  onMount(() => {
    mounted = true;
    return () => {
      stopAutoplay();
    };
  });
</script>

<div class="fixed inset-0 z-50 bg-[#FAFAFA] dark:bg-[#0A0A0A] text-neutral-900 dark:text-neutral-100 overflow-y-auto overflow-x-hidden flex flex-col font-sans transition-colors duration-300 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-950">
  
  <!-- Subtle Ambient Radial Glow (Next.js & Polkadot reference) -->
  <div class="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
    <div class="w-[850px] h-[850px] rounded-full bg-neutral-200/40 dark:bg-neutral-800/20 blur-[140px] -translate-y-24"></div>
  </div>

  <!-- Perspective Vanishing Rays (Delphi & Polkadot reference) -->
  <div class="pointer-events-none fixed inset-0 z-0 opacity-[0.035] dark:opacity-[0.06] overflow-hidden">
    <svg viewBox="0 0 1440 900" class="w-full h-full" preserveAspectRatio="none" fill="none" stroke="currentColor">
      <line x1="720" y1="360" x2="0" y2="0" stroke-width="1" />
      <line x1="720" y1="360" x2="360" y2="0" stroke-width="1" />
      <line x1="720" y1="360" x2="720" y2="0" stroke-width="1" />
      <line x1="720" y1="360" x2="1080" y2="0" stroke-width="1" />
      <line x1="720" y1="360" x2="1440" y2="0" stroke-width="1" />
      <line x1="720" y1="360" x2="0" y2="900" stroke-width="1" />
      <line x1="720" y1="360" x2="480" y2="900" stroke-width="1" />
      <line x1="720" y1="360" x2="960" y2="900" stroke-width="1" />
      <line x1="720" y1="360" x2="1440" y2="900" stroke-width="1" />
      <!-- Concentric perspective rings -->
      <ellipse cx="720" cy="360" rx="200" ry="120" stroke-width="1" stroke-dasharray="4 6" />
      <ellipse cx="720" cy="360" rx="420" ry="250" stroke-width="1" stroke-dasharray="4 6" />
      <ellipse cx="720" cy="360" rx="680" ry="400" stroke-width="1" stroke-dasharray="4 6" />
    </svg>
  </div>

  <!-- Minimalist Top Bar -->
  <header class="relative z-20 border-b border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md bg-white/40 dark:bg-neutral-950/40">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
      <!-- Left: Logo & Edition Pill -->
      <div class="flex items-center gap-3">
        <span class="font-sans font-black text-xl tracking-tight text-neutral-950 dark:text-white">
          gödle
        </span>
        <span class="inline-block w-[1px] h-3 bg-neutral-300 dark:bg-neutral-700"></span>
        <span class="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-600 dark:text-neutral-400">
          Analytic Tableau
        </span>
      </div>

      <!-- Right: Copi Pill, Theme & Enter CTA -->
      <div class="flex items-center gap-2 sm:gap-3 text-xs font-sans">
        <span class="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
          Irving M. Copi · 19 Rules
        </span>

        <!-- Theme Toggle -->
        <button
          type="button"
          on:click={toggleTheme}
          title="Toggle light/dark appearance"
          class="p-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
        >
          {#if $themeStore === 'dark'}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          {:else}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          {/if}
        </button>

        <!-- Enter App Button -->
        <button
          type="button"
          on:click={() => dispatch('enter')}
          class="group px-4 py-1.5 rounded-full text-xs font-sans tracking-wide bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span>Enter gödle</span>
          <span class="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Hero Content Section -->
  <main class="relative z-10 flex-1 flex flex-col items-center px-4 pt-12 pb-16 sm:pt-16 sm:pb-24 max-w-6xl mx-auto w-full">
    
    <!-- Editorial Category Tag -->
    <div class="mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm text-[10px] font-sans tracking-[0.2em] uppercase text-neutral-600 dark:text-neutral-400">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>Semantic Tableau Decision Procedure</span>
    </div>

    <!-- Central Hero Masthead -->
    <h1 class="font-serif text-5xl sm:text-7xl lg:text-8xl tracking-tight text-neutral-950 dark:text-white font-normal text-center leading-[0.95] mb-5">
      Truth Trees.
    </h1>

    <!-- Minimalist Subtitle -->
    <p class="font-serif italic text-neutral-600 dark:text-neutral-400 text-base sm:text-xl text-center max-w-xl mx-auto leading-relaxed mb-8">
      Deconstruct compound propositions to their foundational atoms. Every branch that closes reveals an incontrovertible deductive certainty.
    </p>

    <!-- Quick Action Button Row -->
    <div class="flex flex-wrap items-center justify-center gap-3 mb-14">
      <button
        type="button"
        on:click={() => dispatch('navigate', 'wordle')}
        class="px-6 py-2.5 rounded-full text-xs font-sans tracking-wider uppercase bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 transition-all shadow-md cursor-pointer flex items-center gap-2"
      >
        <span>Begin Daily Deduction</span>
        <span>→</span>
      </button>

      <button
        type="button"
        on:click={() => dispatch('navigate', 'sandbox')}
        class="px-5 py-2.5 rounded-full text-xs font-sans tracking-wider uppercase border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer bg-white/40 dark:bg-neutral-900/40 backdrop-blur-sm"
      >
        Open Proof Sandbox
      </button>

      <button
        type="button"
        on:click={() => dispatch('navigate', 'tutorial')}
        class="px-5 py-2.5 rounded-full text-xs font-sans tracking-wider uppercase border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
      >
        19 Rules Codex
      </button>
    </div>

    <!-- ================================================================= -->
    <!-- THE TRUTH TREE (Analytic Tableau) INTERACTIVE EXHIBIT            -->
    <!-- Referencing Image 0, Image 2, and Kusama geometric layout        -->
    <!-- ================================================================= -->
    <div class="w-full max-w-4xl border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md shadow-xl overflow-hidden mb-16 transition-all">
      
      <!-- Tableau Control Header -->
      <div class="px-4 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs font-sans bg-neutral-50/50 dark:bg-neutral-900/40">
        <!-- Tree Presets -->
        <div class="flex items-center gap-1.5 bg-neutral-200/50 dark:bg-neutral-800/60 p-1 rounded-lg">
          <button
            type="button"
            on:click={() => setTree('syllogism')}
            class="px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer {
              selectedTree === 'syllogism'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }"
          >
            Syllogistic Proof Tableau
          </button>
          <button
            type="button"
            on:click={() => setTree('tautology')}
            class="px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer {
              selectedTree === 'tautology'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }"
          >
            Tautology Verification Tree
          </button>
        </div>

        <!-- Stepper Controls -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={resetSteps}
            title="Reset to step 1"
            class="px-2 py-1 border border-neutral-200 dark:border-neutral-800 rounded hover:border-neutral-400 dark:hover:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            ↺
          </button>
          <button
            type="button"
            on:click={stepBack}
            disabled={activeStep <= 1}
            title="Previous step"
            class="px-2 py-1 border border-neutral-200 dark:border-neutral-800 rounded hover:border-neutral-400 dark:hover:border-neutral-600 disabled:opacity-30 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            ◀
          </button>
          <span class="font-mono text-[11px] text-neutral-600 dark:text-neutral-400 px-1">
            {activeStep} / {maxSteps}
          </span>
          <button
            type="button"
            on:click={stepForward}
            disabled={activeStep >= maxSteps}
            title="Next step"
            class="px-2 py-1 border border-neutral-200 dark:border-neutral-800 rounded hover:border-neutral-400 dark:hover:border-neutral-600 disabled:opacity-30 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            ▶
          </button>
          <button
            type="button"
            on:click={toggleAutoplay}
            class="ml-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-[11px] hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer {
              isAutoPlaying ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950' : 'text-neutral-600 dark:text-neutral-400'
            }"
          >
            {isAutoPlaying ? '⏸ Pause' : '▶ Animate'}
          </button>
        </div>
      </div>

      <!-- Tree Visualization Canvas -->
      <div class="p-6 sm:p-10 flex flex-col items-center justify-center min-h-[440px] select-none overflow-x-auto">
        
        {#if selectedTree === 'syllogism'}
          <!-- ============================================================== -->
          <!-- TREE 1: SYLLOGISTIC DISJUNCTIVE TABLEAU                        -->
          <!-- Based on reference image: (P ∨ Q), (P → R), (¬Q ∨ R) ⊢ R       -->
          <!-- ============================================================== -->
          <div class="relative w-full max-w-[620px] flex flex-col items-center text-center">
            
            <!-- Root Premises Block -->
            <div class="space-y-1.5 mb-2 font-serif text-sm sm:text-base">
              <!-- Premise 1 -->
              <div class="transition-opacity duration-500 {activeStep >= 1 ? 'opacity-100' : 'opacity-20'} flex items-center justify-between gap-6 sm:gap-12 px-3 py-0.5 rounded border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800">
                <span class="text-xs font-mono text-neutral-500 w-8 text-left">(1)</span>
                <span class="font-bold tracking-wide">P ∨ Q</span>
                <span class="text-xs text-neutral-500 font-sans tracking-wide">[initial premise]</span>
                <span class="text-xs font-mono text-emerald-600 dark:text-emerald-400 w-4 text-right">✓</span>
              </div>
              <!-- Premise 2 -->
              <div class="transition-opacity duration-500 {activeStep >= 1 ? 'opacity-100' : 'opacity-20'} flex items-center justify-between gap-6 sm:gap-12 px-3 py-0.5 rounded border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800">
                <span class="text-xs font-mono text-neutral-500 w-8 text-left">(2)</span>
                <span class="font-bold tracking-wide">P → R</span>
                <span class="text-xs text-neutral-500 font-sans tracking-wide">[initial premise]</span>
                <span class="text-xs font-mono text-emerald-600 dark:text-emerald-400 w-4 text-right">✓</span>
              </div>
              <!-- Premise 3 -->
              <div class="transition-opacity duration-500 {activeStep >= 1 ? 'opacity-100' : 'opacity-20'} flex items-center justify-between gap-6 sm:gap-12 px-3 py-0.5 rounded border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800">
                <span class="text-xs font-mono text-neutral-500 w-8 text-left">(3)</span>
                <span class="font-bold tracking-wide">¬Q ∨ R</span>
                <span class="text-xs text-neutral-500 font-sans tracking-wide">[initial premise]</span>
                <span class="text-xs font-mono text-emerald-600 dark:text-emerald-400 w-4 text-right">✓</span>
              </div>
              <!-- Negated Conclusion -->
              <div class="transition-opacity duration-500 {activeStep >= 2 ? 'opacity-100' : 'opacity-20'} flex items-center justify-between gap-6 sm:gap-12 px-3 py-0.5 rounded border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 text-neutral-950 dark:text-white font-semibold">
                <span class="text-xs font-mono text-neutral-500 w-8 text-left">(4)</span>
                <span class="tracking-wide">¬R</span>
                <span class="text-xs text-neutral-500 font-sans tracking-wide">[negate conclusion]</span>
                <span class="text-xs font-mono text-neutral-400 w-4 text-right"></span>
              </div>
            </div>

            <!-- SVG Branching Tree Diagram -->
            <svg viewBox="0 0 540 240" class="w-full max-w-[540px] overflow-visible my-2" fill="none">
              <!-- Trunk apex connector -->
              <line x1="270" y1="0" x2="270" y2="20" stroke="currentColor" class="text-neutral-300 dark:text-neutral-700" stroke-width="1.5" />

              <!-- Level 1 Branching from (1) P ∨ Q -->
              <g class="transition-opacity duration-500 {activeStep >= 3 ? 'opacity-100' : 'opacity-0'}">
                <line x1="270" y1="20" x2="140" y2="70" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="270" y1="20" x2="400" y2="70" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <circle cx="270" cy="20" r="3" fill="currentColor" class="text-neutral-900 dark:text-neutral-100" />
                
                <!-- Left node: P -->
                <text x="140" y="90" text-anchor="middle" fill="currentColor" class="font-serif font-bold text-base text-neutral-950 dark:text-white">P</text>
                <text x="75" y="90" text-anchor="end" fill="currentColor" class="font-mono text-[10px] text-neutral-500">(5)</text>

                <!-- Right node: Q -->
                <text x="400" y="90" text-anchor="middle" fill="currentColor" class="font-serif font-bold text-base text-neutral-950 dark:text-white">Q</text>
                <text x="490" y="90" text-anchor="start" fill="currentColor" class="font-sans text-[10px] text-neutral-500">[(∨) to (1)]</text>
              </g>

              <!-- Level 2 Branching on Left (P): from (2) P → R => branches ¬P and R -->
              <g class="transition-opacity duration-500 {activeStep >= 4 ? 'opacity-100' : 'opacity-0'}">
                <line x1="140" y1="100" x2="80" y2="140" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="140" y1="100" x2="200" y2="140" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                
                <!-- ¬P -->
                <text x="80" y="160" text-anchor="middle" fill="currentColor" class="font-serif text-sm">¬P</text>
                <!-- R -->
                <text x="200" y="160" text-anchor="middle" fill="currentColor" class="font-serif text-sm">R</text>
                <text x="30" y="160" text-anchor="end" fill="currentColor" class="font-mono text-[10px] text-neutral-500">(6)</text>
              </g>

              <!-- Level 2 Branching on Right (Q): from (2) P → R => branches ¬P and R -->
              <g class="transition-opacity duration-500 {activeStep >= 4 ? 'opacity-100' : 'opacity-0'}">
                <line x1="400" y1="100" x2="340" y2="140" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="400" y1="100" x2="460" y2="140" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                
                <!-- ¬P -->
                <text x="340" y="160" text-anchor="middle" fill="currentColor" class="font-serif text-sm">¬P</text>
                <!-- R -->
                <text x="460" y="160" text-anchor="middle" fill="currentColor" class="font-serif text-sm">R</text>
                <text x="490" y="160" text-anchor="start" fill="currentColor" class="font-sans text-[10px] text-neutral-500">[(→) to (2)]</text>
              </g>

              <!-- Contradiction closures on Level 2 -->
              <g class="transition-opacity duration-500 {activeStep >= 5 ? 'opacity-100' : 'opacity-0'} font-bold font-mono text-sm">
                <!-- Under ¬P (clashes with P at (5)) -->
                <text x="80" y="182" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400">×</text>
                <!-- Under R (clashes with ¬R at (4)) -->
                <text x="200" y="182" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400">×</text>
                <!-- Under R on right (clashes with ¬R at (4)) -->
                <text x="460" y="182" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400">×</text>
              </g>

              <!-- Level 3 Branching under remaining ¬P on right from (3) ¬Q ∨ R -->
              <g class="transition-opacity duration-500 {activeStep >= 6 ? 'opacity-100' : 'opacity-0'}">
                <line x1="340" y1="170" x2="300" y2="200" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="340" y1="170" x2="380" y2="200" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                
                <text x="300" y="218" text-anchor="middle" fill="currentColor" class="font-serif text-sm">¬Q</text>
                <text x="380" y="218" text-anchor="middle" fill="currentColor" class="font-serif text-sm">R</text>

                <!-- Final Contradiction closures: ¬Q clashes with Q, R clashes with ¬R -->
                <text x="300" y="235" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">×</text>
                <text x="380" y="235" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">×</text>

                <text x="490" y="218" text-anchor="start" fill="currentColor" class="font-sans text-[10px] text-neutral-500">[(∨) to (3)]</text>
              </g>
            </svg>

            <!-- Status banner at bottom of tree -->
            <div class="mt-4 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-sans text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-2">
              {#if activeStep < 6}
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Branching universe under evaluation... (Step {activeStep} of {maxSteps})</span>
              {:else}
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="font-medium text-neutral-900 dark:text-white">All 4 branches closed with contradiction (×) · Theorem is universally valid (Q.E.D.)</span>
              {/if}
            </div>

          </div>

        {:else}
          <!-- ============================================================== -->
          <!-- TREE 2: TAUTOLOGY EQUIVALENCE TABLEAU                          -->
          <!-- Based on reference image: ¬(((P ∧ Q) → R) ↔ (P → (¬Q ∨ R)))    -->
          <!-- ============================================================== -->
          <div class="relative w-full max-w-[660px] flex flex-col items-center text-center">
            
            <!-- Root Formula -->
            <div class="mb-4 font-serif text-sm sm:text-base">
              <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 font-bold tracking-wide">
                <span>¬(((P ∧ Q) → R) ↔ (P → (¬Q ∨ R)))</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-mono text-xs">✓</span>
              </div>
            </div>

            <!-- Dual Trunk Branching Diagram -->
            <svg viewBox="0 0 600 240" class="w-full max-w-[600px] overflow-visible" fill="none">
              <!-- Root bifurcator -->
              <g class="transition-opacity duration-500 {activeStep >= 2 ? 'opacity-100' : 'opacity-0'}">
                <line x1="300" y1="0" x2="160" y2="45" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="300" y1="0" x2="440" y2="45" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <circle cx="300" cy="0" r="3" fill="currentColor" class="text-neutral-900 dark:text-neutral-100" />
              </g>

              <!-- Left Branch: (P ∧ Q) → R, ¬(P → (¬Q ∨ R)) -->
              <g class="transition-opacity duration-500 {activeStep >= 3 ? 'opacity-100' : 'opacity-0'}">
                <text x="160" y="65" text-anchor="middle" fill="currentColor" class="font-serif text-xs sm:text-sm font-semibold">(P ∧ Q) → R ✓</text>
                <text x="160" y="85" text-anchor="middle" fill="currentColor" class="font-serif text-xs sm:text-sm">¬(P → (¬Q ∨ R)) ✓</text>
                <line x1="160" y1="95" x2="160" y2="115" stroke="currentColor" class="text-neutral-300 dark:text-neutral-700" stroke-width="1.5" />
                <text x="160" y="130" text-anchor="middle" fill="currentColor" class="font-serif text-xs">P, Q, ¬R</text>
              </g>

              <!-- Right Branch: ¬((P ∧ Q) → R), P → (¬Q ∨ R) -->
              <g class="transition-opacity duration-500 {activeStep >= 3 ? 'opacity-100' : 'opacity-0'}">
                <text x="440" y="65" text-anchor="middle" fill="currentColor" class="font-serif text-xs sm:text-sm font-semibold">¬((P ∧ Q) → R) ✓</text>
                <text x="440" y="85" text-anchor="middle" fill="currentColor" class="font-serif text-xs sm:text-sm">P → (¬Q ∨ R) ✓</text>
                <line x1="440" y1="95" x2="440" y2="115" stroke="currentColor" class="text-neutral-300 dark:text-neutral-700" stroke-width="1.5" />
                <text x="440" y="130" text-anchor="middle" fill="currentColor" class="font-serif text-xs">P ∧ Q ✓, ¬R</text>
              </g>

              <!-- Sub-branching Left -->
              <g class="transition-opacity duration-500 {activeStep >= 5 ? 'opacity-100' : 'opacity-0'}">
                <line x1="160" y1="140" x2="110" y2="175" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="160" y1="140" x2="210" y2="175" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <text x="110" y="195" text-anchor="middle" fill="currentColor" class="font-serif text-xs">¬(P ∧ Q) ✓</text>
                <text x="210" y="195" text-anchor="middle" fill="currentColor" class="font-serif text-xs">R</text>
                <!-- Clashing closure on R (clashes with ¬R) -->
                <text x="210" y="215" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">×</text>
              </g>

              <!-- Sub-branching Left De Morgan: ¬P and ¬Q -->
              <g class="transition-opacity duration-500 {activeStep >= 6 ? 'opacity-100' : 'opacity-0'}">
                <line x1="110" y1="200" x2="80" y2="220" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="110" y1="200" x2="140" y2="220" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <text x="80" y="235" text-anchor="middle" fill="currentColor" class="font-serif text-xs">¬P</text>
                <text x="140" y="235" text-anchor="middle" fill="currentColor" class="font-serif text-xs">¬Q</text>
                <!-- Closures: ¬P clashes with P, ¬Q clashes with Q -->
                <text x="80" y="250" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">×</text>
                <text x="140" y="250" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">×</text>
              </g>

              <!-- Sub-branching Right: ¬P and ¬Q ∨ R -->
              <g class="transition-opacity duration-500 {activeStep >= 5 ? 'opacity-100' : 'opacity-0'}">
                <line x1="440" y1="140" x2="390" y2="175" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="440" y1="140" x2="490" y2="175" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <text x="390" y="195" text-anchor="middle" fill="currentColor" class="font-serif text-xs">¬P</text>
                <!-- Closure on ¬P (clashes with P) -->
                <text x="390" y="215" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">×</text>
                <text x="490" y="195" text-anchor="middle" fill="currentColor" class="font-serif text-xs">¬Q ∨ R ✓</text>
              </g>

              <!-- Sub-branching Right Disjunction: ¬Q and R -->
              <g class="transition-opacity duration-500 {activeStep >= 7 ? 'opacity-100' : 'opacity-0'}">
                <line x1="490" y1="200" x2="460" y2="220" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <line x1="490" y1="200" x2="520" y2="220" stroke="currentColor" class="text-neutral-400 dark:text-neutral-600" stroke-width="1.5" />
                <text x="460" y="235" text-anchor="middle" fill="currentColor" class="font-serif text-xs">¬Q</text>
                <text x="520" y="235" text-anchor="middle" fill="currentColor" class="font-serif text-xs">R</text>
                <!-- Closures: ¬Q clashes with Q, R clashes with ¬R -->
                <text x="460" y="250" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">×</text>
                <text x="520" y="250" text-anchor="middle" fill="currentColor" class="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">×</text>
              </g>
            </svg>

            <!-- Status banner at bottom of tree -->
            <div class="mt-6 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 text-xs font-sans text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-2">
              {#if activeStep < 7}
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Testing all truth assignments... (Step {activeStep} of {maxSteps})</span>
              {:else}
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="font-medium text-neutral-900 dark:text-white">All branches close with contradiction (×) ∴ Original statement cannot be false ∴ Tautology!</span>
              {/if}
            </div>

          </div>
        {/if}

      </div>

      <!-- Tableau Mathematical Legend Footer -->
      <div class="px-6 py-3 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-wrap items-center justify-between gap-4 text-[11px] font-sans text-neutral-500 dark:text-neutral-400">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1.5"><span class="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> Decomposed statement</span>
          <span class="flex items-center gap-1.5"><span class="text-rose-600 dark:text-rose-400 font-bold font-mono">×</span> Closed contradictory branch</span>
          <span class="flex items-center gap-1.5"><span>/ \</span> Truth-functional bifurcation</span>
        </div>
        <div class="font-mono text-[10px] tracking-wider uppercase">
          Analytic Tableau · Reductio ad Absurdum
        </div>
      </div>

    </div>

    <!-- ================================================================= -->
    <!-- 4-COLUMN FEATURE NAVIGATION (Inspired by Next.js & Kusama images) -->
    <!-- ================================================================= -->
    <div class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Card 1: Daily Challenge -->
      <button
        type="button"
        on:click={() => dispatch('navigate', 'wordle')}
        class="group text-left p-5 rounded-xl border border-neutral-200/90 dark:border-neutral-800/90 bg-white/40 dark:bg-neutral-950/40 hover:bg-white dark:hover:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-[10px] tracking-widest uppercase text-neutral-400 dark:text-neutral-600">01 / MODE</span>
            <span class="text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
          </div>
          <h3 class="font-serif text-lg font-medium text-neutral-950 dark:text-white mb-2">
            Daily gödle
          </h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans">
            Three daily deductive challenges curated from Copi's <em>Symbolic Logic</em>. Novice, Adept, and Master stages.
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center gap-1.5 text-[10px] font-sans font-medium text-neutral-500">
          <span>🔥 Track Daily Streaks</span>
        </div>
      </button>

      <!-- Card 2: Frenzy Mode -->
      <button
        type="button"
        on:click={() => dispatch('navigate', 'frenzy')}
        class="group text-left p-5 rounded-xl border border-neutral-200/90 dark:border-neutral-800/90 bg-white/40 dark:bg-neutral-950/40 hover:bg-white dark:hover:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-[10px] tracking-widest uppercase text-neutral-400 dark:text-neutral-600">02 / SURVIVAL</span>
            <span class="text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
          </div>
          <h3 class="font-serif text-lg font-medium text-neutral-950 dark:text-white mb-2">
            Logic Frenzy
          </h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans">
            Rapid deduction under time pressure. Maintain 3 hearts of life while validating derivations at speed.
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center gap-1.5 text-[10px] font-sans font-medium text-neutral-500">
          <span>⚡ Global Leaderboard</span>
        </div>
      </button>

      <!-- Card 3: Sandbox Mode -->
      <button
        type="button"
        on:click={() => dispatch('navigate', 'sandbox')}
        class="group text-left p-5 rounded-xl border border-neutral-200/90 dark:border-neutral-800/90 bg-white/40 dark:bg-neutral-950/40 hover:bg-white dark:hover:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-[10px] tracking-widest uppercase text-neutral-400 dark:text-neutral-600">03 / FREEFORM</span>
            <span class="text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
          </div>
          <h3 class="font-serif text-lg font-medium text-neutral-950 dark:text-white mb-2">
            Proof Sandbox
          </h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans">
            Author custom premises, test arbitrary conclusions with the automated BFS theorem prover, and share puzzles.
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center gap-1.5 text-[10px] font-sans font-medium text-neutral-500">
          <span>⚖ Automated BFS Solver</span>
        </div>
      </button>

      <!-- Card 4: Rules Tutorial -->
      <button
        type="button"
        on:click={() => dispatch('navigate', 'tutorial')}
        class="group text-left p-5 rounded-xl border border-neutral-200/90 dark:border-neutral-800/90 bg-white/40 dark:bg-neutral-950/40 hover:bg-white dark:hover:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-[10px] tracking-widest uppercase text-neutral-400 dark:text-neutral-600">04 / CODEX</span>
            <span class="text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
          </div>
          <h3 class="font-serif text-lg font-medium text-neutral-950 dark:text-white mb-2">
            19 Copi Rules
          </h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-sans">
            Interactive visual encyclopedia of the 9 elementary rules of inference and 10 equivalence replacement rules.
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center gap-1.5 text-[10px] font-sans font-medium text-neutral-500">
          <span>📖 Interactive Practice</span>
        </div>
      </button>

    </div>

  </main>

  <!-- Editorial Minimalist Footer -->
  <footer class="relative z-10 border-t border-neutral-200/80 dark:border-neutral-800/80 py-8 px-4 text-center text-xs font-sans text-neutral-500">
    <div class="max-w-4xl mx-auto space-y-1.5">
      <div class="font-serif italic text-neutral-700 dark:text-neutral-300 text-sm">
        "Logic is the study of the methods and principles used to distinguish correct from incorrect reasoning."
      </div>
      <div class="text-[11px] text-neutral-500">
        Irving M. Copi · Propositional Symbolic Logic
      </div>
    </div>
  </footer>

</div>
