<script lang="ts">
  import { startGitHubOAuth, fetchOAuthConfig } from '../logic/oauth';
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
        passwordStatusMessage = needsCurrentPassword ? 'Password updated securely.' : 'Password added';
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
  async function handleOAuthToggle(provider: 'github', currentlyConnected: boolean) {
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
          oauthMessage = data.message || 'GitHub disconnected';
          await authStore.checkAuth();
        } else {
          oauthError = data.error || 'Failed to disconnect GitHub account.';
        }
      } else {
        // Connect / Link GitHub through the real sign-in flow (state-checked on return)
        const cfg = await fetchOAuthConfig();
        if (cfg.githubClientId) {
          await startGitHubOAuth(cfg.githubClientId);
          return;
        }
        if (!cfg.devMode) {
          oauthError = 'GitHub sign-in is not configured for this deployment.';
          return;
        }
        // Local development only (ALLOW_DEV_OAUTH=1)
        const res = await fetch('/api/auth/oauth/github', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-xl bg-card border border-line text-ink p-6 sm:p-7 space-y-5  max-h-[92vh] overflow-y-auto rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between border-b border-line pb-3">
        <div>
          <span class="text-meta font-sans text-ink-3 block mb-0.5">
            Profile
          </span>
          <h2 class="text-xl font-medium font-sans tracking-tight">
            {$authStore.user.username}
          </h2>
        </div>
        <button aria-label="Close"
          type="button"
          on:click={() => dispatch('close')}
          class="btn-icon -mr-2 shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Navigation Tabs: Profile vs Account Settings -->
      <div class="flex border-b border-line gap-2 font-sans text-xs font-medium">
        <button
          type="button"
          on:click={() => (activeTab = 'profile')}
          class="pb-2 px-3 border-b-2 transition-colors cursor-pointer {
 activeTab === 'profile'
 ? 'border-ink text-ink font-medium'
 : 'border-transparent text-ink-3 hover:text-ink-2 '
 }"
        >
          Profile
        </button>
        <button
          type="button"
          on:click={() => (activeTab = 'settings')}
          class="pb-2 px-3 border-b-2 transition-colors cursor-pointer {
 activeTab === 'settings'
 ? 'border-ink text-ink font-medium'
 : 'border-transparent text-ink-3 hover:text-ink-2 '
 }"
        >
          Account settings
        </button>
      </div>

      <!-- TAB 1: PROFILE DOSSIER -->
      {#if activeTab === 'profile'}
        <!-- Identity Summary Card -->
        <div class="flex items-start gap-4 p-4 border border-line bg-raised/50 rounded-xl">
          <!-- User Avatar Photo / Color Block -->
          <div
            class="w-16 h-16 rounded-none flex items-center justify-center text-paper font-serif text-2xl shadow-sm border border-ink shrink-0 select-none overflow-hidden relative"
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
              <span class="font-medium text-base text-ink">
                {$authStore.user.username}
              </span>
              <span class="px-1.5 py-0.2 text-meta font-medium border border-ink bg-card text-ink">
                {$authStore.user.rankTitle || 'Axiomatic Apprentice'}
              </span>
            </div>

            <!-- Bio -->
            {#if $authStore.user.bio}
              <p class="text-xs text-ink-2 mt-1 leading-snug">
                "{$authStore.user.bio}"
              </p>
            {:else}
              <p class="text-meta text-ink-3 mt-1">
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
                class="text-meta font-sans font-medium text-ink-2 underline hover:text-ink cursor-pointer"
              >
                {isEditing ? 'Cancel' : 'Edit profile'}
              </button>
            </div>
          </div>
        </div>

        {#if $authStore.user.hasPassword === false}
          <div class="p-3 border border-line-strong bg-raised flex items-center justify-between text-xs font-sans rounded-xl">
            <div>
              <div class="font-medium text-ink">No password attached</div>
              <div class="text-meta text-ink-3">Attach a password to allow signing in without GitHub.</div>
            </div>
            <button
              type="button"
              on:click={() => (activeTab = 'settings')}
              class="px-2.5 py-1 bg-ink hover:bg-ink text-paper text-meta font-medium cursor-pointer rounded-lg"
            >
              Attach Password
            </button>
          </div>
        {/if}

        <!-- PROFILE EDIT FORM -->
        {#if isEditing}
          <form on:submit|preventDefault={handleSaveProfile} class="p-4 border border-ink bg-raised space-y-4 font-sans text-xs rounded-xl">
            <div class="font-medium text-meta text-ink border-b border-line pb-2">
              Edit profile
            </div>

            {#if profileErrorMessage}
              <div class="p-2.5 border border-ink bg-raised text-ink text-xs rounded-xl">
                • {profileErrorMessage}
              </div>
            {/if}
            {#if profileStatusMessage}
              <div class="p-2.5 border border-ink bg-raised text-ink text-xs rounded-xl">
                 {profileStatusMessage}
              </div>
            {/if}

            <!-- Avatar Picture Upload -->
            <div>
              <span class="block text-meta text-ink-3 mb-1.5 font-medium">
                Profile picture
              </span>
              <div class="flex items-center gap-4">
                <div
                  class="w-14 h-14 border border-ink flex items-center justify-center text-paper font-serif text-xl shrink-0 overflow-hidden"
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
                      class="px-2.5 py-1 border border-ink text-meta font-medium cursor-pointer hover:bg-raised transition-colors inline-block rounded-xl"
                    >
                      {imageProcessing ? 'Compressing' : 'Upload image'}
                    </label>
                    {#if avatarImageInput}
                      <button
                        type="button"
                        on:click={handleRemoveAvatarImage}
                        class="text-meta text-ink hover:underline cursor-pointer"
                      >
                        Remove image
                      </button>
                    {/if}
                  </div>
                  <p class="text-meta text-ink-3">
                    Client-side compressed to ~15KB (160×160). Max file 5MB.
                  </p>
                </div>
              </div>
            </div>

            <!-- Username Input -->
            <div>
              <label for="edit-profile-username" class="block text-meta text-ink-3 mb-1 font-medium">
                Username
              </label>
              <input
                id="edit-profile-username"
                type="text"
                bind:value={usernameInput}
                required
                minlength="3"
                class="w-full h-8 px-2.5 bg-card border border-line-strong text-xs font-sans focus:outline-none focus:border-ink rounded-lg"
              />
            </div>

            <!-- Bio Input -->
            <div>
              <label for="edit-profile-bio" class="block text-meta text-ink-3 mb-1 font-medium">
                Bio, up to 160 characters
              </label>
              <textarea
                id="edit-profile-bio"
                bind:value={bioInput}
                rows="2"
                maxlength="160"
                placeholder="e.g. Formal logic researcher & Copi enthusiast..."
                class="w-full p-2 bg-card border border-line-strong text-xs font-sans focus:outline-none focus:border-ink rounded-lg"
              ></textarea>
            </div>

            <!-- Fallback Color Selector -->
            <div>
              <span class="block text-meta text-ink-3 mb-1.5 font-medium">
                Avatar color
              </span>
              <div class="flex items-center gap-2">
                {#each colorPalette as col}
                  <button
                    type="button"
                    on:click={() => (selectedColor = col)}
                    class="w-6 h-6 border-2 cursor-pointer transition-transform {
 selectedColor === col ? 'scale-125 border-ink ' : 'border-transparent '
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
                class="flex-1 h-9 bg-ink text-paper text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 rounded-lg"
              >
                {isSavingProfile ? 'Saving' : 'Save'}
              </button>
              <button
                type="button"
                on:click={() => (isEditing = false)}
                class="px-4 h-9 border border-line-strong text-xs cursor-pointer hover:border-ink rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        {/if}

        <!-- CORE STATISTICS: Solved, Leaderboard Standing, Streak -->
        <div class="space-y-2">
          <span class="text-meta font-sans text-ink-3 block">
            Stats
          </span>
          <div class="grid grid-cols-3 gap-2.5 font-sans">
            <!-- Solved -->
            <div class="border border-line p-3 text-center bg-raised/40 rounded-xl">
              <div class="text-meta text-ink-3">
                Solved
              </div>
              <div class="text-xl font-medium font-sans mt-0.5 text-ink">
                {$authStore.user.totalSolved ?? (($authStore.user.totalWordleSolved || 0) + ($authStore.user.totalFrenzySolved || 0))}
              </div>
              <div class="text-meta text-ink-3 mt-0.5">
                {$authStore.user.totalWordleSolved || 0} Daily · {$authStore.user.totalFrenzySolved || 0} Frenzy
              </div>
            </div>

            <!-- Leaderboard Standing -->
            <div class="border border-line p-3 text-center bg-raised/40 rounded-xl">
              <div class="text-meta text-ink-3">
                Standing
              </div>
              <div class="text-xl font-medium font-sans mt-0.5 text-ink">
                {$authStore.user.optOutLeaderboard ? 'Hidden' : ($authStore.user.leaderboardStanding || 'Unranked')}
              </div>
              <div class="text-meta text-ink-3 mt-0.5">
                {$authStore.user.optOutLeaderboard ? 'Hidden from ranks' : 'Frenzy rank'}
              </div>
            </div>

            <!-- Streak Metric -->
            <div class="border border-line p-3 text-center bg-raised/40 rounded-xl">
              <div class="text-meta text-ink-3">
                Daily streak
              </div>
              <div class="text-xl font-medium font-sans mt-0.5 text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="inline -mt-0.5 mr-1"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>{$authStore.user.streakCount || 0}
              </div>
              <div class="text-meta text-ink-3 mt-0.5">
                Best {$authStore.user.bestStreak || 0}
              </div>
            </div>
          </div>
        </div>

        <!-- ACTIVITY HEATMAP -->
        <div class="space-y-2 font-sans">
          <div class="flex items-baseline justify-between">
            <span class="text-meta text-ink-3">
              Activity, last 11 weeks
            </span>
            <span class="text-meta text-ink-3">
              {activeDaysCount} active days
            </span>
          </div>

          <div class="border border-line p-3.5 bg-raised/30 space-y-2 rounded-xl">
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
 ? 'bg-raised '
 : day.count === 1
 ? 'bg-line-strong '
 : day.count === 2
 ? 'bg-ink-2 '
 : 'bg-ink '
 }"
                        aria-label="{day.formatted}: {day.count} deductions"
                      ></div>
                    {/if}
                  {/each}
                </div>
              {/each}
            </div>

            <!-- Heatmap Legend & Tooltip readout -->
            <div class="flex items-center justify-between text-meta text-ink-3 pt-1 border-t border-line">
              <div class="min-h-[16px] truncate font-sans">
                {#if hoveredDay}
                  <span class="text-ink font-medium">{hoveredDay.formatted}</span>: {hoveredDay.count} {hoveredDay.count === 1 ? 'deduction' : 'deductions'}
                {:else}
                  Hover over a cell to view daily records
                {/if}
              </div>

              <div class="flex items-center gap-1">
                <span class="text-meta mr-0.5">Less</span>
                <div class="w-2.5 h-2.5 rounded-[1px] bg-raised"></div>
                <div class="w-2.5 h-2.5 rounded-[1px] bg-line-strong"></div>
                <div class="w-2.5 h-2.5 rounded-[1px] bg-ink-2"></div>
                <div class="w-2.5 h-2.5 rounded-[1px] bg-ink"></div>
                <span class="text-meta ml-0.5">More</span>
              </div>
            </div>
          </div>
        </div>

      <!-- TAB 2: ACCOUNT SETTINGS -->
      {:else if activeTab === 'settings'}
        <div class="space-y-6 font-sans text-xs">

          <!-- Section 1: Privacy & Leaderboard Visibility -->
          <div class="p-4 border border-line bg-raised/40 space-y-3 rounded-xl">
            <div class="font-medium text-meta text-ink">
              Leaderboard
            </div>
            <p class="text-meta text-ink-2 leading-relaxed">
              Control whether your username, solve times, and frenzy scores appear on public ranking leaderboards.
            </p>

            <label class="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                bind:checked={optOutLeaderboard}
                on:change={handleToggleLeaderboardOptOut}
                disabled={isUpdatingPrivacy}
                class="w-4 h-4 rounded-none accent-black cursor-pointer"
              />
              <span class="text-xs font-semibold text-ink">
                Opt out of public leaderboards (Hide profile from rankings)
              </span>
            </label>

            {#if privacyMessage}
              <div class="text-meta text-ink font-medium">
                 {privacyMessage}
              </div>
            {/if}
          </div>

          <!-- Section 2: Password Management -->
          <form on:submit|preventDefault={handleChangePassword} class="p-4 border border-line bg-raised/40 space-y-3 rounded-xl">
            <div class="font-medium text-meta text-ink">
              {$authStore.user.hasPassword === false ? 'Add a password' : 'Password'}
            </div>
            {#if $authStore.user.hasPassword === false}
              <p class="text-meta text-ink">
                Your account was created via OAuth and currently has no password attached. Attach a password to enable direct username & password sign in.
              </p>
            {/if}

            {#if passwordErrorMessage}
              <div class="p-2 border border-ink bg-raised text-ink text-xs rounded-xl">
                • {passwordErrorMessage}
              </div>
            {/if}
            {#if passwordStatusMessage}
              <div class="p-2 border border-ink bg-raised text-ink text-xs rounded-xl">
                 {passwordStatusMessage}
              </div>
            {/if}

            {#if $authStore.user.hasPassword !== false}
              <div>
                <label for="current-password-input" class="block text-meta text-ink-3 mb-1 font-medium">
                  Current password
                </label>
                <input
                  id="current-password-input"
                  type="password"
                  bind:value={currentPasswordInput}
                  class="w-full h-8 px-2.5 bg-card border border-line-strong text-xs focus:outline-none focus:border-ink rounded-lg"
                  placeholder="••••••••"
                />
              </div>
            {/if}

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label for="new-password-input" class="block text-meta text-ink-3 mb-1 font-medium">
                  {$authStore.user.hasPassword === false ? 'Password' : 'New password'}
                </label>
                <input
                  id="new-password-input"
                  type="password"
                  bind:value={newPasswordInput}
                  minlength="6"
                  class="w-full h-8 px-2.5 bg-card border border-line-strong text-xs focus:outline-none focus:border-ink rounded-lg"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label for="confirm-password-input" class="block text-meta text-ink-3 mb-1 font-medium">
                  Confirm password
                </label>
                <input
                  id="confirm-password-input"
                  type="password"
                  bind:value={confirmPasswordInput}
                  minlength="6"
                  class="w-full h-8 px-2.5 bg-card border border-line-strong text-xs focus:outline-none focus:border-ink rounded-lg"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              class="h-8 px-4 border border-ink bg-ink text-paper text-xs font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer rounded-lg"
            >
              {isChangingPassword ? 'Saving' : ($authStore.user.hasPassword === false ? 'Add password' : 'Update password')}
            </button>
          </form>

          <!-- Section 3: Connected Accounts (GitHub OAuth) -->
          <div class="p-4 border border-line bg-raised/40 space-y-3 rounded-xl">
            <div class="font-medium text-meta text-ink">
              Connected accounts
            </div>
            <p class="text-meta text-ink-2">
              Link your GitHub identity for instant authentication.
            </p>

            {#if oauthMessage}
              <div class="text-meta text-ink font-medium">
                 {oauthMessage}
              </div>
            {/if}
            {#if oauthError}
              <div class="text-meta text-ink font-medium">
                • {oauthError}
              </div>
            {/if}

            <div class="space-y-2">

              <!-- GitHub Account -->
              <div class="flex items-center justify-between p-2.5 border border-line bg-card rounded-xl">
                <div class="flex items-center gap-2.5">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs bg-raised text-ink">
                    gh
                  </div>
                  <div>
                    <div class="font-medium text-xs">GitHub</div>
                    <div class="text-meta text-ink-3">
                      {$authStore.user.githubConnected ? 'Connected' : 'Not linked'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isConnectingOAuth}
                  on:click={() => handleOAuthToggle('github', Boolean($authStore.user?.githubConnected))}
                  class="px-2.5 py-1 border text-meta font-medium cursor-pointer transition-colors {
 $authStore.user.githubConnected
 ? 'border-line-strong text-ink-2 hover:border-ink hover:text-ink'
 : 'border-ink bg-ink text-paper '
 } rounded-lg"
                >
                  {$authStore.user.githubConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          <!-- Section 4: DANGER ZONE -->
          <div class="p-4 border-2 border-ink bg-raised space-y-4">
            <div class="flex items-center gap-2 text-ink font-medium text-meta">
              <span>Danger zone</span>
              <span class="text-meta font-normal text-ink-3">(Irreversible actions)</span>
            </div>

            <!-- Danger Item 1: Reset stats -->
            <div class="flex items-center justify-between pt-1 border-t border-line-strong">
              <div class="pr-3">
                <div class="font-medium text-ink">
                  Reset stats
                </div>
                <div class="text-meta text-ink-3">
                  Clears all solve completions, frenzy scores, and active daily streaks.
                </div>
              </div>
              <button
                type="button"
                on:click={() => openDangerDialog('reset-stats')}
                class="px-3 py-1.5 border border-ink text-ink hover:bg-ink hover:text-paper text-meta font-medium cursor-pointer transition-colors shrink-0 rounded-lg"
              >
                Reset stats
              </button>
            </div>

            <!-- Danger Item 2: Delete account -->
            <div class="flex items-center justify-between pt-2 border-t border-line-strong">
              <div class="pr-3">
                <div class="font-medium text-ink">
                  Delete account permanently
                </div>
                <div class="text-meta text-ink-3">
                  Permanently destroys your logician account, saved proofs, and identity records.
                </div>
              </div>
              <button
                type="button"
                on:click={() => openDangerDialog('delete-account')}
                class="px-3 py-1.5 bg-ink text-paper hover:bg-ink text-meta font-medium cursor-pointer transition-colors shrink-0 rounded-lg"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Footer Sign Out & Done -->
      <div class="pt-3 border-t border-line flex items-center justify-between">
        <button
          type="button"
          on:click={handleLogout}
          class="text-xs font-sans text-ink hover:underline cursor-pointer"
        >
          Sign out
        </button>

        <button
          type="button"
          on:click={() => dispatch('close')}
          class="px-4 py-1.5 border border-ink text-xs font-sans font-medium cursor-pointer hover:bg-raised transition-colors rounded-lg"
        >
          Done
        </button>
      </div>
    </div>
  </div>

  <!-- INTENSE DANGER CONFIRMATION MODAL OVERLAY -->
  {#if activeDangerAction}
    <div
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
      role="presentation"
    >
      <div
        class="w-full max-w-md bg-card border-2 border-line p-6 space-y-4  font-sans rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        role="alertdialog"
        aria-modal="true"
      >
        <div class="flex items-center gap-2 text-ink font-medium text-xs">
          <span>Confirm this action</span>
        </div>

        {#if activeDangerAction === 'reset-stats'}
          <h3 class="text-base font-medium text-ink">
            Reset all your stats?
          </h3>
          <p class="text-xs text-ink-2 leading-relaxed">
            This will permanently delete your daily solve history, frenzy high scores, and reset your streak back to 0. This cannot be undone.
          </p>
          <div class="p-2.5 bg-raised border border-line-strong text-xs rounded-xl">
            To proceed, type <span class="font-sans font-medium text-ink select-all">RESET STATS</span> below:
          </div>
          <input
            type="text"
            bind:value={dangerConfirmInput}
            placeholder="RESET STATS"
            class="w-full h-9 px-3 border border-ink bg-card text-xs font-sans font-medium focus:outline-none rounded-lg"
          />
        {:else if activeDangerAction === 'delete-account'}
          <h3 class="text-base font-medium text-ink">
            Delete your account?
          </h3>
          <p class="text-xs text-ink-2 leading-relaxed">
            This will completely remove your logician credentials, avatar, user bio, all saved proofs, and all deductive records. You will immediately be signed out.
          </p>
          <div class="p-2.5 bg-raised border border-line-strong text-xs rounded-xl">
            To proceed, type your exact username <span class="font-sans font-medium text-ink select-all">{$authStore.user.username}</span> below:
          </div>
          <input
            type="text"
            bind:value={dangerConfirmInput}
            placeholder={$authStore.user.username}
            class="w-full h-9 px-3 border border-ink bg-card text-xs font-sans font-medium focus:outline-none rounded-lg"
          />
        {/if}

        {#if dangerErrorMessage}
          <div class="p-2 border border-ink bg-raised text-ink text-xs rounded-xl">
            • {dangerErrorMessage}
          </div>
        {/if}

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            on:click={closeDangerDialog}
            class="flex-1 h-9 border border-line-strong text-xs font-medium cursor-pointer hover:border-ink rounded-lg"
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
            class="flex-1 h-9 bg-ink hover:bg-ink text-paper text-xs font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
          >
            {isExecutingDangerAction ? 'Working' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}
