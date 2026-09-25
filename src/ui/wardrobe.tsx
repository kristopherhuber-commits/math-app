// What the mascots are wearing (R-RWD-4, M6): loaded by App, refreshed when a cosmetic unlocks or
// the learner dresses them up. Every Turtle and Penguin reads it, so an accessory shows everywhere.
import { createContext, useContext } from 'react';
import { cosmetic, type AccessoryKind, type Mascot } from '../engine/rewards';

export interface WardrobeValue {
  worn: readonly string[];
  refresh: () => void;
}

const WardrobeContext = createContext<WardrobeValue>({ worn: [], refresh: () => {} });
export const WardrobeProvider = WardrobeContext.Provider;
export const useWardrobe = (): WardrobeValue => useContext(WardrobeContext);

/** The accessory kinds one mascot wears. */
export function useWearing(mascot: Mascot): AccessoryKind[] {
  const { worn } = useWardrobe();
  return worn.flatMap((id) => {
    const c = cosmetic(id);
    return c && c.mascot === mascot ? [c.kind] : [];
  });
}
