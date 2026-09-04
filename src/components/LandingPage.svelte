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

  <!-- Animated Logic Symbols Pattern Background (Subtle & GPU-Optimized) -->
  <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
    <!-- Seamless Drifting Logic Symbol Grid -->
    <div class="logic-pattern-grid absolute -top-60 -left-60 w-[calc(100%+480px)] h-[calc(100%+480px)] opacity-[0.075] dark:opacity-[0.11]">
      <svg width="100%" height="100%" fill="none" class="text-neutral-900 dark:text-neutral-100">
        <defs>
          <pattern id="logic-symbol-pattern" width="240" height="240" patternUnits="userSpaceOnUse">
            <!-- Row 1 -->
            <text x="30" y="36" font-family="'Newsreader', Georgia, serif" font-size="22" font-style="italic" fill="currentColor" text-anchor="middle">⊢</text>
            <text x="110" y="38" font-family="'Newsreader', Georgia, serif" font-size="22" fill="currentColor" text-anchor="middle">⊃</text>
            <text x="190" y="38" font-family="'Newsreader', Georgia, serif" font-size="20" fill="currentColor" text-anchor="middle">∧</text>
            
            <!-- Row 2 -->
            <text x="70" y="98" font-family="'Newsreader', Georgia, serif" font-size="22" fill="currentColor" text-anchor="middle">¬</text>
            <text x="150" y="98" font-family="'Newsreader', Georgia, serif" font-size="24" fill="currentColor" text-anchor="middle">≡</text>
            <text x="225" y="98" font-family="'Newsreader', Georgia, serif" font-size="22" fill="currentColor" text-anchor="middle">∴</text>
            
            <!-- Row 3 -->
            <text x="35" y="158" font-family="'Newsreader', Georgia, serif" font-size="24" fill="currentColor" text-anchor="middle">•</text>
            <text x="115" y="158" font-family="'Newsreader', Georgia, serif" font-size="20" fill="currentColor" text-anchor="middle">∨</text>
            <text x="195" y="158" font-family="'Newsreader', Georgia, serif" font-size="20" fill="currentColor" text-anchor="middle">→</text>
            
            <!-- Row 4 -->
            <text x="75" y="218" font-family="'Newsreader', Georgia, serif" font-size="22" fill="currentColor" text-anchor="middle">⊥</text>
            <text x="155" y="218" font-family="'Newsreader', Georgia, serif" font-size="20" fill="currentColor" text-anchor="middle">↔</text>
            <text x="225" y="218" font-family="'Newsreader', Georgia, serif" font-size="22" fill="currentColor" text-anchor="middle">⊨</text>
            <text x="10" y="218" font-family="'Newsreader', Georgia, serif" font-size="22" fill="currentColor" text-anchor="middle">~</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#logic-symbol-pattern)" />
      </svg>
    </div>

    <!-- Floating Ambient Logic Glyphs (Subtle, slow harmonic drift) -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="floating-glyph-1 absolute top-[18%] left-[10%] text-2xl sm:text-3xl font-serif text-neutral-900 dark:text-neutral-100 opacity-[0.075] dark:opacity-[0.12]">
        ∴
      </div>
      <div class="floating-glyph-2 absolute top-[28%] right-[12%] text-2xl sm:text-3xl font-serif text-neutral-900 dark:text-neutral-100 opacity-[0.07] dark:opacity-[0.11]">
        ⊢
      </div>
      <div class="floating-glyph-3 absolute bottom-[35%] left-[8%] text-3xl font-serif text-neutral-900 dark:text-neutral-100 opacity-[0.07] dark:opacity-[0.10]">
        ≡
      </div>
      <div class="floating-glyph-1 absolute bottom-[28%] right-[10%] text-2xl font-serif text-neutral-900 dark:text-neutral-100 opacity-[0.075] dark:opacity-[0.12]">
        ⊃
      </div>
      <div class="floating-glyph-2 absolute top-[60%] left-[18%] text-xl font-serif text-neutral-900 dark:text-neutral-100 opacity-[0.06] dark:opacity-[0.09]">
        ¬
      </div>
      <div class="floating-glyph-3 absolute top-[45%] right-[20%] text-xl font-serif text-neutral-900 dark:text-neutral-100 opacity-[0.06] dark:opacity-[0.09]">
        ∧
      </div>
    </div>
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

      <!-- Right: Theme Toggle -->
      <div class="flex items-center gap-2 text-xs font-sans">
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
    <p class="font-sans text-neutral-500 dark:text-neutral-400 text-sm sm:text-base tracking-wide text-center max-w-xl mx-auto mb-10">
      by A. Arcega
    </p>

    <!-- Action Button Row -->
    <div class="flex items-center justify-center mb-16 sm:mb-24">
      <button
        type="button"
        on:click={() => dispatch('navigate', 'wordle')}
        class="px-6 py-2.5 rounded-full text-xs font-sans tracking-wider uppercase bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 transition-all shadow-md cursor-pointer flex items-center gap-2"
      >
        <span>Begin Daily Deduction</span>
        <span>→</span>
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

<style>
  @keyframes driftPattern {
    0% {
      transform: translate3d(0, 0, 0);
    }
    100% {
      transform: translate3d(-240px, -240px, 0);
    }
  }

  .logic-pattern-grid {
    animation: driftPattern 80s linear infinite;
    will-change: transform;
  }

  @keyframes floatSlow1 {
    0%, 100% {
      transform: translate3d(0, 0, 0) rotate(0deg);
    }
    50% {
      transform: translate3d(10px, -18px, 0) rotate(3deg);
    }
  }

  @keyframes floatSlow2 {
    0%, 100% {
      transform: translate3d(0, 0, 0) rotate(0deg);
    }
    50% {
      transform: translate3d(-12px, -22px, 0) rotate(-4deg);
    }
  }

  @keyframes floatSlow3 {
    0%, 100% {
      transform: translate3d(0, 0, 0) rotate(0deg);
    }
    50% {
      transform: translate3d(12px, 16px, 0) rotate(4deg);
    }
  }

  .floating-glyph-1 {
    animation: floatSlow1 24s ease-in-out infinite;
    will-change: transform;
  }

  .floating-glyph-2 {
    animation: floatSlow2 30s ease-in-out infinite;
    will-change: transform;
  }

  .floating-glyph-3 {
    animation: floatSlow3 27s ease-in-out infinite;
    will-change: transform;
  }

  @media (prefers-reduced-motion: reduce) {
    .logic-pattern-grid,
    .floating-glyph-1,
    .floating-glyph-2,
    .floating-glyph-3 {
      animation: none !important;
    }
  }
</style>
