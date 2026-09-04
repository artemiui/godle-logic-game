<script lang="ts">
  import { activeTabStore } from '../stores/auth';
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-neutral-900 dark:text-neutral-100 font-sans">
  
  <!-- Masthead Header -->
  <div class="border-b border-neutral-200 dark:border-neutral-800 pb-8 mb-12">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-500 dark:text-neutral-400">
        05 / ABOUT & CONTEXT
      </span>
      <span class="w-1 h-1 rounded-full bg-neutral-400"></span>
      <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-500 dark:text-neutral-400">
        v0.5
      </span>
    </div>
    <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-neutral-950 dark:text-white mb-4">
      About gödle
    </h1>
  </div>

  <!-- Main Editorial Content Columns -->
  <div class="space-y-12 leading-relaxed">

    <!-- Section: The Philosophy of gödle -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-neutral-200/60 dark:border-neutral-800/60 pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl font-medium text-neutral-950 dark:text-white">
          The Purpose
        </h2>
        <span class="text-xs font-sans text-neutral-500">Form & Deduction</span>
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

    <!-- Section: Inspirations & PHILO 12 -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-neutral-200/60 dark:border-neutral-800/60 pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl font-medium text-neutral-950 dark:text-white">
          Inspiration & Heritage
        </h2>
        <span class="text-xs font-sans text-neutral-500">Copi & UP Diliman</span>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
        <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-2">
          <div class="font-sans text-xs font-semibold text-neutral-900 dark:text-white">
            UP Department of Philosophy · PHILO 12
          </div>
          <p class="text-xs text-neutral-600 dark:text-neutral-400">
            Dedicated with profound gratitude to the <strong>Department of Philosophy, College of Social Sciences and Philosophy (CSSP)</strong> at the <strong>University of the Philippines Diliman</strong>, and to the faculty, lecturers, and teaching assistants of <strong>PHILO 12 (Intermediate Logic)</strong>.
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
        <span class="text-xs font-sans text-neutral-500">Design & Engineering</span>
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
        <span class="text-xs font-sans text-neutral-500">Free & Transparent</span>
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

    <!-- Section: Roadmap -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline pb-6">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl font-medium text-neutral-950 dark:text-white">
          Roadmap
        </h2>
        <span class="text-xs font-sans text-neutral-500">The Road to v1.0 & Beyond</span>
      </div>
      <div class="md:col-span-8 space-y-5 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          gödle is evolving from an elementary propositional deduction sandbox into an expansive platform for formal philosophical and mathematical reasoning. Following the <span class="font-sans font-medium text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">v0.5</span> preview, our upcoming development cycles focus on persistent identity, competitive ranking, and expanding beyond sentential logic.
        </p>

        <div class="space-y-4">
          <!-- Milestone 1: v1.0 Accounts -->
          <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-sans text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Account System & Cloud Sync</span>
              </span>
              <span class="text-[10px] font-sans font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                v1.0 · In Development
              </span>
            </div>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Full cross-device cloud persistence. Seamlessly synchronize daily deduction streaks, saved theorem libraries, and historical solving statistics. Introduction of verified global Frenzy leaderboards with anti-cheat validation.
            </p>
          </div>

          <!-- Milestone 2: Advanced Logical Systems -->
          <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-sans text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Expanding Beyond Propositional Logic</span>
              </span>
              <span class="text-[10px] font-sans font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/40">
                Post-v1.0 · Research & Design
              </span>
            </div>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-2">
              While propositional calculus tests truth functions of entire statements, philosophical logic encompasses far richer systems. We are actively exploring expansions into:
            </p>
            <ul class="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 pl-4 list-disc marker:text-neutral-400">
              <li>
                <strong class="text-neutral-900 dark:text-white font-medium">First-Order Predicate Logic (FOL):</strong> Universal (∀) and existential (∃) quantification, predicates, relations, and Copi's four quantification rules (UI, UG, EI, EG).
              </li>
              <li>
                <strong class="text-neutral-900 dark:text-white font-medium">Modal Logic:</strong> Operators of necessity (□) and possibility (◇), exploring systems K, T, S4, and S5 for metaphysical and epistemic reasoning.
              </li>
              <li>
                <strong class="text-neutral-900 dark:text-white font-medium">Non-Classical & Intuitionistic Systems:</strong> Constructive proof systems rejecting the Law of Excluded Middle, alongside many-valued (Łukasiewicz) formalisms.
              </li>
            </ul>
          </div>

          <!-- Milestone 3: Visual Proof Explorers -->
          <div class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-sans text-xs font-semibold text-neutral-900 dark:text-white">
                Interactive Proof Trees & Semantic Tableaux
              </span>
              <span class="text-[10px] font-sans font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/40">
                Future Exploration
              </span>
            </div>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Alternative visual proof representations allowing logicians to compare linear natural deduction against graphical truth trees, Gentzen-style sequent calculi, and semantic refutation trees.
            </p>
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
