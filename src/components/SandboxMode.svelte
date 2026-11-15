<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { celebrate } from "../logic/celebrate";
  import { playVictorySound } from '../logic/sound';
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

  export let hibernated: boolean = false;

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
    currentSaveFeedback = 'Saved to your library';
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
    currentSaveFeedback = 'Removed from your library';
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
      errorMessage = 'Sign in to save theorems to your account';
      return;
    }

    const lines = customPremisesText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length === 0) {
      errorMessage = 'Add at least one premise';
      return;
    }

    const parsedPremises = [];
    for (let i = 0; i < lines.length; i++) {
      const p = safeParseFormula(lines[i]);
      if (!p.formula) {
        errorMessage = `Premise ${i + 1} could not be read: ${p.error}`;
        return;
      }
      parsedPremises.push(p.formula);
    }

    const parsedConc = safeParseFormula(customConclusionText);
    if (!parsedConc.formula) {
      errorMessage = `The conclusion could not be read: ${parsedConc.error}`;
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
        saveSuccessMessage = 'Saved to your account';
        await fetchMySavedProofs();
      } else {
        errorMessage = data.error || 'Failed to save theorem.';
      }
    } catch {
      errorMessage = 'Could not reach the server. Try again';
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
      errorMessage = 'Add at least one premise';
      return;
    }

    const parsedPremises: Formula[] = [];
    for (let i = 0; i < lines.length; i++) {
      const p = safeParseFormula(lines[i]);
      if (!p.formula) {
        errorMessage = `Premise ${i + 1} could not be read: ${p.error}`;
        return;
      }
      parsedPremises.push(p.formula);
    }

    const parsedConc = safeParseFormula(customConclusionText);
    if (!parsedConc.formula) {
      errorMessage = `The conclusion could not be read: ${parsedConc.error}`;
      return;
    }

    // Client-side solver verification first for immediate feedback
    const testResult = solveProblem(parsedPremises, parsedConc.formula, 8);
    if (!testResult.solvable) {
      errorMessage = 'No proof was found with Copi’s 19 rules, so this cannot go in the community library';
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
        communitySuccessMessage = data.message || 'Proved and added to the community library';
        await fetchCommunityTheorems();
        libraryFilter = 'community';
        activeSubTab = 'library';
      } else {
        errorMessage = data.error || 'The theorem was not submitted';
      }
    } catch {
      errorMessage = 'Could not reach the server. Try again';
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
      playVictorySound();
      isWon = true;
      try {
        celebrate(35, 45);
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
      errorMessage = 'Add at least one premise';
      isAssessing = false;
      return;
    }

    const parsedPremises: Formula[] = [];
    for (let i = 0; i < lines.length; i++) {
      const p = safeParseFormula(lines[i]);
      if (!p.formula) {
        errorMessage = `Premise ${i + 1} could not be read: ${p.error}`;
        isAssessing = false;
        return;
      }
      parsedPremises.push(p.formula);
    }

    const parsedConc = safeParseFormula(customConclusionText);
    if (!parsedConc.formula) {
      errorMessage = `The conclusion could not be read: ${parsedConc.error}`;
      isAssessing = false;
      return;
    }

    const solution = solveProblem(parsedPremises, parsedConc.formula, 8);
    isAssessing = false;

    if (solution.solvable) {
      assessmentResult = {
        solvable: true,
        minSteps: solution.minSteps,
        message: `Provable in ${solution.minSteps} ${solution.minSteps === 1 ? 'line' : 'lines'} at the shortest`,
      };
    } else {
      assessmentResult = {
        solvable: false,
        message: 'No proof within 8 lines. It may be invalid or need a longer proof',
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

<div class="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 space-y-8">
  <header class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 space-y-2">
        <span class="font-sans text-meta font-medium text-ink-2">Sandbox</span>
        <h1 class="page-title">{problem.title}</h1>
      </div>
      <button
        type="button"
        on:click={toggleSaveCurrentTheorem}
        disabled={isSavingCurrent}
        aria-pressed={isCurrentSaved}
        title={isCurrentSaved ? 'Saved to your library. Click to remove' : 'Save to your library'}
        class="btn-icon shrink-0 -mr-2 mt-6 disabled:opacity-40 {isCurrentSaved ? 'text-ink' : ''}"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={isCurrentSaved ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="seg" role="group" aria-label="Source">
        <button type="button" class="seg-item" aria-pressed={activeSubTab === 'library'} on:click={() => (activeSubTab = 'library')}>Library</button>
        <button type="button" class="seg-item" aria-pressed={activeSubTab === 'generator'} on:click={() => (activeSubTab = 'generator')}>Generate</button>
        <button type="button" class="seg-item" aria-pressed={activeSubTab === 'custom'} on:click={() => (activeSubTab = 'custom')}>Write your own</button>
      </div>
      {#if currentSaveFeedback}
        <span class="font-sans text-meta text-ink-2" aria-live="polite">{currentSaveFeedback}</span>
      {/if}
    </div>

    {#if activeSubTab === 'library'}
      <div class="panel overflow-hidden">
        <div class="flex items-center gap-6 px-4 h-12 border-b border-line font-sans text-caption">
          <button type="button" on:click={() => (libraryFilter = 'copi')}
            class="relative h-full cursor-pointer transition-colors {libraryFilter === 'copi' ? 'text-ink font-medium' : 'text-ink-2 hover:text-ink'}">
            Copi <span class="text-ink-3 tabular-nums ml-1">{COPI_PRESET_PROBLEMS.length}</span>
            {#if libraryFilter === 'copi'}<span class="absolute inset-x-0 -bottom-px h-px bg-ink"></span>{/if}
          </button>
          <button type="button" on:click={() => { libraryFilter = 'community'; fetchCommunityTheorems(); }}
            class="relative h-full cursor-pointer transition-colors {libraryFilter === 'community' ? 'text-ink font-medium' : 'text-ink-2 hover:text-ink'}">
            Community <span class="text-ink-3 tabular-nums ml-1">{communityTheorems.length}</span>
            {#if libraryFilter === 'community'}<span class="absolute inset-x-0 -bottom-px h-px bg-ink"></span>{/if}
          </button>
          <button type="button" on:click={() => { libraryFilter = 'saved'; if ($authStore.user) fetchMySavedProofs(); }}
            class="relative h-full cursor-pointer transition-colors {libraryFilter === 'saved' ? 'text-ink font-medium' : 'text-ink-2 hover:text-ink'}">
            Saved <span class="text-ink-3 tabular-nums ml-1">{mySavedProofs.length}</span>
            {#if libraryFilter === 'saved'}<span class="absolute inset-x-0 -bottom-px h-px bg-ink"></span>{/if}
          </button>
        </div>

        <div class="max-h-[264px] overflow-y-auto divide-y divide-line">
          {#if libraryFilter === 'copi'}
            {#each COPI_PRESET_PROBLEMS as p}
              <button type="button" on:click={() => loadProblem(p)} aria-current={problem.id === p.id ? 'true' : undefined}
                class="w-full flex items-center justify-between gap-4 min-h-[48px] px-4 text-left font-sans cursor-pointer transition-colors duration-150 {problem.id === p.id ? 'bg-raised' : 'hover:bg-raised/60'}">
                <span class="min-w-0">
                  <span class="block text-sm text-ink truncate {problem.id === p.id ? 'font-medium' : ''}">{p.title}</span>
                  <span class="block text-meta text-ink-3 truncate">{p.description}</span>
                </span>
                <span class="text-meta text-ink-3 shrink-0">{p.difficulty === 'easy' ? 'Novice' : p.difficulty === 'medium' ? 'Adept' : p.difficulty === 'hard' ? 'Master' : p.difficulty}</span>
              </button>
            {/each}

          {:else if libraryFilter === 'community'}
            {#if isCommunityLoading}
              <p class="px-4 py-8 text-center font-sans text-caption text-ink-3">Loading community theorems</p>
            {:else if communityTheorems.length === 0}
              <div class="px-4 py-8 text-center font-sans space-y-1">
                <p class="text-sm text-ink">No community theorems yet</p>
                <p class="text-caption text-ink-3">Write one under Write your own and submit it. It is added once a proof is found.</p>
              </div>
            {:else}
              {#each communityTheorems as cp}
                <button type="button"
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
                  aria-current={problem.id === cp.id ? 'true' : undefined}
                  class="w-full flex items-center justify-between gap-4 min-h-[48px] px-4 text-left font-sans cursor-pointer transition-colors duration-150 {problem.id === cp.id ? 'bg-raised' : 'hover:bg-raised/60'}">
                  <span class="min-w-0">
                    <span class="block text-sm text-ink truncate {problem.id === cp.id ? 'font-medium' : ''}">{cp.title}</span>
                    <span class="block text-meta text-ink-3 truncate">@{cp.author || cp.creator_username || 'logician'}</span>
                  </span>
                  <span class="text-meta text-ink-3 shrink-0">{cp.difficulty === 'easy' ? 'Novice' : cp.difficulty === 'medium' ? 'Adept' : cp.difficulty === 'hard' ? 'Master' : cp.difficulty}</span>
                </button>
              {/each}
            {/if}

          {:else}
            {#if isSavedLoading}
              <p class="px-4 py-8 text-center font-sans text-caption text-ink-3">Loading your saved theorems</p>
            {:else if mySavedProofs.length === 0}
              <div class="px-4 py-8 text-center font-sans space-y-1">
                <p class="text-sm text-ink">Nothing saved yet</p>
                <p class="text-caption text-ink-3">Use the bookmark beside any title to keep it here.</p>
              </div>
            {:else}
              {#each mySavedProofs as sp}
                <div class="group flex items-center {problem.id === sp.id ? 'bg-raised' : 'hover:bg-raised/60'} transition-colors">
                  <button type="button"
                    on:click={() => loadProblem({
                      id: sp.id,
                      title: sp.title,
                      difficulty: (sp.difficulty as any) || 'medium',
                      premises: sp.premises,
                      conclusion: sp.conclusion
                    })}
                    class="flex-1 min-w-0 min-h-[48px] px-4 py-2 text-left font-sans cursor-pointer">
                    <span class="block text-sm text-ink truncate">{sp.title}</span>
                    {#if sp.notes}<span class="block text-meta text-ink-3 truncate">{sp.notes}</span>{/if}
                  </button>
                  <button type="button" on:click|stopPropagation={() => removeSavedProof(sp)} title="Remove from saved" aria-label="Remove {sp.title} from saved"
                    class="btn-icon mr-2 opacity-60 group-hover:opacity-100"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                </div>
              {/each}
            {/if}
          {/if}
        </div>
        {#if libraryFilter === 'saved' && !$authStore.user && mySavedProofs.length > 0}
          <p class="px-4 py-3 border-t border-line font-sans text-meta text-ink-3">Saved on this device. Sign in to keep them across devices.</p>
        {/if}
      </div>
    {/if}

    {#if activeSubTab === 'generator'}
      <div class="panel p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] items-end gap-4 font-sans">
        <div class="space-y-2">
          <label for="sandbox-gen-seed" class="label block">Seed</label>
          <input id="sandbox-gen-seed" type="text" bind:value={genSeed} class="field" />
        </div>
        <div class="space-y-2">
          <label for="sandbox-gen-diff" class="label block">Stage</label>
          <select id="sandbox-gen-diff" bind:value={genDifficulty} class="field cursor-pointer">
            <option value="easy">Novice</option>
            <option value="medium">Adept</option>
            <option value="hard">Master</option>
          </select>
        </div>
        <button type="button" on:click={handleGenerate} class="btn btn-primary">Generate</button>
      </div>
    {/if}

    {#if activeSubTab === 'custom'}
      <div class="panel p-4 sm:p-6 space-y-4 font-sans">
        <div class="space-y-2">
          <label for="sandbox-custom-title" class="label block">Title</label>
          <input id="sandbox-custom-title" type="text" bind:value={customTitle} placeholder="Modus Tollens, twice" class="field" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="sandbox-custom-premises" class="label block">Premises, one per line</label>
            <textarea id="sandbox-custom-premises" bind:value={customPremisesText} on:input={handlePremisesInput}
              maxlength="2000" rows="4" class="field h-auto py-2 font-serif text-base leading-relaxed"></textarea>
          </div>
          <div class="space-y-2">
            <label for="sandbox-custom-conclusion" class="label block">Conclusion</label>
            <input id="sandbox-custom-conclusion" type="text" bind:value={customConclusionText} on:input={handleConclusionInput}
              maxlength="250" class="field font-serif text-base" />
          </div>
        </div>

        {#if assessmentResult}
          <p class="px-4 py-3 rounded-lg bg-raised text-caption text-ink">{assessmentResult.message}</p>
        {/if}
        {#if saveSuccessMessage}
          <p class="text-caption text-ink-2" aria-live="polite">{saveSuccessMessage}</p>
        {/if}
        {#if communitySuccessMessage}
          <p class="text-caption text-ink-2" aria-live="polite">{communitySuccessMessage}</p>
        {/if}

        <div class="flex flex-wrap items-center gap-2 pt-4 border-t border-line">
          <button type="button" on:click={playCustomProblem} class="btn btn-primary">Prove it</button>
          <button type="button" on:click={assessCustomProblem} disabled={isAssessing} class="btn btn-secondary">
            {isAssessing ? 'Checking' : 'Check if provable'}
          </button>
          <span class="flex-1"></span>
          <button type="button" on:click={handleSaveToAccount} disabled={isSavingToAccount} class="btn btn-ghost">
            {isSavingToAccount ? 'Saving' : 'Save to account'}
          </button>
          <button type="button" on:click={handleSubmitToCommunity} disabled={isSubmittingToCommunity} class="btn btn-ghost">
            {isSubmittingToCommunity ? 'Looking for a proof' : 'Submit to community'}
          </button>
        </div>
      </div>
    {/if}
  </header>

  <!-- Error feedback message -->
  {#if errorMessage}
    <div class="flex items-center justify-between gap-4 min-h-[44px] px-4 rounded-xl border border-ink bg-card font-sans text-caption text-ink" role="alert">
      <span>{errorMessage}</span>
      <button type="button" on:click={() => (errorMessage = '')} class="link shrink-0">Dismiss</button>
    </div>
  {/if}

  <!-- Minimal Proof Space -->
  <ProofTable
    {steps}
    conclusion={problem.conclusion}
    isComplete={isWon}
    {hibernated}
    on:undoStep={handleUndo}
    on:citeLine={handleCiteLine}
    on:insertFormula={(event) => stepInputComponent?.insertFormula(event.detail)}
  />

  <!-- Derivation Input -->
  {#if !isWon}
    <StepInput
      bind:this={stepInputComponent}
      existingSteps={steps}
      {hibernated}
      on:submitStep={handleAddStep}
    />
  {/if}

  {#if isWon}
    <section class="panel p-6 sm:p-8 space-y-6">
      <div class="space-y-2">
        <span class="label">Proved</span>
        <h2 class="font-serif text-3xl text-ink leading-tight">
          In {steps.filter(s => s.rule !== 'premise').length} {steps.filter(s => s.rule !== 'premise').length === 1 ? 'line' : 'lines'}
        </h2>
      </div>
      <div class="flex flex-wrap items-center gap-3 pt-6 border-t border-line">
        <button type="button" on:click={() => (showShareModal = true)} class="btn btn-primary">Share proof</button>
        <button type="button" on:click={() => (activeSubTab = 'library')} class="btn btn-ghost">Pick another</button>
      </div>
    </section>
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
