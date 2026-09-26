import { ratToString } from '../math/rational';
import { BLUEPRINT, MOCK_BLUEPRINT } from './blueprint';
import { isBoxFirst } from './build';
import { promptText } from './format';
import { getType } from './registry';
import { createRng } from './rng';
import type { Difficulty, Generated, Part, Question, QuestionType } from './types';

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

/** The calculation of a prompt, wherever its answer box is: "□ = 6 × 70" is the same as "6 × 70 = □". */
export const calculationKey = (parts: Part[]): string => promptText(isBoxFirst(parts) ? parts.slice(2) : parts);

export interface PaperOptions {
  /** A mock in the real format: 36 questions, 40 marks (see MOCK_BLUEPRINT). */
  mock?: boolean;
}

/**
 * Builds the 40 questions of a paper, or the 36 of a mock. The same code always gives the same
 * paper, and the same mock (a mock is not the paper with four questions missing: its seeds differ).
 */
export function generatePaper(code: string, options: PaperOptions = {}): Question[] {
  const blueprint = options.mock ? MOCK_BLUEPRINT : BLUEPRINT;
  const prefix = options.mock ? 'M' : '';
  const seen = new Set<string>();
  return blueprint.map((slotOptions, i) => {
    // Every slot has its own seed, so changing one generator never reshuffles the others.
    for (let reroll = 0; reroll < 50; reroll++) {
      const rng = createRng(`${prefix}${code}#${i + 1}#${reroll}`);
      const option = rng.pick(slotOptions);
      const difficulty = rng.pick(option.d);
      const type = getType(option.type);
      const q = toQuestion(type, difficulty, type.generate(rng, difficulty));
      const key = calculationKey(q.parts);
      if (!seen.has(key)) {
        seen.add(key);
        return q;
      }
    }
    throw new Error(`Could not build a unique question for slot ${i + 1} of ${options.mock ? 'mock' : 'paper'} ${code}`);
  });
}

/** A one-off question of a given type, e.g. for tests or future targeted practice. */
export function generateQuestion(typeId: string, difficulty: Difficulty, seed: string): Question {
  const type = getType(typeId);
  return toQuestion(type, difficulty, type.generate(createRng(seed), difficulty));
}
