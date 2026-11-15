<script lang="ts">
  /*
    A quiet field of logic glyphs behind the landing hero.
    - glyphs sit on a grid at very low contrast
    - a slow diagonal band passes over them, like an eye reading down a proof
    - now and then a glyph turns into another one (a rule being applied)
    - the cursor brightens the glyphs it passes, like a lens
    - the centre stays clear so the wordmark reads on calm paper
    Canvas only, ~30fps, paused when hidden, static under reduced motion.
  */
  import { onMount, onDestroy } from 'svelte';

  const GLYPHS = ['⊃', '∨', '·', '~', '≡', '∴', '⊢', 'p', 'q', 'r', '(', ')'];
  const CELL = 56;

  let canvas: HTMLCanvasElement;
  let raf = 0;
  let running = true;

  interface Cell { x: number; y: number; g: string; next: string; t: number; jitter: number }
  let cells: Cell[] = [];
  let w = 0, h = 0, dpr = 1;
  let pointer = { x: -9999, y: -9999, a: 0 };
  let ink = '10,10,10';

  const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

  function readInk() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    ink = v ? v.split(/\s+/).join(',') : '10,10,10';
  }

  function layout() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    cells = [];
    const cols = Math.ceil(w / CELL) + 1, rows = Math.ceil(h / CELL) + 1;
    const ox = (w - (cols - 1) * CELL) / 2, oy = (h - (rows - 1) * CELL) / 2;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        if (Math.random() < 0.32) continue; // leave gaps so the grid breathes
        const g = pick();
        cells.push({ x: ox + i * CELL + (j % 2 ? CELL / 2 : 0), y: oy + j * CELL, g, next: g, t: 1, jitter: Math.random() });
      }
  }

  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  function draw(time: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const s = time / 1000;
    const cx = w / 2, cy = h * 0.46;
    const rx = Math.max(260, w * 0.3), ry = Math.max(200, h * 0.3);
    pointer.a += ((pointer.x > -999 ? 1 : 0) - pointer.a) * 0.08;

    for (const c of cells) {
      // keep the middle clear for the wordmark
      const d = Math.hypot((c.x - cx) / rx, (c.y - cy) / ry);
      const clear = smooth(0.55, 1.25, d);
      if (clear < 0.02) continue;

      // a narrow diagonal band that sweeps slowly across
      const phase = (c.x * 0.55 + c.y) / 900 - s * 0.06 + c.jitter * 0.04;
      const band = Math.pow(Math.max(0, Math.cos(phase * Math.PI * 2)), 24);

      // cursor lens
      const pd = Math.hypot(c.x - pointer.x, c.y - pointer.y);
      const lens = pointer.a * Math.max(0, 1 - pd / 180);

      // glyph transitions
      if (c.t < 1) c.t = Math.min(1, c.t + 0.035);
      else if (c.g !== c.next) c.g = c.next;

      const base = 0.055 + band * 0.16 + lens * 0.22;
      const alpha = base * clear;
      const size = 20 + band * 2 + lens * 6;
      const face = (g: string) => `${/[a-z]/.test(g) ? 'italic ' : ''}400 ${size}px Newsreader, Georgia, serif`;

      if (c.t < 1) {
        const e = c.t * c.t * (3 - 2 * c.t);
        ctx.font = face(c.g);
        ctx.fillStyle = `rgba(${ink},${alpha * (1 - e)})`;
        ctx.fillText(c.g, c.x, c.y - e * 6);
        ctx.font = face(c.next);
        ctx.fillStyle = `rgba(${ink},${alpha * e})`;
        ctx.fillText(c.next, c.x, c.y + (1 - e) * 6);
      } else {
        ctx.font = face(c.g);
        ctx.fillStyle = `rgba(${ink},${alpha})`;
        ctx.fillText(c.g, c.x, c.y);
      }
    }

    // a few glyphs change each second, mostly inside the passing band
    for (let k = 0; k < 2; k++) {
      const c = cells[(Math.random() * cells.length) | 0];
      if (c && c.t >= 1 && Math.random() < 0.18) { c.next = pick(); c.t = 0; }
    }
  }

  let last = 0;
  function loop(time: number) {
    if (!running) return;
    if (time - last > 33) { draw(time); last = time; }
    raf = requestAnimationFrame(loop);
  }

  function onMove(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  }
  function onLeave() { pointer.x = pointer.y = -9999; }
  function onVisibility() {
    running = !document.hidden;
    if (running) raf = requestAnimationFrame(loop);
  }

  let ro: ResizeObserver;
  let mo: MutationObserver;

  onMount(() => {
    readInk();
    layout();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // wait for the serif so glyphs do not flash in a fallback face
    (document as any).fonts?.load?.('20px Newsreader').finally(() => {
      if (reduce) draw(0);
      else raf = requestAnimationFrame(loop);
    });
    ro = new ResizeObserver(() => { layout(); if (reduce) draw(0); });
    ro.observe(canvas);
    mo = new MutationObserver(() => { readInk(); if (reduce) draw(0); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
  });

  onDestroy(() => {
    running = false;
    cancelAnimationFrame(raf);
    ro?.disconnect();
    mo?.disconnect();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  });
</script>

<canvas bind:this={canvas} class="logic-field absolute inset-0 w-full h-full pointer-events-none select-none" aria-hidden="true"></canvas>

<style>
  .logic-field {
    /* fade out toward the bottom so the field ends softly above the modes */
    -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%);
  }
</style>
