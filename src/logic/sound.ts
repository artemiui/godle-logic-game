import { get } from 'svelte/store';
import { soundEnabledStore, soundVolumeStore } from '../stores/theme';

/** Shared victory clip for Daily, Frenzy, and Sandbox. */
let victoryAudio: HTMLAudioElement | undefined;

soundVolumeStore.subscribe(volume => {
  if (victoryAudio) victoryAudio.volume = volume / 100;
});

soundEnabledStore.subscribe(enabled => {
  if (!enabled && victoryAudio) {
    victoryAudio.pause();
    victoryAudio.currentTime = 0;
  }
});

export function playVictorySound(): void {
  if (!get(soundEnabledStore)) return;
  try {
    victoryAudio ??= new Audio('/audio/victory.mp3');
    victoryAudio.volume = get(soundVolumeStore) / 100;
    victoryAudio.currentTime = 0;
    void victoryAudio.play().catch(() => {
      // Browser audio restrictions must never interrupt a completed proof.
    });
  } catch {
    // Solving still succeeds when audio is unavailable.
  }
}
