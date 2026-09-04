<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, activeTabStore } from './stores/auth';
  import { themeStore } from './stores/theme';
  import Header from './components/Header.svelte';
  import WordleMode from './components/WordleMode.svelte';
  import FrenzyMode from './components/FrenzyMode.svelte';
  import SandboxMode from './components/SandboxMode.svelte';
  import TutorialView from './components/TutorialView.svelte';
  import AuthModal from './components/AuthModal.svelte';
  import ProfileModal from './components/ProfileModal.svelte';
  import PublicProfileModal from './components/PublicProfileModal.svelte';
  import StatsModal from './components/StatsModal.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import LandingPage from './components/LandingPage.svelte';
  import AboutView from './components/AboutView.svelte';

  let showLanding: boolean = typeof window !== 'undefined'
    ? localStorage.getItem('goodle_landing_seen') !== 'true'
    : false;

  let showAuthModal: boolean = false;
  let showProfileModal: boolean = false;
  let showPublicProfileModal: boolean = false;
  let publicProfileUsername: string | null = null;
  let authModalMode: 'prompt' | 'login' | 'register' = 'prompt';
  let showStatsModal: boolean = false;

  function handleLandingEnter() {
    showLanding = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('goodle_landing_seen', 'true');
    }
  }

  function handleLandingNavigate(mode: any) {
    activeTabStore.set(mode);
    showLanding = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('goodle_landing_seen', 'true');
    }
  }

  function handleOpenPublicProfile(username: string) {
    publicProfileUsername = username;
    showPublicProfileModal = true;
  }

  onMount(() => {
    authStore.checkAuth();

    // Ensure theme class is applied on document
    if ($themeStore === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check URL parameters for mode switch or landing
    const params = new URLSearchParams(window.location.search);
    if (params.get('landing') === 'true' || params.get('home') === 'true') {
      showLanding = true;
    }
    const mode = params.get('mode');
    if (mode === 'frenzy') {
      activeTabStore.set('frenzy');
    } else if (mode === 'sandbox') {
      activeTabStore.set('sandbox');
    } else if (mode === 'tutorial') {
      activeTabStore.set('tutorial');
    } else if (mode === 'about') {
      activeTabStore.set('about');
    }
  });
</script>

<div class="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-950 transition-colors">
  <!-- Minimal Header Bar -->
  <Header
    on:openLanding={() => (showLanding = true)}
    on:openProfile={() => (showProfileModal = true)}
    on:openAuthPrompt={() => {
      authModalMode = 'prompt';
      showAuthModal = true;
    }}
    on:openStats={() => (showStatsModal = true)}
  />

  <!-- Main View Router -->
  <main class="flex-1">
    {#if $activeTabStore === 'wordle'}
      <WordleMode />
    {:else if $activeTabStore === 'frenzy'}
      <FrenzyMode />
    {:else if $activeTabStore === 'sandbox'}
      <SandboxMode />
    {:else if $activeTabStore === 'tutorial'}
      <TutorialView />
    {:else if $activeTabStore === 'about'}
      <AboutView />
    {/if}
  </main>

  <!-- Minimal Editorial Footer -->
  <footer class="border-t border-neutral-200 dark:border-neutral-800 py-10 px-4 text-center font-sans text-xs text-neutral-600 dark:text-neutral-300">
    <div class="max-w-4xl mx-auto space-y-2">
      <div class="font-serif italic text-neutral-800 dark:text-neutral-200 text-sm">
        "Logic is the study of the methods and principles used to distinguish correct from incorrect reasoning."
      </div>
      <div class="text-[11px] text-neutral-600 dark:text-neutral-300">
        Irving M. Copi
      </div>
    </div>
  </footer>

  <!-- Modals & Utilities -->
  <SettingsModal />

  <AuthModal
    isOpen={showAuthModal}
    initialMode={authModalMode}
    on:close={() => (showAuthModal = false)}
  />

  <ProfileModal
    isOpen={showProfileModal}
    on:close={() => (showProfileModal = false)}
  />

  <StatsModal
    isOpen={showStatsModal}
    on:close={() => (showStatsModal = false)}
    on:viewProfile={(e) => handleOpenPublicProfile(e.detail)}
  />

  <PublicProfileModal
    isOpen={showPublicProfileModal}
    username={publicProfileUsername}
    on:close={() => {
      showPublicProfileModal = false;
      publicProfileUsername = null;
    }}
  />

  <!-- Minimalist Truth Trees Landing Page -->
  {#if showLanding}
    <LandingPage
      on:enter={handleLandingEnter}
      on:navigate={(e) => handleLandingNavigate(e.detail)}
    />
  {/if}
</div>
