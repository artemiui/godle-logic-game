<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore } from '../stores/auth';

  export let isOpen: boolean = false;
  export let initialMode: 'prompt' | 'login' | 'register' = 'prompt';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  type AuthMode = 'prompt' | 'login' | 'register' | 'reset' | 'attach-password';

  let mode: AuthMode = 'prompt';
  let username: string = '';
  let password: string = '';
  let confirmPassword: string = '';
  let email: string = '';
  let errorMessage: string = '';
  let successMessage: string = '';
  let loading: boolean = false;

  // Reset Password State
  let resetUsername: string = '';
  let resetEmail: string = '';
  let resetNewPassword: string = '';
  let resetConfirmPassword: string = '';
  let resetLoading: boolean = false;

  // Attach Password State
  let attachNewPassword: string = '';
  let attachConfirmPassword: string = '';
  let attachLoading: boolean = false;

  import { onMount } from 'svelte';

  // OAuth Configuration State
  let oauthConfig = {
    githubClientId: null as string | null,
    devMode: false,
  };

  // OAuth Interactive Dialog State
  let oauthProvider: 'github' | null = null;
  let oauthEmailOrUser: string = '';
  let oauthLoading: boolean = false;

  // Security Visual Captcha State
  let captchaSvg: string = '';
  let captchaToken: string = '';
  let captchaAnswer: string = '';
  let captchaLoading: boolean = false;

  async function fetchCaptcha() {
    captchaLoading = true;
    captchaAnswer = '';
    try {
      const res = await fetch('/api/auth/captcha');
      if (res.ok) {
        const data = await res.json();
        captchaSvg = data.svg;
        captchaToken = data.token;
      }
    } catch {
      // User can click refresh
    } finally {
      captchaLoading = false;
    }
  }

  function switchMode(newMode: AuthMode) {
    mode = newMode;
    errorMessage = '';
    successMessage = '';
    captchaAnswer = '';
    if (newMode === 'login' || newMode === 'register' || newMode === 'reset') {
      fetchCaptcha();
    }
  }

  onMount(() => {
    fetch('/api/auth/oauth/config')
      .then(r => r.json())
      .then(cfg => {
        oauthConfig = cfg;
      })
      .catch(() => {});
  });

  $: if (isOpen) {
    mode = initialMode;
    errorMessage = '';
    successMessage = '';
    username = '';
    password = '';
    confirmPassword = '';
    email = '';
    oauthProvider = null;
    captchaAnswer = '';
    if (mode === 'login' || mode === 'register' || mode === 'reset') {
      fetchCaptcha();
    }
  }

  async function handleAuth() {
    errorMessage = '';
    successMessage = '';

    if (!captchaAnswer.trim()) {
      errorMessage = 'Please enter the security verification captcha.';
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        errorMessage = 'Password must be at least 6 characters.';
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        errorMessage = 'Passwords do not match.';
        return;
      }
    }

    loading = true;
    const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login'
      ? { username: username.trim(), password, captchaToken, captchaAnswer: captchaAnswer.trim() }
      : { username: username.trim(), password, email: email.trim() || undefined, captchaToken, captchaAnswer: captchaAnswer.trim() };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Body was not JSON
      }

      if (!res.ok) {
        errorMessage = data?.error || `Authentication request failed (${res.status}).`;
        loading = false;
        fetchCaptcha();
        return;
      }

      authStore.setUser(data.user, data.token);
      authStore.checkAuth().catch(() => {});
      successMessage = mode === 'register' ? 'Account created! Entering...' : 'Welcome back! Entering...';
      setTimeout(() => {
        dispatch('close');
      }, 500);
    } catch (err: any) {
      errorMessage = err?.message && !err.message.includes('fetch')
        ? err.message
        : 'Network connection failed. Please ensure the server is running and reachable.';
      fetchCaptcha();
    } finally {
      loading = false;
    }
  }

  // Handle Reset Password
  async function handleResetPassword() {
    errorMessage = '';
    successMessage = '';

    if (!captchaAnswer.trim()) {
      errorMessage = 'Please enter the security verification captcha.';
      return;
    }

    if (!resetUsername.trim() || !resetNewPassword) {
      errorMessage = 'Username and new password are required.';
      return;
    }
    if (resetNewPassword.length < 6) {
      errorMessage = 'New password must be at least 6 characters.';
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      errorMessage = 'Passwords do not match.';
      return;
    }

    resetLoading = true;
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: resetUsername.trim(),
          email: resetEmail.trim() || undefined,
          newPassword: resetNewPassword,
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
        }),
      });
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        errorMessage = data?.error || 'Failed to reset password.';
        fetchCaptcha();
      } else {
        successMessage = data?.message || 'Password reset successfully. You can now sign in.';
        setTimeout(() => {
          switchMode('login');
          username = resetUsername.trim();
          password = '';
          successMessage = 'Password reset. Please enter your new password to sign in.';
        }, 1200);
      }
    } catch {
      errorMessage = 'Network error during password reset.';
      fetchCaptcha();
    } finally {
      resetLoading = false;
    }
  }

  // Handle Attach Password to Account
  async function handleAttachPassword() {
    errorMessage = '';
    successMessage = '';

    if (!attachNewPassword || attachNewPassword.length < 6) {
      errorMessage = 'Password must be at least 6 characters.';
      return;
    }
    if (attachNewPassword !== attachConfirmPassword) {
      errorMessage = 'Passwords do not match.';
      return;
    }

    attachLoading = true;
    const token = $authStore.token || localStorage.getItem('goodle_token');

    try {
      const res = await fetch('/api/auth/attach-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          newPassword: attachNewPassword,
        }),
      });
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        errorMessage = data?.error || 'Failed to attach password.';
      } else {
        successMessage = 'Master password attached to account!';
        authStore.checkAuth().catch(() => {});
        setTimeout(() => {
          dispatch('close');
        }, 800);
      }
    } catch {
      errorMessage = 'Network error while attaching password.';
    } finally {
      attachLoading = false;
    }
  }

  // Trigger GitHub Sign-In
  function triggerGitHubSignIn() {
    errorMessage = '';
    successMessage = '';

    // If real GitHub Client ID is configured
    if (oauthConfig.githubClientId) {
      const redirectUri = encodeURIComponent(window.location.origin);
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${oauthConfig.githubClientId}&scope=read:user,user:email&redirect_uri=${redirectUri}`;
      return;
    }

    // If devMode is enabled (local development or ALLOW_DEV_OAUTH)
    if (oauthConfig.devMode) {
      oauthProvider = 'github';
      oauthEmailOrUser = 'github_logician';
      return;
    }

    // In production without GitHub Client ID
    errorMessage = 'GitHub Sign-In is not configured for this deployment (GITHUB_CLIENT_ID missing). Please use Username & Password.';
  }

  // Execute Simulated Dev OAuth Sign In
  async function handleOAuthExecute() {
    if (!oauthProvider) return;
    oauthLoading = true;
    errorMessage = '';

    const endpoint = '/api/auth/oauth/github';
    const body = { githubUsername: oauthEmailOrUser.trim() || 'github_logician' };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        errorMessage = data?.error || 'Failed to sign in with GitHub.';
      } else {
        authStore.setUser(data.user, data.token);
        authStore.checkAuth().catch(() => {});
        oauthProvider = null;
        successMessage = 'Signed in with GitHub!';
        setTimeout(() => {
          dispatch('close');
        }, 600);
      }
    } catch {
      errorMessage = 'Network error connecting to GitHub.';
    } finally {
      oauthLoading = false;
    }
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget && !oauthProvider) {
      dispatch('close');
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px] transition-opacity"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-900 dark:border-neutral-200 text-neutral-900 dark:text-neutral-100 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <!-- Form Container -->
      <div class="space-y-6">
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-500 dark:text-neutral-400 block mb-0.5">
            Logician Authentication
          </span>
          <h2 class="text-xl font-bold font-sans uppercase tracking-tight">
            {#if mode === 'prompt'}
              Account Clearance
            {:else if mode === 'login'}
              Sign In
            {:else if mode === 'register'}
              Register Account
            {:else if mode === 'reset'}
              Reset Password
            {:else if mode === 'attach-password'}
              Attach Password
            {/if}
          </h2>
        </div>
        <button
          type="button"
          on:click={() => dispatch('close')}
          class="text-neutral-500 hover:text-black dark:hover:text-white text-xs font-sans tracking-wider cursor-pointer p-1"
        >
          [ ✕ Close ]
        </button>
      </div>

      <!-- VIEW 1: PROMPT VIEW (Choose Sign In, Register, or OAuth) -->
      {#if mode === 'prompt'}
        <div class="space-y-5 font-sans">
          <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed text-center">
            Sign in to record daily deduction streaks, monitor your activity heatmap, and save formal proofs.
          </p>

          <!-- Primary Actions -->
          <div class="space-y-2.5 pt-1">
            <button
              type="button"
              on:click={() => switchMode('login')}
              class="w-full h-11 border border-neutral-900 dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-950 dark:text-white font-bold text-xs uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              <span>Sign In with Username & Password</span>
              <span class="font-sans">→</span>
            </button>

            <button
              type="button"
              on:click={() => switchMode('register')}
              class="w-full h-11 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span>Create New Logician Account</span>
              <span class="font-sans">+</span>
            </button>
          </div>

          <!-- OAuth Social Divider -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-3">
              <div class="flex-1 h-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
              <span class="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">or authenticate with</span>
              <div class="flex-1 h-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
            </div>

            <!-- GitHub Button -->
            <button
              type="button"
              on:click={triggerGitHubSignIn}
              class="w-full h-10 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-colors bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 shadow-sm"
            >
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>

          <div class="text-center pt-2 text-[11px] font-serif italic text-neutral-400 dark:text-neutral-500">
            "A proposition is that in virtue of which a statement is true or false."
          </div>
        </div>

      <!-- VIEW 2: LOGIN OR REGISTER -->
      {:else if mode === 'login' || mode === 'register'}
        <div class="space-y-4 font-sans text-xs">
          <!-- Back to Options & Mode Switcher -->
          <div class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-2">
            <button
              type="button"
              on:click={() => switchMode('prompt')}
              class="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer font-medium"
            >
              ← Back to options
            </button>
            <div class="flex gap-2 text-[11px]">
              <button
                type="button"
                on:click={() => switchMode('login')}
                class="uppercase tracking-wider {mode === 'login' ? 'font-bold underline text-neutral-950 dark:text-white' : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer'}"
              >
                Sign In
              </button>
              <span class="text-neutral-300 dark:text-neutral-700">|</span>
              <button
                type="button"
                on:click={() => switchMode('register')}
                class="uppercase tracking-wider {mode === 'register' ? 'font-bold underline text-neutral-950 dark:text-white' : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer'}"
              >
                Register
              </button>
            </div>
          </div>

          <form on:submit|preventDefault={handleAuth} class="space-y-3.5 pt-1">
            {#if errorMessage}
              <div class="p-2.5 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                • {errorMessage}
              </div>
            {/if}

            {#if successMessage}
              <div class="p-2.5 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
                ✓ {successMessage}
              </div>
            {/if}

            <!-- Username Field -->
            <div>
              <label for="auth-username-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                Username
              </label>
              <input
                id="auth-username-field"
                type="text"
                bind:value={username}
                required
                placeholder="Logician handle"
                class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
              />
            </div>

            <!-- Email (for Register) -->
            {#if mode === 'register'}
              <div>
                <label for="auth-email-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                  Email (Optional, used for password recovery)
                </label>
                <input
                  id="auth-email-field"
                  type="email"
                  bind:value={email}
                  placeholder="logician@example.org"
                  class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />
              </div>
            {/if}

            <!-- Password Field -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="auth-password-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400">
                  Password
                </label>
                {#if mode === 'login'}
                  <button
                    type="button"
                    on:click={() => {
                      switchMode('reset');
                      resetUsername = username;
                    }}
                    class="text-[10px] text-neutral-500 hover:text-black dark:hover:text-white uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                {/if}
              </div>
              <input
                id="auth-password-field"
                type="password"
                bind:value={password}
                required
                minlength="6"
                placeholder="Minimum 6 characters"
                class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
              />
            </div>

            <!-- Confirm Password (for Register) -->
            {#if mode === 'register'}
              <div>
                <label for="auth-confirm-pwd-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                  Confirm Password
                </label>
                <input
                  id="auth-confirm-pwd-field"
                  type="password"
                  bind:value={confirmPassword}
                  placeholder="Re-enter password"
                  class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />
              </div>
            {/if}

            <!-- Security Captcha Verification -->
            <div class="space-y-1.5 pt-1">
              <div class="flex items-center justify-between">
                <label for="auth-captcha-input" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400">
                  Security Captcha
                </label>
                <button
                  type="button"
                  on:click={fetchCaptcha}
                  class="text-[10px] text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  title="Generate a new code"
                >
                  <span class="font-bold">↻</span>
                  <span>Refresh Code</span>
                </button>
              </div>
              <div class="flex gap-2 items-center">
                <!-- SVG Visual Challenge -->
                <div class="w-40 h-10 border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden select-none shrink-0 shadow-inner">
                  {#if captchaLoading}
                    <span class="text-[10px] text-neutral-400 animate-pulse">Loading...</span>
                  {:else if captchaSvg}
                    {@html captchaSvg}
                  {:else}
                    <button type="button" on:click={fetchCaptcha} class="text-[10px] text-blue-600 underline">Load Captcha</button>
                  {/if}
                </div>
                <!-- Input field -->
                <input
                  id="auth-captcha-input"
                  type="text"
                  bind:value={captchaAnswer}
                  required
                  maxlength="6"
                  placeholder="Enter Code"
                  autocomplete="off"
                  spellcheck="false"
                  class="flex-1 h-10 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-neutral-900 dark:focus:border-white text-center"
                />
              </div>
              <div class="text-[9px] text-neutral-400">
                Case-insensitive. Type the 5 characters to verify you are human.
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              class="w-full h-10 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 uppercase tracking-widest text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 mt-2"
            >
              {loading ? 'Authenticating...' : (mode === 'login' ? 'Sign In' : 'Create Logician Account')}
            </button>
          </form>

          <!-- Social Sign In under Login/Register -->
          <div class="space-y-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <div class="text-center text-[10px] uppercase text-neutral-400 font-bold tracking-wider">
              Or sign in with OAuth
            </div>
            <button
              type="button"
              on:click={triggerGitHubSignIn}
              class="w-full h-8 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-colors bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
            >
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span>GitHub</span>
            </button>
          </div>
        </div>

      <!-- VIEW 3: RESET PASSWORD VIEW -->
      {:else if mode === 'reset'}
        <form on:submit|preventDefault={handleResetPassword} class="space-y-4 font-sans text-xs">
          <div class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-2">
            <button
              type="button"
              on:click={() => switchMode('login')}
              class="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer font-medium"
            >
              ← Back to Sign In
            </button>
            <span class="text-[10px] uppercase font-bold text-neutral-400">Account Recovery</span>
          </div>

          <p class="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Enter your account username and registered email (if one was attached) to reset your master password.
          </p>

          {#if errorMessage}
            <div class="p-2.5 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
              • {errorMessage}
            </div>
          {/if}

          {#if successMessage}
            <div class="p-2.5 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
              ✓ {successMessage}
            </div>
          {/if}

          <div>
            <label for="reset-username-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
              Account Username
            </label>
            <input
              id="reset-username-field"
              type="text"
              bind:value={resetUsername}
              required
              placeholder="Your username"
              class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div>
            <label for="reset-email-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
              Registered Email (If applicable)
            </label>
            <input
              id="reset-email-field"
              type="email"
              bind:value={resetEmail}
              placeholder="email@example.org"
              class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label for="reset-new-pwd-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                New Password
              </label>
              <input
                id="reset-new-pwd-field"
                type="password"
                bind:value={resetNewPassword}
                required
                minlength="6"
                placeholder="Min. 6 chars"
                class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
            <div>
              <label for="reset-confirm-pwd-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                Confirm Password
              </label>
              <input
                id="reset-confirm-pwd-field"
                type="password"
                bind:value={resetConfirmPassword}
                required
                minlength="6"
                placeholder="Repeat password"
                class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
              />
            </div>
          </div>

          <!-- Security Captcha Verification -->
          <div class="space-y-1.5 pt-1">
            <div class="flex items-center justify-between">
              <label for="reset-captcha-input" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400">
                Security Captcha
              </label>
              <button
                type="button"
                on:click={fetchCaptcha}
                class="text-[10px] text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="Generate a new code"
              >
                <span class="font-bold">↻</span>
                <span>Refresh Code</span>
              </button>
            </div>
            <div class="flex gap-2 items-center">
              <!-- SVG Visual Challenge -->
              <div class="w-40 h-10 border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden select-none shrink-0 shadow-inner">
                {#if captchaLoading}
                  <span class="text-[10px] text-neutral-400 animate-pulse">Loading...</span>
                {:else if captchaSvg}
                  {@html captchaSvg}
                {:else}
                  <button type="button" on:click={fetchCaptcha} class="text-[10px] text-blue-600 underline">Load Captcha</button>
                {/if}
              </div>
              <!-- Input field -->
              <input
                id="reset-captcha-input"
                type="text"
                bind:value={captchaAnswer}
                required
                maxlength="6"
                placeholder="Enter Code"
                autocomplete="off"
                spellcheck="false"
                class="flex-1 h-10 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-neutral-900 dark:focus:border-white text-center"
              />
            </div>
            <div class="text-[9px] text-neutral-400">
              Case-insensitive. Type the 5 characters to verify you are human.
            </div>
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            class="w-full h-10 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 uppercase tracking-widest text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 mt-2"
          >
            {resetLoading ? 'Resetting Password...' : 'Reset Password & Sign In'}
          </button>
        </form>

      <!-- VIEW 4: ATTACH PASSWORD TO ACCOUNT (Required for passwords without accounts) -->
      {:else if mode === 'attach-password'}
        <form on:submit|preventDefault={handleAttachPassword} class="space-y-4 font-sans text-xs">
          <div class="p-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900 space-y-1">
            <div class="font-bold text-xs uppercase tracking-wider text-neutral-950 dark:text-neutral-50">
              Attach Master Password
            </div>
            <p class="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Your account was created via OAuth. Please attach a password to your account so you can log in with your username and password directly.
            </p>
          </div>

          {#if errorMessage}
            <div class="p-2.5 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
              • {errorMessage}
            </div>
          {/if}

          {#if successMessage}
            <div class="p-2.5 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
              ✓ {successMessage}
            </div>
          {/if}

          <div>
            <label for="attach-new-pwd-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
              Choose Master Password
            </label>
            <input
              id="attach-new-pwd-field"
              type="password"
              bind:value={attachNewPassword}
              required
              minlength="6"
              placeholder="Minimum 6 characters"
              class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div>
            <label for="attach-confirm-pwd-field" class="block text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 mb-1">
              Confirm Master Password
            </label>
            <input
              id="attach-confirm-pwd-field"
              type="password"
              bind:value={attachConfirmPassword}
              required
              minlength="6"
              placeholder="Repeat password"
              class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div class="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={attachLoading}
              class="flex-1 h-10 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 uppercase tracking-widest text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {attachLoading ? 'Attaching...' : 'Attach Password'}
            </button>
            <button
              type="button"
              on:click={() => dispatch('close')}
              class="px-4 h-10 border border-neutral-300 dark:border-neutral-700 text-xs uppercase font-bold cursor-pointer hover:border-neutral-900 dark:hover:border-white"
            >
              Skip
            </button>
          </div>
        </form>
      {/if}

      <!-- OAUTH DEVELOPER/DEV-MODE CLEARANCE MODAL -->
      {#if oauthProvider}
        <div
          class="absolute inset-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm z-20 p-6 flex flex-col justify-center space-y-4 font-sans text-xs"
        >
          <div class="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <div>
                <h3 class="font-bold text-sm uppercase tracking-wider">
                  GitHub Sign-In
                </h3>
                <span class="text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold block">
                  Developer Mode Test Clearance
                </span>
              </div>
            </div>
            <button
              type="button"
              on:click={() => (oauthProvider = null)}
              class="text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          <p class="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Fast 1-click test authentication for local development and preview environments without requiring OAuth API credentials.
          </p>

          <div>
            <label for="oauth-input" class="block text-[10px] uppercase font-bold text-neutral-500 mb-1">
              Test GitHub Username
            </label>
            <input
              id="oauth-input"
              type="text"
              bind:value={oauthEmailOrUser}
              class="w-full h-9 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              on:click={() => (oauthProvider = null)}
              class="flex-1 h-10 border border-neutral-300 dark:border-neutral-700 text-xs uppercase font-bold cursor-pointer hover:border-neutral-900 dark:hover:border-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={oauthLoading || !oauthEmailOrUser.trim()}
              on:click={handleOAuthExecute}
              class="flex-[2] h-10 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs uppercase font-bold tracking-wider cursor-pointer hover:opacity-90 disabled:opacity-40"
            >
              {oauthLoading ? 'Authenticating...' : 'Sign In with GitHub'}
            </button>
          </div>
        </div>
      {/if}
      </div>
    </div>
  </div>
{/if}
