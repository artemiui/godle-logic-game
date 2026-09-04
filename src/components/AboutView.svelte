<script lang="ts">
  import { activeTabStore } from '../stores/auth';
  import { notationStore } from '../stores/auth';
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-neutral-900 dark:text-neutral-100 font-sans">
  
  <!-- Masthead Header -->
  <div class="border-b border-neutral-200 dark:border-neutral-800 pb-8 mb-12">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-[10px] font-mono tracking-widest uppercase text-neutral-500 dark:text-neutral-400">
        05 / ABOUT & CONTEXT
      </span>
      <span class="w-1 h-1 rounded-full bg-neutral-400"></span>
      <span class="text-[10px] font-mono tracking-widest uppercase text-neutral-500 dark:text-neutral-400">
        v1.0
      </span>
    </div>
    <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-neutral-950 dark:text-white mb-4">
      About gödle
    </h1>
    <p class="font-serif italic text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
      A digital sanctuary for formal natural deduction, propositional reasoning, and Irving M. Copi's nineteen rules of deduction.
    </p>
  </div>

  <!-- Main Editorial Content Columns -->
  <div class="space-y-12 leading-relaxed">

    <!-- Section: The Philosophy of gödle -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-neutral-200/60 dark:border-neutral-800/60 pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl font-medium text-neutral-950 dark:text-white">
          The Purpose
        </h2>
        <span class="text-xs font-mono text-neutral-500">Form & Deduction</span>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          <strong class="font-semibold text-neutral-950 dark:text-white">gödle</strong> is a full-stack propositional symbolic logic web game inspired by the precision and pedagogical clarity of classic logic texts. While traditional puzzle games challenge vocabulary or pattern matching, gödle challenges formal deductive validity: given a set of premises, can you systematically derive a target conclusion using only truth-preserving inference rules?
        </p>
        <p>
          Unlike automated black-box solvers, gödle requires the logician to construct every step of the deduction, citing exact premise lines and selecting appropriate justifications. Every proof step is verified instantaneously against the rigorous syntactic tree grammar of propositional calculus.
        </p>
      </div>
    </section>

    <!-- Section: Inspirations & PHILO 11 -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-neutral-200/60 dark:border-neutral-800/60 pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl font-medium text-neutral-950 dark:text-white">
          Inspiration & Heritage
        </h2>
        <span class="text-xs font-mono text-neutral-500">Copi & UP Diliman</span>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-2">
          <div class="font-mono text-xs font-semibold text-neutral-900 dark:text-white">
            UP Department of Philosophy · PHILO 11
          </div>
          <p class="text-xs text-neutral-600 dark:text-neutral-400">
            Dedicated with profound gratitude to the <strong>Department of Philosophy, College of Social Sciences and Philosophy (CSSP)</strong> at the <strong>University of the Philippines Diliman</strong>, and to the faculty, lecturers, and teaching assistants of <strong>PHILO 11 (Elementary Logic)</strong>.
          </p>
          <p class="text-xs text-neutral-600 dark:text-neutral-400">
            For generations of UP scholars, PHILO 11 has served as an intellectual crucible—cultivating critical rigor, formal reasoning, and the disciplined art of natural deduction. gödle was forged as an interactive homage to the chalkboard proofs, problem sets, and deductive joy experienced inside the lecture halls of Palma Hall.
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-neutral-900 dark:text-white mb-1">
            Irving M. Copi (1917–2002)
          </h3>
          <p>
            The formal deduction engine is modeled directly on Irving M. Copi’s seminal textbooks, <em>Symbolic Logic</em> (1954) and <em>Introduction to Logic</em> (1953). Copi's celebrated nineteen rules of deduction (nine elementary rules of inference and ten rules of replacement) form the exclusive, uncompromised axiomatic foundation of this system.
          </p>
        </div>
      </div>
    </section>

    <!-- Section: The Creator -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-neutral-200/60 dark:border-neutral-800/60 pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl font-medium text-neutral-950 dark:text-white">
          The Creator
        </h2>
        <span class="text-xs font-mono text-neutral-500">Design & Engineering</span>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          Conceived, designed, and developed by <strong class="font-semibold text-neutral-950 dark:text-white">A. Arcega</strong>.
        </p>
        <p>
          Driven by an affinity for formal philosophical logic, minimalist typography (Swiss grotesques, Japanese editorial layouts), and performant web systems, gödle was built to bring the austere beauty of propositional natural deduction to the web without distraction or compromise.
        </p>
        <div class="pt-2">
          <a
            href="https://artemiui.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-xs font-sans font-medium text-neutral-900 dark:text-white transition-colors group"
          >
            <span>artemiui.vercel.app</span>
            <span class="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-neutral-400">↗</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Section: Open Source & Codebase -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-neutral-200/60 dark:border-neutral-800/60 pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl font-medium text-neutral-950 dark:text-white">
          Open Source
        </h2>
        <span class="text-xs font-mono text-neutral-500">Free & Transparent</span>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          gödle is entirely open source. The engine contains a custom recursive-descent Pratt-like formula parser, an AST verification engine, a seeded PRNG problem generator (Mulberry32), and an automated Breadth-First Search (BFS) theorem prover with zero third-party logic dependencies.
        </p>
        <div class="pt-2">
          <a
            href="https://github.com/artemiui/godle-logic-game"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 text-xs font-sans font-medium transition-all shadow-sm group"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub Repository</span>
            <span class="group-hover:translate-x-0.5 transition-transform text-neutral-400">→</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Section: Four Supported Notations -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline pb-6">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl font-medium text-neutral-950 dark:text-white">
          Notation Traditions
        </h2>
        <span class="text-xs font-mono text-neutral-500">Dynamic Typesetting</span>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          Symbolic logic has evolved multiple rich typographical traditions over the past century. gödle dynamically adapts formulas in real time across four major systems via the Settings panel:
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div class="p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="font-bold text-neutral-950 dark:text-white mb-1 font-sans">Copi (Classic)</div>
            <div class="text-neutral-600 dark:text-neutral-400">~ (not), • (and), ⊃ (implies), ≡ (equiv)</div>
          </div>
          <div class="p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="font-bold text-neutral-950 dark:text-white mb-1 font-sans">Modern Mathematical</div>
            <div class="text-neutral-600 dark:text-neutral-400">¬ (not), ∧ (and), → (implies), ↔ (equiv)</div>
          </div>
          <div class="p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="font-bold text-neutral-950 dark:text-white mb-1 font-sans">Whitehead & Russell</div>
            <div class="text-neutral-600 dark:text-neutral-400">~ (not), · (and), ⊃ (implies), ≡ (equiv)</div>
          </div>
          <div class="p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="font-bold text-neutral-950 dark:text-white mb-1 font-sans">Programmer / ASCII</div>
            <div class="text-neutral-600 dark:text-neutral-400">~ (not), & (and), -> (implies), &lt;-> (equiv)</div>
          </div>
        </div>
      </div>
    </section>

  </div>

  <!-- Bottom CTA Actions -->
  <div class="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
    <button
      type="button"
      on:click={() => activeTabStore.set('wordle')}
      class="px-5 py-2.5 rounded-full text-xs font-sans tracking-wider uppercase bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 transition-all shadow-sm cursor-pointer flex items-center gap-2"
    >
      <span>Begin Daily Deduction</span>
      <span>→</span>
    </button>

    <button
      type="button"
      on:click={() => activeTabStore.set('tutorial')}
      class="px-4 py-2 rounded-full text-xs font-sans tracking-wider uppercase border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
    >
      Explore 19 Rules Codex
    </button>
  </div>

</div>
