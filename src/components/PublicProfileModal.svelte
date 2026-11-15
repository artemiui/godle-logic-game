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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-lg bg-card border border-line text-ink p-6 sm:p-7 space-y-5  max-h-[92vh] overflow-y-auto rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
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
            {username || 'Logician'}
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

      {#if loading}
        <div class="py-12 text-center text-xs font-sans text-ink-3">
          Loading profile
        </div>
      {:else if fetchError}
        <div class="p-4 border border-line-strong bg-raised text-center space-y-2 font-sans rounded-xl">
          <div class="text-xs text-ink font-medium">• {fetchError}</div>
          <button
            type="button"
            on:click={() => dispatch('close')}
            class="px-3 py-1 border border-ink text-xs font-medium rounded-lg"
          >
            Return
          </button>
        </div>
      {:else if profile}
        <!-- Identity Summary Card -->
        <div class="flex items-start gap-4 p-4 border border-line bg-raised/50 rounded-xl">
          <!-- Avatar -->
          <div
            class="w-16 h-16 rounded-none flex items-center justify-center text-paper font-serif text-2xl shadow-sm border border-ink shrink-0 select-none overflow-hidden relative"
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
              <span class="font-medium text-base text-ink">
                {profile.username}
              </span>
              <span class="px-1.5 py-0.2 text-meta font-medium border border-ink bg-card text-ink">
                {profile.rankTitle || 'Logician'}
              </span>
            </div>

            <!-- Bio -->
            {#if profile.bio}
              <p class="text-xs text-ink-2 mt-1 leading-snug">
                "{profile.bio}"
              </p>
            {:else}
              <p class="text-meta text-ink-3 mt-1">
                No personal bio set.
              </p>
            {/if}

            <!-- Member since & report button -->
            <div class="flex items-center justify-between mt-3 text-meta text-ink-3">
              <span>
                Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}
              </span>

              <button
                type="button"
                on:click={() => (isReporting = true)}
                class="text-meta font-sans text-ink-3 hover:text-ink cursor-pointer flex items-center gap-1 transition-colors"
                title="Flag inappropriate profile"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg>
                <span>Report profile</span>
              </button>
            </div>
          </div>
        </div>

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
                {profile.totalSolved}
              </div>
              <div class="text-meta text-ink-3 mt-0.5">
                Proofs
              </div>
            </div>

            <!-- Leaderboard Standing -->
            <div class="border border-line p-3 text-center bg-raised/40 rounded-xl">
              <div class="text-meta text-ink-3">
                Standing
              </div>
              <div class="text-xl font-medium font-sans mt-0.5 text-ink">
                {profile.leaderboardStanding}
              </div>
              <div class="text-meta text-ink-3 mt-0.5">
                Frenzy rank
              </div>
            </div>

            <!-- Streak Metric -->
            <div class="border border-line p-3 text-center bg-raised/40 rounded-xl">
              <div class="text-meta text-ink-3">
                Streak
              </div>
              <div class="text-xl font-medium font-sans mt-0.5 text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="inline -mt-0.5 mr-1"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>{profile.streakCount || 0}
              </div>
              <div class="text-meta text-ink-3 mt-0.5">
                Best {profile.bestStreak || 0}
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

        <!-- Footer -->
        <div class="pt-2 border-t border-line flex justify-end">
          <button
            type="button"
            on:click={() => dispatch('close')}
            class="px-5 py-1.5 border border-ink text-xs font-sans font-medium cursor-pointer hover:bg-raised transition-colors rounded-lg"
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
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
      role="presentation"
    >
      <div
        class="w-full max-w-md bg-card border border-line p-6 space-y-4  font-sans text-xs rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-start justify-between border-b border-line pb-2">
          <div>
            <span class="text-meta text-ink font-medium block">
              Report
            </span>
            <h3 class="text-sm font-medium">
              Report @{profile.username}
            </h3>
          </div>
          <button aria-label="Close"
            type="button"
            on:click={() => (isReporting = false)}
            class="btn-icon -mr-2 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {#if reportSuccessMessage}
          <div class="p-3 border border-ink bg-raised text-ink font-semibold rounded-xl">
             {reportSuccessMessage}
          </div>
        {:else}
          {#if reportErrorMessage}
            <div class="p-2 border border-ink bg-raised text-ink rounded-xl">
              • {reportErrorMessage}
            </div>
          {/if}

          <div>
            <label for="report-reason-select" class="block text-meta text-ink-3 mb-1 font-medium">
              Reason for report
            </label>
            <select
              id="report-reason-select"
              bind:value={reportReason}
              class="w-full h-8 px-2 bg-card border border-line-strong text-xs focus:outline-none focus:border-ink rounded-lg"
            >
              {#each reportReasons as reason}
                <option value={reason}>{reason}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="report-details-textarea" class="block text-meta text-ink-3 mb-1 font-medium">
              Additional context (Optional, max 500 characters)
            </label>
            <textarea
              id="report-details-textarea"
              bind:value={reportDetails}
              rows="3"
              maxlength="500"
              placeholder="Describe why this profile violates guidelines..."
              class="w-full p-2 bg-card border border-line-strong text-xs focus:outline-none focus:border-ink rounded-lg"
            ></textarea>
          </div>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              on:click={() => (isReporting = false)}
              class="flex-1 h-8 border border-line-strong font-medium text-meta cursor-pointer hover:border-ink rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingReport}
              on:click={handleSubmitReport}
              class="flex-1 h-8 bg-ink text-paper font-medium text-meta cursor-pointer disabled:opacity-40 rounded-lg"
            >
              {isSubmittingReport ? 'Sending' : 'Send report'}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
