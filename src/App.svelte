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
  import Analytics from './components/Analytics.svelte';
  import LegalModal from './components/LegalModal.svelte';
  import { openLegalModal } from './stores/legal';

  let showLanding: boolean = true;

  let showAuthModal: boolean = false;
  let showProfileModal: boolean = false;
  let showPublicProfileModal: boolean = false;
  let publicProfileUsername: string | null = null;
  let authModalMode: 'prompt' | 'login' | 'register' = 'prompt';
  let showStatsModal: boolean = false;

  function handleLandingEnter() {
    showLanding = false;
  }

  function handleLandingNavigate(mode: any) {
    activeTabStore.set(mode);
    showLanding = false;
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

    // Check for GitHub OAuth callback code
    const params = new URLSearchParams(window.location.search);
    const githubCode = params.get('code');
    if (githubCode) {
      fetch('/api/auth/oauth/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: githubCode }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.token && data.user) {
            authStore.setUser(data.user, data.token);
            authStore.checkAuth();
            showLanding = false;
          }
        })
        .catch(console.error)
        .finally(() => {
          params.delete('code');
          const newQuery = params.toString();
          const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
          window.history.replaceState({}, '', newUrl);
        });
    }

    const mode = params.get('mode');
    if (mode === 'frenzy') {
      activeTabStore.set('frenzy');
      showLanding = false;
    } else if (mode === 'sandbox') {
      activeTabStore.set('sandbox');
      showLanding = false;
    } else if (mode === 'tutorial') {
      activeTabStore.set('tutorial');
      showLanding = false;
    } else if (mode === 'about') {
      activeTabStore.set('about');
      showLanding = false;
    } else if (mode === 'wordle') {
      activeTabStore.set('wordle');
      showLanding = false;
    } else if (mode === 'privacy') {
      openLegalModal('privacy');
    } else if (mode === 'terms') {
      openLegalModal('terms');
    }

    const legalParam = params.get('legal');
    if (legalParam === 'privacy' || legalParam === 'terms') {
      openLegalModal(legalParam);
    }
  });
</script>

<div class="min-h-screen bg-paper text-ink flex flex-col font-sans selection:bg-ink selection:text-paper">
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
    <div class={$activeTabStore === 'wordle' ? 'block' : 'hidden'}>
      <WordleMode hibernated={$activeTabStore !== 'wordle'} />
    </div>
    <div class={$activeTabStore === 'frenzy' ? 'block' : 'hidden'}>
      <FrenzyMode hibernated={$activeTabStore !== 'frenzy'} />
    </div>
    <div class={$activeTabStore === 'sandbox' ? 'block' : 'hidden'}>
      <SandboxMode hibernated={$activeTabStore !== 'sandbox'} />
    </div>
    <div class={$activeTabStore === 'tutorial' ? 'block' : 'hidden'}>
      <TutorialView />
    </div>
    <div class={$activeTabStore === 'about' ? 'block' : 'hidden'}>
      <AboutView />
    </div>
  </main>

  <footer class="border-t border-line">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <figure class="max-w-xl space-y-2">
        <blockquote class="font-serif text-lg leading-snug text-ink-2">
          “Logic is the study of the methods and principles used to distinguish correct from incorrect reasoning.”
        </blockquote>
        <figcaption class="font-sans text-meta text-ink-3">Irving M. Copi, Introduction to Logic</figcaption>
      </figure>
      <nav class="flex items-center gap-6 font-sans text-caption text-ink-3" aria-label="Footer">
        <button type="button" on:click={() => openLegalModal('privacy')} class="hover:text-ink transition-colors cursor-pointer">Privacy</button>
        <button type="button" on:click={() => openLegalModal('terms')} class="hover:text-ink transition-colors cursor-pointer">Terms</button>
        <button type="button" on:click={() => { activeTabStore.set('about'); }} class="hover:text-ink transition-colors cursor-pointer">About</button>
      </nav>
    </div>
  </footer>

  <!-- Modals & Utilities -->
  <Analytics />
  <SettingsModal />
  <LegalModal />

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
