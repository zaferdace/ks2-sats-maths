import { describe, expect, it } from 'vitest';
import { ratFromString } from '../math/rational';
import { BLUEPRINT, QUESTIONS_PER_PAPER } from './blueprint';
import { answerFits } from './evaluate';
import { promptText } from './format';
import { generatePaper } from './paper';
import { findType, QUESTION_TYPES } from './registry';
import { createRng, isPaperCode, newPaperCode } from './rng';

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
});

describe('generatePaper', () => {
  it('is deterministic for a code', () => {
    expect(generatePaper('ABCDEF')).toEqual(generatePaper('ABCDEF'));
    expect(generatePaper('ABCDEF')).not.toEqual(generatePaper('ABCDEG'));
  });

  it('builds 40 unique, correct questions for many codes', () => {
    const rng = createRng('paper-test');
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 300; i++) {
      const code = Array.from({ length: 6 }, () => rng.pick([...alphabet])).join('');
      const paper = generatePaper(code);
      expect(paper).toHaveLength(QUESTIONS_PER_PAPER);
      const prompts = paper.map((q) => promptText(q.parts));
      expect(new Set(prompts).size).toBe(QUESTIONS_PER_PAPER);
      paper.forEach((q, slot) => {
        expect(BLUEPRINT[slot].some((o) => o.type === q.typeId && o.d.includes(q.difficulty))).toBe(true);
        expect(answerFits(q.parts, ratFromString(q.answer))).toBe(true);
      });
    }
  });

  it('survives a JSON round trip', () => {
    const paper = generatePaper('QWERTY');
    expect(JSON.parse(JSON.stringify(paper))).toEqual(paper);
  });
});

describe('paper codes', () => {
  it('are six unambiguous characters', () => {
    for (let i = 0; i < 100; i++) expect(isPaperCode(newPaperCode())).toBe(true);
    expect(isPaperCode('ABCDE0')).toBe(false);
    expect(isPaperCode('abcdef')).toBe(false);
  });
});
