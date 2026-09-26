// Property tests: every type and difficulty, many seeds. Two evaluators check every answer: the exact
// one (evaluate.ts, rationals over the parts) and a plain-number one over the text the pupil sees
// (textEval.ts), so neither a bug in the rational arithmetic nor one in the rendering can pass.
import { describe, expect, it } from 'vitest';
import { FIELD_MAX_LENGTH } from '../answer/answer';
import { cmp, decimalPlaces, fromDecimalString, isInt, toDecimalString, toMixed, ZERO, type Rational } from '../math/rational';
import { carries } from './build';
import { answerFits } from './evaluate';
import { formatValue, promptText } from './format';
import { findType, QUESTION_TYPES } from './registry';
import { createRng } from './rng';
import { closeTo, evaluateText, textHolds } from './textEval';
import type { AnswerKind, Difficulty, Generated, Part } from './types';

const SEEDS = 1000;
const LIMIT = fromDecimalString('1000000');
const METHOD_TYPES = new Set(['mul-long', 'div-long']);

/** The answer as the pupil types it fits the answer boxes (keypad limits). */
function fitsKeypad(answer: Rational, kind: AnswerKind): boolean {
  if (kind !== 'frac' || isInt(answer)) {
    const typed = toDecimalString(answer);
    return typed !== null && typed.length <= FIELD_MAX_LENGTH.whole;
  }
  const { w, n, d } = toMixed(answer);
  return (
    (w === 0 || String(w).length <= FIELD_MAX_LENGTH.whole) &&
    String(n).length <= FIELD_MAX_LENGTH.num &&
    String(d).length <= FIELD_MAX_LENGTH.den
  );
}

function problems(typeId: string, g: Generated): string[] {
  const out: string[] = [];
  const text = promptText(g.parts);
  if (/NaN|undefined|Infinity/.test(text)) out.push('bad text');
  if (!answerFits(g.parts, g.answer)) out.push('answer does not fit');
  // Independent check: the text with the shown answer in the box, in plain numbers.
  const shown = formatValue(g.answer, g.kind);
  try {
    if (!closeTo(evaluateText(shown), g.answer.n / g.answer.d)) out.push(`shown answer ${shown} is not the answer`);
    if (text.split('□').length !== 2) out.push('not exactly one box');
    else if (!textHolds(text.replace('□', shown))) out.push(`float check fails with ${shown}`);
  } catch (e) {
    out.push(`unreadable text: ${(e as Error).message}`);
  }
  if (!fitsKeypad(g.answer, g.kind)) out.push(`answer ${shown} does not fit the answer boxes`);
  const zeroAllowed = typeId === 'mul-div-0-1';
  if (cmp(g.answer, ZERO) < 0 || (!zeroAllowed && cmp(g.answer, ZERO) === 0)) out.push('answer not positive');
  if (cmp(g.answer, LIMIT) > 0) out.push('answer too large');
  if (g.kind === 'int' && !isInt(g.answer)) out.push('int kind with non-integer answer');
  if (g.kind === 'dec' && (decimalPlaces(g.answer) ?? 99) > 3) out.push('more than 3 decimal places');
  if (g.kind === 'frac' && g.answer.d > 150) out.push('huge denominator');
  if (Boolean(g.showMethod) !== METHOD_TYPES.has(typeId)) out.push('showMethod mismatch');
  for (const p of g.parts) {
    if (p.t === 'num') {
      const v: Rational = fromDecimalString(p.v);
      if (cmp(v, LIMIT) > 0) out.push(`operand ${p.v} too large`);
      if ((decimalPlaces(v) ?? 99) > 3) out.push(`operand ${p.v} has too many places`);
    }
    if (p.t === 'frac' && (p.n <= 0 || p.n >= p.d)) out.push(`fraction ${p.n}/${p.d} is not proper`);
  }
  return out.map((m) => `${m}: ${text} (answer ${g.answer.n}/${g.answer.d})`);
}

describe.each(QUESTION_TYPES.map((t) => [t.id, t] as const))('%s', (_id, type) => {
  it.each([1, 2, 3] as Difficulty[])('difficulty %i gives valid questions', (d) => {
    const failures: string[] = [];
    const prompts = new Set<string>();
    for (let s = 0; s < SEEDS; s++) {
      const g = type.generate(createRng(`${type.id}/${d}/${s}`), d);
      failures.push(...problems(type.id, g));
      prompts.add(promptText(g.parts));
    }
    expect(failures.slice(0, 5)).toEqual([]);
    // Not stuck on one question (squares and cubes have the smallest pool: 2³ … 5³, 10³).
    expect(prompts.size).toBeGreaterThanOrEqual(5);
  });
});

it('type ids are unique', () => {
  const ids = QUESTION_TYPES.map((t) => t.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe('the float check', () => {
  it('reads what the pupil sees', () => {
    expect(evaluateText('2 − 3/8')).toBeCloseTo(1.625, 12);
    expect(evaluateText('35% of 1,480')).toBeCloseTo(518, 9);
    expect(evaluateText('3 3/4 × 5')).toBeCloseTo(18.75, 12);
    expect(evaluateText('37 − (8 + 7) × 2')).toBe(7);
    expect(evaluateText('7² + 4³')).toBe(113);
    expect(evaluateText('24 ÷ 4 ÷ 2')).toBe(3);
    expect(textHolds('420 = 6 × 70')).toBe(true);
    expect(textHolds('6 × 70 = 421')).toBe(false);
  });

  it('rejects text a pupil should never see', () => {
    for (const bad of ['1635 + 1', '3 - 1', '2 + □', '(1 + 2', '1 2', 'NaN']) expect(() => evaluateText(bad), bad).toThrow();
  });
});

// ---- The spec table (docs/superpowers/specs/2026-09-23-ks2-arithmetic-design.md), level by level ----

function sample(typeId: string, d: Difficulty, n = SEEDS): Generated[] {
  const type = findType(typeId);
  if (!type) throw new Error(typeId);
  return Array.from({ length: n }, (_, s) => type.generate(createRng(`spec/${typeId}/${d}/${s}`), d));
}

const share = (gs: Generated[], test: (g: Generated) => boolean): number => gs.filter(test).length / gs.length;
const nums = (parts: Part[]): string[] => parts.flatMap((p) => (p.t === 'num' ? [p.v] : []));
const ops = (parts: Part[]): string[] => parts.flatMap((p) => (p.t === 'op' ? [p.v] : []));
const boxFirst = (g: Generated): boolean => g.parts[0].t === 'box' && ops(g.parts)[0] === '=';
/** Scaled integer of a decimal string: "67.81" → 6781 with 2 places. */
const hundredths = (v: string): number => Math.round(Number(v) * 100);

describe('matches the spec table', () => {
  const BOX_FIRST_TYPES = ['add-column', 'add-three', 'sub-column', 'sub-round', 'mul-mental', 'mul-short', 'div-short'];

  it.each(BOX_FIRST_TYPES)('%s puts the box first in about a quarter of easy and medium items, never in hard ones', (id) => {
    for (const d of [1, 2] as Difficulty[]) {
      const s = share(sample(id, d), boxFirst);
      expect(s, `d${d}`).toBeGreaterThan(0.18);
      expect(s, `d${d}`).toBeLessThan(0.32);
    }
    expect(share(sample(id, 3), boxFirst)).toBe(0);
  });

  it('only those types put the box first', () => {
    for (const t of QUESTION_TYPES) {
      if (BOX_FIRST_TYPES.includes(t.id)) continue;
      for (const d of [1, 2, 3] as Difficulty[]) expect(share(sample(t.id, d, 200), boxFirst), `${t.id} d${d}`).toBe(0);
    }
  });

  it('sub-round d1 includes 7,000 − 3', () => {
    const s = share(sample('sub-round', 1), (g) => Number(nums(g.parts)[1]) < 10);
    expect(s).toBeGreaterThan(0.18);
    expect(s).toBeLessThan(0.32);
  });

  it('pv-mul-div-10 d1: whole numbers × and ÷ 10, 100 and 1,000', () => {
    const gs = sample('pv-mul-div-10', 1);
    const kinds = new Set(gs.map((g) => `${ops(g.parts)[0]} ${nums(g.parts)[1]}`));
    expect([...kinds].sort()).toEqual(['× 10', '× 100', '× 1000', '÷ 10', '÷ 100', '÷ 1000']);
    expect(gs.every((g) => g.kind === 'int' && nums(g.parts).every((v) => !v.includes('.')))).toBe(true);
  });

  it('pct-of d2: two in five are multiples of 10% (30% of 320), and never x% of 100', () => {
    const tens = share(sample('pct-of', 2), (g) => g.parts[0].t === 'pct' && ['30', '40', '70', '80', '90'].includes(g.parts[0].v));
    expect(tens).toBeGreaterThan(0.33);
    expect(tens).toBeLessThan(0.47);
    for (const d of [1, 2, 3] as Difficulty[]) expect(share(sample('pct-of', d), (g) => nums(g.parts)[0] === '100')).toBe(0);
    // 1% of at least 1,000
    expect(sample('pct-of', 2).every((g) => g.parts[0].t !== 'pct' || g.parts[0].v !== '1' || Number(nums(g.parts)[0]) >= 1000)).toBe(true);
  });

  it('frac-mul-whole d2: about a third have a whole-number answer (3/4 × 16)', () => {
    const s = share(sample('frac-mul-whole', 2), (g) => isInt(g.answer));
    expect(s).toBeGreaterThan(0.27);
    expect(s).toBeLessThan(0.4);
    expect(share(sample('frac-mul-whole', 3), (g) => isInt(g.answer))).toBe(0);
  });

  it('dec-div d1 divides a 1 dp decimal, never a whole number', () => {
    expect(sample('dec-div', 1).every((g) => nums(g.parts)[0].split('.')[1]?.length === 1)).toBe(true);
  });

  it('easy decimal × and ÷ are more than 1 (no 0.1 × 2 or 0.3 ÷ 3 in Day 4)', () => {
    expect(sample('dec-mul', 1).every((g) => g.answer.n > g.answer.d)).toBe(true);
    expect(sample('dec-div', 1).every((g) => Number(nums(g.parts)[0]) > 1)).toBe(true);
  });

  it('missing-add-sub d3 is 4-5-digit throughout (□ + 1,000 = 8,568 is d2)', () => {
    const powerOfTen = (g: Generated) => nums(g.parts).some((v) => ['10', '100', '1000'].includes(v));
    expect(share(sample('missing-add-sub', 2), powerOfTen)).toBeGreaterThan(0.2);
    expect(share(sample('missing-add-sub', 3), powerOfTen)).toBeLessThan(0.01);
  });

  it('dec-mul d2 multiplies by a multiple of 10, d3 never does', () => {
    const multiplier = (g: Generated) => Number(nums(g.parts).find((v) => !v.includes('.')));
    expect(sample('dec-mul', 2).every((g) => multiplier(g) % 10 === 0)).toBe(true);
    expect(sample('dec-mul', 3).every((g) => multiplier(g) % 10 !== 0)).toBe(true);
  });

  it('dec-add d3 always carries', () => {
    expect(sample('dec-add', 3).every((g) => carries(...(nums(g.parts).map(hundredths) as [number, number])) > 0)).toBe(true);
  });

  it('order-ops d3 always has brackets and three operations', () => {
    for (const g of sample('order-ops', 3)) {
      expect(ops(g.parts)).toContain('(');
      expect(ops(g.parts).filter((o) => !'()'.includes(o))).toHaveLength(3);
    }
  });
});
