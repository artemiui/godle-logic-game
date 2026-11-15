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

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'wordle', label: 'Daily' },
    { id: 'frenzy', label: 'Frenzy' },
    { id: 'sandbox', label: 'Sandbox' },
    { id: 'tutorial', label: 'Rules' },
    { id: 'about', label: 'About' },
  ];
</script>

<header class="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-4">
    <!-- Wordmark (unchanged brand) -->
    <div class="flex items-baseline gap-3">
      <button
        type="button"
        on:click={() => dispatch('openLanding')}
        title="gödle home"
        class="text-left cursor-pointer group"
      >
        <span class="font-sans font-black text-xl tracking-tight text-neutral-950 dark:text-white group-hover:opacity-75 transition-opacity">
          gödle
        </span>
      </button>
      <span class="hidden sm:inline text-meta font-sans text-ink-3">
        by A. Arcega
      </span>
    </div>

    <!-- Tabs -->
    <nav class="hidden md:flex items-center gap-1 h-14 font-sans text-sm" aria-label="Modes">
      {#each tabs as tab}
        <button
          type="button"
          on:click={() => activeTabStore.set(tab.id)}
          aria-current={$activeTabStore === tab.id ? 'page' : undefined}
          class="relative h-full px-3 cursor-pointer transition-colors duration-150 {
            $activeTabStore === tab.id ? 'text-ink font-medium' : 'text-ink-2 hover:text-ink'
          }"
        >
          {tab.label}
          {#if $activeTabStore === tab.id}
            <span class="absolute left-3 right-3 -bottom-px h-px bg-ink" aria-hidden="true"></span>
          {/if}
        </button>
      {/each}
    </nav>

    <!-- Streak, account, settings -->
    <div class="flex items-center justify-end gap-1">
      <button
        type="button"
        on:click={() => dispatch('openStats')}
        title="Streak and stats"
        class="btn btn-ghost btn-sm gap-1.5 px-2.5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
        <span class="tabular-nums text-ink">{$authStore.user?.streakCount || 0}</span>
        <span class="sr-only">day streak</span>
      </button>

      <button
        type="button"
        on:click={handlePersonClick}
        title={$authStore.user ? `Profile (@${$authStore.user.username})` : 'Sign in'}
        class="btn-icon relative overflow-hidden"
        aria-label={$authStore.user ? 'Profile' : 'Sign in'}
      >
        {#if $authStore.user}
          {#if $authStore.user.avatarImage}
            <img src={$authStore.user.avatarImage} alt={$authStore.user.username} class="w-6 h-6 rounded-md object-cover" />
          {:else if $authStore.user.avatarIcon && $authStore.user.avatarIcon !== 'user'}
            <span class="font-serif text-base leading-none select-none text-ink">{$authStore.user.avatarIcon}</span>
          {:else}
            <span class="font-sans text-caption font-medium leading-none select-none text-ink">
              {($authStore.user.username || 'G')[0].toUpperCase()}
            </span>
          {/if}
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        {/if}
      </button>

      <button
        type="button"
        on:click={() => isSettingsOpen.set(true)}
        title="Settings"
        class="btn-icon"
        aria-label="Settings"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile tabs -->
  <nav class="md:hidden flex items-center gap-1 overflow-x-auto px-4 h-11 border-t border-line font-sans text-caption" aria-label="Modes">
    {#each tabs as tab}
      <button
        type="button"
        on:click={() => activeTabStore.set(tab.id)}
        aria-current={$activeTabStore === tab.id ? 'page' : undefined}
        class="h-8 px-3 rounded-lg cursor-pointer transition-colors duration-150 {
          $activeTabStore === tab.id ? 'bg-raised text-ink font-medium' : 'text-ink-2'
        }"
      >
        {tab.label}
      </button>
    {/each}
  </nav>
</header>
