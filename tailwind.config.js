/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{html,js,ts,svelte}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Newsreader"', '"Crimson Pro"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        canvas: {
          light: '#FAFAFA',
          dark: '#0A0A0A',
        },
        // Monochrome ramp — values live in app.css so both themes share one set of names
        paper: v('paper'),
        card: v('card'),
        raised: v('raised'),
        ink: {
          DEFAULT: v('ink'),
          2: v('ink-2'),
          3: v('ink-3'),
        },
        line: 'rgb(var(--ink) / 0.09)',
        'line-strong': 'rgb(var(--ink) / 0.16)',
      },
      fontSize: {
        meta: ['12px', { lineHeight: '16px' }],
        caption: ['13px', { lineHeight: '20px' }],
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        DEFAULT: '160ms',
      },
    },
  },
  plugins: [],
}
