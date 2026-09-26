// Written methods: missing digits in column calculations, and using a known fact.
import { rat, type Rational } from '../../math/rational';
import { carries, exchanges, retry } from '../build';
import type { Rng } from '../rng';
import type { Block, ReasoningType } from '../types';
import { draft, fmt, nums, text } from './helpers';

type ColumnOp = Extract<Block, { b: 'column' }>['op'];

/**
 * Every way of putting digits in the lettered boxes that makes `rows[0] op rows[1] = total`, where
 * no number of two or more digits starts with 0. Letters in alphabetical order.
 */
function columnSolutions(op: ColumnOp, rows: string[], total: string): number[][] {
  const lines = [...rows, total];
  const letters = [...new Set(lines.join('').replace(/[^A-Z]/g, ''))].sort();
  const out: number[][] = [];
  for (let code = 0; code < 10 ** letters.length; code++) {
    const digits = letters.map((_, i) => Math.floor(code / 10 ** (letters.length - 1 - i)) % 10);
    const values = lines.map((l) => l.replace(/[A-Z]/g, (ch) => String(digits[letters.indexOf(ch)])));
    if (values.some((v) => v.length > 1 && v.startsWith('0'))) continue;
    const [a, b, c] = values.map(Number);
    if (op === '+' ? a + b === c : op === '−' ? a - b === c : a * b === c) out.push(digits);
  }
  return out;
}

/**
 * Hides `count` digits of the calculation, no two in the same column (a column with two gaps has
 * more than one answer), and keeps it only when exactly one set of digits works.
 */
function hideDigits(rng: Rng, op: ColumnOp, make: () => number[] | undefined, count: number, hideable: boolean[]) {
  return retry(() => {
    const numbers = make();
    if (!numbers) return undefined;
    const lines = numbers.map(String);
    const spots = lines.flatMap((l, row) => (hideable[row] ? [...l].map((_, i) => ({ row, i, place: l.length - 1 - i })) : []));
    const chosen: typeof spots = [];
    for (const s of rng.shuffle(spots)) if (chosen.length < count && !chosen.some((c) => c.place === s.place)) chosen.push(s);
    if (chosen.length < count) return undefined;
    // Letters go in reading order: top row first, left to right.
    chosen.sort((p, q) => p.row - q.row || p.i - q.i);
    const digits = chosen.map((s) => Number(lines[s.row][s.i]));
    chosen.forEach((s, k) => {
      const l = lines[s.row];
      lines[s.row] = l.slice(0, s.i) + 'ABC'[k] + l.slice(s.i + 1);
    });
    const rows = lines.slice(0, -1);
    const total = lines[lines.length - 1];
    if (columnSolutions(op, rows, total).length !== 1) return undefined;
    return { block: { b: 'column', op, rows, total } as Block, digits };
  });
}

const WORD: Record<ColumnOp, string> = { '+': 'addition', '−': 'subtraction', '×': 'multiplication' };

export const missingDigits: ReasoningType = {
  id: 'r-missing-digits',
  label: 'Missing digits in written methods',
  topic: 'add-sub',
  generate(rng, d) {
    let op: ColumnOp;
    let make: () => number[] | undefined;
    let count: number;
    if (d === 1) {
      op = '+';
      make = () => {
        const a = rng.int(120, 899);
        const b = rng.int(110, 899);
        return carries(a, b) >= 1 ? [a, b, a + b] : undefined;
      };
      count = 2;
    } else if (d === 2) {
      op = '−';
      make = () => {
        const a = rng.int(2000, 9899);
        const b = rng.int(rng.chance(0.5) ? 1000 : 150, a - 100);
        return exchanges(a, b) >= 2 ? [a, b, a - b] : undefined;
      };
      count = rng.int(2, 3);
    } else {
      op = '×';
      make = () => {
        const a = rng.int(112, 989);
        const k = rng.int(3, 9);
        return a % 10 ? [a, k, a * k] : undefined;
      };
      count = rng.int(2, 3);
    }
    // The single-digit multiplier stays: a missing digit goes in the number or the answer.
    const hideable = op === '×' ? [true, false, true] : [true, true, true];
    const { block, digits } = hideDigits(rng, op, make, count, hideable);
    const letters = digits.map((_, k) => 'ABC'[k]);
    return draft(
      [text(`Each box is a missing digit. Write the digits that make this **${WORD[op]}** correct.`), block],
      { kind: 'number', layout: 'row', boxes: letters.map((label) => ({ label })) },
      nums(...digits),
    );
  },
};

export const knownFacts: ReasoningType = {
  id: 'r-known-facts',
  label: 'Using a known fact',
  topic: 'mul-div',
  generate(rng, d) {
    return retry(() => {
      const a = rng.int(13, 89);
      const b = rng.int(12, 49);
      if (a % 10 === 0 || b % 10 === 0 || a === b) return undefined;
      const c = a * b;
      const tenth = (v: number) => fmt(rat(v, 10));
      const hundredth = (v: number) => fmt(rat(v, 100));
      const options: [string, Rational][] =
        d === 1
          ? [
              [`${fmt(c)} ÷ ${b}`, rat(a)],
              [`${fmt(c)} ÷ ${a}`, rat(b)],
              [`${fmt(a * 10)} × ${b}`, rat(c * 10)],
              [`${a} × ${fmt(b * 10)}`, rat(c * 10)],
            ]
          : d === 2
            ? [
                [`${a} × ${b + 1}`, rat(c + a)],
                [`${a} × ${b - 1}`, rat(c - a)],
                [`${a + 1} × ${b}`, rat(c + b)],
                [`${a - 1} × ${b}`, rat(c - b)],
                [`${a} × ${2 * b}`, rat(2 * c)],
              ]
            : // Decimals times or divided by a whole number, as in KS2 (never by a decimal).
              [
                [`${tenth(a)} × ${b}`, rat(c, 10)],
                [`${a} × ${tenth(b)}`, rat(c, 10)],
                [`${hundredth(a)} × ${b}`, rat(c, 100)],
                [`${tenth(c)} ÷ ${b}`, rat(a, 10)],
                [`${hundredth(c)} ÷ ${a}`, rat(b, 100)],
              ];
      const [target, answer] = rng.pick(options);
      return draft(
        [text(`**${a} × ${b} = ${fmt(c)}**\nUse this fact to work out **${target}**.`)],
        { kind: 'number', boxes: [d === 3 ? { decimal: true } : {}] },
        nums(answer),
      );
    });
  },
};
