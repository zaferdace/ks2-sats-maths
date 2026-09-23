// Property tests: every type and difficulty, many seeds. The evaluator is independent of the
// generators, so a passing run means every generated answer is actually correct.
import { describe, expect, it } from 'vitest';
import { cmp, decimalPlaces, fromDecimalString, isInt, ZERO, type Rational } from '../math/rational';
import { answerFits } from './evaluate';
import { promptText } from './format';
import { QUESTION_TYPES } from './registry';
import { createRng } from './rng';
import type { Difficulty, Generated } from './types';

const SEEDS = 1000;
const LIMIT = fromDecimalString('1000000');
const METHOD_TYPES = new Set(['mul-long', 'div-long']);

function problems(typeId: string, g: Generated): string[] {
  const out: string[] = [];
  const text = promptText(g.parts);
  if (/NaN|undefined|Infinity/.test(text)) out.push('bad text');
  if (!answerFits(g.parts, g.answer)) out.push('answer does not fit');
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
