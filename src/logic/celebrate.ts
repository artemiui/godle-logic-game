import confetti from 'canvas-confetti';

/** Monochrome confetti in the ink of the current theme. */
export function celebrate(particleCount = 40, spread = 50) {
  const dark = document.documentElement.classList.contains('dark');
  const colors = dark ? ['#F0F0F0', '#A3A3A8', '#5C5C60'] : ['#0A0A0A', '#525252', '#A3A3A3'];
  confetti({ particleCount, spread, colors, shapes: ['square'], scalar: 0.8 });
}
