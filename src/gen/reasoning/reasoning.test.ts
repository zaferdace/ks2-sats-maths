// Invariant tests for every reasoning template, plus independent checks where the figure alone
// determines the answer (angles). Wording is checked by reading printed papers, not here.
import { describe, expect, it } from 'vitest';
import { formNote, isCorrect, formatCorrect, markFor, typedValue, type AnswerInput } from '../../answer/answer';
import { isInt, ratFromString, toDecimalString, type Rational } from '../../math/rational';
import { createRng } from '../rng';
import type { Block, Difficulty, ItemQuestion } from '../types';
import { REASONING_BLUEPRINT, REASONING_MARKS, REASONING_QUESTIONS } from './blueprint';
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
      const r = ratFromString(q.answer);
      return { ...blank, num: String(r.n), den: String(r.d) };
    }
    case 'choice':
    case 'order':
      return { ...blank, sel: q.answer.split(',').map(Number) };
    default:
      throw new Error(`Reasoning templates do not use ${q.input.kind} inputs`);
  }
}

const n = (label: string) => Number(label.replace('°', ''));

/** Re-derives an angle answer from the diagram labels alone. */
function angleFromFigure(b: Extract<Block, { b: 'angles' }>): number | null {
  const unknown = b.labels.filter((l) => l === 'a').length;
  if (!unknown || b.labels.some((l) => l !== 'a' && !/^\d+°$/.test(l))) return null;
  const known = b.labels.filter((l) => l !== 'a').reduce((s, l) => s + n(l), 0);
  const total = { triangle: 180, line: 180, point: 360, quad: 360 }[b.shape];
  return (total - known) / unknown;
}

function problems(q: ItemQuestion): string[] {
  const out: string[] = [];
  const all = JSON.stringify(q);
  if (/NaN|undefined|Infinity|\[object/.test(all)) out.push('bad text');
  if (!q.body.length) out.push('empty body');
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
    if (ratFromString(q.answer).n <= 0) out.push('fraction answer not positive');
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
  }
  for (const b of q.body) {
    if (b.b === 'bar' && (b.values.some((v) => v < 0 || v > b.max) || b.values.length !== b.labels.length)) out.push('bar data');
    if (b.b === 'line' && b.values.some((v) => v < b.min || v > b.max)) out.push('line data');
    if (b.b === 'pie' && Math.abs(b.slices.reduce((s, x) => s + x.turn, 0) - 1) > 1e-9) out.push('pie does not add up');
    if (b.b === 'coords' && b.points.some((p) => p.x < b.min || p.x > b.max || p.y < b.min || p.y > b.max)) out.push('point off grid');
    if (b.b === 'grid' && (new Set(b.shaded).size !== b.shaded.length || b.shaded.some((i) => i < 0 || i >= b.cols * b.rows))) {
      out.push('grid shading');
    }
    if (b.b === 'table' && b.rows.some((r) => r.length !== b.head.length)) out.push('table row length');
    if (b.b === 'lshape' && b.labels.length !== 6) out.push('lshape labels');
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

