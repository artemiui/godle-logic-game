<script lang="ts">
  import { activeTabStore } from '../stores/auth';
  import { CHANGELOG } from '../data/changelog';
  import { openLegalModal } from '../stores/legal';

  let showAllChangelog: boolean = false;
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 text-ink font-sans">
  
  <!-- Masthead Header -->
  <div class="border-b border-line pb-8 mb-12">
    <div class="flex items-center gap-3 mb-2 font-sans text-meta text-ink-3">
      <span class="font-medium text-ink-2">About</span>
      <span class="tabular-nums">{CHANGELOG[0]?.version || 'v1.1.0'}</span>
    </div>
    <h1 class="page-title">A logic game played one valid line at a time</h1>
  </div>

  <!-- Main Editorial Content Columns -->
  <div class="space-y-12 leading-relaxed">

    <!-- Section: The Philosophy of gödle -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-line pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl text-ink">
          What it is
        </h2>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-ink-2">
        <p>
          <strong class="font-semibold text-ink">gödle</strong> is a propositional symbolic logic web game inspired by the precision and pedagogical clarity of classic logic texts. While traditional puzzle games challenge vocabulary or pattern matching, gödle challenges formal deductive validity: given a set of premises, can you systematically derive a target conclusion using only truth-preserving inference rules?
        </p>
        <p>
          Unlike automated black-box solvers, gödle requires the logician to construct every step of the deduction, citing exact premise lines and selecting appropriate justifications. Each line is checked the moment you add it, against the syntax of propositional calculus.
        </p>
      </div>
    </section>

    <!-- Section: Inspirations & PHILO 12 -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-line pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl text-ink">
          Copi and UP Diliman
        </h2>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-ink-2">
        <div class="p-4 rounded-xl border border-line bg-card space-y-2">
          <div class="font-sans text-sm font-medium text-ink">
            UP Department of Philosophy · PHILO 12
          </div>
          <p class="text-xs text-ink-2">
            Dedicated with gratitude to the <strong>Department of Philosophy, College of Social Sciences and Philosophy (CSSP)</strong> at the <strong>University of the Philippines Diliman</strong>, and to the faculty, lecturers, and teaching assistants of <strong>PHILO 12 (Intermediate Logic)</strong>.
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-ink mb-1">
            Irving M. Copi (1917–2002)
          </h3>
          <p>
            The formal deduction engine is modeled directly on Irving M. Copi’s seminal textbooks, <em>Symbolic Logic</em> (1954) and <em>Introduction to Logic</em> (1953). Copi's celebrated nineteen rules of deduction (nine elementary rules of inference and ten rules of replacement) are the only rules the game accepts.
          </p>
        </div>
      </div>
    </section>

    <!-- Section: Who made it -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-line pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl text-ink">
          Who made it
        </h2>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-ink-2">
        <p>
          Conceived, designed, and developed by <strong class="font-semibold text-ink">A. Arcega</strong>.
        </p>
        <p>
          Driven by an affinity for formal philosophical logic, minimalist typography (Swiss grotesques, Japanese editorial layouts), and performant web systems, gödle was built to bring propositional natural deduction to the web without distraction.
        </p>
        <div class="pt-2">
          <a
            href="https://artemiui.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondary"
          >
            <span>artemiui.vercel.app</span>
            <span class="text-ink-3" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Section: Open Source & Codebase -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-line pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl text-ink">
          Open Source
        </h2>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-ink-2">
        <p>
          gödle is entirely open source. The engine contains a custom recursive-descent Pratt-like formula parser, an AST verification engine, a seeded PRNG problem generator (Mulberry32), and an automated Breadth-First Search (BFS) theorem prover with zero third-party logic dependencies.
        </p>
        <div class="pt-2">
          <a
            href="https://github.com/artemiui/godle-logic-game"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Source on GitHub</span>
            
          </a>
        </div>
      </div>
    </section>

    <!-- Section: Privacy and terms -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-line pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl text-ink">
          Privacy and terms
        </h2>
      </div>
      <div class="md:col-span-8 space-y-4 text-sm text-ink-2">
        <p>
          gödle collects as little data as it can, sells nothing and keeps its code open. You control your proofs, streaks and account data.
        </p>
        <div class="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            on:click={() => openLegalModal('privacy')}
            class="btn btn-secondary btn-sm"
          >
            <span>Privacy policy</span>
          </button>
          <button
            type="button"
            on:click={() => openLegalModal('terms')}
            class="btn btn-secondary btn-sm"
          >
            <span>Terms of service</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Section: Changelog & System History -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-line pb-10">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl text-ink">
          Changelog
        </h2>
      </div>
      <div class="md:col-span-8 space-y-6 text-sm">
        {#if CHANGELOG.length > 0}
          {@const latest = CHANGELOG[0]}
          <div class="space-y-2.5">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span class="font-sans text-caption font-medium text-ink tabular-nums">
                {latest.version}
              </span>
              <span class="tag">
                {latest.tag}
              </span>
            </div>
            <h3 class="font-serif text-base font-medium text-ink">
              {latest.title}
            </h3>
            <ul class="space-y-1.5 text-xs text-ink-2 pl-4 list-disc marker:text-ink-3 leading-relaxed">
              {#each latest.highlights as highlight}
                <li>{highlight}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if showAllChangelog}
          <div class="space-y-8 pt-6 border-t border-line">
            {#each CHANGELOG.slice(1) as entry}
              <div class="space-y-2.5">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <span class="font-sans text-caption font-medium text-ink tabular-nums">
                    {entry.version}
                  </span>
                  <span class="tag">
                    {entry.tag}
                  </span>
                </div>
                <h3 class="font-serif text-base font-medium text-ink">
                  {entry.title}
                </h3>
                <ul class="space-y-1.5 text-xs text-ink-2 pl-4 list-disc marker:text-ink-3 leading-relaxed">
                  {#each entry.highlights as highlight}
                    <li>{highlight}</li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
          <div class="pt-1">
            <button
              type="button"
              on:click={() => (showAllChangelog = false)}
              class="link font-sans text-caption"
            >
              Show less
            </button>
          </div>
        {:else if CHANGELOG.length > 1}
          <div class="pt-1">
            <button
              type="button"
              on:click={() => (showAllChangelog = true)}
              class="link font-sans text-caption"
            >
              Show {CHANGELOG.length - 1} earlier {CHANGELOG.length - 1 === 1 ? 'version' : 'versions'}
            </button>
          </div>
        {/if}
      </div>
    </section>

    <!-- Section: Roadmap -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline pb-6">
      <div class="md:col-span-4">
        <h2 class="font-serif text-xl text-ink">
          Roadmap
        </h2>
      </div>
      <div class="md:col-span-8 space-y-5 text-sm text-ink-2">
        <p>
          gödle starts with propositional deduction and aims to grow into other formal systems. With the <span class="font-medium text-ink tabular-nums">{CHANGELOG[0]?.version || 'v1.1.0'}</span> release covering textbook problems and solving tools, the next work looks beyond sentential logic.
        </p>

        <div class="space-y-4">
          <!-- Milestone 1: Accounts & Persistence -->
          <div class="p-4 rounded-xl border border-line bg-card space-y-2">
            <div class="flex items-baseline justify-between gap-4">
              <span class="font-sans text-sm font-medium text-ink flex items-center gap-2">
                <span>Accounts and sync</span>
              </span>
              <span class="font-sans text-meta text-ink-3 shrink-0">
                Live
              </span>
            </div>
            <p class="text-xs text-ink-2 leading-relaxed">
              Streaks, saved theorems and solving history sync across devices. Frenzy has a global leaderboard of verified runs.
            </p>
          </div>

          <!-- Milestone 2: Advanced Logical Systems -->
          <div class="p-4 rounded-xl border border-line bg-card space-y-2">
            <div class="flex items-baseline justify-between gap-4">
              <span class="font-sans text-sm font-medium text-ink flex items-center gap-2">
                <span>Beyond propositional logic</span>
              </span>
              <span class="font-sans text-meta text-ink-3 shrink-0">
                Next, in research
              </span>
            </div>
            <p class="text-xs text-ink-2 leading-relaxed mb-2">
              While propositional calculus tests truth functions of entire statements, philosophical logic encompasses far richer systems. We are actively exploring expansions into:
            </p>
            <ul class="space-y-1.5 text-xs text-ink-2 pl-4 list-disc marker:text-ink-3">
              <li>
                <strong class="text-ink font-medium">First-Order Predicate Logic (FOL):</strong> Universal (∀) and existential (∃) quantification, predicates, relations, and Copi's four quantification rules (UI, UG, EI, EG).
              </li>
              <li>
                <strong class="text-ink font-medium">Modal Logic:</strong> Operators of necessity (□) and possibility (◇), exploring systems K, T, S4, and S5 for metaphysical and epistemic reasoning.
              </li>
              <li>
                <strong class="text-ink font-medium">Non-Classical & Intuitionistic Systems:</strong> Constructive proof systems rejecting the Law of Excluded Middle, alongside many-valued (Łukasiewicz) formalisms.
              </li>
            </ul>
          </div>

          <!-- Milestone 3: Visual Proof Explorers -->
          <div class="p-4 rounded-xl border border-line bg-card space-y-2">
            <div class="flex items-baseline justify-between gap-4">
              <span class="font-sans text-sm font-medium text-ink">
                Proof trees and semantic tableaux
              </span>
              <span class="font-sans text-meta text-ink-3 shrink-0">
                Later
              </span>
            </div>
            <p class="text-xs text-ink-2 leading-relaxed">
              Alternative visual proof representations allowing logicians to compare linear natural deduction against graphical truth trees, Gentzen-style sequent calculi, and semantic refutation trees.
            </p>
          </div>
        </div>
      </div>
    </section>

  </div>

  <!-- Bottom CTA Actions -->
  <div class="mt-12 pt-8 border-t border-line flex flex-wrap items-center justify-between gap-4">
    <button
      type="button"
      on:click={() => activeTabStore.set('wordle')}
      class="btn btn-primary"
    >
      <span>Play today’s problem</span>
    </button>

    <button
      type="button"
      on:click={() => activeTabStore.set('tutorial')}
      class="btn btn-ghost"
    >
      Read the 19 rules
    </button>
  </div>

</div>
