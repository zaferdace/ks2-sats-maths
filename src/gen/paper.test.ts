import { describe, expect, it } from 'vitest';
import { ratFromString } from '../math/rational';
import { BLUEPRINT, MOCK_BLUEPRINT, MOCK_DROPPED_SLOTS, MOCK_QUESTIONS, QUESTIONS_PER_DAY, QUESTIONS_PER_PAPER, type SlotOption } from './blueprint';
import { isBoxFirst } from './build';
import { answerFits } from './evaluate';
import { formatAnswer, promptText } from './format';
import { calculationKey, generatePaper, toQuestion } from './paper';
import { findType, getType, QUESTION_TYPES } from './registry';
import { createRng, isPaperCode, newPaperCode } from './rng';
import { textHolds } from './textEval';
import type { Question, TopicId } from './types';

const CODES = 3000;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** `n` paper codes, the same on every run. */
function codes(seed: string, n = CODES): string[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => Array.from({ length: 6 }, () => rng.pick([...ALPHABET])).join(''));
}

const marksOf = (paper: Question[]): number => paper.reduce((s, q) => s + (q.marks ?? 1), 0);
const levelOf = (typeId: string, d: number): string => `${typeId} d${d}`;
const ALL_LEVELS = QUESTION_TYPES.flatMap((t) => [1, 2, 3].map((d) => levelOf(t.id, d)));
const FDP: readonly TopicId[] = ['fractions', 'decimals', 'percentages'];
const topicsOf = (slot: SlotOption[]) => new Set(slot.map((o) => getType(o.type).topic));

/** Every problem with one question: in its slot, exactly right, readable with plain numbers. */
function problems(q: Question, slot: SlotOption[]): string[] {
  const out: string[] = [];
  const text = promptText(q.parts);
  if (!slot.some((o) => o.type === q.typeId && o.d.includes(q.difficulty))) out.push('not from its slot');
  if (!answerFits(q.parts, ratFromString(q.answer))) out.push('wrong answer');
  if (!textHolds(text.replace('□', formatAnswer(q)))) out.push('float check fails');
  return out.map((m) => `${m}: ${text}`);
}

describe('blueprint', () => {
  it('has 40 slots that only name real types', () => {
    expect(BLUEPRINT).toHaveLength(QUESTIONS_PER_PAPER);
    for (const slot of BLUEPRINT) {
      expect(slot.length).toBeGreaterThan(0);
      for (const option of slot) {
        expect(findType(option.type), option.type).toBeDefined();
        expect(option.d.length).toBeGreaterThan(0);
      }
    }
  });

  it('can reach every question type', () => {
    const used = new Set(BLUEPRINT.flat().map((o) => o.type));
    expect(QUESTION_TYPES.filter((t) => !used.has(t.id)).map((t) => t.id)).toEqual([]);
  });

  it('offers every type × difficulty in some slot', () => {
    const offered = new Set(BLUEPRINT.flat().flatMap((o) => o.d.map((d) => levelOf(o.type, d))));
    expect(ALL_LEVELS.filter((l) => !offered.has(l))).toEqual([]);
  });

  it('gives every paper the same balance', () => {
    // A slot never mixes fractions, decimals and percentages with other topics.
    expect(BLUEPRINT.filter((slot) => new Set([...topicsOf(slot)].map((t) => FDP.includes(t))).size > 1)).toEqual([]);
    const count = (test: (slot: SlotOption[]) => boolean) => BLUEPRINT.filter(test).length;
    const only = (...types: string[]) => (slot: SlotOption[]) => slot.every((o) => types.includes(o.type));
    expect(count((slot) => FDP.includes([...topicsOf(slot)][0]))).toBe(14); // about a third of 44 marks
    expect(count(only('pct-of'))).toBe(2);
    expect(count(only('div-short'))).toBe(4);
    expect(BLUEPRINT.map((slot, i) => (only('mul-long')(slot) ? i + 1 : 0)).filter(Boolean)).toEqual([16, 37]);
    expect(BLUEPRINT.map((slot, i) => (only('div-long')(slot) ? i + 1 : 0)).filter(Boolean)).toEqual([30, 40]);
    // Two-mark questions never share a slot with one-mark ones.
    const methodTypes = new Set(['mul-long', 'div-long']);
    expect(BLUEPRINT.filter((slot) => new Set(slot.map((o) => methodTypes.has(o.type))).size > 1)).toEqual([]);
  });

  it('keeps the easiest levels in Days 1 and 2', () => {
    // Too easy for the second half of a paper: 2³, 20 × 20, n × 0, 470 + 100, 3/8 + 2/8, 44 ÷ 4, …
    const easyLevel1 = [
      ...['pv-partition', 'pv-add-sub-power', 'pv-mul-div-10', 'add-column', 'add-three', 'sub-column', 'sub-round'],
      ...['missing-add-sub', 'missing-mul-div', 'mul-short', 'div-short', 'order-ops'],
      ...['frac-add-same', 'frac-sub-same', 'dec-add', 'dec-sub'],
    ];
    const easy = [
      ...['mul-div-0-1', 'mul-mental', 'squares-cubes'].flatMap((t) => [levelOf(t, 1), levelOf(t, 2)]),
      levelOf('mul-div-0-1', 3),
      ...easyLevel1.map((t) => levelOf(t, 1)),
    ];
    const late = BLUEPRINT.slice(2 * QUESTIONS_PER_DAY)
      .flat()
      .flatMap((o) => o.d.map((d) => levelOf(o.type, d)));
    expect(late.filter((l) => easy.includes(l))).toEqual([]);
  });

  it('makes a mock by dropping four one-mark slots', () => {
    expect(MOCK_BLUEPRINT).toHaveLength(MOCK_QUESTIONS);
    expect(MOCK_DROPPED_SLOTS).toHaveLength(QUESTIONS_PER_PAPER - MOCK_QUESTIONS);
    expect(MOCK_BLUEPRINT).toEqual(BLUEPRINT.filter((_, i) => !MOCK_DROPPED_SLOTS.includes(i + 1)));
    for (const s of MOCK_DROPPED_SLOTS) expect(BLUEPRINT[s - 1].some((o) => ['mul-long', 'div-long'].includes(o.type))).toBe(false);
    const fdp = MOCK_BLUEPRINT.filter((slot) => FDP.includes([...topicsOf(slot)][0])).length;
    expect(fdp).toBe(13); // of 40 marks
    expect(MOCK_BLUEPRINT.filter((slot) => slot.every((o) => o.type === 'div-short'))).toHaveLength(4);
    expect(MOCK_BLUEPRINT.filter((slot) => slot.every((o) => o.type === 'pct-of'))).toHaveLength(2);
  });
});

describe('generatePaper', () => {
  it('is deterministic for a code', () => {
    expect(generatePaper('ABCDEF')).toEqual(generatePaper('ABCDEF'));
    expect(generatePaper('ABCDEF')).not.toEqual(generatePaper('ABCDEG'));
  });

  it(`builds 40 unique, correct questions worth 44 marks for ${CODES} codes, reaching every level`, () => {
    const failures: string[] = [];
    const levels = new Map<string, number>();
    let boxFirstPapers = 0;
    for (const code of codes('paper-test')) {
      const paper = generatePaper(code);
      expect(paper).toHaveLength(QUESTIONS_PER_PAPER);
      expect(marksOf(paper)).toBe(44);
      expect(new Set(paper.map((q) => calculationKey(q.parts))).size, code).toBe(QUESTIONS_PER_PAPER);
      paper.forEach((q, slot) => {
        failures.push(...problems(q, BLUEPRINT[slot]).map((m) => `${code} Q${slot + 1} ${m}`));
        levels.set(levelOf(q.typeId, q.difficulty), (levels.get(levelOf(q.typeId, q.difficulty)) ?? 0) + 1);
      });
      // Q16 (end of Day 2) is the first two-mark question; Days 1 and 2 have no other.
      expect(paper.slice(0, 16).map((q) => q.marks ?? 1)).toEqual([...Array(15).fill(1), 2]);
      if (paper.some((q) => isBoxFirst(q.parts))) boxFirstPapers++;
    }
    expect(failures.slice(0, 5)).toEqual([]);
    // Every type × difficulty turns up, none of them only once in a blue moon.
    expect(ALL_LEVELS.filter((l) => !levels.has(l))).toEqual([]);
    expect(Math.min(...levels.values())).toBeGreaterThan(CODES / 10);
    // Box-first items (□ = 6 × 70) appear in most papers.
    expect(boxFirstPapers / CODES).toBeGreaterThan(0.6);
  });

  it('survives a JSON round trip', () => {
    const paper = generatePaper('QWERTY');
    expect(JSON.parse(JSON.stringify(paper))).toEqual(paper);
  });

  it('does not repeat a calculation with the box on the other side', () => {
    const box = { t: 'box' } as const;
    const eq = { t: 'op', v: '=' } as const;
    const calc = [{ t: 'num', v: '6' } as const, { t: 'op', v: '×' } as const, { t: 'num', v: '70' } as const];
    expect(calculationKey([box, eq, ...calc])).toBe(calculationKey(calc));
  });
});

describe('mock paper', () => {
  it('is deterministic for a code and differs from the 40-question paper of that code', () => {
    const mock = generatePaper('ABCDEF', { mock: true });
    expect(generatePaper('ABCDEF', { mock: true })).toEqual(mock);
    expect(generatePaper('ABCDEG', { mock: true })).not.toEqual(mock);
    const paper = generatePaper('ABCDEF');
    expect(mock.map((q) => promptText(q.parts))).not.toEqual(paper.filter((_, i) => !MOCK_DROPPED_SLOTS.includes(i + 1)).map((q) => promptText(q.parts)));
    expect(generatePaper('ABCDEF', {})).toEqual(paper);
  });

  it('seeds slot i with "MCODE#i#reroll" (papers keep "CODE#i#reroll")', () => {
    const first = (seed: string, slot: SlotOption[]) => {
      const rng = createRng(seed);
      const option = rng.pick(slot);
      const d = rng.pick(option.d);
      const type = getType(option.type);
      return toQuestion(type, d, type.generate(rng, d));
    };
    expect(generatePaper('QWERTY')[0]).toEqual(first('QWERTY#1#0', BLUEPRINT[0]));
    expect(generatePaper('QWERTY', { mock: true })[0]).toEqual(first('MQWERTY#1#0', MOCK_BLUEPRINT[0]));
  });

  it(`has 36 unique, correct questions and 40 marks, and never throws, over ${CODES} codes`, () => {
    const failures: string[] = [];
    const levels = new Set<string>();
    for (const code of codes('mock-test')) {
      const mock = generatePaper(code, { mock: true });
      expect(mock).toHaveLength(MOCK_QUESTIONS);
      expect(marksOf(mock)).toBe(40);
      expect(mock.filter((q) => q.marks === 2).map((q) => q.typeId).sort()).toEqual(['div-long', 'div-long', 'mul-long', 'mul-long']);
      expect(new Set(mock.map((q) => calculationKey(q.parts))).size, code).toBe(MOCK_QUESTIONS);
      mock.forEach((q, slot) => {
        failures.push(...problems(q, MOCK_BLUEPRINT[slot]).map((m) => `${code} Q${slot + 1} ${m}`));
        levels.add(levelOf(q.typeId, q.difficulty));
      });
    }
    expect(failures.slice(0, 5)).toEqual([]);
    const offered = new Set(MOCK_BLUEPRINT.flat().flatMap((o) => o.d.map((d) => levelOf(o.type, d))));
    expect([...offered].filter((l) => !levels.has(l))).toEqual([]);
  });
});

describe('paper codes', () => {
  it('are six unambiguous characters', () => {
    for (let i = 0; i < 100; i++) expect(isPaperCode(newPaperCode())).toBe(true);
    expect(isPaperCode('ABCDE0')).toBe(false);
    expect(isPaperCode('abcdef')).toBe(false);
  });
});
