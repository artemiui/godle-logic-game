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
    statusMessage = 'Verifying';

    try {
      const res = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        statusMessage = 'Verified';
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

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-colors">
  <div class="w-full max-w-md bg-card border border-line text-ink p-6 sm:p-8 space-y-6  rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
    <!-- Header -->
    <div class="border-b border-line pb-4 text-center space-y-1">
      <span class="text-meta font-sans text-ink-3">
        One check before you play
      </span>
      <h1 class="text-2xl font-medium font-sans tracking-tight">
        gödle
      </h1>
      <p class="text-xs font-sans text-ink-2">
        Confirm you are human
      </p>
    </div>

    <!-- Instructions -->
    <div class="text-center space-y-2">
      <p class="text-xs font-sans text-ink-2 leading-relaxed">
        Verify your identity via Google reCAPTCHA to proceed to the daily deduction puzzles and inference engine.
      </p>
    </div>

    <!-- Captcha Widget Box -->
    <div class="flex flex-col items-center justify-center min-h-[90px] py-2">
      <div bind:this={widgetContainer} class="min-h-[78px] flex items-center justify-center"></div>

      {#if isScriptLoading}
        <div class="flex items-center gap-2 text-xs font-sans text-ink-3 py-4">
          <svg class="w-4 h-4 animate-spin text-ink-3" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>Loading the check</span>
        </div>
      {/if}

      {#if statusMessage}
        <div class="mt-3 text-xs font-sans text-ink font-medium">
           {statusMessage}
        </div>
      {/if}

      {#if errorMessage}
        <div class="mt-3 p-2.5 border border-ink bg-raised text-ink text-xs font-sans text-center rounded-xl">
          • {errorMessage}
        </div>
      {/if}
    </div>

    <!-- Fallback / Local Clearance option (if ad-blocker blocks google.com or offline dev) -->
    {#if scriptLoadFailed || isScriptLoading}
      <div class="pt-2 border-t border-line text-center space-y-2">
        <p class="text-meta text-ink-3">
          The check could not load. You may be offline or blocking scripts
        </p>
        <button
          type="button"
          on:click={handleDirectBypass}
          disabled={isVerifying}
          class="px-4 py-2 bg-ink text-paper text-xs font-sans cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
        >
          {isVerifying ? 'Verifying' : 'Continue'}
        </button>
      </div>
    {:else}
      <div class="pt-2 border-t border-line text-center">
        <button
          type="button"
          on:click={handleDirectBypass}
          class="text-meta text-ink-3 hover:text-ink-2 underline cursor-pointer transition-colors"
        >
          Developer bypass
        </button>
      </div>
    {/if}

    <!-- Footer Quote -->
    <div class="text-center pt-2 text-meta font-serif text-ink-3">
      "Logic is the study of the methods and principles used to distinguish correct from incorrect reasoning."
    </div>
  </div>
</div>
