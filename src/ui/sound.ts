// Sounds (design.md §8, R-PAR-5 "sounds on/off"): short, soft tones made with one Web Audio context,
// so there are no audio files to license, download or cache. Each is under 300 ms and quiet. Nothing
// plays when the parent's setting is off, and a browser without Web Audio simply stays silent.
import { useCallback } from 'react';
import { useSettings } from './settings';

export type SoundName = 'select' | 'correct' | 'stars' | 'notQuite' | 'tileSnap' | 'levelUp';

/** A note: frequency (Hz), start offset and length (s), and the oscillator shape. */
type Note = [freq: number, at: number, len: number, wave?: OscillatorType];

const RECIPES: Record<SoundName, (n: number) => Note[]> = {
  select: () => [[880, 0, 0.04, 'sine']],
  // Two rising notes (design.md §8 "two-note chime").
  correct: () => [
    [660, 0, 0.09],
    [880, 0.09, 0.12],
  ],
  // One sparkle per star, 80 ms apart (the star stagger in design.md §5 Celebration).
  stars: (n) => Array.from({ length: n }, (_, i): Note => [1320 + i * 180, 0.25 + i * 0.08, 0.06]),
  // A single soft low note, never a buzzer.
  notQuite: () => [[220, 0, 0.18, 'sine']],
  tileSnap: () => [[440, 0, 0.05, 'triangle']],
  levelUp: () => [
    [523, 0, 0.06],
    [659, 0.06, 0.06],
    [784, 0.12, 0.06],
    [1047, 0.18, 0.1],
  ],
};

const VOLUME = 0.06;
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = typeof window !== 'undefined' ? window.AudioContext : undefined;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** Test hook: when a page defines `window.__soundLog`, every sound played is recorded there. */
declare global {
  interface Window {
    __soundLog?: string[];
  }
}

export function playSound(name: SoundName, count = 1): void {
  if (typeof window !== 'undefined') window.__soundLog?.push(name);
  try {
    const c = context();
    if (!c) return;
    if (c.state === 'suspended') void c.resume();
    const t0 = c.currentTime + 0.01;
    for (const [freq, at, len, wave = 'sine'] of RECIPES[name](count)) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      // A quick fade in and out so nothing clicks.
      gain.gain.setValueAtTime(0, t0 + at);
      gain.gain.linearRampToValueAtTime(VOLUME, t0 + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
      osc.connect(gain).connect(c.destination);
      osc.start(t0 + at);
      osc.stop(t0 + at + len + 0.02);
    }
  } catch {
    // Sound is decoration: never let it break a question.
  }
}

/** Play a sound when the parent's setting allows it. */
export function useSound(): (name: SoundName, count?: number) => void {
  const { sound } = useSettings();
  return useCallback(
    (name: SoundName, count?: number) => {
      if (sound) playSound(name, count);
    },
    [sound],
  );
}
