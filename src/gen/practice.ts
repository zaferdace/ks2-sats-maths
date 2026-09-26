// Short practice sets of chosen maths question types, easy to hard, for working on weak spots.
import { promptText } from './format';
import { toQuestion } from './paper';
import { REASONING_BLUEPRINT } from './reasoning/blueprint';
import { reasoningKey } from './reasoning/paper';
import { getReasoningType } from './reasoning/registry';
import { getType } from './registry';
import { createRng } from './rng';
import type { AnyQuestion, Difficulty, ItemQuestion } from './types';

export const PRACTICE_QUESTIONS = 10;

/** Three easy, four medium and three hard questions. */
const RAMP: Difficulty[] = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3];

/** Marks a reasoning question carries in a paper: its slot for that difficulty, else its first slot. */
const marksOf = (typeId: string, difficulty: Difficulty): number =>
  (
    REASONING_BLUEPRINT.find((slot) => slot.options.some((o) => o.type === typeId && o.d.includes(difficulty))) ??
    REASONING_BLUEPRINT.find((slot) => slot.options.some((o) => o.type === typeId))
  )?.marks ?? 1;

export function buildMathsPractice(code: string, paper: 'arithmetic' | 'reasoning', typeIds: string[], count = PRACTICE_QUESTIONS): AnyQuestion[] {
  const out: AnyQuestion[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < count && i < count * 20; i++) {
    const seed = `P${code}#${i}`;
    const rng = createRng(seed);
    const typeId = rng.pick(typeIds);
    const difficulty = RAMP[Math.floor((out.length * RAMP.length) / count)] ?? 3;
    let q: AnyQuestion;
    let key: string;
    // The question is made from the same random numbers that went on from picking its type: a fresh
    // generator from the same seed would repeat the pick's number and skew every question it makes.
    if (paper === 'arithmetic') {
      const type = getType(typeId);
      const question = toQuestion(type, difficulty, type.generate(rng, difficulty));
      q = question;
      key = promptText(question.parts);
    } else {
      const draft = getReasoningType(typeId).generate(rng, difficulty);
      const item: ItemQuestion = { format: 'reasoning', typeId, difficulty, marks: marksOf(typeId, difficulty), ...draft };
      q = item;
      key = reasoningKey(item);
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
