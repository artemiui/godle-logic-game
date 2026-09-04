<script lang="ts">
  import { onMount, tick } from 'svelte';
  import confetti from 'canvas-confetti';
  import type { Problem, ProofStep, RuleId, Formula } from '../types/logic';
  import { COPI_PRESET_PROBLEMS, COMMUNITY_DEFAULT_PROBLEMS } from '../logic/presets';
  import { generateProblem, encodeProblemToShareCode } from '../logic/generator';
  import { solveProblem } from '../logic/solver';
  import { validateProofStep } from '../logic/checker';
  import { parseFormula, safeParseFormula } from '../logic/parser';
  import { formulasEqual } from '../logic/ast';
  import { authStore, activeSandboxProblem, notationStore, type SavedProof } from '../stores/auth';
  import { replaceFormulaKeywords } from '../logic/latex';
  import ProofTable from './ProofTable.svelte';
  import StepInput from './StepInput.svelte';
  import ShareModal from './ShareModal.svelte';

  let activeSubTab: 'library' | 'generator' | 'custom' = 'library';
  let libraryFilter: 'copi' | 'community' | 'saved' = 'copi';
  let communityTheorems: Problem[] = [];
  let isCommunityLoading: boolean = false;
  let isSubmittingToCommunity: boolean = false;
  let communitySuccessMessage: string = '';
  let mySavedProofs: SavedProof[] = [];
  let isSavedLoading: boolean = false;
  let saveSuccessMessage: string = '';
  let isSavingToAccount: boolean = false;
  let isCurrentSaved: boolean = false;
  let isSavingCurrent: boolean = false;
  let currentSaveFeedback: string = '';
  let showShareModal: boolean = false;

  let problem: Problem = COPI_PRESET_PROBLEMS[0];
  let steps: ProofStep[] = COPI_PRESET_PROBLEMS[0].premises.map((prem, idx) => ({
    stepNumber: idx + 1,
    formula: prem,
    rule: 'premise' as const,
    citations: [],
    isPremise: true,
  }));
  let isWon: boolean = false;
  let errorMessage: string = '';

  let stepInputComponent: any;

  // Generator State
  let genSeed: string = 'custom-' + Math.floor(Math.random() * 10000);
  let genDifficulty: 'easy' | 'medium' | 'hard' = 'medium';

  // Custom Problem Creator State
  let customTitle: string = 'Custom Theorem';
  let customPremisesText: string = 'P ⊃ Q\nP';
  let customConclusionText: string = 'Q';
  let assessmentResult: { solvable: boolean; minSteps?: number; message?: string } | null = null;
  let isAssessing: boolean = false;
  let shareUrl: string = '';

  function handleConclusionInput(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target) return;
    const cursor = target.selectionStart ?? target.value.length;
    const res = replaceFormulaKeywords(target.value, cursor, $notationStore);
    if (res.changed) {
      customConclusionText = res.text;
      target.value = res.text;
      target.setSelectionRange(res.cursor, res.cursor);
      tick().then(() => target?.setSelectionRange(res.cursor, res.cursor));
    }
  }

  function handlePremisesInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    if (!target) return;
    const cursor = target.selectionStart ?? target.value.length;
    const res = replaceFormulaKeywords(target.value, cursor, $notationStore);
    if (res.changed) {
      customPremisesText = res.text;
      target.value = res.text;
      target.setSelectionRange(res.cursor, res.cursor);
      tick().then(() => target?.setSelectionRange(res.cursor, res.cursor));
    }
  }

  $: if ($activeSandboxProblem) {
    loadProblem($activeSandboxProblem);
    activeSandboxProblem.set(null);
  }

  function loadProblem(p: Problem) {
    problem = p;
    steps = p.premises.map((prem, idx) => ({
      stepNumber: idx + 1,
      formula: prem,
      rule: 'premise' as const,
      citations: [],
      isPremise: true,
    }));
    isWon = false;
    errorMessage = '';
    shareUrl = '';
  }

  function checkIfCurrentSaved() {
    if (!problem) return;
    const inList = mySavedProofs.some(sp => sp.title === problem.title);
    let inLocal = false;
    try {
      const local = JSON.parse(localStorage.getItem('goodle_local_saved_proofs') || '[]');
      inLocal = local.some((p: any) => p.title === problem.title);
    } catch {}
    isCurrentSaved = inList || inLocal;
  }

  $: if (problem || mySavedProofs) {
    checkIfCurrentSaved();
  }

  async function saveCurrentTheorem() {
    if (isSavingCurrent || isCurrentSaved || !problem) return;
    isSavingCurrent = true;
    currentSaveFeedback = '';

    const newSaved: SavedProof = {
      id: 'saved-' + Date.now(),
      title: problem.title,
      difficulty: problem.difficulty || 'medium',
      premises: problem.premises,
      conclusion: problem.conclusion,
      notes: problem.author ? `Community theorem by @${problem.author}` : `Saved from Sandbox Prover on ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    try {
      const local = JSON.parse(localStorage.getItem('goodle_local_saved_proofs') || '[]');
      if (!local.some((p: any) => p.title === newSaved.title)) {
        local.unshift(newSaved);
        localStorage.setItem('goodle_local_saved_proofs', JSON.stringify(local));
      }
    } catch {}

    // Save to account if logged in
    const token = $authStore.token || localStorage.getItem('goodle_token');
    if (token && $authStore.user) {
      try {
        await fetch('/api/user/saved-proofs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
            title: problem.title,
            difficulty: problem.difficulty || 'medium',
            premises: problem.premises,
            conclusion: problem.conclusion,
            notes: newSaved.notes,
          }),
        });
      } catch {}
    }

    await fetchMySavedProofs();
    isSavingCurrent = false;
    isCurrentSaved = true;
    currentSaveFeedback = 'Saved to Sandbox Library!';
    setTimeout(() => (currentSaveFeedback = ''), 3000);
  }

  async function removeCurrentTheorem() {
    if (isSavingCurrent || !isCurrentSaved || !problem) return;
    isSavingCurrent = true;
    currentSaveFeedback = '';

    // Remove from localStorage
    try {
      const local = JSON.parse(localStorage.getItem('goodle_local_saved_proofs') || '[]');
      const updated = local.filter((p: any) => p.title !== problem.title);
      localStorage.setItem('goodle_local_saved_proofs', JSON.stringify(updated));
    } catch {}

    // Remove from account if logged in
    const token = $authStore.token || localStorage.getItem('goodle_token');
    if (token && $authStore.user) {
      try {
        await fetch('/api/user/saved-proofs/' + encodeURIComponent(problem.title), {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
      } catch {}
    }

    await fetchMySavedProofs();
    isSavingCurrent = false;
    isCurrentSaved = false;
    currentSaveFeedback = 'Removed from Sandbox Library';
    setTimeout(() => (currentSaveFeedback = ''), 3000);
  }

  function toggleSaveCurrentTheorem() {
    if (isCurrentSaved) {
      removeCurrentTheorem();
    } else {
      saveCurrentTheorem();
    }
  }

  async function removeSavedProof(sp: SavedProof) {
    // Remove from localStorage
    try {
      const local = JSON.parse(localStorage.getItem('goodle_local_saved_proofs') || '[]');
      const updated = local.filter((p: any) => p.title !== sp.title && p.id !== sp.id);
      localStorage.setItem('goodle_local_saved_proofs', JSON.stringify(updated));
    } catch {}

    // Remove from account if logged in
    const token = $authStore.token || localStorage.getItem('goodle_token');
    if (token && $authStore.user) {
      try {
        const identifier = sp.id || sp.title;
        await fetch('/api/user/saved-proofs/' + encodeURIComponent(identifier), {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
      } catch {}
    }

    await fetchMySavedProofs();
    if (problem && (problem.title === sp.title || problem.id === sp.id)) {
      isCurrentSaved = false;
    }
  }

  async function fetchMySavedProofs() {
    let localProofs: SavedProof[] = [];
    try {
      localProofs = JSON.parse(localStorage.getItem('goodle_local_saved_proofs') || '[]');
    } catch {}

    const token = $authStore.token || localStorage.getItem('goodle_token');
    if (!token) {
      mySavedProofs = localProofs;
      return;
    }
    isSavedLoading = true;
    try {
      const res = await fetch('/api/user/saved-proofs', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        const data = await res.json();
        const serverProofs: SavedProof[] = data.proofs || [];
        const combined = [...serverProofs];
        for (const lp of localProofs) {
          if (!combined.some(sp => sp.title === lp.title)) {
            combined.push(lp);
          }
        }
        mySavedProofs = combined;
      } else {
        mySavedProofs = localProofs;
      }
    } catch (err) {
      mySavedProofs = localProofs;
    } finally {
      isSavedLoading = false;
    }
  }

  async function fetchCommunityTheorems() {
    isCommunityLoading = true;
    try {
      const res = await fetch('/api/community/theorems');
      if (res.ok) {
        const data = await res.json();
        if (data.theorems && data.theorems.length > 0) {
          communityTheorems = data.theorems;
        } else {
          communityTheorems = COMMUNITY_DEFAULT_PROBLEMS;
        }
      } else {
        communityTheorems = COMMUNITY_DEFAULT_PROBLEMS;
      }
    } catch {
      communityTheorems = COMMUNITY_DEFAULT_PROBLEMS;
    } finally {
      isCommunityLoading = false;
    }
  }

  async function handleSaveToAccount() {
    saveSuccessMessage = '';
    communitySuccessMessage = '';
    errorMessage = '';
    if (!$authStore.user) {
      errorMessage = 'Please sign in or register to save theorems to your account.';
      return;
    }

    const lines = customPremisesText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length === 0) {
      errorMessage = 'Enter at least one premise to save.';
      return;
    }

    const parsedPremises = [];
    for (let i = 0; i < lines.length; i++) {
      const p = safeParseFormula(lines[i]);
      if (!p.formula) {
        errorMessage = `Syntax error in premise ${i + 1}: ${p.error}`;
        return;
      }
      parsedPremises.push(p.formula);
    }

    const parsedConc = safeParseFormula(customConclusionText);
    if (!parsedConc.formula) {
      errorMessage = `Syntax error in conclusion: ${parsedConc.error}`;
      return;
    }

    isSavingToAccount = true;
    const token = $authStore.token || localStorage.getItem('goodle_token');
    try {
      const res = await fetch('/api/user/saved-proofs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          title: customTitle || 'Custom Deduction',
          difficulty: 'custom',
          premises: parsedPremises,
          conclusion: parsedConc.formula,
          notes: `Saved from Sandbox on ${new Date().toLocaleDateString()}`
        }),
      });
      const data = await res.json();
      if (res.ok) {
        saveSuccessMessage = 'Theorem successfully saved to your Logician Account ledger!';
        await fetchMySavedProofs();
      } else {
        errorMessage = data.error || 'Failed to save theorem.';
      }
    } catch {
      errorMessage = 'Network error while saving theorem.';
    } finally {
      isSavingToAccount = false;
    }
  }

  async function handleSubmitToCommunity() {
    communitySuccessMessage = '';
    saveSuccessMessage = '';
    errorMessage = '';

    const lines = customPremisesText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length === 0) {
      errorMessage = 'Enter at least one premise to submit.';
      return;
    }

    const parsedPremises: Formula[] = [];
    for (let i = 0; i < lines.length; i++) {
      const p = safeParseFormula(lines[i]);
      if (!p.formula) {
        errorMessage = `Syntax error in premise ${i + 1}: ${p.error}`;
        return;
      }
      parsedPremises.push(p.formula);
    }

    const parsedConc = safeParseFormula(customConclusionText);
    if (!parsedConc.formula) {
      errorMessage = `Syntax error in conclusion: ${parsedConc.error}`;
      return;
    }

    // Client-side solver verification first for immediate feedback
    const testResult = solveProblem(parsedPremises, parsedConc.formula, 8);
    if (!testResult.solvable) {
      errorMessage = 'Theorem could not be proven valid under Copi\'s 19 rules. Only logically provable theorems are accepted into the Community Library.';
      return;
    }

    isSubmittingToCommunity = true;
    const token = $authStore.token || localStorage.getItem('goodle_token');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch('/api/community/theorems', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: customTitle.trim() || 'Community Theorem',
          difficulty: testResult.minSteps && testResult.minSteps > 4 ? 'hard' : (testResult.minSteps && testResult.minSteps > 2 ? 'medium' : 'easy'),
          premises: parsedPremises,
          conclusion: parsedConc.formula,
          creatorUsername: $authStore.user?.username || 'Anonymous Logician',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        communitySuccessMessage = data.message || 'Theorem verified and added to the Community Library!';
        await fetchCommunityTheorems();
        libraryFilter = 'community';
        activeSubTab = 'library';
      } else {
        errorMessage = data.error || 'Failed to submit theorem.';
      }
    } catch {
      errorMessage = 'Network error while submitting to community.';
    } finally {
      isSubmittingToCommunity = false;
    }
  }

  onMount(() => {
    loadProblem(COPI_PRESET_PROBLEMS[0]);
    fetchCommunityTheorems();
    if ($authStore.user) fetchMySavedProofs();
  });

  function handleAddStep(event: CustomEvent<{ formula: Formula; formulaRaw: string; ruleId: RuleId; citations: number[] }>) {
    errorMessage = '';
    const { formula, ruleId, citations } = event.detail;

    const checkResult = validateProofStep(steps, formula, ruleId, citations);
    if (!checkResult.valid) {
      errorMessage = checkResult.error || 'Invalid step deduction.';
      return;
    }

    const newStep: ProofStep = {
      stepNumber: steps.length + 1,
      formula,
      rule: ruleId,
      citations,
    };

    steps = [...steps, newStep];

    if (formulasEqual(formula, problem.conclusion)) {
      isWon = true;
      try {
        confetti({ particleCount: 35, spread: 45 });
      } catch {}
    }
  }

  function handleUndo() {
    if (steps.filter(s => s.rule !== 'premise').length === 0) return;
    steps = steps.slice(0, -1);
    isWon = false;
  }

  function handleCiteLine(event: CustomEvent<number>) {
    if (stepInputComponent && typeof stepInputComponent.toggleCitation === 'function') {
      stepInputComponent.toggleCitation(event.detail);
    }
  }

  function handleGenerate() {
    const generated = generateProblem(genSeed, genDifficulty);
    loadProblem(generated);
  }

  async function assessCustomProblem() {
    isAssessing = true;
    assessmentResult = null;
    errorMessage = '';

    const lines = customPremisesText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      errorMessage = 'Please enter at least one premise.';
      isAssessing = false;
      return;
    }

    const parsedPremises: Formula[] = [];
    for (let i = 0; i < lines.length; i++) {
      const p = safeParseFormula(lines[i]);
      if (!p.formula) {
        errorMessage = `Syntax error in premise ${i + 1}: ${p.error}`;
        isAssessing = false;
        return;
      }
      parsedPremises.push(p.formula);
    }

    const parsedConc = safeParseFormula(customConclusionText);
    if (!parsedConc.formula) {
      errorMessage = `Syntax error in conclusion: ${parsedConc.error}`;
      isAssessing = false;
      return;
    }

    const solution = solveProblem(parsedPremises, parsedConc.formula, 8);
    isAssessing = false;

    if (solution.solvable) {
      assessmentResult = {
        solvable: true,
        minSteps: solution.minSteps,
        message: `? Provable. Minimal deduction path is ${solution.minSteps} step(s).`,
      };
    } else {
      assessmentResult = {
        solvable: false,
        message: 'Derivation not found within 8 steps. May be invalid or require deeper search.',
      };
    }
  }

  function playCustomProblem() {
    const lines = customPremisesText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    const parsedPremises = lines.map(l => parseFormula(l));
    const parsedConc = parseFormula(customConclusionText);

    const customProb: Problem = {
      id: 'custom-' + Date.now(),
      title: customTitle || 'Custom Deduction',
      difficulty: 'medium',
      premises: parsedPremises,
      conclusion: parsedConc,
    };
    loadProblem(customProb);

    const code = encodeProblemToShareCode(customProb);
    shareUrl = `${window.location.origin}?mode=frenzy&seed=${code}`;
  }
</script>

<div class="max-w-3xl mx-auto py-8 sm:py-12 px-4 space-y-8">
  <!-- Top Navigation & Problem Source -->
  <div class="border-b border-neutral-200 dark:border-neutral-800 pb-5 space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
      <div>
        <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-1">
          03 / Prover Sandbox
        </span>
        <div class="flex items-center gap-2.5 flex-wrap">
          <h1 class="text-xl sm:text-2xl font-serif font-normal text-neutral-950 dark:text-neutral-50 tracking-tight">
            {problem.title}
          </h1>
          <button
            type="button"
            on:click={toggleSaveCurrentTheorem}
            disabled={isSavingCurrent}
            title={isCurrentSaved ? "Saved to Sandbox Library (click to remove)" : "Save theorem to Sandbox Library"}
            class="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-sans transition-colors cursor-pointer {
              isCurrentSaved
                ? 'border-emerald-600/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }"
          >
            {#if isCurrentSaved}
              <svg class="group-hover:hidden" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <svg class="hidden group-hover:block" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span class="group-hover:hidden">Saved</span>
              <span class="hidden group-hover:inline">Remove</span>
            {:else if isSavingCurrent}
              <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              <span>Updating...</span>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span>Save</span>
            {/if}
          </button>
        </div>
        {#if currentSaveFeedback}
          <div class="text-[11px] font-sans text-emerald-600 dark:text-emerald-400 mt-0.5">
            ✓ {currentSaveFeedback}
          </div>
        {/if}
      </div>

      <!-- Mode sub-tabs -->
      <div class="flex items-center gap-1 font-sans text-xs">
        <button
          type="button"
          on:click={() => (activeSubTab = 'library')}
          class="px-2.5 py-1 border cursor-pointer transition-colors {
            activeSubTab === 'library'
              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
          }"
        >
          Library
        </button>
        <button
          type="button"
          on:click={() => (activeSubTab = 'generator')}
          class="px-2.5 py-1 border cursor-pointer transition-colors {
            activeSubTab === 'generator'
              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
          }"
        >
          Generator
        </button>
        <button
          type="button"
          on:click={() => (activeSubTab = 'custom')}
          class="px-2.5 py-1 border cursor-pointer transition-colors {
            activeSubTab === 'custom'
              ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black dark:border-white font-bold'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
          }"
        >
          Custom
        </button>
      </div>
    </div>

    <!-- Copi Library / Saved Proofs Picker -->
    {#if activeSubTab === 'library'}
      <div class="pt-2 space-y-3">
        <div class="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
          <button
            type="button"
            on:click={() => (libraryFilter = 'copi')}
            class="text-xs uppercase tracking-wider font-bold cursor-pointer transition-colors {
              libraryFilter === 'copi'
                ? 'text-neutral-950 dark:text-white border-b border-neutral-950 dark:border-white'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }"
          >
            Copi ({COPI_PRESET_PROBLEMS.length})
          </button>
          <span class="text-neutral-300 dark:text-neutral-700">|</span>
          <button
            type="button"
            on:click={() => {
              libraryFilter = 'community';
              fetchCommunityTheorems();
            }}
            class="text-xs uppercase tracking-wider font-bold cursor-pointer transition-colors {
              libraryFilter === 'community'
                ? 'text-neutral-950 dark:text-white border-b border-neutral-950 dark:border-white'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }"
          >
            Community ({communityTheorems.length})
          </button>
          <span class="text-neutral-300 dark:text-neutral-700">|</span>
          <button
            type="button"
            on:click={() => {
              libraryFilter = 'saved';
              if ($authStore.user) fetchMySavedProofs();
            }}
            class="text-xs uppercase tracking-wider font-bold cursor-pointer transition-colors {
              libraryFilter === 'saved'
                ? 'text-neutral-950 dark:text-white border-b border-neutral-950 dark:border-white'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }"
          >
            Saved Theorems ({mySavedProofs.length})
          </button>
        </div>

        {#if libraryFilter === 'copi'}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {#each COPI_PRESET_PROBLEMS as p}
              <button
                type="button"
                on:click={() => loadProblem(p)}
                class="p-2.5 text-left border transition-colors cursor-pointer {
                  problem.id === p.id
                    ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-neutral-900'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                }"
              >
                <div class="flex items-center justify-between font-sans text-xs">
                  <span class="font-bold text-neutral-900 dark:text-neutral-100">{p.title}</span>
                  <span class="text-[10px] uppercase text-neutral-600 dark:text-neutral-300">{p.difficulty}</span>
                </div>
                <div class="text-[11px] font-serif text-neutral-600 dark:text-neutral-300 truncate mt-0.5">{p.description}</div>
              </button>
            {/each}
          </div>

        {:else if libraryFilter === 'community'}
          {#if isCommunityLoading}
            <div class="py-6 text-center text-xs text-neutral-400 animate-pulse font-sans">
              Loading verified community theorems...
            </div>
          {:else if communityTheorems.length === 0}
            <div class="p-4 border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-1 font-sans">
              <div class="text-xs font-bold text-neutral-900 dark:text-white">No community theorems found.</div>
              <div class="text-[11px] text-neutral-500">Design a theorem in the Custom tab and submit it to be proven and included!</div>
            </div>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {#each communityTheorems as cp}
                <button
                  type="button"
                  on:click={() => loadProblem({
                    id: cp.id,
                    title: cp.title,
                    difficulty: (cp.difficulty as any) || 'medium',
                    premises: cp.premises,
                    conclusion: cp.conclusion,
                    author: cp.author || cp.creator_username,
                    creator_username: cp.creator_username || cp.author,
                    isCommunity: true
                  })}
                  class="p-2.5 text-left border transition-colors cursor-pointer {
                    problem.id === cp.id
                      ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-neutral-900'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                  }"
                >
                  <div class="flex items-center justify-between font-sans text-xs">
                    <span class="font-bold text-neutral-900 dark:text-neutral-100 truncate pr-2">{cp.title}</span>
                    <span class="text-[10px] uppercase text-neutral-600 dark:text-neutral-300 flex-shrink-0">{cp.difficulty}</span>
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-sans">
                    <span>by <strong class="text-neutral-800 dark:text-neutral-200">@{cp.author || cp.creator_username || 'Logician'}</strong></span>
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Proven</span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}

        {:else}
          {#if isSavedLoading}
            <div class="py-6 text-center text-xs text-neutral-400 animate-pulse font-sans">
              Loading your saved theorems...
            </div>
          {:else if mySavedProofs.length === 0}
            <div class="p-4 border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-1 font-sans">
              <div class="text-xs font-bold text-neutral-900 dark:text-white">No saved theorems found.</div>
              <div class="text-[11px] text-neutral-500">
                Click the "Save" button beside any theorem title to add it here, or create one in Custom!
              </div>
            </div>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {#each mySavedProofs as sp}
                <div class="group relative flex items-stretch border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white transition-colors bg-white dark:bg-neutral-950">
                  <button
                    type="button"
                    on:click={() => loadProblem({
                      id: sp.id,
                      title: sp.title,
                      difficulty: (sp.difficulty as any) || 'medium',
                      premises: sp.premises,
                      conclusion: sp.conclusion
                    })}
                    class="flex-1 p-2.5 text-left cursor-pointer min-w-0"
                  >
                    <div class="flex items-center justify-between font-sans text-xs">
                      <span class="font-bold text-neutral-900 dark:text-neutral-100 truncate pr-2">{sp.title}</span>
                      <span class="text-[9px] uppercase text-neutral-500 flex-shrink-0">{sp.difficulty}</span>
                    </div>
                    {#if sp.notes}
                      <div class="text-[11px] text-neutral-500 truncate mt-0.5">{sp.notes}</div>
                    {/if}
                  </button>
                  <button
                    type="button"
                    on:click|stopPropagation={() => removeSavedProof(sp)}
                    title="Remove from Saved Theorems"
                    class="px-2.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 opacity-40 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              {/each}
            </div>
            {#if !$authStore.user}
              <div class="text-[10px] text-neutral-400 dark:text-neutral-500 text-center font-sans pt-1">
                Saved locally on this device. Sign in to synchronize across devices.
              </div>
            {/if}
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Generator Controls -->
    {#if activeSubTab === 'generator'}
      <div class="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-sans text-xs">
        <div>
          <label for="sandbox-gen-seed" class="block text-[10px] uppercase text-neutral-600 dark:text-neutral-300 mb-1">Seed</label>
          <input
            id="sandbox-gen-seed"
            type="text"
            bind:value={genSeed}
            class="w-full h-8 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700"
          />
        </div>
        <div>
          <label for="sandbox-gen-diff" class="block text-[10px] uppercase text-neutral-600 dark:text-neutral-300 mb-1">Difficulty</label>
          <select
            id="sandbox-gen-diff"
            bind:value={genDifficulty}
            class="w-full h-8 px-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 cursor-pointer"
          >
            <option value="easy">Novice</option>
            <option value="medium">Adept</option>
            <option value="hard">Master</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            type="button"
            on:click={handleGenerate}
            class="w-full h-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 uppercase tracking-wider text-xs cursor-pointer hover:bg-black"
          >
            Generate
          </button>
        </div>
      </div>
    {/if}

    <!-- Custom Creator Controls -->
    {#if activeSubTab === 'custom'}
      <div class="pt-2 space-y-3 font-sans text-xs">
        <div>
          <label for="sandbox-custom-title" class="block text-[10px] uppercase text-neutral-600 dark:text-neutral-300 mb-1">Theorem Title</label>
          <input
            id="sandbox-custom-title"
            type="text"
            bind:value={customTitle}
            placeholder="e.g. Modus Tollens Variation"
            class="w-full h-8 px-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-sans text-xs"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="sandbox-custom-premises" class="block text-[10px] uppercase text-neutral-600 dark:text-neutral-300 mb-1">Premises (one per line)</label>
            <textarea
              id="sandbox-custom-premises"
              bind:value={customPremisesText}
              on:input={handlePremisesInput}
              maxlength="2000"
              rows="3"
              class="w-full p-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-serif text-sm"
            ></textarea>
          </div>
          <div class="space-y-2">
            <div>
              <label for="sandbox-custom-conclusion" class="block text-[10px] uppercase text-neutral-600 dark:text-neutral-300 mb-1">Conclusion to Prove</label>
              <input
                id="sandbox-custom-conclusion"
                type="text"
                bind:value={customConclusionText}
                on:input={handleConclusionInput}
                maxlength="250"
                class="w-full h-8 px-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-serif text-sm"
              />
            </div>
            <div class="flex gap-2 pt-1">
              <button
                type="button"
                on:click={assessCustomProblem}
                disabled={isAssessing}
                class="flex-1 h-8 border border-neutral-900 dark:border-white text-xs uppercase hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer disabled:opacity-40"
              >
                {isAssessing ? 'Checking...' : 'Assess'}
              </button>
              <button
                type="button"
                on:click={playCustomProblem}
                class="flex-1 h-8 bg-neutral-900 dark:bg-white text-white dark:text-black text-xs uppercase cursor-pointer"
              >
                Load to Prove
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                on:click={handleSaveToAccount}
                disabled={isSavingToAccount}
                class="h-8 border border-neutral-400 dark:border-neutral-600 hover:border-neutral-900 dark:hover:border-white text-neutral-800 dark:text-neutral-200 text-xs uppercase cursor-pointer transition-colors disabled:opacity-40"
              >
                {isSavingToAccount ? 'Saving...' : '💾 Save to Account'}
              </button>
              <button
                type="button"
                on:click={handleSubmitToCommunity}
                disabled={isSubmittingToCommunity}
                class="h-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-black dark:hover:bg-neutral-100 text-xs uppercase cursor-pointer transition-colors disabled:opacity-40"
              >
                {isSubmittingToCommunity ? 'Verifying...' : '🌐 Submit to Community'}
              </button>
            </div>
          </div>
        </div>

        {#if saveSuccessMessage}
          <div class="p-2.5 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
            ✓ {saveSuccessMessage}
          </div>
        {/if}

        {#if communitySuccessMessage}
          <div class="p-2.5 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
            {communitySuccessMessage}
          </div>
        {/if}

        {#if assessmentResult}
          <div class="p-2.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs">
            {assessmentResult.message}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Error feedback message -->
  {#if errorMessage}
    <div class="py-2.5 px-3.5 border border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-900 text-xs font-sans text-neutral-950 dark:text-neutral-50 flex items-center justify-between">
      <span>• {errorMessage}</span>
      <button type="button" on:click={() => (errorMessage = '')} class="underline ml-3 cursor-pointer">dismiss</button>
    </div>
  {/if}

  <!-- Minimal Proof Space -->
  <ProofTable
    {steps}
    conclusion={problem.conclusion}
    isComplete={isWon}
    on:undoStep={handleUndo}
    on:citeLine={handleCiteLine}
  />

  <!-- Derivation Input -->
  {#if !isWon}
    <StepInput
      bind:this={stepInputComponent}
      existingSteps={steps}
      on:submitStep={handleAddStep}
    />
  {/if}

  <!-- Minimal Completion Banner -->
  {#if isWon}
    <div class="border border-neutral-900 dark:border-white p-6 bg-white dark:bg-neutral-950 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <span class="text-[10px] font-sans tracking-widest uppercase text-neutral-600 dark:text-neutral-300 block mb-0.5">
            Validation Complete
          </span>
          <h3 class="font-serif text-2xl text-neutral-950 dark:text-neutral-50">
            Theorem Formally Proven
          </h3>
        </div>
        <div class="font-sans text-xs text-neutral-600 dark:text-neutral-300">
          {steps.filter(s => s.rule !== 'premise').length} deduction steps
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          on:click={() => (showShareModal = true)}
          class="h-9 px-4 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-sans text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>Share Proof Certificate</span>
          <span class="text-[10px] opacity-70">↗</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- Proof Sharing Modal with LaTeX and Image Rendering -->
  <ShareModal
    isOpen={showShareModal}
    {problem}
    {steps}
    mode="sandbox"
    difficulty="custom"
    on:close={() => (showShareModal = false)}
  />
</div>
