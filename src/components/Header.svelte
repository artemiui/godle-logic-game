<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore, activeTabStore, type ActiveTab } from '../stores/auth';
  import { isSettingsOpen } from '../stores/theme';

  const dispatch = createEventDispatcher<{
    openProfile: void;
    openAuthPrompt: void;
    openStats: void;
    openLanding: void;
  }>();

  function handlePersonClick() {
    if ($authStore.user) {
      dispatch('openProfile');
    } else {
      dispatch('openAuthPrompt');
    }
  }

  const tabs: { id: ActiveTab; label: string; number: string }[] = [
    { id: 'wordle', label: 'Daily', number: '01' },
    { id: 'frenzy', label: 'Frenzy', number: '02' },
    { id: 'sandbox', label: 'Sandbox', number: '03' },
    { id: 'tutorial', label: 'Rules', number: '04' },
    { id: 'about', label: 'About', number: '05' },
  ];
</script>

<header class="border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm sticky top-0 z-40 transition-colors">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
    <!-- Brand Masthead (Left) -->
    <div class="flex items-baseline gap-3">
      <button
        type="button"
        on:click={() => dispatch('openLanding')}
        title="View Truth Trees Landing Page"
        class="text-left cursor-pointer group"
      >
        <span class="font-sans font-black text-xl tracking-tight text-neutral-950 dark:text-white group-hover:opacity-75 transition-opacity">
          gödle
        </span>
      </button>
      <span class="hidden sm:inline text-[11px] font-sans text-neutral-500 dark:text-neutral-400">
        by A. Arcega
      </span>
    </div>

    <!-- Navigation Tabs (Center) -->
    <nav class="hidden md:flex items-center gap-1 font-sans text-xs">
      {#each tabs as tab}
        <button
          type="button"
          on:click={() => activeTabStore.set(tab.id)}
          class="px-3 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 {
            $activeTabStore === tab.id
              ? 'text-neutral-950 dark:text-white font-bold border-b border-neutral-950 dark:border-white -mb-[1px]'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white'
          }"
        >
          <span class="text-[10px] opacity-70">{tab.number}</span>
          <span>{tab.label}</span>
        </button>
      {/each}
    </nav>

    <!-- Right Controls: Streak, Account & Settings -->
    <div class="flex items-center gap-2">
      <!-- Streak & Stats Button -->
      <button
        type="button"
        on:click={() => dispatch('openStats')}
        title="View Streaks & Stats"
        class="h-8 px-2 text-xs font-sans text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 flex items-center gap-1 transition-colors cursor-pointer"
      >
        <span class="text-xs">🔥</span>
        <span class="font-bold">{$authStore.user?.streakCount || 0}</span>
      </button>

      <!-- Person Icon (Profile if signed in, Login/Register prompt if not) -->
      <button
        type="button"
        on:click={handlePersonClick}
        title={$authStore.user ? `Profile: ${$authStore.user.username}` : 'Account: Sign In or Register'}
        class="w-8 h-8 flex items-center justify-center border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white transition-colors cursor-pointer relative text-neutral-800 dark:text-neutral-200"
        aria-label="User Account"
      >
        {#if $authStore.user}
          {#if $authStore.user.avatarImage}
            <img src={$authStore.user.avatarImage} alt={$authStore.user.username} class="w-full h-full object-cover" />
          {:else if $authStore.user.avatarIcon && $authStore.user.avatarIcon !== 'user'}
            <span class="font-serif text-sm font-bold leading-none select-none">
              {$authStore.user.avatarIcon}
            </span>
          {:else}
            <span class="font-sans text-xs font-bold leading-none select-none">
              {($authStore.user.username || 'G')[0].toUpperCase()}
            </span>
          {/if}
          <!-- Online status dot -->
          <span class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {:else}
          <svg class="w-4 h-4 text-neutral-600 dark:text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        {/if}
      </button>

      <!-- Subtle Settings Icon -->
      <button
        type="button"
        on:click={() => isSettingsOpen.set(true)}
        title="Settings (Theme & Notation)"
        class="w-8 h-8 flex items-center justify-center text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white transition-colors cursor-pointer"
        aria-label="Settings"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile Tab Bar -->
  <div class="md:hidden flex items-center justify-around border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2 py-1 font-sans text-xs">
    {#each tabs as tab}
      <button
        type="button"
        on:click={() => activeTabStore.set(tab.id)}
        class="py-1 px-2 cursor-pointer transition-colors {
          $activeTabStore === tab.id
            ? 'text-neutral-950 dark:text-white font-bold border-b-2 border-neutral-950 dark:border-white'
            : 'text-neutral-600 dark:text-neutral-300'
        }"
      >
        {tab.label}
      </button>
    {/each}
  </div>
</header>
