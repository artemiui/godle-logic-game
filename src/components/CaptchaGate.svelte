<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { authStore } from '../stores/auth';
  import { themeStore } from '../stores/theme';

  let widgetContainer: HTMLDivElement;
  let widgetId: number | null = null;
  let isScriptLoading: boolean = true;
  let scriptLoadFailed: boolean = false;
  let isVerifying: boolean = false;
  let errorMessage: string = '';
  let statusMessage: string = '';

  const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string) || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

  async function handleVerifyToken(token: string) {
    isVerifying = true;
    errorMessage = '';
    statusMessage = 'Validating clearance token...';

    try {
      const res = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        statusMessage = 'Clearance granted. Entering deduction space...';
        setTimeout(() => {
          authStore.setCaptchaVerified(true);
        }, 400);
      } else {
        errorMessage = data.error || 'Verification failed. Please try again.';
        statusMessage = '';
        if (typeof (window as any).grecaptcha !== 'undefined' && widgetId !== null) {
          (window as any).grecaptcha.reset(widgetId);
        }
      }
    } catch {
      errorMessage = 'Network error during validation. Check your connection or use local bypass.';
      statusMessage = '';
    } finally {
      isVerifying = false;
    }
  }

  async function handleDirectBypass() {
    await handleVerifyToken('test-bypass');
  }

  function renderWidget() {
    if (typeof (window as any).grecaptcha !== 'undefined' && widgetContainer) {
      try {
        if (widgetId !== null) {
          return;
        }
        widgetId = (window as any).grecaptcha.render(widgetContainer, {
          sitekey: siteKey,
          theme: $themeStore === 'dark' ? 'dark' : 'light',
          callback: (token: string) => {
            handleVerifyToken(token);
          },
          'expired-callback': () => {
            errorMessage = 'Clearance challenge expired. Please re-verify.';
          },
          'error-callback': () => {
            errorMessage = 'reCAPTCHA encounter error. You may use Local Clearance below.';
          },
        });
        isScriptLoading = false;
      } catch (err) {
        console.warn('reCAPTCHA render error:', err);
      }
    }
  }

  onMount(() => {
    // If already verified, exit
    if ($authStore.isCaptchaVerified) return;

    (window as any).onGodleRecaptchaLoaded = () => {
      isScriptLoading = false;
      renderWidget();
    };

    if (typeof (window as any).grecaptcha !== 'undefined' && (window as any).grecaptcha.render) {
      isScriptLoading = false;
      renderWidget();
    } else {
      // Check if script tag already exists
      const existingScript = document.getElementById('godle-recaptcha-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'godle-recaptcha-script';
        script.src = 'https://www.google.com/recaptcha/api.js?onload=onGodleRecaptchaLoaded&render=explicit';
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          scriptLoadFailed = true;
          isScriptLoading = false;
        };
        document.head.appendChild(script);
      }

      // Timeout fallback if script blocked by AdBlock or strict DNS
      const timer = setTimeout(() => {
        if (isScriptLoading) {
          scriptLoadFailed = true;
          isScriptLoading = false;
        }
      }, 4000);

      return () => clearTimeout(timer);
    }
  });

  onDestroy(() => {
    delete (window as any).onGodleRecaptchaLoaded;
  });
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md transition-colors">
  <div class="w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-900 dark:border-neutral-200 text-neutral-950 dark:text-neutral-50 p-6 sm:p-8 space-y-6 shadow-2xl">
    <!-- Header -->
    <div class="border-b border-neutral-200 dark:border-neutral-800 pb-4 text-center space-y-1">
      <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-500 dark:text-neutral-400">
        Gate 00 · Access Verification
      </span>
      <h1 class="text-2xl font-bold font-sans tracking-tight">
        gödle
      </h1>
      <p class="text-xs font-sans text-neutral-600 dark:text-neutral-400">
        Formal Propositional Deduction System
      </p>
    </div>

    <!-- Instructions -->
    <div class="text-center space-y-2">
      <p class="text-xs font-sans text-neutral-700 dark:text-neutral-300 leading-relaxed">
        Verify your identity via Google reCAPTCHA to proceed to the daily deduction puzzles and inference engine.
      </p>
    </div>

    <!-- Captcha Widget Box -->
    <div class="flex flex-col items-center justify-center min-h-[90px] py-2">
      <div bind:this={widgetContainer} class="min-h-[78px] flex items-center justify-center"></div>

      {#if isScriptLoading}
        <div class="flex items-center gap-2 text-xs font-sans text-neutral-500 animate-pulse py-4">
          <svg class="w-4 h-4 animate-spin text-neutral-400" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>Loading reCAPTCHA verification...</span>
        </div>
      {/if}

      {#if statusMessage}
        <div class="mt-3 text-xs font-sans text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ {statusMessage}
        </div>
      {/if}

      {#if errorMessage}
        <div class="mt-3 p-2.5 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-sans text-center">
          • {errorMessage}
        </div>
      {/if}
    </div>

    <!-- Fallback / Local Clearance option (if ad-blocker blocks google.com or offline dev) -->
    {#if scriptLoadFailed || isScriptLoading}
      <div class="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-center space-y-2">
        <p class="text-[11px] text-neutral-500 dark:text-neutral-400">
          Google script unavailable (offline / ad-blocker detected).
        </p>
        <button
          type="button"
          on:click={handleDirectBypass}
          disabled={isVerifying}
          class="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-sans uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
        >
          {isVerifying ? 'Verifying...' : 'Pass via Local Clearance'}
        </button>
      </div>
    {:else}
      <div class="pt-2 border-t border-neutral-100 dark:border-neutral-900 text-center">
        <button
          type="button"
          on:click={handleDirectBypass}
          class="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 underline cursor-pointer transition-colors"
        >
          Developer bypass / offline clearance
        </button>
      </div>
    {/if}

    <!-- Footer Quote -->
    <div class="text-center pt-2 text-[10px] font-serif italic text-neutral-400 dark:text-neutral-500">
      "Logic is the study of the methods and principles used to distinguish correct from incorrect reasoning."
    </div>
  </div>
</div>
