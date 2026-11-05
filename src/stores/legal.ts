import { writable } from 'svelte/store';

export type LegalTab = 'privacy' | 'terms';

export interface LegalModalState {
  isOpen: boolean;
  activeTab: LegalTab;
}

export const legalModalStore = writable<LegalModalState>({
  isOpen: false,
  activeTab: 'privacy',
});

export function openLegalModal(tab: LegalTab = 'privacy') {
  legalModalStore.set({
    isOpen: true,
    activeTab: tab,
  });
}

export function closeLegalModal() {
  legalModalStore.update(s => ({
    ...s,
    isOpen: false,
  }));
}
