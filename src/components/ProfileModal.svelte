<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore } from '../stores/auth';

  export let isOpen: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  // Tab State: 'profile' | 'settings'
  let activeTab: 'profile' | 'settings' = 'profile';

  // Profile Edit State
  let isEditing: boolean = false;
  let usernameInput: string = '';
  let bioInput: string = '';
  let avatarImageInput: string = '';
  let selectedColor: string = '#171717';
  let isSavingProfile: boolean = false;
  let profileStatusMessage: string = '';
  let profileErrorMessage: string = '';
  let fileInputRef: HTMLInputElement | null = null;
  let imageProcessing: boolean = false;

  // Settings State: Privacy / Leaderboard
  let optOutLeaderboard: boolean = false;
  let isUpdatingPrivacy: boolean = false;
  let privacyMessage: string = '';

  // Settings State: Password Reset
  let currentPasswordInput: string = '';
  let newPasswordInput: string = '';
  let confirmPasswordInput: string = '';
  let isChangingPassword: boolean = false;
  let passwordStatusMessage: string = '';
  let passwordErrorMessage: string = '';

  // Settings State: OAuth
  let isConnectingOAuth: boolean = false;
  let oauthMessage: string = '';
  let oauthError: string = '';

  // Danger Zone Modal State
  type DangerAction = 'reset-stats' | 'delete-account' | null;
  let activeDangerAction: DangerAction = null;
  let dangerConfirmInput: string = '';
  let dangerErrorMessage: string = '';
  let isExecutingDangerAction: boolean = false;

  // Heatmap Tooltip
  let hoveredDay: { date: string; count: number; formatted: string } | null = null;

  const colorPalette = [
    '#171717', // Neutral 900
    '#059669', // Emerald
    '#2563EB', // Blue
    '#7C3AED', // Violet
    '#DC2626', // Crimson
    '#D97706', // Amber
  ];

  // Initialize input fields only on modal open or edit start — never re-run reactively during user typing
  let prevIsOpen = false;
  $: if (isOpen && !prevIsOpen) {
    prevIsOpen = true;
    initFormFromUser();
    authStore.checkAuth();
  } else if (!isOpen && prevIsOpen) {
    prevIsOpen = false;
    isEditing = false;
    activeDangerAction = null;
  }

  function initFormFromUser() {
    if (!$authStore.user) return;
    usernameInput = $authStore.user.username || '';
    bioInput = $authStore.user.bio || '';
    avatarImageInput = $authStore.user.avatarImage || '';
    selectedColor = $authStore.user.avatarColor || '#171717';
    optOutLeaderboard = Boolean($authStore.user.optOutLeaderboard);
    profileStatusMessage = '';
    profileErrorMessage = '';
    passwordStatusMessage = '';
    passwordErrorMessage = '';
    currentPasswordInput = '';
    newPasswordInput = '';
    confirmPasswordInput = '';
    oauthMessage = '';
    oauthError = '';
  }

  // Handle client-side image compression (160x160 canvas, JPEG ~15KB)
  function handleImageSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      profileErrorMessage = 'Image file too large. Please select an image under 5MB.';
      return;
    }

    imageProcessing = true;
    profileErrorMessage = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 160;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            profileErrorMessage = 'Failed to process image canvas.';
            imageProcessing = false;
            return;
          }

          // Center crop to square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 160, 160);

          // Compress to JPEG with 0.82 quality (~15KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          avatarImageInput = compressedDataUrl;
        } catch {
          profileErrorMessage = 'Could not compress image.';
        } finally {
          imageProcessing = false;
        }
      };
      img.onerror = () => {
        profileErrorMessage = 'Invalid image file.';
        imageProcessing = false;
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      profileErrorMessage = 'Failed to read image file.';
      imageProcessing = false;
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatarImage() {
    avatarImageInput = '';
    if (fileInputRef) fileInputRef.value = '';
  }

  async function handleSaveProfile() {
    profileErrorMessage = '';
    profileStatusMessage = '';

    if (!usernameInput || usernameInput.trim().length < 3) {
      profileErrorMessage = 'Username must be at least 3 characters.';
      return;
    }

    isSavingProfile = true;
    const token = $authStore.token || localStorage.getItem('goodle_token');

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          username: usernameInput.trim(),
          bio: bioInput.trim(),
          avatarImage: avatarImageInput,
          avatarColor: selectedColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        profileErrorMessage = data.error || 'Failed to update profile.';
      } else {
        profileStatusMessage = 'Profile updated successfully.';
        if (data.token) {
          authStore.setUser(data.user, data.token);
        }
        await authStore.checkAuth();
        setTimeout(() => {
          isEditing = false;
          profileStatusMessage = '';
        }, 900);
      }
    } catch {
      profileErrorMessage = 'Network error while saving profile.';
    } finally {
      isSavingProfile = false;
    }
  }

  // Settings: Toggle leaderboard opt-out
  async function handleToggleLeaderboardOptOut() {
    isUpdatingPrivacy = true;
    privacyMessage = '';
    const token = $authStore.token || localStorage.getItem('goodle_token');

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          optOutLeaderboard: optOutLeaderboard,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        privacyMessage = optOutLeaderboard
          ? 'Profile hidden from public rankings.'
          : 'Profile visible on public leaderboards.';
        await authStore.checkAuth();
        setTimeout(() => (privacyMessage = ''), 2500);
      }
    } catch {
      privacyMessage = 'Failed to update privacy preference.';
    } finally {
      isUpdatingPrivacy = false;
    }
  }

  // Settings: Change or Attach Password
  async function handleChangePassword() {
    passwordStatusMessage = '';
    passwordErrorMessage = '';

    const needsCurrentPassword = $authStore.user?.hasPassword !== false;

    if (needsCurrentPassword && !currentPasswordInput) {
      passwordErrorMessage = 'Please enter your current password.';
      return;
    }
    if (!newPasswordInput) {
      passwordErrorMessage = 'Please enter your new password.';
      return;
    }
    if (newPasswordInput.length < 6) {
      passwordErrorMessage = 'New password must be at least 6 characters.';
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      passwordErrorMessage = 'New passwords do not match.';
      return;
    }

    isChangingPassword = true;
    const token = $authStore.token || localStorage.getItem('goodle_token');

    try {
      const endpoint = needsCurrentPassword ? '/api/auth/change-password' : '/api/auth/attach-password';
      const payload = needsCurrentPassword
        ? { currentPassword: currentPasswordInput, newPassword: newPasswordInput }
        : { newPassword: newPasswordInput };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        passwordErrorMessage = data.error || 'Failed to update password.';
      } else {
        passwordStatusMessage = needsCurrentPassword ? 'Password updated securely.' : 'Master password attached successfully!';
        currentPasswordInput = '';
        newPasswordInput = '';
        confirmPasswordInput = '';
        await authStore.checkAuth();
        setTimeout(() => (passwordStatusMessage = ''), 3000);
      }
    } catch {
      passwordErrorMessage = 'Network error while updating password.';
    } finally {
      isChangingPassword = false;
    }
  }

  // Settings: OAuth Connect / Disconnect
  async function handleOAuthToggle(provider: 'google' | 'github', currentlyConnected: boolean) {
    oauthMessage = '';
    oauthError = '';
    isConnectingOAuth = true;
    const token = $authStore.token || localStorage.getItem('goodle_token');

    try {
      if (currentlyConnected) {
        // Disconnect
        const res = await fetch('/api/auth/oauth/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ provider }),
        });
        const data = await res.json();
        if (res.ok) {
          oauthMessage = data.message || `Disconnected ${provider}.`;
          await authStore.checkAuth();
        } else {
          oauthError = data.error || `Failed to disconnect ${provider}.`;
        }
      } else {
        // Connect / Link
        const endpoint = provider === 'google' ? '/api/auth/oauth/google' : '/api/auth/oauth/github';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
            email: $authStore.user?.email || `${$authStore.user?.username}@oauth.mock`,
            name: $authStore.user?.username,
            githubUsername: $authStore.user?.username,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          oauthMessage = data.message || `Linked ${provider} successfully.`;
          await authStore.checkAuth();
        } else {
          oauthError = data.error || `Failed to connect ${provider}.`;
        }
      }
    } catch {
      oauthError = `Network error connecting to ${provider}.`;
    } finally {
      isConnectingOAuth = false;
    }
  }

  // Danger Zone Actions
  function openDangerDialog(action: DangerAction) {
    activeDangerAction = action;
    dangerConfirmInput = '';
    dangerErrorMessage = '';
  }

  function closeDangerDialog() {
    activeDangerAction = null;
    dangerConfirmInput = '';
    dangerErrorMessage = '';
  }

  async function handleExecuteDangerAction() {
    dangerErrorMessage = '';
    isExecutingDangerAction = true;
    const token = $authStore.token || localStorage.getItem('goodle_token');

    try {
      if (activeDangerAction === 'reset-stats') {
        if (dangerConfirmInput.trim() !== 'RESET STATS') {
          dangerErrorMessage = 'Confirmation phrase does not match "RESET STATS".';
          isExecutingDangerAction = false;
          return;
        }

        const res = await fetch('/api/user/reset-stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ confirmText: dangerConfirmInput.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          dangerErrorMessage = data.error || 'Failed to reset statistics.';
        } else {
          await authStore.checkAuth();
          closeDangerDialog();
          activeTab = 'profile';
        }
      } else if (activeDangerAction === 'delete-account') {
        const username = $authStore.user?.username || '';
        if (dangerConfirmInput.trim() !== username) {
          dangerErrorMessage = `Confirmation must match your username "${username}".`;
          isExecutingDangerAction = false;
          return;
        }

        const res = await fetch('/api/user/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ confirmUsername: dangerConfirmInput.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          dangerErrorMessage = data.error || 'Failed to delete account.';
        } else {
          authStore.logout();
          closeDangerDialog();
          dispatch('close');
        }
      }
    } catch {
      dangerErrorMessage = 'Network error while executing action.';
    } finally {
      isExecutingDangerAction = false;
    }
  }

  // Generate 77 days (11 weeks of 7 days) for the calendar heatmap
  function getHeatmapData(activityMap: Record<string, number> = {}) {
    const totalDays = 77; // 11 weeks
    const days: { date: string; count: number; formatted: string; dayOfWeek: number }[] = [];
    const today = new Date();

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const count = activityMap[iso] || 0;
      days.push({
        date: iso,
        count,
        dayOfWeek: d.getDay(),
        formatted: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      });
    }
    return days;
  }

  $: heatmapDays = getHeatmapData($authStore.user?.activityMap || {});
  $: activeDaysCount = heatmapDays.filter(d => d.count > 0).length;

  function handleLogout() {
    authStore.logout();
    dispatch('close');
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget && !activeDangerAction) {
      dispatch('close');
    }
  }
</script>

{#if isOpen && $authStore.user}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[2px] transition-opacity"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-xl bg-white dark:bg-neutral-950 border border-neutral-900 dark:border-neutral-200 text-neutral-900 dark:text-neutral-100 p-6 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div>
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-500 dark:text-neutral-400 block mb-0.5">
            Logician Account & Dossier
          </span>
          <h2 class="text-xl font-bold font-sans uppercase tracking-tight">
            {$authStore.user.username}
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

      <!-- Navigation Tabs: Profile vs Account Settings -->
      <div class="flex border-b border-neutral-200 dark:border-neutral-800 gap-2 font-sans text-xs font-bold uppercase tracking-wider">
        <button
          type="button"
          on:click={() => (activeTab = 'profile')}
          class="pb-2 px-3 border-b-2 transition-colors cursor-pointer {
            activeTab === 'profile'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-extrabold'
              : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          }"
        >
          Profile
        </button>
        <button
          type="button"
          on:click={() => (activeTab = 'settings')}
          class="pb-2 px-3 border-b-2 transition-colors cursor-pointer {
            activeTab === 'settings'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-extrabold'
              : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          }"
        >
          ⚙ Account Settings
        </button>
      </div>

      <!-- TAB 1: PROFILE DOSSIER -->
      {#if activeTab === 'profile'}
        <!-- Identity Summary Card -->
        <div class="flex items-start gap-4 p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
          <!-- User Avatar Photo / Color Block -->
          <div
            class="w-16 h-16 rounded-none flex items-center justify-center text-white font-serif text-2xl shadow-sm border border-neutral-800 dark:border-neutral-200 shrink-0 select-none overflow-hidden relative"
            style="background-color: {$authStore.user.avatarColor || '#171717'};"
          >
            {#if $authStore.user.avatarImage}
              <img
                src={$authStore.user.avatarImage}
                alt={$authStore.user.username}
                class="w-full h-full object-cover"
              />
            {:else}
              <span>{($authStore.user.username || 'G')[0].toUpperCase()}</span>
            {/if}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="font-bold text-base text-neutral-950 dark:text-neutral-50">
                {$authStore.user.username}
              </span>
              <span class="px-1.5 py-0.2 text-[9px] uppercase tracking-wider font-bold border border-neutral-900 dark:border-neutral-300 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
                {$authStore.user.rankTitle || 'Axiomatic Apprentice'}
              </span>
            </div>

            <!-- Bio -->
            {#if $authStore.user.bio}
              <p class="text-xs text-neutral-600 dark:text-neutral-300 italic mt-1 leading-snug">
                "{$authStore.user.bio}"
              </p>
            {:else}
              <p class="text-[11px] text-neutral-400 italic mt-1">
                No personal logician bio set.
              </p>
            {/if}

            <!-- Quick Edit Button -->
            <div class="mt-2.5">
              <button
                type="button"
                on:click={() => {
                  isEditing = !isEditing;
                  if (isEditing) initFormFromUser();
                }}
                class="text-[11px] font-sans font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 underline hover:text-black dark:hover:text-white cursor-pointer"
              >
                {isEditing ? 'Cancel Edit' : 'Modify Profile & Avatar Photo ✎'}
              </button>
            </div>
          </div>
        </div>

        {#if $authStore.user.hasPassword === false}
          <div class="p-3 border border-amber-400/80 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between text-xs font-sans">
            <div>
              <div class="font-bold text-amber-800 dark:text-amber-300">⚠ No master password attached</div>
              <div class="text-[10px] text-neutral-500 dark:text-neutral-400">Attach a password to allow signing in without Google/GitHub.</div>
            </div>
            <button
              type="button"
              on:click={() => (activeTab = 'settings')}
              class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Attach Password
            </button>
          </div>
        {/if}

        <!-- PROFILE EDIT FORM -->
        {#if isEditing}
          <form on:submit|preventDefault={handleSaveProfile} class="p-4 border border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900 space-y-4 font-sans text-xs">
            <div class="font-bold uppercase tracking-wider text-[11px] text-neutral-950 dark:text-neutral-50 border-b border-neutral-200 dark:border-neutral-800 pb-2">
              Modify Profile Details
            </div>

            {#if profileErrorMessage}
              <div class="p-2.5 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                • {profileErrorMessage}
              </div>
            {/if}
            {#if profileStatusMessage}
              <div class="p-2.5 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
                ✓ {profileStatusMessage}
              </div>
            {/if}

            <!-- Avatar Picture Upload -->
            <div>
              <span class="block text-[10px] uppercase text-neutral-500 mb-1.5 font-bold">
                Profile Picture (Image Upload)
              </span>
              <div class="flex items-center gap-4">
                <div
                  class="w-14 h-14 border border-neutral-800 dark:border-neutral-200 flex items-center justify-center text-white font-serif text-xl shrink-0 overflow-hidden"
                  style="background-color: {selectedColor};"
                >
                  {#if avatarImageInput}
                    <img src={avatarImageInput} alt="Preview" class="w-full h-full object-cover" />
                  {:else}
                    <span>{(usernameInput || 'G')[0]?.toUpperCase() || '⊢'}</span>
                  {/if}
                </div>

                <div class="space-y-1.5">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    bind:this={fileInputRef}
                    on:change={handleImageSelected}
                    class="hidden"
                    id="profile-avatar-upload"
                  />
                  <div class="flex items-center gap-2">
                    <label
                      for="profile-avatar-upload"
                      class="px-2.5 py-1 border border-neutral-900 dark:border-neutral-100 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors inline-block"
                    >
                      {imageProcessing ? 'Compressing...' : 'Upload Image'}
                    </label>
                    {#if avatarImageInput}
                      <button
                        type="button"
                        on:click={handleRemoveAvatarImage}
                        class="text-[10px] uppercase text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        [ Remove Image ]
                      </button>
                    {/if}
                  </div>
                  <p class="text-[10px] text-neutral-500">
                    Client-side compressed to ~15KB (160×160). Max file 5MB.
                  </p>
                </div>
              </div>
            </div>

            <!-- Username Input -->
            <div>
              <label for="edit-profile-username" class="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">
                Username
              </label>
              <input
                id="edit-profile-username"
                type="text"
                bind:value={usernameInput}
                required
                minlength="3"
                class="w-full h-8 px-2.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-sans focus:outline-none focus:border-neutral-900 dark:focus:border-white"
              />
            </div>

            <!-- Bio Input -->
            <div>
              <label for="edit-profile-bio" class="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">
                User Bio (Max 160 characters)
              </label>
              <textarea
                id="edit-profile-bio"
                bind:value={bioInput}
                rows="2"
                maxlength="160"
                placeholder="e.g. Formal logic researcher & Copi enthusiast..."
                class="w-full p-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-sans focus:outline-none focus:border-neutral-900 dark:focus:border-white"
              ></textarea>
            </div>

            <!-- Fallback Color Selector -->
            <div>
              <span class="block text-[10px] uppercase text-neutral-500 mb-1.5 font-bold">
                Fallback Tone / Accent Color
              </span>
              <div class="flex items-center gap-2">
                {#each colorPalette as col}
                  <button
                    type="button"
                    on:click={() => (selectedColor = col)}
                    class="w-6 h-6 border-2 cursor-pointer transition-transform {
                      selectedColor === col ? 'scale-125 border-neutral-950 dark:border-white' : 'border-transparent hover:scale-110'
                    }"
                    style="background-color: {col};"
                    aria-label="Pick color"
                  ></button>
                {/each}
              </div>
            </div>

            <!-- Save / Cancel Buttons -->
            <div class="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isSavingProfile || imageProcessing}
                class="flex-1 h-9 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs uppercase tracking-wider font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isSavingProfile ? 'Saving Changes...' : 'Save Profile'}
              </button>
              <button
                type="button"
                on:click={() => (isEditing = false)}
                class="px-4 h-9 border border-neutral-300 dark:border-neutral-700 text-xs uppercase cursor-pointer hover:border-neutral-900 dark:hover:border-white"
              >
                Cancel
              </button>
            </div>
          </form>
        {/if}

        <!-- CORE STATISTICS: Total Solved, Leaderboard Standing, Streak -->
        <div class="space-y-2">
          <span class="text-[10px] font-sans uppercase tracking-widest text-neutral-500 block">
            Deductive Statistics
          </span>
          <div class="grid grid-cols-3 gap-2.5 font-sans">
            <!-- Total Solved -->
            <div class="border border-neutral-200 dark:border-neutral-800 p-3 text-center bg-neutral-50/40 dark:bg-neutral-900/30">
              <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Solved
              </div>
              <div class="text-xl font-bold font-sans mt-0.5 text-neutral-950 dark:text-neutral-50">
                {$authStore.user.totalSolved ?? (($authStore.user.totalWordleSolved || 0) + ($authStore.user.totalFrenzySolved || 0))}
              </div>
              <div class="text-[9px] text-neutral-400 mt-0.5">
                {$authStore.user.totalWordleSolved || 0} Daily · {$authStore.user.totalFrenzySolved || 0} Frenzy
              </div>
            </div>

            <!-- Leaderboard Standing -->
            <div class="border border-neutral-200 dark:border-neutral-800 p-3 text-center bg-neutral-50/40 dark:bg-neutral-900/30">
              <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Standing
              </div>
              <div class="text-xl font-bold font-sans mt-0.5 text-neutral-950 dark:text-neutral-50">
                {$authStore.user.optOutLeaderboard ? 'Opted Out' : ($authStore.user.leaderboardStanding || 'Unranked')}
              </div>
              <div class="text-[9px] text-neutral-400 mt-0.5">
                {$authStore.user.optOutLeaderboard ? 'Hidden from ranks' : 'Global Frenzy Rank'}
              </div>
            </div>

            <!-- Streak Metric -->
            <div class="border border-neutral-200 dark:border-neutral-800 p-3 text-center bg-neutral-50/40 dark:bg-neutral-900/30">
              <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Daily Streak
              </div>
              <div class="text-xl font-bold font-sans mt-0.5 text-neutral-950 dark:text-neutral-50">
                🔥 {$authStore.user.streakCount || 0}
              </div>
              <div class="text-[9px] text-neutral-400 mt-0.5">
                Best: ★ {$authStore.user.bestStreak || 0}
              </div>
            </div>
          </div>
        </div>

        <!-- ACTIVITY HEATMAP -->
        <div class="space-y-2 font-sans">
          <div class="flex items-baseline justify-between">
            <span class="text-[10px] uppercase tracking-widest text-neutral-500">
              Activity Heatmap · Last 11 Weeks
            </span>
            <span class="text-[10px] text-neutral-400">
              {activeDaysCount} active days
            </span>
          </div>

          <div class="border border-neutral-200 dark:border-neutral-800 p-3.5 bg-neutral-50/30 dark:bg-neutral-900/20 space-y-2">
            <!-- Calendar Grid: 11 columns x 7 days -->
            <div class="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              {#each Array(11) as _, colIdx}
                <div class="flex flex-col gap-1">
                  {#each Array(7) as _, rowIdx}
                    {@const dayIdx = colIdx * 7 + rowIdx}
                    {@const day = heatmapDays[dayIdx]}
                    {#if day}
                      <div
                        role="presentation"
                        on:mouseenter={() => (hoveredDay = day)}
                        on:mouseleave={() => (hoveredDay = null)}
                        class="w-3.5 h-3.5 rounded-[1px] transition-colors cursor-pointer {
                          day.count === 0
                            ? 'bg-neutral-200 dark:bg-neutral-800'
                            : day.count === 1
                            ? 'bg-neutral-400 dark:bg-neutral-500'
                            : day.count === 2
                            ? 'bg-neutral-700 dark:bg-neutral-300'
                            : 'bg-neutral-950 dark:bg-white'
                        }"
                        aria-label="{day.formatted}: {day.count} deductions"
                      ></div>
                    {/if}
                  {/each}
                </div>
              {/each}
            </div>

            <!-- Heatmap Legend & Tooltip readout -->
            <div class="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-100 dark:border-neutral-900">
              <div class="min-h-[16px] truncate font-sans">
                {#if hoveredDay}
                  <span class="text-neutral-900 dark:text-neutral-100 font-bold">{hoveredDay.formatted}</span>: {hoveredDay.count} {hoveredDay.count === 1 ? 'deduction' : 'deductions'}
                {:else}
                  Hover over a cell to view daily records
                {/if}
              </div>

              <div class="flex items-center gap-1">
                <span class="text-[9px] mr-0.5">Less</span>
                <div class="w-2.5 h-2.5 rounded-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                <div class="w-2.5 h-2.5 rounded-[1px] bg-neutral-400 dark:bg-neutral-500"></div>
                <div class="w-2.5 h-2.5 rounded-[1px] bg-neutral-700 dark:bg-neutral-300"></div>
                <div class="w-2.5 h-2.5 rounded-[1px] bg-neutral-950 dark:bg-white"></div>
                <span class="text-[9px] ml-0.5">More</span>
              </div>
            </div>
          </div>
        </div>

      <!-- TAB 2: ACCOUNT SETTINGS -->
      {:else if activeTab === 'settings'}
        <div class="space-y-6 font-sans text-xs">

          <!-- Section 1: Privacy & Leaderboard Visibility -->
          <div class="p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 space-y-3">
            <div class="font-bold uppercase tracking-wider text-[11px] text-neutral-950 dark:text-neutral-50">
              Privacy & Leaderboard Participation
            </div>
            <p class="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Control whether your username, solve times, and frenzy scores appear on public ranking leaderboards.
            </p>

            <label class="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                bind:checked={optOutLeaderboard}
                on:change={handleToggleLeaderboardOptOut}
                disabled={isUpdatingPrivacy}
                class="w-4 h-4 rounded-none accent-black dark:accent-white cursor-pointer"
              />
              <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Opt out of public leaderboards (Hide profile from rankings)
              </span>
            </label>

            {#if privacyMessage}
              <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ {privacyMessage}
              </div>
            {/if}
          </div>

          <!-- Section 2: Password Management -->
          <form on:submit|preventDefault={handleChangePassword} class="p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 space-y-3">
            <div class="font-bold uppercase tracking-wider text-[11px] text-neutral-950 dark:text-neutral-50">
              {$authStore.user.hasPassword === false ? 'Attach Account Password' : 'Security & Password Reset'}
            </div>
            {#if $authStore.user.hasPassword === false}
              <p class="text-[11px] text-amber-700 dark:text-amber-400">
                Your account was created via OAuth and currently has no password attached. Attach a password to enable direct username & password sign in.
              </p>
            {/if}

            {#if passwordErrorMessage}
              <div class="p-2 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                • {passwordErrorMessage}
              </div>
            {/if}
            {#if passwordStatusMessage}
              <div class="p-2 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
                ✓ {passwordStatusMessage}
              </div>
            {/if}

            {#if $authStore.user.hasPassword !== false}
              <div>
                <label for="current-password-input" class="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">
                  Current Password
                </label>
                <input
                  id="current-password-input"
                  type="password"
                  bind:value={currentPasswordInput}
                  class="w-full h-8 px-2.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  placeholder="••••••••"
                />
              </div>
            {/if}

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label for="new-password-input" class="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">
                  {$authStore.user.hasPassword === false ? 'Choose Password' : 'New Password'}
                </label>
                <input
                  id="new-password-input"
                  type="password"
                  bind:value={newPasswordInput}
                  minlength="6"
                  class="w-full h-8 px-2.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label for="confirm-password-input" class="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">
                  Confirm Password
                </label>
                <input
                  id="confirm-password-input"
                  type="password"
                  bind:value={confirmPasswordInput}
                  minlength="6"
                  class="w-full h-8 px-2.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              class="h-8 px-4 border border-neutral-900 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs uppercase font-bold tracking-wider hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {isChangingPassword ? 'Saving...' : ($authStore.user.hasPassword === false ? 'Attach Password to Account' : 'Update Password')}
            </button>
          </form>

          <!-- Section 3: Connected Accounts (Google / GitHub) -->
          <div class="p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 space-y-3">
            <div class="font-bold uppercase tracking-wider text-[11px] text-neutral-950 dark:text-neutral-50">
              Connected Accounts (OAuth)
            </div>
            <p class="text-[11px] text-neutral-600 dark:text-neutral-400">
              Link third-party identities for instant authentication.
            </p>

            {#if oauthMessage}
              <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ {oauthMessage}
              </div>
            {/if}
            {#if oauthError}
              <div class="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                • {oauthError}
              </div>
            {/if}

            <div class="space-y-2">
              <!-- Google Account -->
              <div class="flex items-center justify-between p-2.5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                <div class="flex items-center gap-2.5">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                    G
                  </div>
                  <div>
                    <div class="font-bold text-xs">Google</div>
                    <div class="text-[10px] text-neutral-400">
                      {$authStore.user.googleConnected ? 'Connected' : 'Not linked'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isConnectingOAuth}
                  on:click={() => handleOAuthToggle('google', Boolean($authStore.user?.googleConnected))}
                  class="px-2.5 py-1 border text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-colors {
                    $authStore.user.googleConnected
                      ? 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-rose-500 hover:text-rose-600'
                      : 'border-neutral-900 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                  }"
                >
                  {$authStore.user.googleConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              <!-- GitHub Account -->
              <div class="flex items-center justify-between p-2.5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                <div class="flex items-center gap-2.5">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                    gh
                  </div>
                  <div>
                    <div class="font-bold text-xs">GitHub</div>
                    <div class="text-[10px] text-neutral-400">
                      {$authStore.user.githubConnected ? 'Connected' : 'Not linked'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isConnectingOAuth}
                  on:click={() => handleOAuthToggle('github', Boolean($authStore.user?.githubConnected))}
                  class="px-2.5 py-1 border text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-colors {
                    $authStore.user.githubConnected
                      ? 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-rose-500 hover:text-rose-600'
                      : 'border-neutral-900 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-neutral-950'
                  }"
                >
                  {$authStore.user.githubConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          <!-- Section 4: DANGER ZONE -->
          <div class="p-4 border-2 border-rose-600/80 bg-rose-50/20 dark:bg-rose-950/20 space-y-4">
            <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold uppercase tracking-widest text-[11px]">
              <span>⚠ DANGER ZONE</span>
              <span class="text-[9px] font-normal text-neutral-500">(Irreversible actions)</span>
            </div>

            <!-- Danger Item 1: Reset Stats -->
            <div class="flex items-center justify-between pt-1 border-t border-rose-200 dark:border-rose-900/60">
              <div class="pr-3">
                <div class="font-bold text-neutral-900 dark:text-neutral-100">
                  Reset Account Statistics
                </div>
                <div class="text-[10px] text-neutral-500">
                  Clears all solve completions, frenzy scores, and active daily streaks.
                </div>
              </div>
              <button
                type="button"
                on:click={() => openDangerDialog('reset-stats')}
                class="px-3 py-1.5 border border-rose-600 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-colors shrink-0"
              >
                Reset Stats
              </button>
            </div>

            <!-- Danger Item 2: Delete Account -->
            <div class="flex items-center justify-between pt-2 border-t border-rose-200 dark:border-rose-900/60">
              <div class="pr-3">
                <div class="font-bold text-rose-700 dark:text-rose-400">
                  Delete Account Permanently
                </div>
                <div class="text-[10px] text-neutral-500">
                  Permanently destroys your logician account, saved proofs, and identity records.
                </div>
              </div>
              <button
                type="button"
                on:click={() => openDangerDialog('delete-account')}
                class="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-colors shrink-0"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Footer Sign Out & Done -->
      <div class="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <button
          type="button"
          on:click={handleLogout}
          class="text-xs font-sans text-rose-600 dark:text-rose-400 hover:underline uppercase tracking-wider cursor-pointer"
        >
          Sign Out of Account
        </button>

        <button
          type="button"
          on:click={() => dispatch('close')}
          class="px-4 py-1.5 border border-neutral-900 dark:border-white text-xs font-sans uppercase font-bold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>

  <!-- INTENSE DANGER CONFIRMATION MODAL OVERLAY -->
  {#if activeDangerAction}
    <div
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="presentation"
    >
      <div
        class="w-full max-w-md bg-white dark:bg-neutral-950 border-2 border-rose-600 p-6 space-y-4 shadow-2xl font-sans"
        role="alertdialog"
        aria-modal="true"
      >
        <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold tracking-widest text-xs uppercase">
          <span>⚠ CRITICAL CONFIRMATION REQUIRED</span>
        </div>

        {#if activeDangerAction === 'reset-stats'}
          <h3 class="text-base font-bold text-neutral-950 dark:text-neutral-50">
            Reset All Deductive Records?
          </h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            This will permanently delete your daily solve history, frenzy high scores, and reset your streak back to 0. This cannot be undone.
          </p>
          <div class="p-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs">
            To proceed, type <span class="font-sans font-bold text-neutral-950 dark:text-neutral-100 select-all">RESET STATS</span> below:
          </div>
          <input
            type="text"
            bind:value={dangerConfirmInput}
            placeholder="RESET STATS"
            class="w-full h-9 px-3 border border-rose-500 bg-white dark:bg-neutral-950 text-xs font-sans font-bold focus:outline-none"
          />
        {:else if activeDangerAction === 'delete-account'}
          <h3 class="text-base font-bold text-rose-600 dark:text-rose-400">
            Permanently Delete Entire Account?
          </h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            This will completely remove your logician credentials, avatar, user bio, all saved proofs, and all deductive records. You will immediately be signed out.
          </p>
          <div class="p-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs">
            To proceed, type your exact username <span class="font-sans font-bold text-neutral-950 dark:text-neutral-100 select-all">{$authStore.user.username}</span> below:
          </div>
          <input
            type="text"
            bind:value={dangerConfirmInput}
            placeholder={$authStore.user.username}
            class="w-full h-9 px-3 border border-rose-500 bg-white dark:bg-neutral-950 text-xs font-sans font-bold focus:outline-none"
          />
        {/if}

        {#if dangerErrorMessage}
          <div class="p-2 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
            • {dangerErrorMessage}
          </div>
        {/if}

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            on:click={closeDangerDialog}
            class="flex-1 h-9 border border-neutral-300 dark:border-neutral-700 text-xs uppercase font-bold cursor-pointer hover:border-neutral-900 dark:hover:border-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              isExecutingDangerAction ||
              (activeDangerAction === 'reset-stats' && dangerConfirmInput.trim() !== 'RESET STATS') ||
              (activeDangerAction === 'delete-account' && dangerConfirmInput.trim() !== $authStore.user.username)
            }
            on:click={handleExecuteDangerAction}
            class="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white text-xs uppercase font-bold tracking-wider cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isExecutingDangerAction ? 'Executing...' : 'Confirm Action'}
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}
