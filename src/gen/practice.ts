// Short practice sets of chosen maths question types, easy to hard, for working on weak spots.
import { promptText } from './format';
import { generateQuestion } from './paper';
import { REASONING_BLUEPRINT } from './reasoning/blueprint';
import { reasoningKey } from './reasoning/paper';
import { getReasoningType } from './reasoning/registry';
import { createRng } from './rng';
import type { AnyQuestion, Difficulty, ItemQuestion } from './types';

export const PRACTICE_QUESTIONS = 10;

/** Three easy, four medium and three hard questions. */
const RAMP: Difficulty[] = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3];

/** Marks a reasoning type carries in the real paper (its first slot in the blueprint). */
const marksOf = (typeId: string): number =>
  REASONING_BLUEPRINT.find((slot) => slot.options.some((o) => o.type === typeId))?.marks ?? 1;

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
    if (paper === 'arithmetic') {
      const question = generateQuestion(typeId, difficulty, seed);
      q = question;
      key = promptText(question.parts);
    } else {
      const draft = getReasoningType(typeId).generate(rng, difficulty);
      const item: ItemQuestion = { format: 'reasoning', typeId, difficulty, marks: marksOf(typeId), ...draft };
      q = item;
      key = reasoningKey(item);
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
