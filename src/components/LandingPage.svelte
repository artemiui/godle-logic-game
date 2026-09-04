<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { themeStore, toggleTheme } from '../stores/theme';
  import type { ActiveTab } from '../stores/auth';

  const dispatch = createEventDispatcher<{
    enter: void;
    navigate: ActiveTab;
  }>();
</script>

<div class="fixed inset-0 z-50 bg-[#FAFAFA] dark:bg-[#0A0A0A] text-neutral-900 dark:text-neutral-100 overflow-y-auto overflow-x-hidden flex flex-col justify-between font-sans transition-colors duration-300 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-950">
  
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
      <ellipse cx="720" cy="360" rx="200" ry="120" stroke-width="1" stroke-dasharray="4 6" />
      <ellipse cx="720" cy="360" rx="420" ry="250" stroke-width="1" stroke-dasharray="4 6" />
      <ellipse cx="720" cy="360" rx="680" ry="400" stroke-width="1" stroke-dasharray="4 6" />
    </svg>
  </div>

  <!-- Minimalist Top Bar -->
  <header class="relative z-20 border-b border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md bg-white/40 dark:bg-neutral-950/40">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
      <!-- Left: Logo -->
      <div class="flex items-center gap-3">
        <span class="font-sans font-black text-xl tracking-tight text-neutral-950 dark:text-white">
          gödle
        </span>
      </div>

      <!-- Right: Theme & Enter CTA -->
      <div class="flex items-center gap-2 sm:gap-3 text-xs font-sans">
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
  <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 max-w-6xl mx-auto w-full">
    
    <!-- Central Hero Masthead: same heavy sans font as the gödle brand -->
    <h1 class="font-sans font-black text-6xl sm:text-8xl lg:text-9xl tracking-tight text-neutral-950 dark:text-white leading-[0.9] text-center mb-6 select-none">
      gödle
    </h1>

    <!-- Minimalist Subtitle -->
    <p class="font-serif italic text-neutral-600 dark:text-neutral-400 text-lg sm:text-2xl text-center max-w-xl mx-auto leading-relaxed mb-10">
      Formal propositional deduction, distilled.
    </p>

    <!-- Action Button Row -->
    <div class="flex flex-wrap items-center justify-center gap-3 mb-16 sm:mb-24">
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
          <span>Track Daily Streaks</span>
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
          <span>Global Leaderboard</span>
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
          <span>Automated BFS Solver</span>
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
          <span>Interactive Practice</span>
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
        Irving M. Copi
      </div>
    </div>
  </footer>

</div>
