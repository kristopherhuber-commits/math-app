import { strings } from '../strings';

export type KeypadKey = string | { key: 'backspace' };

interface Props {
  variable: string;
  disabled?: boolean;
  onKey: (k: KeypadKey) => void;
  onClear: () => void;
  onCheck: () => void;
}

// R-EQ-TYPE-2: digits, only this problem's letter, + − × ÷ / ( ) =, fraction key, backspace.
export function Keypad({ variable, disabled, onKey, onClear, onCheck }: Props) {
  const rows: { label: string; value: KeypadKey; kind: 'digit' | 'op' | 'var'; aria?: string }[][] = [
    [
      { label: '7', value: '7', kind: 'digit' },
      { label: '8', value: '8', kind: 'digit' },
      { label: '9', value: '9', kind: 'digit' },
      { label: '÷', value: '÷', kind: 'op', aria: 'divide' },
    ],
    [
      { label: '4', value: '4', kind: 'digit' },
      { label: '5', value: '5', kind: 'digit' },
      { label: '6', value: '6', kind: 'digit' },
      { label: '×', value: '×', kind: 'op', aria: 'times' },
    ],
    [
      { label: '1', value: '1', kind: 'digit' },
      { label: '2', value: '2', kind: 'digit' },
      { label: '3', value: '3', kind: 'digit' },
      { label: '−', value: '−', kind: 'op', aria: 'minus' },
    ],
    [
      { label: '0', value: '0', kind: 'digit' },
      { label: variable, value: variable, kind: 'var' },
      { label: '/', value: '/', kind: 'op', aria: strings.practice.fractionKey },
      { label: '+', value: '+', kind: 'op', aria: 'plus' },
    ],
    [
      { label: '(', value: '(', kind: 'op', aria: 'open bracket' },
      { label: ')', value: ')', kind: 'op', aria: 'close bracket' },
      { label: '=', value: '=', kind: 'op', aria: 'equals' },
      { label: '⌫', value: { key: 'backspace' }, kind: 'op', aria: strings.practice.backspace },
    ],
  ];
  return (
    <div className="keypad">
      <div className="overline">{strings.practice.keypad}</div>
      <div className="keypad-grid">
        {rows.flat().map((k) => (
          <button
            key={typeof k.value === 'string' ? k.value : 'bs'}
            type="button"
            className={`key key-${k.kind}`}
            aria-label={k.aria ?? k.label}
            disabled={disabled}
            // Keep focus (and the caret) in the line input.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onKey(k.value)}
          >
            {k.kind === 'var' ? <i>{k.label}</i> : k.label}
          </button>
        ))}
      </div>
      <div className="keypad-actions">
        <button type="button" className="btn btn-outline" disabled={disabled} onClick={onClear}>
          {strings.practice.clearLine}
        </button>
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={onCheck}>
          {strings.practice.checkStep}
        </button>
      </div>
      <p className="keypad-note">{strings.practice.keyboardHint}</p>
    </div>
  );
}
