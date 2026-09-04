<script lang="ts">
  import { onMount, createEventDispatcher, tick } from 'svelte';
  import type { Problem, ProofStep } from '../types/logic';
  import { formulaToLaTeX, formulaToString } from '../logic/latex';
  import { COPI_RULES } from '../logic/rules';
  import { authStore, notationStore } from '../stores/auth';
  import LaTeX from './LaTeX.svelte';

  export let isOpen: boolean = false;
  export let problem: Problem | null = null;
  export let steps: ProofStep[] = [];
  export let mode: 'wordle' | 'frenzy' | 'sandbox' = 'wordle';
  export let difficulty: string = 'medium';
  export let durationSeconds: number = 0;
  export let score: number = 0;
  export let heartsLeft: number = 3;
  export let seed: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  let canvasElement: HTMLCanvasElement;
  let statusMessage: string = '';
  let imageTheme: 'dark' | 'light' = 'dark';

  function getRuleLabel(ruleId: string, citations: number[]): string {
    if (ruleId === 'premise') return 'Premise';
    const r = COPI_RULES.find(x => x.id === ruleId);
    const name = r ? r.name : ruleId;
    if (citations && citations.length > 0) {
      return `${name} (${citations.join(', ')})`;
    }
    return name;
  }

  function formatDuration(sec: number): string {
    if (!sec || sec <= 0) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  }

  $: totalStepsCount = steps.length;
  $: deducedCount = steps.filter(s => !s.isPremise && s.rule !== 'premise').length;

  // LaTeX theorem statement: P1, P2, ... ⊢ C
  $: theoremLatex = (() => {
    if (!problem) return '';
    const premLatex = problem.premises.map(p => formulaToLaTeX(p, $notationStore)).join(', ');
    const concLatex = formulaToLaTeX(problem.conclusion, $notationStore);
    return `${premLatex} \\vdash ${concLatex}`;
  })();

  // Plain symbolic string theorem: P1, P2, ... ⊢ C
  $: theoremString = (() => {
    if (!problem) return '';
    const premStr = problem.premises.map(p => formulaToString(p, $notationStore)).join(', ');
    const concStr = formulaToString(problem.conclusion, $notationStore);
    return `${premStr} ⊢ ${concStr}`;
  })();

  // Text summary without any LaTeX notation tags
  function getShareSummaryText(): string {
    const today = new Date().toISOString().split('T')[0];
    const username = $authStore.user?.username || 'Anonymous Logician';
    const userIcon = $authStore.user?.avatarIcon || '⊢';
    const timeInfo = durationSeconds > 0 ? ` (${formatDuration(durationSeconds)})` : '';

    const lines = [
      `gödle · ${today}`,
      `Theorem: ${theoremString}`,
    ];
    if (problem?.author || problem?.creator_username) {
      lines.push(`Author: @${problem.author || problem.creator_username}`);
    }
    lines.push(
      `Solved in ${deducedCount} step(s)${timeInfo}`,
      `Logician: ${userIcon} ${username}`,
      `Q.E.D. ∎`,
    );
    return lines.join('\n');
  }

  // Full proof text sharing with NO LaTeX tags i.e. NO '(LaTeX: $A \supset B$)'
  function getFullProofText(): string {
    const summary = getShareSummaryText();
    let proofLines = ['\n--- FORMAL DERIVATION ---'];
    steps.forEach(s => {
      const fStr = formulaToString(s.formula, $notationStore);
      const rule = getRuleLabel(s.rule, s.citations);
      proofLines.push(`${s.stepNumber}. ${fStr}   [${rule}]`);
    });
    proofLines.push(`∎ Q.E.D. (${totalStepsCount} total lines)`);
    proofLines.push(`\nhttps://godle.org`);
    return `${summary}\n${proofLines.join('\n')}`;
  }

  // Draw high-resolution single-variation card on Canvas for download / copy
  function renderProofCanvas() {
    if (!canvasElement || !problem) return;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    const width = 760;
    const headerHeight = 90;
    const metaHeight = 60;
    const tableHeaderHeight = 36;
    const rowHeight = 34;
    const rowsCount = steps.length;
    const footerHeight = 80;
    const calculatedHeight = headerHeight + metaHeight + tableHeaderHeight + (rowsCount * rowHeight) + footerHeight;

    const scale = 2;
    canvasElement.width = width * scale;
    canvasElement.height = calculatedHeight * scale;
    canvasElement.style.width = `${width}px`;
    canvasElement.style.height = `${calculatedHeight}px`;

    ctx.scale(scale, scale);

    const isDark = imageTheme === 'dark';
    const bgColor = isDark ? '#0A0A0A' : '#FFFFFF';
    const textColor = isDark ? '#F5F5F5' : '#0A0A0A';
    const mutedColor = isDark ? '#888888' : '#666666';
    const borderColor = isDark ? '#262626' : '#E5E5E5';
    const rowAltBg = isDark ? '#141414' : '#F9F9FB';

    // 1. Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, calculatedHeight);

    // 2. Crisp single hairline border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, width - 40, calculatedHeight - 40);

    // 3. Top Header: ONLY main gödle typography
    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px system-ui, -apple-system, "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('gödle', 40, 62);

    // Subtle right date
    const todayStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    ctx.textAlign = 'right';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = mutedColor;
    ctx.fillText(todayStr.toUpperCase(), width - 40, 60);

    // Thin separator
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.moveTo(40, 78);
    ctx.lineTo(width - 40, 78);
    ctx.stroke();

    // 4. Metadata: Logician, Theorem, Steps, Duration
    const userIcon = $authStore.user?.avatarIcon || '⊢';
    const username = $authStore.user?.username || 'Anonymous Logician';

    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.font = '13px Georgia, serif';
    ctx.fillText(`${userIcon}  ${username}`, 40, 108);

    ctx.fillStyle = mutedColor;
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    const timeStr = durationSeconds > 0 ? ` · ${formatDuration(durationSeconds)}` : '';
    ctx.fillText(`${deducedCount} deduced steps${timeStr} · Q.E.D. ∎`, 40, 126);

    // Right-aligned theorem formula
    ctx.textAlign = 'right';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(`Theorem: ${theoremString}`, width - 40, 114);

    // 5. Lines & Premises Table
    const tableTop = 154;
    ctx.fillStyle = mutedColor;
    ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LINE', 40, tableTop);
    ctx.fillText('PROPOSITION', 90, tableTop);
    ctx.fillText('JUSTIFICATION', 460, tableTop);

    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.moveTo(40, tableTop + 8);
    ctx.lineTo(width - 40, tableTop + 8);
    ctx.stroke();

    let currentY = tableTop + 24;
    steps.forEach((step, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = rowAltBg;
        ctx.fillRect(40, currentY - 14, width - 80, rowHeight);
      }

      // Line number
      ctx.fillStyle = mutedColor;
      ctx.font = '11px "Plus Jakarta Sans", "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${step.stepNumber}.`, 40, currentY);

      // Formula string
      const fStr = formulaToString(step.formula, $notationStore);
      ctx.fillStyle = textColor;
      ctx.font = 'bold 13px Georgia, serif';
      ctx.fillText(fStr, 90, currentY);

      // Justification
      const ruleLabel = getRuleLabel(step.rule, step.citations);
      ctx.fillStyle = step.isPremise ? mutedColor : textColor;
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(ruleLabel, 460, currentY);

      currentY += rowHeight;
    });

    // 6. Footer watermark
    const footerY = calculatedHeight - 40;
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.moveTo(40, footerY - 15);
    ctx.lineTo(width - 40, footerY - 15);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '9px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = mutedColor;
    ctx.fillText('FORMAL PROPOSITIONAL DEDUCTION · GODLE.ORG', 40, footerY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText('∎ Q.E.D.', width - 40, footerY);
  }

  $: if (isOpen && problem && steps.length > 0) {
    tick().then(() => {
      renderProofCanvas();
    });
  }

  async function handleCopyText() {
    try {
      const text = getFullProofText();
      await navigator.clipboard.writeText(text);
      statusMessage = 'Proof text copied to clipboard!';
      setTimeout(() => (statusMessage = ''), 2800);
    } catch {
      statusMessage = 'Could not copy text.';
    }
  }

  async function handleCopyImage() {
    if (!canvasElement) return;
    try {
      canvasElement.toBlob(async (blob) => {
        if (!blob) {
          handleDownloadImage();
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          statusMessage = 'Proof card image copied to clipboard!';
          setTimeout(() => (statusMessage = ''), 2800);
        } catch {
          handleDownloadImage();
        }
      }, 'image/png');
    } catch {
      handleDownloadImage();
    }
  }

  function handleDownloadImage() {
    if (!canvasElement) return;
    const dataUrl = canvasElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `godle-proof.png`;
    a.href = dataUrl;
    a.click();
    statusMessage = 'Proof image downloaded (.png)!';
    setTimeout(() => (statusMessage = ''), 2800);
  }

  function shareTwitter() {
    const text = getShareSummaryText();
    const url = window.location.origin;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank', 'width=600,height=480');
  }

  function shareFacebook() {
    const url = window.location.origin;
    const quote = getShareSummaryText();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500');
  }

  async function shareInstagram() {
    await handleCopyImage();
    statusMessage = 'Card image copied! Open Instagram to paste into Stories or message.';
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank');
    }, 1200);
  }

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      dispatch('close');
    }
  }
</script>

{#if isOpen && problem}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-[2px] transition-opacity overflow-y-auto"
    on:click={handleBackdrop}
    role="presentation"
  >
    <div
      class="w-full max-w-2xl bg-white dark:bg-neutral-950 border border-neutral-900 dark:border-neutral-200 text-neutral-900 dark:text-neutral-100 p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <span class="text-xs font-sans font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          Share Proof
        </span>
        <button
          type="button"
          on:click={() => dispatch('close')}
          class="text-neutral-500 hover:text-black dark:hover:text-white text-xs font-sans tracking-wider cursor-pointer p-1"
        >
          [ ✕ Close ]
        </button>
      </div>

      <!-- Feedback Alert -->
      {#if statusMessage}
        <div class="p-2.5 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-sans">
          ✓ {statusMessage}
        </div>
      {/if}

      <!-- Actions Bar: Clipboard, Image Download, and Social Icons -->
      <div class="flex flex-wrap items-center justify-between gap-3 font-sans text-xs pt-1">
        <!-- Clipboard & Download Buttons -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            on:click={handleCopyText}
            class="h-9 px-3 border border-neutral-900 dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-950 dark:text-white font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            Copy Text
          </button>
          <button
            type="button"
            on:click={handleCopyImage}
            class="h-9 px-3 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
          >
            Copy Image
          </button>
          <button
            type="button"
            on:click={handleDownloadImage}
            class="h-9 px-3 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white uppercase font-bold tracking-wider cursor-pointer transition-colors"
          >
            Download PNG
          </button>
        </div>

        <!-- Social Media Icons Only (Twitter/X, Facebook, Instagram) -->
        <div class="flex items-center gap-1.5">
          <!-- Twitter / X -->
          <button
            type="button"
            on:click={shareTwitter}
            title="Share on Twitter / X"
            class="w-9 h-9 flex items-center justify-center border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            aria-label="Share on Twitter"
          >
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>

          <!-- Facebook -->
          <button
            type="button"
            on:click={shareFacebook}
            title="Share on Facebook"
            class="w-9 h-9 flex items-center justify-center border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            aria-label="Share on Facebook"
          >
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>

          <!-- Instagram -->
          <button
            type="button"
            on:click={shareInstagram}
            title="Share on Instagram"
            class="w-9 h-9 flex items-center justify-center border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            aria-label="Share on Instagram"
          >
            <svg class="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </button>

          <!-- Card Light / Dark Toggle -->
          <button
            type="button"
            on:click={() => {
              imageTheme = imageTheme === 'dark' ? 'light' : 'dark';
              renderProofCanvas();
            }}
            class="h-9 px-2.5 border border-neutral-300 dark:border-neutral-700 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white cursor-pointer ml-1"
            title="Switch card theme"
          >
            {imageTheme === 'dark' ? 'Light Card' : 'Dark Card'}
          </button>
        </div>
      </div>

      <!-- SINGLE CARD PREVIEW: First variation with LaTeX notation, main gödle typography, user icon, username, date, duration, lines & premises clearly shown -->
      <div class="border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 space-y-6 transition-colors shadow-sm {
        imageTheme === 'dark' ? 'bg-[#0A0A0A] text-[#F5F5F5]' : 'bg-[#FFFFFF] text-[#0A0A0A]'
      }">
        <!-- Card Header: ONLY main gödle typography -->
        <div class="flex items-baseline justify-between border-b {imageTheme === 'dark' ? 'border-[#262626]' : 'border-[#E5E5E5]'} pb-3">
          <span class="text-3xl font-black font-sans tracking-tight">
            gödle
          </span>
          <span class="text-xs font-sans uppercase tracking-wider {imageTheme === 'dark' ? 'text-[#888888]' : 'text-[#666666]'}">
            {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <!-- Logician Info & Stats -->
        <div class="flex items-center justify-between text-xs font-sans flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 border flex items-center justify-center font-serif font-bold text-xs select-none {imageTheme === 'dark' ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-[#F0F0F0] border-[#D0D0D0]'}">
              {$authStore.user?.avatarIcon || '⊢'}
            </span>
            <span class="font-bold">
              {$authStore.user?.username || 'Anonymous Logician'}
            </span>
          </div>

          <div class="{imageTheme === 'dark' ? 'text-[#888888]' : 'text-[#666666]'}">
            <span>{deducedCount} deduced steps</span>
            {#if durationSeconds > 0}
              <span> · {formatDuration(durationSeconds)}</span>
            {/if}
            <span class="font-bold ml-1">· Q.E.D. ∎</span>
          </div>
        </div>

        <!-- Theorem LaTeX Statement -->
        <div class="py-2.5 px-3 border {imageTheme === 'dark' ? 'border-[#262626] bg-[#121212]' : 'border-[#E5E5E5] bg-[#FBFBFB]'} flex items-center justify-between flex-wrap gap-2 text-sm">
          <span class="text-[10px] font-sans uppercase tracking-wider {imageTheme === 'dark' ? 'text-[#888888]' : 'text-[#666666]'}">
            Theorem:
          </span>
          <div class="font-serif font-medium overflow-x-auto">
            <LaTeX latex={theoremLatex} displayMode={false} />
          </div>
        </div>

        <!-- Lines & Premises Clearly Demarcated with LaTeX notation -->
        <div class="space-y-1 font-sans">
          <div class="grid grid-cols-12 text-[10px] uppercase font-bold pb-1 border-b {imageTheme === 'dark' ? 'text-[#888888] border-[#262626]' : 'text-[#666666] border-[#E5E5E5]'}">
            <span class="col-span-1">No.</span>
            <span class="col-span-7">Proposition (LaTeX)</span>
            <span class="col-span-4 text-right">Justification</span>
          </div>

          <div class="divide-y {imageTheme === 'dark' ? 'divide-[#1A1A1A]' : 'divide-[#F0F0F0]'}">
            {#each steps as s}
              <div class="grid grid-cols-12 py-2 text-xs items-center {s.stepNumber === steps.length ? 'font-bold' : ''}">
                <span class="col-span-1 font-sans {imageTheme === 'dark' ? 'text-[#666666]' : 'text-[#999999]'}">{s.stepNumber}.</span>
                <span class="col-span-7 font-serif flex items-center">
                  <LaTeX formula={s.formula} displayMode={false} />
                </span>
                <span class="col-span-4 text-right text-[11px] {s.isPremise ? (imageTheme === 'dark' ? 'text-[#777777]' : 'text-[#888888]') : ''}">
                  {getRuleLabel(s.rule, s.citations)}
                </span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Card Footer Watermark -->
        <div class="pt-2 border-t {imageTheme === 'dark' ? 'border-[#262626]' : 'border-[#E5E5E5]'} flex items-center justify-between text-[9px] uppercase tracking-wider {imageTheme === 'dark' ? 'text-[#777777]' : 'text-[#888888]'}">
          <span>godle.org</span>
          <span>∎ Quod Erat Demonstrandum</span>
        </div>
      </div>

      <!-- Off-screen Canvas for image generation -->
      <div class="hidden">
        <canvas bind:this={canvasElement}></canvas>
      </div>

      <!-- Modal Footer -->
      <div class="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
        <button
          type="button"
          on:click={() => dispatch('close')}
          class="px-5 py-2 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-sans uppercase font-bold cursor-pointer hover:opacity-90 transition-opacity"
        >
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
