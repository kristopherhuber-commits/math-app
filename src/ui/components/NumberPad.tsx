// Small number pad for the tile builder's Simplify and Solve phases (R-EQ-TILE-4/5, design.md §6.2).
import { strings } from '../strings';

const KEYS: { label: string; key: string; aria?: string }[] = [
  { label: '7', key: '7' },
  { label: '8', key: '8' },
  { label: '9', key: '9' },
  { label: '4', key: '4' },
  { label: '5', key: '5' },
  { label: '6', key: '6' },
  { label: '1', key: '1' },
  { label: '2', key: '2' },
  { label: '3', key: '3' },
  { label: '−', key: '−', aria: strings.tiles.padMinus },
  { label: '0', key: '0' },
  { label: '⌫', key: 'back', aria: strings.tiles.padDelete },
];

export function NumberPad({ onKey, disabled }: { onKey: (key: string) => void; disabled?: boolean }) {
  return (
    <div className="number-pad" role="group" aria-label={strings.tiles.pad}>
      {KEYS.map((k) => (
        <button
          key={k.key}
          type="button"
          className={`key ${/\d/.test(k.key) ? 'key-digit' : 'key-op'}`}
          aria-label={k.aria ?? k.label}
          disabled={disabled}
          onClick={() => onKey(k.key)}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}
