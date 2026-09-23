import { isInt, ratFromString, toDecimalString, toMixed, type Rational } from '../math/rational';
import type { AnswerKind, Op, Part, Question } from './types';

/** "4478" → "4,478", "1234.5" → "1,234.5". Commas from four digits, as on SATs papers. */
export function formatNumber(v: string): string {
  const negative = v.startsWith('-');
  const [intPart, fracPart] = (negative ? v.slice(1) : v).split('.');
  const grouped = intPart.length >= 4 ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : intPart;
  return (negative ? '−' : '') + grouped + (fracPart !== undefined ? `.${fracPart}` : '');
}

export const OP_TEXT: Record<Op, string> = {
  '+': '+',
  '-': '−',
  '×': '×',
  '÷': '÷',
  '=': '=',
  '(': '(',
  ')': ')',
  of: 'of',
};

export function partText(p: Part): string {
  switch (p.t) {
    case 'num':
      return formatNumber(p.v);
    case 'op':
      return OP_TEXT[p.v];
    case 'frac':
      return p.w ? `${p.w} ${p.n}/${p.d}` : `${p.n}/${p.d}`;
    case 'pow':
      return `${p.b}${p.e === 2 ? '²' : '³'}`;
    case 'pct':
      return `${p.v}%`;
    case 'box':
      return '□';
  }
}

export const hasBox = (parts: Part[]): boolean => parts.some((p) => p.t === 'box');

/** One-line text of a prompt; prompts without a box get "= □" on the end. */
export function promptText(parts: Part[]): string {
  const text = parts
    .map(partText)
    .join(' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')');
  return hasBox(parts) ? text : `${text} = □`;
}

/** Answer as a pupil would write it: "1,635", "0.006", "3/4", "1 1/8". */
export function formatValue(r: Rational, kind: AnswerKind): string {
  if (kind !== 'frac' || isInt(r)) {
    const s = toDecimalString(r);
    if (s !== null) return formatNumber(s);
  }
  const { w, n, d } = toMixed(r);
  if (n === 0) return formatNumber(String(w));
  return w ? `${formatNumber(String(w))} ${n}/${d}` : `${n}/${d}`;
}

export const formatAnswer = (q: Question): string => formatValue(ratFromString(q.answer), q.kind);
