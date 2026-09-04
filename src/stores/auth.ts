import { writable } from 'svelte/store';
import { NotationStyle } from '../types/logic';

export interface User {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  avatarIcon?: string;
  avatarImage?: string;
  avatarColor: string;
  streakCount: number;
  bestStreak: number;
  lastPlayedDate?: string;
  rankTitle?: string;
  totalWordleSolved?: number;
  totalFrenzySolved?: number;
  totalSolved?: number;
  leaderboardStanding?: string;
  activityMap?: Record<string, number>;
  optOutLeaderboard?: boolean;
  googleConnected?: boolean;
  githubConnected?: boolean;
  hasPassword?: boolean;
  createdAt?: string;
}

export interface SavedProof {
  id: string;
  title: string;
  difficulty: string;
  premises: any[];
  conclusion: any;
  notes?: string;
  createdAt: string;
}

export interface UserHistoryItem {
  date?: string;
  seed?: string;
  difficulty?: string;
  step_count?: number;
  duration_seconds?: number;
  score?: number;
  hearts_left?: number;
  won?: number;
  created_at: string;
}

function createAuthStore() {
  const initialCaptcha = typeof window !== 'undefined' && localStorage.getItem('godle_captcha_verified') === 'true';

  const { subscribe, set, update } = writable<{
    user: User | null;
    loading: boolean;
    token: string | null;
    isCaptchaVerified: boolean;
  }>({
    user: null,
    loading: true,
    token: typeof window !== 'undefined' ? localStorage.getItem('goodle_token') : null,
    isCaptchaVerified: initialCaptcha,
  });

  return {
    subscribe,
    setCaptchaVerified: (verified: boolean) => {
      if (verified) {
        localStorage.setItem('godle_captcha_verified', 'true');
      } else {
        localStorage.removeItem('godle_captcha_verified');
      }
      update(s => ({ ...s, isCaptchaVerified: verified }));
    },
    setUser: (user: User | null, token?: string | null) => {
      if (token) {
        localStorage.setItem('goodle_token', token);
      } else if (token === null) {
        localStorage.removeItem('goodle_token');
      }
      update(s => ({ ...s, user, token: token !== undefined ? token : s.token, loading: false }));
    },
    logout: async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {}
      localStorage.removeItem('goodle_token');
      update(s => ({ ...s, user: null, loading: false, token: null }));
    },
    checkAuth: async () => {
      const token = localStorage.getItem('goodle_token');
      if (!token) {
        update(s => ({ ...s, loading: false }));
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.user) {
          update(s => ({ ...s, user: data.user, loading: false }));
        } else {
          localStorage.removeItem('goodle_token');
          update(s => ({ ...s, user: null, token: null, loading: false }));
        }
      } catch {
        update(s => ({ ...s, loading: false }));
      }
    }
  };
}

export const authStore = createAuthStore();

export type ActiveTab = 'wordle' | 'frenzy' | 'sandbox' | 'tutorial' | 'about';

const initialNotation = typeof localStorage !== 'undefined' ? localStorage.getItem('goodle_notation') : null;
export const notationStore = writable<NotationStyle>(
  initialNotation === 'whitehead' ? 'whitehead' : 'standard'
);

notationStore.subscribe(val => {
  localStorage.setItem('goodle_notation', val);
});

export const activeTabStore = writable<ActiveTab>('wordle');

export const activeSandboxProblem = writable<any | null>(null);
