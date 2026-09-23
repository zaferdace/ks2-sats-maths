import { Fragment, type ReactNode } from 'react';
import { FracView } from './MathText';

// Light markup in questions: **bold**, __underlined__, [[3/8]] or [[2 1/4]] fractions, \n breaks.
// Underlined text never starts or ends with a space, so blanks such as "The ____ was ____" stay blanks.
const TOKEN = /(\*\*[^*]+\*\*|__[^_\s](?:[^_]*[^_\s])?__|\[\[[^\]]+\]\])/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(TOKEN).map((piece, i) => {
    const k = `${key}-${i}`;
    if (piece.startsWith('**') && piece.endsWith('**')) return <strong key={k}>{inline(piece.slice(2, -2), k)}</strong>;
    if (/^__[^_]/.test(piece) && piece.endsWith('__')) return <u key={k}>{inline(piece.slice(2, -2), k)}</u>;
    const m = /^\[\[(?:(\d+) )?(\d+)\/(\d+)\]\]$/.exec(piece);
    if (m) return <FracView key={k} w={m[1]} n={m[2]} d={m[3]} />;
    return <Fragment key={k}>{piece.replace(/-(?=\d)/g, '−')}</Fragment>;
  });
}

/** One paragraph of question text. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');
  return (
    <p className={`rich ${className ?? ''}`}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {inline(line, String(i))}
        </Fragment>
      ))}
    </p>
  );
}

/** Inline markup without a paragraph, for option buttons. */
export function RichInline({ text }: { text: string }) {
  return <>{inline(text, 'i')}</>;
}
