import type { ReactNode } from 'react';
import { formatNumber, OP_TEXT } from '../gen/format';
import type { Part } from '../gen/types';

export function FracView({ n, d, w }: { n: ReactNode; d: ReactNode; w?: ReactNode }) {
  return (
    <span className="frac">
      {w ? <span>{w}</span> : null}
      <span className="frac-stack">
        <span>{n}</span>
        <span className="frac-bar" />
        <span>{d}</span>
      </span>
    </span>
  );
}

function PartView({ part, box }: { part: Part; box: ReactNode }) {
  switch (part.t) {
    case 'num':
      return <span>{formatNumber(part.v)}</span>;
    case 'op':
      return <span className={part.v === '(' || part.v === ')' ? 'paren' : 'op'}>{OP_TEXT[part.v]}</span>;
    case 'frac':
      return <FracView n={part.n} d={part.d} w={part.w} />;
    case 'pow':
      return (
        <span>
          {part.b}
          <sup>{part.e}</sup>
        </span>
      );
    case 'pct':
      return <span>{part.v}%</span>;
    case 'box':
      return <>{box}</>;
  }
}

const isOp = (p: Part, v: string) => p.t === 'op' && p.v === v;

/**
 * A question's calculation. `box` fills the answer position: inside the calculation when the
 * prompt has a box, otherwise after a trailing "=".
 */
export function MathText({ parts, box, className }: { parts: Part[]; box: ReactNode; className?: string }) {
  const inline = parts.some((p) => p.t === 'box');
  // Brackets hug their contents: "(" joins the next part, ")" joins the previous one.
  const groups: Part[][] = [];
  for (const p of parts) {
    const last = groups[groups.length - 1];
    if (last && (isOp(last[last.length - 1], '(') || isOp(p, ')'))) last.push(p);
    else groups.push([p]);
  }
  return (
    <span className={`math ${className ?? ''}`}>
      {groups.map((g, i) => (
        <span key={i} className="math-group">
          {g.map((p, j) => (
            <PartView key={j} part={p} box={box} />
          ))}
        </span>
      ))}
      {!inline && (
        <>
          <span className="op">=</span>
          {box}
        </>
      )}
    </span>
  );
}
