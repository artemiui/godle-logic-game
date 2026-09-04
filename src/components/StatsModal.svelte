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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-neutral-950 border border-neutral-900 dark:border-neutral-200 text-neutral-900 dark:text-neutral-100 p-6 sm:p-8 space-y-6 shadow-2xl"
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-1">
            Metrics & Records
          </span>
          <div class="flex items-center gap-2 font-sans text-xs pt-1">
            <button
              type="button"
              on:click={() => (activeView = 'stats')}
              class="px-2.5 py-1 border transition-colors cursor-pointer {
                activeView === 'stats'
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
              }"
            >
              Daily Stats
            </button>
            <button
              type="button"
              on:click={() => {
                activeView = 'leaderboard';
                fetchLeaderboard();
              }}
              class="px-2.5 py-1 border transition-colors cursor-pointer {
                activeView === 'leaderboard'
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
              }"
            >
              Leaderboard
            </button>
          </div>
        </div>

        <button
          type="button"
          on:click={() => dispatch('close')}
          class="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white text-xs font-sans tracking-wider cursor-pointer"
        >
          [ ✕ Close ]
        </button>
      </div>

      <!-- View 1: Wordle Stats -->
      {#if activeView === 'stats'}
        <div class="space-y-4 font-sans text-xs">
          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="border border-neutral-200 dark:border-neutral-800 p-2.5">
              <div class="text-[10px] text-neutral-600 dark:text-neutral-300 uppercase">Played</div>
              <div class="text-lg font-bold text-neutral-950 dark:text-neutral-50 mt-0.5">
                {$authStore.user ? Math.max(1, $authStore.user.streakCount) : 1}
              </div>
            </div>
            <div class="border border-neutral-200 dark:border-neutral-800 p-2.5">
              <div class="text-[10px] text-neutral-600 dark:text-neutral-300 uppercase">Win %</div>
              <div class="text-lg font-bold text-neutral-950 dark:text-neutral-50 mt-0.5">
                100%
              </div>
            </div>
            <div class="border border-neutral-200 dark:border-neutral-800 p-2.5">
              <div class="text-[10px] text-neutral-600 dark:text-neutral-300 uppercase">Streak</div>
              <div class="text-lg font-bold text-neutral-950 dark:text-neutral-50 mt-0.5">
                {$authStore.user?.streakCount || 0}
              </div>
            </div>
            <div class="border border-neutral-200 dark:border-neutral-800 p-2.5">
              <div class="text-[10px] text-neutral-600 dark:text-neutral-300 uppercase">Best</div>
              <div class="text-lg font-bold text-neutral-950 dark:text-neutral-50 mt-0.5">
                {$authStore.user?.bestStreak || 0}
              </div>
            </div>
          </div>

          <!-- Step Guess Distribution Bar Chart Mockup -->
          <div class="space-y-2 pt-2">
            <div class="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-300">Proof Steps Distribution</div>
            <div class="space-y-1.5 font-sans text-xs">
              <div class="flex items-center gap-2">
                <span class="w-3 text-right">1</span>
                <div class="flex-1 bg-neutral-100 dark:bg-neutral-900 h-5 relative flex items-center px-2">
                  <span class="text-[10px] text-neutral-600 dark:text-neutral-300">0</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 text-right">2</span>
                <div class="flex-1 bg-neutral-100 dark:bg-neutral-900 h-5 relative flex items-center">
                  <div class="bg-neutral-900 dark:bg-white text-white dark:text-black h-full flex items-center px-2 text-[10px] font-bold" style="width: 45%;">
                    1
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 text-right">3</span>
                <div class="flex-1 bg-neutral-100 dark:bg-neutral-900 h-5 relative flex items-center">
                  <div class="bg-neutral-900 dark:bg-white text-white dark:text-black h-full flex items-center px-2 text-[10px] font-bold" style="width: 80%;">
                    2
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 text-right">4+</span>
                <div class="flex-1 bg-neutral-100 dark:bg-neutral-900 h-5 relative flex items-center">
                  <div class="bg-neutral-900 dark:bg-white text-white dark:text-black h-full flex items-center px-2 text-[10px] font-bold" style="width: 30%;">
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
            <div class="text-center py-6 text-neutral-600 dark:text-neutral-300">Loading leaderboard records...</div>
          {:else if leaderboard.length === 0}
            <div class="text-center py-6 text-neutral-600 dark:text-neutral-300">No records registered yet. Prove a frenzy challenge to rank!</div>
          {:else}
            <div class="divide-y divide-neutral-200 dark:divide-neutral-800">
              {#each leaderboard as entry, idx}
                <div class="py-2 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-bold w-4 text-neutral-600 dark:text-neutral-300">{idx + 1}.</span>
                    <button
                      type="button"
                      on:click={() => dispatch('viewProfile', entry.username)}
                      class="font-semibold text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer flex items-center gap-1.5 text-left"
                      title="View @{entry.username}'s dossier"
                    >
                      <span>{entry.username}</span>
                      <span class="text-[9px] text-neutral-400 opacity-60">↗</span>
                    </button>
                  </div>
                  <div class="text-neutral-600 dark:text-neutral-300">
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
