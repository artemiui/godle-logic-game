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

function getInitialSoundEnabled(): boolean {
  try {
    return typeof window === 'undefined' || localStorage.getItem('goodle_sound_enabled') !== 'false';
  } catch {
    return true;
  }
}

export const soundEnabledStore = writable<boolean>(getInitialSoundEnabled());

function getInitialSoundVolume(): number {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('goodle_sound_volume') : null;
    const value = saved === null ? 35 : Number(saved);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 35;
  } catch {
    return 35;
  }
}

export const soundVolumeStore = writable<number>(getInitialSoundVolume());

if (typeof window !== 'undefined') {
  soundVolumeStore.subscribe(volume => {
    try { localStorage.setItem('goodle_sound_volume', String(volume)); } catch {}
  });
  soundEnabledStore.subscribe(enabled => {
    try { localStorage.setItem('goodle_sound_enabled', String(enabled)); } catch {}
  });
}
