<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { legalModalStore, closeLegalModal, type LegalTab } from '../stores/legal';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  $: isOpen = $legalModalStore.isOpen;
  $: activeTab = $legalModalStore.activeTab;

  function switchTab(tab: LegalTab) {
    legalModalStore.update(s => ({ ...s, activeTab: tab }));
  }

  function handleClose() {
    closeLegalModal();
    dispatch('close');
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      class="w-full max-w-4xl max-h-[90vh] bg-[#FAFAFA] dark:bg-[#0A0A0A] border border-neutral-300 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100 font-sans"
    >
      <!-- Modal Header -->
      <div class="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-950">
        <div>
          <h2 id="legal-modal-title" class="font-serif text-xl sm:text-2xl font-normal text-neutral-950 dark:text-white">
            {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
          </h2>
        </div>

        <button
          type="button"
          on:click={handleClose}
          class="text-neutral-500 hover:text-black dark:hover:text-white text-xs font-sans tracking-wider cursor-pointer p-1 transition-colors"
          aria-label="Close dialog"
        >
          [ ✕ Close ]
        </button>
      </div>

      <!-- Tab Navigation Bar -->
      <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/60 px-4 sm:px-6">
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={() => switchTab('privacy')}
            class="py-3 px-3 sm:px-4 text-xs uppercase tracking-wider font-semibold cursor-pointer border-b-2 transition-all {
              activeTab === 'privacy'
                ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            on:click={() => switchTab('terms')}
            class="py-3 px-3 sm:px-4 text-xs uppercase tracking-wider font-semibold cursor-pointer border-b-2 transition-all {
              activeTab === 'terms'
                ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }"
          >
            Terms of Service
          </button>
        </div>
      </div>

      <!-- Scrollable Policy Content -->
      <div class="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 text-xs sm:text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        
        {#if activeTab === 'privacy'}
          <!-- ================= PRIVACY POLICY ================= -->
          <div class="space-y-6">
            <!-- Intro Note -->
            <div class="p-4 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-neutral-600 dark:text-neutral-400 text-xs">
              <strong class="font-semibold text-neutral-900 dark:text-white">Radical Data Minimization:</strong> gödle is designed around logician privacy and mathematical austerity. We collect only the bare minimum data required to authenticate your profile, record your deductive streaks, and maintain competitive leaderboards. We do not sell your personal data, run invasive trackers, or monetize your activity.
            </div>

            <!-- Section 1: Overview -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                1. Overview & Data Controller
              </h3>
              <p>
                This Privacy Policy explains how <strong>gödle</strong> ("we", "us", "our"), created and maintained by <strong>A. Arcega</strong>, collects, processes, and protects your information when you use the web application at its official domains and mirrors.
              </p>
              <p>
                Our philosophy mirrors the principles of open-source transparency: logicians retain complete autonomy over their data, deductions, and profile presence.
              </p>
            </section>

            <!-- Section 2: What We Collect -->
            <section class="space-y-3">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                2. Information We Collect (and Why)
              </h3>
              
              <div class="space-y-3 pl-2 sm:pl-3 border-l-2 border-neutral-200 dark:border-neutral-800">
                <div>
                  <h4 class="font-semibold text-neutral-950 dark:text-white">A. Account Credentials & Profile Data</h4>
                  <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                    When you register an account, we store your chosen <strong>username</strong> (public handle). If you choose a password, it is hashed client/server using cryptographically secure <strong>scrypt</strong> with a unique 16-byte random salt; we never store or transmit plaintext passwords. If you provide an optional recovery email, it is held strictly for account recovery and is never shared, marketed, or sold. Profile bios (max 160 characters) and display avatars (color, icon, or client-side canvas-compressed custom images) are stored with your public profile.
                  </p>
                </div>

                <div>
                  <h4 class="font-semibold text-neutral-950 dark:text-white">B. GitHub OAuth Authentication</h4>
                  <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                    If you choose to authenticate via GitHub, we exchange your one-time OAuth token server-side solely to obtain your public GitHub user ID and username. We do not request, read, or store access to your private repositories, code, personal contacts, or other OAuth scopes.
                  </p>
                </div>

                <div>
                  <h4 class="font-semibold text-neutral-950 dark:text-white">C. Deduction Gameplay Records & Statistics</h4>
                  <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                    To maintain deduction streaks, historical statistics, and public leaderboards, we store:
                  </p>
                  <ul class="list-disc list-inside space-y-1 text-xs text-neutral-600 dark:text-neutral-400 pl-2 pt-1">
                    <li><strong>Daily Wordle Mode:</strong> Date, difficulty level, solved status, proof step count, and solve duration in seconds.</li>
                    <li><strong>Frenzy Mode:</strong> Total score tally, hearts remaining, number of problems solved, and elapsed time.</li>
                    <li><strong>Streak Counts:</strong> Current consecutive daily streak, highest streak ever achieved, and last played date.</li>
                    <li><strong>Activity Heatmap:</strong> Daily solve timestamps used to render your personal deduction activity matrix.</li>
                    <li><strong>Saved Proofs:</strong> Deductions you explicitly save in Sandbox mode (premises, conclusion, derivation steps, and notes).</li>
                  </ul>
                </div>

                <div>
                  <h4 class="font-semibold text-neutral-950 dark:text-white">D. Ephemeral Security & Anti-Abuse Logs</h4>
                  <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                    To safeguard the service against denial-of-service (DDoS) attacks, automated bot abuse, and credential stuffing, our custom in-memory rate limiters temporarily process client IP addresses. These operational logs are ephemeral, kept in transient server memory, and are never joined to your user identity or used for cross-site behavioral tracking.
                  </p>
                </div>
              </div>
            </section>

            <!-- Section 3: What We DO NOT Collect -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                3. Information We DO NOT Collect
              </h3>
              <p>
                In alignment with reference privacy benchmarks (such as Monkeytype), we practice strict operational boundaries:
              </p>
              <ul class="list-disc list-inside space-y-1 text-xs text-neutral-600 dark:text-neutral-400 pl-2">
                <li>We do <strong>not</strong> record your local unsaved scratchpad proofs or informal drafts constructed in Sandbox mode.</li>
                <li>We do <strong>not</strong> track individual keystroke latencies or background user behavior outside active deduction checks.</li>
                <li>We do <strong>not</strong> collect financial, credit card, or payment data (gödle is 100% free and non-commercial).</li>
                <li>We do <strong>not</strong> sell, rent, license, or monetize any user data to third-party data brokers or advertising networks.</li>
              </ul>
            </section>

            <!-- Section 4: Cookies & Local Storage -->
            <section class="space-y-3">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                4. Cookies & Client-Side Local Storage
              </h3>
              <p>
                We do not employ third-party advertising or tracking cookies. We utilize browser storage solely for functional operation:
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div class="p-3 border border-neutral-200 dark:border-neutral-800 rounded bg-neutral-50 dark:bg-neutral-900/50">
                  <div class="font-semibold text-neutral-900 dark:text-white mb-1">Session Cookie (`goodle_token`)</div>
                  <p class="text-neutral-500">
                    An HTTP-only, secure JWT cookie maintaining your authenticated logician session without exposing credentials to client scripts.
                  </p>
                </div>
                <div class="p-3 border border-neutral-200 dark:border-neutral-800 rounded bg-neutral-50 dark:bg-neutral-900/50">
                  <div class="font-semibold text-neutral-900 dark:text-white mb-1">Theme & Notation (`localStorage`)</div>
                  <p class="text-neutral-500">
                    Stores your visual theme (`goodle_theme`), logic notation style (`standard` vs `whitehead`), sound effect volume, and local challenge state.
                  </p>
                </div>
              </div>
            </section>

            <!-- Section 5: Third-Party Infrastructure -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                5. Third-Party Infrastructure & Service Providers
              </h3>
              <p>
                To provide high-availability hosting and security, gödle interfaces with the following infrastructure providers:
              </p>
              <ul class="list-disc list-inside space-y-1 text-xs text-neutral-600 dark:text-neutral-400 pl-2">
                <li><strong>Hosting & Edge Delivery:</strong> Vercel Inc. (serverless execution, content delivery, and edge security).</li>
                <li><strong>Authentication:</strong> GitHub API (for OAuth sign-in).</li>
                <li><strong>Abuse Mitigation:</strong> Google reCAPTCHA / internal visual SVG captcha challenge to prevent automated bot scripts from overwhelming verification nodes.</li>
              </ul>
            </section>

            <!-- Section 6: Public Visibility & Opt-Out -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                6. Public Visibility & Leaderboard Opt-Out
              </h3>
              <p>
                By default, your username, avatar badge, current streak, and frenzy solve scores are visible on global leaderboards and public logician cards.
              </p>
              <p class="text-xs text-neutral-600 dark:text-neutral-400">
                <strong>Your Privacy Choice:</strong> If you prefer anonymity, you may enable <span class="underline font-medium text-neutral-900 dark:text-white">"Opt out of Public Leaderboard"</span> at any time in your Profile Settings. This will omit your account from all public leaderboards while continuing to record your personal streak and proofs.
              </p>
            </section>

            <!-- Section 7: Data Retention & Deletion -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                7. Data Retention & Right to be Forgotten (Account Deletion)
              </h3>
              <p>
                You possess absolute ownership of your data. You may delete your account at any time through the Profile Settings interface.
              </p>
              <p class="text-xs text-neutral-600 dark:text-neutral-400">
                Triggering account deletion initiates an immediate, irreversible cascading purge (`DELETE CASCADE`) in our database, eradicating your user record, authentication hashes, streak records, solve history, activity maps, and saved proofs.
              </p>
            </section>

            <!-- Section 8: Contact -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                8. Inquiries & Maintainer Contact
              </h3>
              <p>
                Questions or inquiries regarding this Privacy Policy or your data rights can be directed to the creator via GitHub issues or through <a href="https://artemiui.vercel.app" target="_blank" rel="noopener noreferrer" class="underline hover:text-black dark:hover:text-white">artemiui.vercel.app</a>.
              </p>
            </section>
          </div>

        {:else if activeTab === 'terms'}
          <!-- ================= TERMS OF SERVICE ================= -->
          <div class="space-y-6">
            <!-- Intro Note -->
            <div class="p-4 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-neutral-600 dark:text-neutral-400 text-xs">
              <strong class="font-semibold text-neutral-900 dark:text-white">Standard of Conduct:</strong> gödle is an open platform celebrating deductive rigor, truth-functional validity, and community learning. By playing or creating an account, you agree to respect the service, other logicians, and the integrity of our deduction leaderboards.
            </div>

            <!-- Section 1: Agreement -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                1. Agreement to Terms
              </h3>
              <p>
                By accessing, using, or creating an account on <strong>gödle</strong> ("the Service"), you agree to be legally bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, you must discontinue use of the Service immediately.
              </p>
            </section>

            <!-- Section 2: Educational Mission & Axiomatic Scope -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                2. Educational Purpose & Deductive Scope
              </h3>
              <p>
                gödle is provided free of charge for non-commercial educational, recreational, and intellectual enrichment. The formal verification engine exclusively models Irving M. Copi's celebrated nineteen rules of propositional natural deduction (9 elementary inference rules and 10 equivalence replacement rules). The platform does not guarantee automated resolution of non-propositional logic systems (e.g., first-order predicate calculus with quantifiers).
              </p>
            </section>

            <!-- Section 3: Accounts & Security -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                3. User Accounts & Credential Security
              </h3>
              <ul class="list-disc list-inside space-y-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 pl-2">
                <li>Account registration is optional; guests can freely play the daily deduction, explore the rules tutorial, and practice in the sandbox without an account.</li>
                <li>If you create an account, you are solely responsible for maintaining the confidentiality of your authentication credentials and for all activities that occur under your account.</li>
                <li>You agree to notify us immediately of any unauthorized use or security compromise regarding your logician handle.</li>
                <li>You may not impersonate any person, logician, academic institution, or entity, or create deceptive pseudonyms.</li>
              </ul>
            </section>

            <!-- Section 4: Fair Play & Leaderboard Integrity (Monkeytype benchmark) -->
            <section class="space-y-3">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                4. Fair Play, Leaderboard Integrity & Anti-Abuse
              </h3>
              <p>
                In alignment with community-first competitive platforms (such as Monkeytype), we uphold strict standards of fairness and system integrity:
              </p>
              
              <div class="space-y-2.5 pl-2 sm:pl-3 border-l-2 border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm">
                <div>
                  <strong class="text-neutral-950 dark:text-white">A. Anti-Cheat & Automated Solvers:</strong>
                  <p class="text-neutral-600 dark:text-neutral-400">
                    Leaderboards and streaks exist to measure human deductive acumen. The deployment of automated headless bots, API submission scrapers, pre-computed solver scripts, or external automation tools on daily or Frenzy leaderboard submissions is strictly prohibited.
                  </p>
                </div>
                <div>
                  <strong class="text-neutral-950 dark:text-white">B. Exploit Reporting:</strong>
                  <p class="text-neutral-600 dark:text-neutral-400">
                    Discovering an edge-case bug in the rule validator or solver engine should be reported responsibly. Intentionally exploiting parser vulnerabilities to fabricate invalid proofs or inject artificial high scores is grounds for immediate leaderboard disqualification.
                  </p>
                </div>
                <div>
                  <strong class="text-neutral-950 dark:text-white">C. System Infrastructure Respect:</strong>
                  <p class="text-neutral-600 dark:text-neutral-400">
                    You agree not to disrupt, flood, perform denial-of-service (DoS) attacks on, reverse-engineer server mechanisms of, or bypass rate limits on our verification endpoints.
                  </p>
                </div>
                <div>
                  <strong class="text-neutral-950 dark:text-white">D. Community Conduct:</strong>
                  <p class="text-neutral-600 dark:text-neutral-400">
                    Usernames, bios, and profile avatars must not contain hate speech, harassment, threats, explicit sexual content, defamatory statements, or unlawful material.
                  </p>
                </div>
              </div>
            </section>

            <!-- Section 5: Intellectual Property -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                5. Intellectual Property
              </h3>
              <p>
                The visual design, branding, typography, user interface code, and implementation of the proof checker are open-source and copyright © <strong>A. Arcega</strong>. The nineteen rules of inference and replacement originate from Irving M. Copi's public pedagogical literature.
              </p>
              <p class="text-xs text-neutral-600 dark:text-neutral-400">
                Any custom problem sets, annotations, or proofs you author in Sandbox Mode remain your own intellectual output.
              </p>
            </section>

            <!-- Section 6: Termination & Moderation -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                6. Account Suspension & Moderation
              </h3>
              <p>
                We reserve the right, at our sole discretion, to remove content, wipe cheated leaderboard records, rate-limit, or terminate accounts that violate these Terms of Service or compromise the safety and stability of the platform, without prior notice.
              </p>
            </section>

            <!-- Section 7: Disclaimer & Limitation of Liability -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                7. Disclaimer of Warranties & Limitation of Liability
              </h3>
              <p class="text-xs text-neutral-600 dark:text-neutral-400">
                THE SERVICE IS PROVIDED ON AN <strong>"AS IS"</strong> AND <strong>"AS AVAILABLE"</strong> BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT GÖDLE WILL BE UNINTERRUPTED, BUG-FREE, OR ERROR-FREE.
              </p>
              <p class="text-xs text-neutral-600 dark:text-neutral-400">
                TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, IN NO EVENT SHALL THE CREATOR, CONTRIBUTORS, OR HOSTING PROVIDERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE SERVICE, INCLUDING LOSS OF STREAKS, STATISTICAL SCORES, OR SAVED PROOFS.
              </p>
            </section>

            <!-- Section 8: Changes to Terms -->
            <section class="space-y-2">
              <h3 class="font-serif text-base sm:text-lg font-medium text-neutral-950 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-1">
                8. Modifications to Terms
              </h3>
              <p>
                We reserve the right to modify or revise these terms at any time. Continued use of gödle following the publication of revised terms constitutes your acceptance of the changes.
              </p>
            </section>
          </div>
        {/if}

      </div>

      <!-- Modal Footer -->
      <div class="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-end text-xs">
        <button
          type="button"
          on:click={handleClose}
          class="px-4 py-1.5 border border-neutral-900 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-opacity text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          Acknowledge & Close
        </button>
      </div>
    </div>
  </div>
{/if}
