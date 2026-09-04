import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('goodle_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark )').matches ? 'dark' : 'light';
}

export const themeStore = writable<Theme>(getInitialTheme());

if (typeof window !== 'undefined') {
  themeStore.subscribe(theme => {
    try {
      localStorage.setItem('goodle_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  });
}

export function toggleTheme() {
  themeStore.update(t => (t === 'dark' ? 'light' : 'dark'));
}

export const isSettingsOpen = writable<boolean>(false);
