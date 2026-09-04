<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore } from '../stores/auth';

  export let isOpen: boolean = false;
  export let username: string | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  interface PublicProfile {
    username: string;
    bio: string;
    avatarColor: string;
    avatarIcon: string;
    avatarImage: string;
    rankTitle: string;
    totalSolved: number;
    leaderboardStanding: string;
    streakCount: number;
    bestStreak: number;
    createdAt: string;
    activityMap: Record<string, number>;
  }

  let profile: PublicProfile | null = null;
  let loading: boolean = false;
  let fetchError: string = '';

  // Reporting System State
  let isReporting: boolean = false;
  let reportReason: string = 'Inappropriate username';
  let reportDetails: string = '';
  let isSubmittingReport: boolean = false;
  let reportSuccessMessage: string = '';
  let reportErrorMessage: string = '';

  // Heatmap hover state
  let hoveredDay: { date: string; count: number; formatted: string } | null = null;

  const reportReasons = [
    'Inappropriate or offensive username',
    'Offensive profile picture / avatar',
    'Inappropriate bio or profile text',
    'Cheating or automated solves',
    'Harassment or hate speech',
    'Other violation',
  ];

  // Fetch public profile whenever opened for a username
  $: if (isOpen && username) {
    fetchProfile(username);
    isReporting = false;
    reportSuccessMessage = '';
    reportErrorMessage = '';
  }

  async function fetchProfile(targetUser: string) {
    loading = true;
    fetchError = '';
    profile = null;

    try {
      const res = await fetch(`/api/user/profile/${encodeURIComponent(targetUser)}`);
      const data = await res.json();
      if (!res.ok) {
        fetchError = data.error || 'Logician profile could not be found.';
      } else {
        profile = data.user;
      }
    } catch {
      fetchError = 'Network error while retrieving profile.';
    } finally {
      loading = false;
    }
  }

  async function handleSubmitReport() {
    if (!profile) return;
    reportErrorMessage = '';
    reportSuccessMessage = '';
    isSubmittingReport = true;

    const token = $authStore.token || localStorage.getItem('goodle_token');

    try {
      const res = await fetch('/api/user/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          reportedUsername: profile.username,
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        reportErrorMessage = data.error || 'Failed to submit report.';
      } else {
        reportSuccessMessage = data.message || 'Report submitted. Thank you for keeping the gödle space safe.';
        setTimeout(() => {
          isReporting = false;
          reportSuccessMessage = '';
          reportDetails = '';
        }, 1800);
      }
    } catch {
      reportErrorMessage = 'Network error while sending report.';
    } finally {
      isSubmittingReport = false;
    }
  }

  // Generate 77 days (11 weeks of 7 days) for the calendar heatmap
  function getHeatmapData(activityMap: Record<string, number> = {}) {
    const totalDays = 77;
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

  $: heatmapDays = getHeatmapData(profile?.activityMap || {});
  $: activeDaysCount = heatmapDays.filter(d => d.count > 0).length;

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget && !isReporting) {
      dispatch('close');
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[2px] transition-opacity"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-neutral-950 border border-neutral-900 dark:border-neutral-200 text-neutral-900 dark:text-neutral-100 p-6 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div>
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-500 dark:text-neutral-400 block mb-0.5">
            Logician Public Dossier
          </span>
          <h2 class="text-xl font-bold font-sans uppercase tracking-tight">
            {username || 'Logician'}
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

      {#if loading}
        <div class="py-12 text-center text-xs font-sans text-neutral-500 animate-pulse">
          Retrieving deductive dossier...
        </div>
      {:else if fetchError}
        <div class="p-4 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-center space-y-2 font-sans">
          <div class="text-xs text-rose-600 dark:text-rose-400 font-bold">• {fetchError}</div>
          <button
            type="button"
            on:click={() => dispatch('close')}
            class="px-3 py-1 border border-neutral-900 dark:border-white text-xs uppercase font-bold"
          >
            Return
          </button>
        </div>
      {:else if profile}
        <!-- Identity Summary Card -->
        <div class="flex items-start gap-4 p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
          <!-- Avatar -->
          <div
            class="w-16 h-16 rounded-none flex items-center justify-center text-white font-serif text-2xl shadow-sm border border-neutral-800 dark:border-neutral-200 shrink-0 select-none overflow-hidden relative"
            style="background-color: {profile.avatarColor || '#171717'};"
          >
            {#if profile.avatarImage}
              <img
                src={profile.avatarImage}
                alt={profile.username}
                class="w-full h-full object-cover"
              />
            {:else}
              <span>{(profile.username || 'G')[0].toUpperCase()}</span>
            {/if}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="font-bold text-base text-neutral-950 dark:text-neutral-50">
                {profile.username}
              </span>
              <span class="px-1.5 py-0.2 text-[9px] uppercase tracking-wider font-bold border border-neutral-900 dark:border-neutral-300 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
                {profile.rankTitle || 'Logician'}
              </span>
            </div>

            <!-- Bio -->
            {#if profile.bio}
              <p class="text-xs text-neutral-600 dark:text-neutral-300 italic mt-1 leading-snug">
                "{profile.bio}"
              </p>
            {:else}
              <p class="text-[11px] text-neutral-400 italic mt-1">
                No personal bio set.
              </p>
            {/if}

            <!-- Member since & report button -->
            <div class="flex items-center justify-between mt-3 text-[10px] text-neutral-400">
              <span>
                Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}
              </span>

              <button
                type="button"
                on:click={() => (isReporting = true)}
                class="text-[10px] uppercase font-sans text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer flex items-center gap-1 transition-colors"
                title="Flag inappropriate profile"
              >
                <span>🚩</span>
                <span>Report Profile</span>
              </button>
            </div>
          </div>
        </div>

        <!-- CORE STATISTICS: Total Solved, Leaderboard Standing, Streak -->
        <div class="space-y-2">
          <span class="text-[10px] font-sans uppercase tracking-widest text-neutral-500 block">
            Deductive Standing
          </span>
          <div class="grid grid-cols-3 gap-2.5 font-sans">
            <!-- Total Solved -->
            <div class="border border-neutral-200 dark:border-neutral-800 p-3 text-center bg-neutral-50/40 dark:bg-neutral-900/30">
              <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Solved
              </div>
              <div class="text-xl font-bold font-sans mt-0.5 text-neutral-950 dark:text-neutral-50">
                {profile.totalSolved}
              </div>
              <div class="text-[9px] text-neutral-400 mt-0.5">
                Lifetime Proofs
              </div>
            </div>

            <!-- Leaderboard Standing -->
            <div class="border border-neutral-200 dark:border-neutral-800 p-3 text-center bg-neutral-50/40 dark:bg-neutral-900/30">
              <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Standing
              </div>
              <div class="text-xl font-bold font-sans mt-0.5 text-neutral-950 dark:text-neutral-50">
                {profile.leaderboardStanding}
              </div>
              <div class="text-[9px] text-neutral-400 mt-0.5">
                Global Ranking
              </div>
            </div>

            <!-- Streak Metric -->
            <div class="border border-neutral-200 dark:border-neutral-800 p-3 text-center bg-neutral-50/40 dark:bg-neutral-900/30">
              <div class="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Streak
              </div>
              <div class="text-xl font-bold font-sans mt-0.5 text-neutral-950 dark:text-neutral-50">
                🔥 {profile.streakCount || 0}
              </div>
              <div class="text-[9px] text-neutral-400 mt-0.5">
                Best: ★ {profile.bestStreak || 0}
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

        <!-- Footer -->
        <div class="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            type="button"
            on:click={() => dispatch('close')}
            class="px-5 py-1.5 border border-neutral-900 dark:border-white text-xs font-sans uppercase font-bold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            Close
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- REPORT PROFILE DIALOG OVERLAY -->
  {#if isReporting && profile}
    <div
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="presentation"
    >
      <div
        class="w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-900 dark:border-neutral-200 p-6 space-y-4 shadow-2xl font-sans text-xs"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
          <div>
            <span class="text-[9px] uppercase tracking-widest text-rose-600 font-bold block">
              Flag Profile
            </span>
            <h3 class="text-sm font-bold uppercase tracking-wide">
              Report @{profile.username}
            </h3>
          </div>
          <button
            type="button"
            on:click={() => (isReporting = false)}
            class="text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {#if reportSuccessMessage}
          <div class="p-3 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
            ✓ {reportSuccessMessage}
          </div>
        {:else}
          {#if reportErrorMessage}
            <div class="p-2 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
              • {reportErrorMessage}
            </div>
          {/if}

          <div>
            <label for="report-reason-select" class="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">
              Reason for report
            </label>
            <select
              id="report-reason-select"
              bind:value={reportReason}
              class="w-full h-8 px-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            >
              {#each reportReasons as reason}
                <option value={reason}>{reason}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="report-details-textarea" class="block text-[10px] uppercase text-neutral-500 mb-1 font-bold">
              Additional context (Optional, max 500 characters)
            </label>
            <textarea
              id="report-details-textarea"
              bind:value={reportDetails}
              rows="3"
              maxlength="500"
              placeholder="Describe why this profile violates guidelines..."
              class="w-full p-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            ></textarea>
          </div>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              on:click={() => (isReporting = false)}
              class="flex-1 h-8 border border-neutral-300 dark:border-neutral-700 uppercase font-bold text-[10px] cursor-pointer hover:border-neutral-900 dark:hover:border-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingReport}
              on:click={handleSubmitReport}
              class="flex-1 h-8 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 uppercase font-bold text-[10px] tracking-wider cursor-pointer disabled:opacity-40"
            >
              {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
