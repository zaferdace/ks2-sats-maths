import { useEffect } from 'react';

interface Props {
  onKey: (key: string) => void;
  /** False while a dialog is open, so typing doesn't change the answer behind it. */
  enabled?: boolean;
}

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/**
 * On-screen letters for typed answers. The iPad's own keyboard would autocorrect and suggest
 * spellings, which gives spelling answers away, and it covers half the screen.
 */
export function LetterKeyboard({ onKey, enabled = true }: Props) {
  // A hardware keyboard works too.
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea')) return;
      if (/^[a-z'-]$/i.test(e.key)) onKey(e.key.toLowerCase());
      else if (e.key === '’') onKey("'");
      else if (e.key === ' ') onKey('space');
      else if (e.key === 'Backspace') onKey('back');
      else if (e.key === 'Delete' || e.key === 'Escape') onKey('clear');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKey, enabled]);

  const key = (k: string, label = k, cls = '', aria?: string) => (
    <button key={k} type="button" className={`key lkey ${cls}`} aria-label={aria} onClick={() => onKey(k)}>
      {label}
    </button>
  );

  return (
    <div className="letters" role="group" aria-label="Letter keyboard">
      {ROWS.map((row, r) => (
        <div key={r} className={`letters-row row-${r}`}>
          {[...row].map((k) => key(k))}
          {r === 2 && (
            <>
              {key("'", "'", 'punct', 'Apostrophe')}
              {key('-', '-', 'punct', 'Hyphen')}
            </>
          )}
        </div>
      ))}
      <div className="letters-row">
        {key('clear', 'Clear', 'wide')}
        {key('space', 'space', 'space', 'Space')}
        {key('back', '⌫', 'wide', 'Delete')}
      </div>
    </div>
  );
}
