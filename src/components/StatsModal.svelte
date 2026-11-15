<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore } from '../stores/auth';

  export let isOpen: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
    viewProfile: string;
  }>();

  let activeView: 'stats' | 'leaderboard' = 'stats';
  let leaderboard: any[] = [];
  let loadingLeaderboard: boolean = false;

  async function fetchLeaderboard() {
    loadingLeaderboard = true;
    try {
      const res = await fetch('/api/frenzy/leaderboard');
      const data = await res.json();
      leaderboard = data.leaderboard || [];
    } catch {
      leaderboard = [];
    } finally {
      loadingLeaderboard = false;
    }
  }

  $: if (isOpen && activeView === 'leaderboard') {
    fetchLeaderboard();
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      dispatch('close');
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-lg bg-card border border-line text-ink p-6 sm:p-8 space-y-6  rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-line pb-4">
        <div>
          <span class="text-meta font-sans text-ink-2 block mb-1">
            Stats
          </span>
          <div class="flex items-center gap-2 font-sans text-xs pt-1">
            <button
              type="button"
              on:click={() => (activeView = 'stats')}
              class="px-2.5 py-1 border transition-colors cursor-pointer {
 activeView === 'stats'
 ? 'bg-ink text-paper border-ink font-medium'
 : 'border-line text-ink-2 hover:border-line-strong'
 } rounded-lg"
            >
              Daily
            </button>
            <button
              type="button"
              on:click={() => {
                activeView = 'leaderboard';
                fetchLeaderboard();
              }}
              class="px-2.5 py-1 border transition-colors cursor-pointer {
 activeView === 'leaderboard'
 ? 'bg-ink text-paper border-ink font-medium'
 : 'border-line text-ink-2 hover:border-line-strong'
 } rounded-lg"
            >
              Leaderboard
            </button>
          </div>
        </div>

        <button aria-label="Close"
          type="button"
          on:click={() => dispatch('close')}
          class="btn-icon -mr-2 shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- View 1: Wordle Stats -->
      {#if activeView === 'stats'}
        <div class="space-y-4 font-sans text-xs">
          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="border border-line p-2.5 rounded-xl">
              <div class="text-meta text-ink-2">Played</div>
              <div class="text-lg font-medium text-ink mt-0.5">
                {$authStore.user ? Math.max(1, $authStore.user.streakCount) : 1}
              </div>
            </div>
            <div class="border border-line p-2.5 rounded-xl">
              <div class="text-meta text-ink-2">Win %</div>
              <div class="text-lg font-medium text-ink mt-0.5">
                100%
              </div>
            </div>
            <div class="border border-line p-2.5 rounded-xl">
              <div class="text-meta text-ink-2">Streak</div>
              <div class="text-lg font-medium text-ink mt-0.5">
                {$authStore.user?.streakCount || 0}
              </div>
            </div>
            <div class="border border-line p-2.5 rounded-xl">
              <div class="text-meta text-ink-2">Best</div>
              <div class="text-lg font-medium text-ink mt-0.5">
                {$authStore.user?.bestStreak || 0}
              </div>
            </div>
          </div>

          <!-- Step Guess Distribution Bar Chart Mockup -->
          <div class="space-y-2 pt-2">
            <div class="text-meta text-ink-2">Lines per proof</div>
            <div class="space-y-1.5 font-sans text-xs">
              <div class="flex items-center gap-2">
                <span class="w-3 text-right">1</span>
                <div class="flex-1 bg-raised h-5 relative flex items-center px-2">
                  <span class="text-meta text-ink-2">0</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 text-right">2</span>
                <div class="flex-1 bg-raised h-5 relative flex items-center">
                  <div class="bg-ink text-paper h-full flex items-center px-2 text-meta font-medium" style="width: 45%;">
                    1
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 text-right">3</span>
                <div class="flex-1 bg-raised h-5 relative flex items-center">
                  <div class="bg-ink text-paper h-full flex items-center px-2 text-meta font-medium" style="width: 80%;">
                    2
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 text-right">4+</span>
                <div class="flex-1 bg-raised h-5 relative flex items-center">
                  <div class="bg-ink text-paper h-full flex items-center px-2 text-meta font-medium" style="width: 30%;">
                    1
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <!-- View 2: Leaderboard -->
        <div class="space-y-3 font-sans text-xs">
          {#if loadingLeaderboard}
            <div class="text-center py-6 text-ink-2">Loading the leaderboard</div>
          {:else if leaderboard.length === 0}
            <div class="text-center py-6 text-ink-2">No runs yet. Finish a Frenzy run to appear here</div>
          {:else}
            <div class="divide-y divide-line">
              {#each leaderboard as entry, idx}
                <div class="py-2 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-medium w-4 text-ink-2">{idx + 1}.</span>
                    <button
                      type="button"
                      on:click={() => dispatch('viewProfile', entry.username)}
                      class="font-semibold text-ink hover:underline cursor-pointer flex items-center gap-1.5 text-left"
                      title="View @{entry.username}'s dossier"
                    >
                      <span>{entry.username}</span>
                      <span class="text-meta text-ink-3 opacity-60">↗</span>
                    </button>
                  </div>
                  <div class="text-ink-2">
                    {entry.score} pts • {entry.time_seconds}s
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
