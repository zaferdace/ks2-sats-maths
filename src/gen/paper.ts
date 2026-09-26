import { ratToString } from '../math/rational';
import { BLUEPRINT } from './blueprint';
import { promptText } from './format';
import { getType } from './registry';
import { createRng } from './rng';
import type { Difficulty, Generated, Question, QuestionType } from './types';

export function toQuestion(type: QuestionType, difficulty: Difficulty, g: Generated): Question {
  return {
    typeId: type.id,
    difficulty,
    parts: g.parts,
    answer: ratToString(g.answer),
    kind: g.kind,
    // Long multiplication and division are worth 2 marks in the real test (1 of them for the method).
    ...(g.showMethod ? { showMethod: true, marks: 2 } : {}),
  };
}

/** Builds the 40 questions of a paper. The same code always gives the same paper. */
export function generatePaper(code: string, _options: { mock?: boolean } = {}): Question[] {
  const seen = new Set<string>();
  return BLUEPRINT.map((options, i) => {
    // Every slot has its own seed, so changing one generator never reshuffles the others.
    for (let reroll = 0; reroll < 50; reroll++) {
      const rng = createRng(`${code}#${i + 1}#${reroll}`);
      const option = rng.pick(options);
      const difficulty = rng.pick(option.d);
      const type = getType(option.type);
      const q = toQuestion(type, difficulty, type.generate(rng, difficulty));
      const key = promptText(q.parts);
      if (!seen.has(key)) {
        seen.add(key);
        return q;
      }
    }
    throw new Error(`Could not build a unique question for slot ${i + 1} of paper ${code}`);
  });
}

/** A one-off question of a given type, e.g. for tests or future targeted practice. */
export function generateQuestion(typeId: string, difficulty: Difficulty, seed: string): Question {
  const type = getType(typeId);
  return toQuestion(type, difficulty, type.generate(createRng(seed), difficulty));
}
