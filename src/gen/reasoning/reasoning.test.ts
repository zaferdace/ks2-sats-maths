// Invariant tests for every reasoning template, plus independent checks where the figure alone
// determines the answer (angles). Wording is checked by reading printed papers, not here.
import { describe, expect, it } from 'vitest';
import { formNote, isCorrect, formatCorrect, markFor, typedValue, type AnswerInput } from '../../answer/answer';
import { isInt, ratFromString, toDecimalString, type Rational } from '../../math/rational';
import { createRng } from '../rng';
import type { Block, Difficulty, ItemQuestion } from '../types';
import { wordingProblems } from '../wording';
import { REASONING_BLUEPRINT, REASONING_MARKS, REASONING_QUESTIONS } from './blueprint';
import { nums } from './helpers';
import { generateReasoningPaper, reasoningKey } from './paper';
import { REASONING_TYPES } from './registry';

const SEEDS = 1000;

/** The input a pupil would give for the right answer. */
export function correctInput(q: ItemQuestion): AnswerInput {
  const blank = { whole: '', num: '', den: '' };
  switch (q.input.kind) {
    case 'number': {
      const boxes = q.input.boxes;
      return { ...blank, boxes: q.answer.split(';').map((s, i) => typedValue(ratFromString(s), boxes[i] ?? {})) };
    }
    case 'fraction': {
      // As a mixed number when the question asks for one, otherwise as a fraction.
      const r = ratFromString(q.answer);
      if (q.input.form !== 'mixed') return { ...blank, num: String(r.n), den: String(r.d) };
      const whole = Math.floor(r.n / r.d);
      return { ...blank, whole: String(whole), num: String(r.n - whole * r.d), den: String(r.d) };
    }
    case 'choice':
    case 'order':
      return { ...blank, sel: q.answer.split(',').map(Number) };
    case 'tf':
      return { ...blank, tf: q.answer.split(',').map((v) => v === '1') };
    default:
      throw new Error(`Reasoning templates do not use ${q.input.kind} inputs`);
  }
}

const n = (label: string) => Number(label.replace('°', ''));

/** Re-derives an angle answer from the diagram labels alone (crossing lines are checked in derive.test.ts). */
function angleFromFigure(b: Extract<Block, { b: 'angles' }>): number | null {
  if (b.shape === 'cross') return null;
  const unknown = b.labels.filter((l) => l === 'a').length;
  if (!unknown || b.labels.some((l) => l !== 'a' && !/^\d+°$/.test(l))) return null;
  const known = b.labels.filter((l) => l !== 'a').reduce((s, l) => s + n(l), 0);
  const total = { triangle: 180, line: 180, point: 360, quad: 360 }[b.shape];
  return (total - known) / unknown;
}

/** Every piece of text a pupil reads: paragraphs, options, order items, table cells, figure labels. */
function textsOf(q: ItemQuestion): string[] {
  const out: string[] = [];
  for (const b of q.body) {
    if (b.b === 'text') out.push(b.text);
    if (b.b === 'table') out.push(...b.head, ...b.rows.flat());
    if (b.b === 'pie') out.push(...b.slices.map((s) => s.label));
  }
  if (q.input.kind === 'choice') out.push(...q.input.options);
  if (q.input.kind === 'order') out.push(...q.input.items);
  if (q.input.kind === 'tf') out.push(...q.input.statements);
  return out;
}

/** A printed label as a number: "1,000", "−2.5". */
const labelValue = (text: string) => Number(text.replace(/,/g, '').replace('−', '-'));

/** Problems with a scale's labels: fewer than two, off the scale, or not evenly spaced. */
function scaleProblems(ticks: number, labels: { at: number; text: string }[], pointer: number): string[] {
  const out: string[] = [];
  if (labels.length < 2) out.push('scale has fewer than two labels');
  if (labels.some((l) => l.at < 0 || l.at > ticks || !Number.isInteger(l.at))) out.push('scale label off the scale');
  if (!(pointer > 0 && pointer < ticks) || !Number.isInteger(pointer * 2)) out.push('scale pointer off the scale');
  if (labels.some((l) => l.at === pointer)) out.push('scale points at a label');
  const [a, b] = labels;
  if (a && b) {
    const step = (labelValue(b.text) - labelValue(a.text)) / (b.at - a.at);
    if (labels.some((l) => Math.abs(labelValue(l.text) - (labelValue(a.text) + step * (l.at - a.at))) > 1e-9)) out.push('scale labels not evenly spaced');
  }
  return out;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/**
 * A pie chart sector can be read without judging by eye when it has a right-angle mark (a
 * quarter), is a half (its edges make a straight line) or has its angle printed. Returns the
 * sectors that cannot, and checks the answer against the figure.
 */
function pieProblems(q: ItemQuestion, b: Extract<Block, { b: 'pie' }>): string[] {
  const out: string[] = [];
  for (const s of b.slices) {
    const angle = Math.round(s.turn * 360);
    const printed = s.label.match(/ (\d+)°$/);
    if (printed && Number(printed[1]) !== angle) out.push(`pie label ${s.label} is not ${angle}°`);
    if (!printed && angle !== 90 && angle !== 180) out.push(`pie sector ${s.label} (${angle}°) can only be judged by eye`);
  }
  const text = q.body.flatMap((x) => (x.b === 'text' ? [x.text] : [])).join('\n');
  const total = Number(text.match(/\*\*(\d+)\*\* children chose/)?.[1]);
  const asked = text.match(/How many children chose \*\*(.+?)\*\*/)?.[1];
  const slice = b.slices.find((s) => s.label === asked || s.label.startsWith(`${asked} `));
  if (!slice) out.push('pie question asks about a sector that is not there');
  else if (q.input.kind === 'number' && ratFromString(q.answer).n !== total * slice.turn) out.push('pie answer does not match the figure');
  return out;
}

function problems(q: ItemQuestion): string[] {
  const out: string[] = [];
  const all = JSON.stringify(q);
  if (/NaN|undefined|Infinity|\[object/.test(all)) out.push('bad text');
  if (!q.body.length) out.push('empty body');
  // "an equilateral triangle", "1 litre", "1 hour 1 minute"
  for (const t of textsOf(q)) out.push(...wordingProblems(t));
  for (const t of textsOf(q)) {
    // Ratios are given in their simplest form unless the question is about simplifying.
    if (/simplest|simplify/i.test(t)) continue;
    for (const [, a, b] of t.matchAll(/(\d+) : (\d+)/g)) if (gcd(Number(a), Number(b)) !== 1) out.push(`ratio ${a} : ${b} not in simplest form`);
    for (const [, a, b] of t.matchAll(/for every \*\*(\d+)[^*]*\*\* there (?:is|are) \*\*(\d+)/g)) {
      if (gcd(Number(a), Number(b)) !== 1) out.push(`"for every ${a} … ${b}" not in simplest form`);
    }
  }
  const input = q.input;
  if (input.kind === 'number') {
    const values: Rational[] = q.answer.split(';').map(ratFromString);
    if (values.length !== input.boxes.length) out.push('answer/box count');
    values.forEach((v, i) => {
      const box = input.boxes[i];
      if (!box) return;
      if (toDecimalString(v) === null) out.push('answer cannot be typed');
      if (!box.negative && v.n < 0) out.push('negative answer without a minus key');
      if (!box.decimal && !isInt(v)) out.push('decimal answer in a whole-number box');
      if (box.prefix === '£' && (v.n < 0 || !Number.isInteger((v.n * 100) / v.d))) out.push('not whole pence');
    });
    if (input.layout === 'time') {
      const [h, m] = values;
      if (values.length !== 2 || !isInt(h) || !isInt(m) || h.n < 0 || h.n > 23 || m.n < 0 || m.n > 59) out.push('bad time');
    }
    if (input.layout === 'sequence' && (input.tokens ?? []).filter((t) => t === null).length !== input.boxes.length) {
      out.push('sequence gaps ≠ boxes');
    }
  } else if (input.kind === 'fraction') {
    const v = ratFromString(q.answer);
    if (v.n <= 0) out.push('fraction answer not positive');
    // A mixed number or an improper fraction is only asked for a value above 1 that is not whole.
    if (input.form && (v.n <= v.d || v.d === 1)) out.push(`${input.form} form asked for ${v.n}/${v.d}`);
  } else if (input.kind === 'choice') {
    const idx = q.answer.split(',').map(Number);
    if (new Set(input.options).size !== input.options.length) out.push('duplicate options');
    if (idx.length !== input.pick || new Set(idx).size !== idx.length) out.push('wrong number of correct options');
    if (idx.some((i) => !(i >= 0 && i < input.options.length))) out.push('answer index out of range');
    if (input.options.length < input.pick + 2) out.push('too few options');
  } else if (input.kind === 'order') {
    const idx = q.answer.split(',').map(Number);
    if (new Set(input.items).size !== input.items.length) out.push('duplicate order items');
    if ([...idx].sort((a, b) => a - b).join() !== input.items.map((_, i) => i).join()) out.push('order answer not a permutation');
  } else if (input.kind === 'tf') {
    const marks = q.answer.split(',');
    if (new Set(input.statements).size !== input.statements.length) out.push('duplicate statements');
    if (marks.length !== input.statements.length || marks.some((m) => m !== '0' && m !== '1')) out.push('true/false answer does not fit the statements');
    if (!marks.includes('0') || !marks.includes('1')) out.push('statements all true or all false');
  }
  for (const b of q.body) {
    if (b.b === 'bar' && (b.values.some((v) => v < 0 || v > b.max) || b.values.length !== b.labels.length)) out.push('bar data');
    if (b.b === 'line' && b.values.some((v) => v < b.min || v > b.max)) out.push('line data');
    if (b.b === 'pie' && Math.abs(b.slices.reduce((s, x) => s + x.turn, 0) - 1) > 1e-9) out.push('pie does not add up');
    if (b.b === 'pie') out.push(...pieProblems(q, b));
    if (b.b === 'rect') {
      const [w, h] = b.labels.map((l) => parseFloat(l));
      if (Boolean(b.square) !== (w === h)) out.push('rect: a square must be marked square, and only a square');
    }
    const text = q.body.flatMap((x) => (x.b === 'text' ? [x.text] : [])).join('\n');
    if (b.b === 'coords' && /parallelogram/i.test(text)) {
      // "ABCD is a parallelogram": corners in order, so D is opposite B and D = A + C − B.
      // "Three corners of a parallelogram" would also allow B + C − A and A + B − C.
      const [A, B, C] = ['A', 'B', 'C'].map((l) => b.points.find((p) => p.label === l)!);
      if (!text.includes('**ABCD** is a parallelogram')) out.push('parallelogram corners are not named in order');
      if (q.answer !== nums(A.x + C.x - B.x, A.y + C.y - B.y)) out.push('parallelogram D is not A + C − B');
    }
    if (b.b === 'coords' && b.points.some((p) => p.x < b.min || p.x > b.max || p.y < b.min || p.y > b.max)) out.push('point off grid');
    if (b.b === 'grid' && (new Set(b.shaded).size !== b.shaded.length || b.shaded.some((i) => i < 0 || i >= b.cols * b.rows))) {
      out.push('grid shading');
    }
    if (b.b === 'table' && b.rows.some((r) => r.length !== b.head.length)) out.push('table row length');
    if (b.b === 'lshape' && b.labels.length !== 6) out.push('lshape labels');
    if (b.b === 'grid' && b.shape && b.shape.some(([x, y]) => x < 0 || x > b.cols || y < 0 || y > b.rows || !Number.isInteger(x) || !Number.isInteger(y))) {
      out.push('grid shape corner off the grid');
    }
    if (b.b === 'line' && b.xAxis) {
      // A conversion graph: a straight line through 0.
      const rate = b.values[1] / Number(b.labels[1]);
      if (b.labels.some((l, i) => Math.abs(Number(l) * rate - b.values[i]) > 1e-9)) out.push('conversion graph is not a straight line from 0');
    }
    if (b.b === 'numberline') out.push(...scaleProblems(b.ticks, b.labels, b.arrow));
    if (b.b === 'scale') {
      out.push(...scaleProblems(b.ticks, b.labels, b.level));
      const [l0, l1] = b.labels;
      const bottom = labelValue(l0.text) - ((labelValue(l1.text) - labelValue(l0.text)) / (l1.at - l0.at)) * l0.at;
      if (b.kind === 'jug' && bottom !== 0) out.push('measuring jug does not start at 0');
    }
    if (b.b === 'column') {
      const letters = [...new Set([...b.rows, b.total].join('').match(/[A-Z]/g) ?? [])];
      const boxes = input.kind === 'number' ? input.boxes.map((x) => x.label) : [];
      if (letters.join() !== boxes.join()) out.push('lettered boxes do not match the answer boxes');
      const columns = [...b.rows, b.total].flatMap((row) => [...row].flatMap((ch, i) => (/[A-Z]/.test(ch) ? [row.length - i] : [])));
      if (new Set(columns).size !== columns.length) out.push('two missing digits in one column');
    }
    if (b.b === 'cubes') {
      const hs = b.heights;
      if (!hs.length || !hs[0][0]) out.push('no cubes');
      // Each stack no taller than the one behind it or to its left, so every stack top can be seen.
      hs.forEach((row, r) =>
        row.forEach((h, c) => {
          if (!Number.isInteger(h) || h < 0 || h > 4) out.push('bad stack height');
          if ((r && h > hs[r - 1][c]) || (c && h > row[c - 1])) out.push('a stack hides behind a taller one');
        }),
      );
    }
    if (b.b === 'polygon' && !(b.sides >= 5 && b.sides <= 10)) out.push('polygon sides');
    // Angles sorted by eye: none close to a right angle (except a marked one) or to a straight line.
    if (b.b === 'angleset' && b.angles.some((a) => !(a > 0 && a < 360) || (a !== 90 && Math.abs(a - 90) < 15) || Math.abs(a - 180) < 15)) {
      out.push('angle to sort is unclear');
    }
    if (b.b === 'angles') {
      const expected = angleFromFigure(b);
      if (expected !== null && q.input.kind === 'number' && Number(q.answer.split('/')[0]) !== expected) {
        out.push(`angle answer ${q.answer} ≠ ${expected} from the diagram`);
      }
    }
  }
  if (!isCorrect(q, correctInput(q))) out.push('the right answer is marked wrong');
  try {
    formatCorrect(q);
  } catch {
    out.push('answer cannot be formatted');
  }
  return out.map((m) => `${m}: ${reasoningKey(q).slice(0, 160)}`);
}

describe.each(REASONING_TYPES.map((t) => [t.id, t] as const))('%s', (_id, type) => {
  it.each([1, 2, 3] as Difficulty[])('difficulty %i gives valid questions', (d) => {
    const failures: string[] = [];
    const keys = new Set<string>();
    for (let s = 0; s < SEEDS; s++) {
      const draft = type.generate(createRng(`${type.id}/${d}/${s}`), d);
      const q: ItemQuestion = { format: 'reasoning', typeId: type.id, difficulty: d, marks: 1, ...draft };
      failures.push(...problems(q));
      keys.add(reasoningKey(q));
    }
    expect(failures.slice(0, 5)).toEqual([]);
    expect(keys.size).toBeGreaterThanOrEqual(5);
  });
});

describe('reasoning blueprint', () => {
  it('has 25 questions worth 35 marks, 7 a day', () => {
    expect(REASONING_BLUEPRINT).toHaveLength(REASONING_QUESTIONS);
    expect(REASONING_BLUEPRINT.reduce((s, slot) => s + slot.marks, 0)).toBe(REASONING_MARKS);
    for (let day = 0; day < 5; day++) {
      expect(REASONING_BLUEPRINT.slice(day * 5, day * 5 + 5).reduce((s, slot) => s + slot.marks, 0)).toBe(7);
    }
  });

  it('only names real templates and reaches every one', () => {
    const ids = new Set(REASONING_TYPES.map((t) => t.id));
    const used = new Set(REASONING_BLUEPRINT.flatMap((s) => s.options.map((o) => o.type)));
    expect([...used].filter((u) => !ids.has(u))).toEqual([]);
    expect([...ids].filter((id) => !used.has(id))).toEqual([]);
  });
});

describe('generateReasoningPaper', () => {
  it('is deterministic and serialisable', () => {
    const paper = generateReasoningPaper('ABCDEF');
    expect(generateReasoningPaper('ABCDEF')).toEqual(paper);
    expect(JSON.parse(JSON.stringify(paper))).toEqual(paper);
  });

  it('builds 25 distinct questions worth 35 marks for many codes', () => {
    const rng = createRng('reasoning-papers');
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 200; i++) {
      const code = Array.from({ length: 6 }, () => rng.pick([...alphabet])).join('');
      const paper = generateReasoningPaper(code);
      expect(paper).toHaveLength(REASONING_QUESTIONS);
      expect(paper.reduce((s, q) => s + q.marks, 0)).toBe(REASONING_MARKS);
      expect(new Set(paper.map(reasoningKey)).size).toBe(REASONING_QUESTIONS);
      expect(new Set(paper.map((q) => q.typeId)).size).toBeGreaterThanOrEqual(20);
      for (const q of paper) expect(problems(q)).toEqual([]);
    }
  });
});

describe('answers are marked as the real test marks them', () => {
  const byId = (id: string) => REASONING_TYPES.find((t) => t.id === id)!;
  const make = (id: string, d: Difficulty, seed: string): ItemQuestion => ({
    format: 'reasoning',
    typeId: id,
    difficulty: d,
    marks: 1,
    ...byId(id).generate(createRng(seed), d),
  });
  const blank = { whole: '', num: '', den: '' };

  it('money needs two digits for the pence', () => {
    let checked = 0;
    for (let s = 0; s < 400 && checked < 20; s++) {
      const q = make('r-money', 2, `money-${s}`);
      if (q.input.kind !== 'number') continue;
      const v = ratFromString(q.answer);
      const short = toDecimalString(v)!; // e.g. 4.4
      if (!/\.\d$/.test(short)) continue;
      checked++;
      expect(markFor(q, { ...blank, boxes: [short] })).toBe(0);
      expect(formNote(q, { ...blank, boxes: [short] })).toMatch(/two digits/);
      expect(markFor(q, { ...blank, boxes: [`${short}0`] })).toBe(q.marks);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('rounding to one decimal place needs one decimal place, even for a whole number', () => {
    let wholes = 0;
    for (let s = 0; s < 400; s++) {
      const q = make('r-rounding', 3, `round-${s}`);
      if (q.input.kind !== 'number' || q.input.boxes[0].dp !== 1) continue;
      const v = ratFromString(q.answer);
      const exact = typedValue(v, q.input.boxes[0]);
      expect(exact).toMatch(/\.\d$/);
      expect(markFor(q, { ...blank, boxes: [exact] })).toBe(1);
      expect(markFor(q, { ...blank, boxes: [`${exact}0`] })).toBe(0);
      if (isInt(v)) {
        wholes++;
        expect(markFor(q, { ...blank, boxes: [String(v.n)] })).toBe(0);
        expect(formatCorrect(q)).toMatch(/\.0$/);
      }
    }
    expect(wholes).toBeGreaterThan(0);
  });

  it('"write as a fraction" needs a fraction, not a decimal', () => {
    const q = make('r-fdp', 3, 'fdp');
    if (q.input.kind !== 'fraction') return;
    const v = ratFromString(q.answer);
    const decimal = toDecimalString(v);
    expect(markFor(q, correctInput(q))).toBe(1);
    if (decimal) expect(markFor(q, { ...blank, whole: decimal })).toBe(0);
  });
});

describe('reasoning blueprint', () => {
  // One calculation (or one step of reasoning): worth 1 mark, not 2.
  const ONE_STEP = [
    ['r-money', 1],
    ['r-fraction-context', 1],
    ['r-percent-context', 1],
    ['r-recipe', 1],
    ['r-inverse', 1],
    ['r-time', 2],
    ['r-equation', 3],
    ['r-volume', 1],
    ['r-perimeter-area', 1],
    ['r-area-formula', 1],
    ['r-area-formula', 2],
    ['r-area-formula', 3],
    // Reading a value off a number line, scale or graph
    ['r-number-line', 1],
    ['r-number-line', 2],
    ['r-number-line', 3],
    ['r-scales', 1],
    ['r-scales', 2],
    ['r-conversion-graph', 1],
    ['r-conversion-graph', 2],
    // One calculation, fact or comparison
    ['r-known-facts', 1],
    ['r-known-facts', 2],
    ['r-known-facts', 3],
    ['r-compare-signs', 1],
    ['r-compare-signs', 2],
    ['r-mixed-numbers', 1],
    ['r-mixed-numbers', 2],
    ['r-mixed-numbers', 3],
    ['r-order-fdp', 1],
    ['r-order-fdp', 2],
    ['r-order-fdp', 3],
    ['r-true-false', 1],
    ['r-true-false', 2],
    ['r-time-units', 1],
    ['r-time-units', 2],
    ['r-round-large', 1],
    ['r-round-large', 2],
    ['r-round-large', 3],
    ['r-lcm', 1],
    ['r-pairs', 1],
    ['r-missing-digits', 1],
    ['r-missing-digits', 2],
    // One geometric fact, or counting
    ['r-angles-cross', 1],
    ['r-angles-cross', 2],
    ['r-angle-types', 1],
    ['r-angle-types', 2],
    ['r-angle-types', 3],
    ['r-regular-polygon', 1],
    ['r-cubes', 1],
    ['r-cubes', 2],
    ['r-area-squares', 1],
    ['r-area-squares', 2],
    ['r-area-squares', 3],
  ] as const;

  it('keeps one-step problems out of the two-mark slots', () => {
    for (const slot of REASONING_BLUEPRINT.filter((s) => s.marks === 2)) {
      for (const o of slot.options) {
        for (const [type, d] of ONE_STEP) expect(o.type === type && o.d.includes(d), `${type} d${d} in a 2-mark slot`).toBe(false);
      }
    }
  });

  it('still reaches every template at every difficulty it has in a slot', () => {
    for (const [type, d] of ONE_STEP) {
      expect(REASONING_BLUEPRINT.some((s) => s.options.some((o) => o.type === type && o.d.includes(d))), `${type} d${d}`).toBe(true);
    }
  });
});

