import { useEffect } from 'react';

interface Props {
  onKey: (key: string) => void;
  allowDecimal: boolean;
  /** False while a dialog is open, so typing doesn't change the answer behind it. */
  enabled?: boolean;
  /** Shows a minus key (temperatures, coordinates). */
  allowNegative?: boolean;
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'back'];

/** On-screen number pad, so the iPad keyboard never covers the question. */
export function Keypad({ onKey, allowDecimal, enabled = true, allowNegative = false }: Props) {
  // A hardware keyboard works too (handy on a laptop).
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) onKey(e.key);
      else if (e.key === '.' && allowDecimal) onKey('.');
      else if (e.key === '-' && allowNegative) onKey('-');
      else if (e.key === 'Backspace') onKey('back');
      else if (e.key === 'Delete' || e.key === 'Escape') onKey('clear');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKey, allowDecimal, enabled, allowNegative]);

  return (
    <div className="keypad" role="group" aria-label="Number pad">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`key ${k === 'back' ? 'key-back' : ''}`}
          disabled={k === '.' && !allowDecimal}
          aria-label={k === 'back' ? 'Delete' : k === '.' ? 'Decimal point' : k}
          onClick={() => onKey(k)}
        >
          {k === 'back' ? '⌫' : k}
        </button>
      ))}
      {allowNegative && (
        <button type="button" className="key key-minus" aria-label="Minus sign" onClick={() => onKey('-')}>
          −
        </button>
      )}
      <button type="button" className={`key key-clear ${allowNegative ? 'narrow' : ''}`} onClick={() => onKey('clear')}>
        Clear
      </button>
    </div>
  );
}
