<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { themeStore, toggleTheme } from '../stores/theme';
  import type { ActiveTab } from '../stores/auth';
  import { CHANGELOG } from '../data/changelog';
  import { openLegalModal } from '../stores/legal';

  const dispatch = createEventDispatcher<{
    enter: void;
    navigate: ActiveTab;
  }>();

  let showAllChangelog: boolean = false;


  const modes: { id: ActiveTab; name: string; line: string }[] = [
    { id: 'wordle', name: 'Daily', line: 'Three problems from Copi’s Symbolic Logic every day, Novice to Master, with a streak' },
    { id: 'frenzy', name: 'Frenzy', line: 'One seeded problem against the clock. Three invalid lines and the run ends' },
    { id: 'sandbox', name: 'Sandbox', line: 'Write your own premises, check that a proof exists, share the puzzle' },
    { id: 'tutorial', name: 'Rules', line: 'All 19 rules with schemas, worked examples and a place to try each one' },
  ];
</script>

<div class="fixed inset-0 z-50 bg-paper text-ink overflow-y-auto overflow-x-hidden flex flex-col font-sans selection:bg-ink selection:text-paper">
  <header class="border-b border-line">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
      <div class="flex items-baseline gap-3">
        <span class="font-sans font-black text-xl tracking-tight text-neutral-950 dark:text-white">gödle</span>
        <span class="hidden sm:inline text-meta text-ink-3">by A. Arcega</span>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" on:click={() => dispatch('navigate', 'about')} class="btn btn-ghost btn-sm">About</button>
        <button type="button" on:click={toggleTheme} title={$themeStore === 'dark' ? 'Light appearance' : 'Dark appearance'} aria-label="Toggle appearance" class="btn-icon">
          {#if $themeStore === 'dark'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          {/if}
        </button>
      </div>
    </div>
  </header>

  <main class="flex-1">
    <!-- Hero: wordmark, promise, one action -->
    <section class="max-w-6xl mx-auto px-4 sm:px-6 min-h-[calc(100vh-56px)] flex items-center py-16">
      <div class="landing-rise space-y-8">
        <div>
          <h1 class="font-sans font-black text-7xl sm:text-8xl lg:text-9xl tracking-tight leading-[0.9] text-neutral-950 dark:text-white select-none">gödle</h1>
          <p class="mt-6 text-sm text-ink-3">by A. Arcega</p>
        </div>
        <div class="max-w-xl">
          <p class="font-serif text-2xl sm:text-[28px] leading-snug text-ink">
            A daily proof in propositional logic, line by line, with Copi’s 19 rules
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button type="button" on:click={() => dispatch('navigate', 'wordle')} class="btn btn-primary btn-lg">
            Play today’s problem
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
          <button type="button" on:click={() => dispatch('navigate', 'tutorial')} class="btn btn-ghost btn-lg">Learn the rules</button>
        </div>
      </div>
    </section>

    <!-- Modes -->
    <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
        {#each modes as mode}
          <button
            type="button"
            on:click={() => dispatch('navigate', mode.id)}
            class="group text-left pt-6 pb-4 border-t border-line hover:border-ink transition-colors cursor-pointer"
          >
            <span class="flex items-center justify-between font-serif text-xl text-ink">
              {mode.name}
              <svg class="text-ink-3 group-hover:text-ink transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </span>
            <span class="block mt-2 text-caption text-ink-2">{mode.line}</span>
          </button>
        {/each}
      </div>
    </section>

    <!-- Changelog -->
    {#if CHANGELOG.length > 0}
      {@const latest = CHANGELOG[0]}
      <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 md:gap-16 pt-12 border-t border-line">
          <div class="space-y-2">
            <h2 class="font-serif text-2xl text-ink">What’s new</h2>
            <p class="text-caption text-ink-3 tabular-nums">{latest.version} · {latest.date}</p>
          </div>
          <div class="space-y-6">
            <article class="space-y-3">
              <div class="flex items-center gap-3">
                <h3 class="font-sans text-base font-medium text-ink">{latest.title}</h3>
                <span class="tag">{latest.tag}</span>
              </div>
              <ul class="space-y-2 text-caption text-ink-2 pl-4 list-disc marker:text-ink-3">
                {#each latest.highlights as highlight}<li>{highlight}</li>{/each}
              </ul>
            </article>

            {#if showAllChangelog}
              {#each CHANGELOG.slice(1) as entry}
                <article class="space-y-3 pt-6 border-t border-line">
                  <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 class="font-sans text-base font-medium text-ink">{entry.title}</h3>
                    <span class="text-meta text-ink-3 tabular-nums">{entry.version} · {entry.date}</span>
                  </div>
                  <ul class="space-y-2 text-caption text-ink-2 pl-4 list-disc marker:text-ink-3">
                    {#each entry.highlights as highlight}<li>{highlight}</li>{/each}
                  </ul>
                </article>
              {/each}
              <button type="button" on:click={() => (showAllChangelog = false)} class="link text-caption">Show less</button>
            {:else if CHANGELOG.length > 1}
              <button type="button" on:click={() => (showAllChangelog = true)} class="link text-caption">
                Show {CHANGELOG.length - 1} earlier {CHANGELOG.length - 1 === 1 ? 'version' : 'versions'}
              </button>
            {/if}
          </div>
        </div>
      </section>
    {/if}
  </main>

  <footer class="border-t border-line">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <figure class="max-w-xl space-y-2">
        <blockquote class="font-serif text-lg leading-snug text-ink-2">
          “Logic is the study of the methods and principles used to distinguish correct from incorrect reasoning.”
        </blockquote>
        <figcaption class="text-meta text-ink-3">Irving M. Copi, Introduction to Logic</figcaption>
      </figure>
      <nav class="flex items-center gap-6 text-caption text-ink-3" aria-label="Footer">
        <button type="button" on:click={() => openLegalModal('privacy')} class="hover:text-ink transition-colors cursor-pointer">Privacy</button>
        <button type="button" on:click={() => openLegalModal('terms')} class="hover:text-ink transition-colors cursor-pointer">Terms</button>
        <button type="button" on:click={() => dispatch('navigate', 'about')} class="hover:text-ink transition-colors cursor-pointer">About</button>
      </nav>
    </div>
  </footer>
</div>

<style>
  /* One entrance on load: a short fade and rise, the proof a beat later */
  @keyframes rise {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
  .landing-rise { animation: rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
    @media (prefers-reduced-motion: reduce) {
    .landing-rise { animation: none; }
  }
</style>
