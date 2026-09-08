<script lang="ts">
  import katex from 'katex';
  import type { Formula, NotationStyle } from '../types/logic';
  import { formulaToLaTeX } from '../logic/latex';
  import { notationStore } from '../stores/auth';

  export let formula: Formula | null = null;
  export let latex: string = '';
  export let style: NotationStyle | null = null;
  export let displayMode: boolean = false;
  export let className: string = '';
  export let hibernated: boolean = false;

  let cachedHtml: string = '';

  $: effectiveStyle = style || $notationStore;
  $: renderedLatex = formula ? formulaToLaTeX(formula, effectiveStyle) : latex;

  $: if (!hibernated && renderedLatex) {
    try {
      cachedHtml = katex.renderToString(renderedLatex, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      cachedHtml = renderedLatex;
    }
  } else if (!renderedLatex) {
    cachedHtml = '';
  }

  $: html = cachedHtml;
</script>

<span class="inline-flex items-center {className}">
  {@html html}
</span>
