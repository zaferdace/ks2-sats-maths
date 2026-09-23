import { createRng } from '../rng';
import type { ReasoningQuestion } from '../types';
import { REASONING_BLUEPRINT } from './blueprint';
import { getReasoningType } from './registry';

/** A question's content (text, figures and options), used to spot repeats inside one paper. */
export const reasoningKey = (q: ReasoningQuestion): string =>
  [...q.body.map((b) => (b.b === 'text' ? b.text : JSON.stringify(b))), JSON.stringify(q.input)].join('|');

/**
 * Builds a reasoning paper (Paper 2 or 3). The same code always gives the same paper. A slot
 * prefers a question type not used earlier in the paper, so one paper covers more topics.
 */
export function generateReasoningPaper(code: string): ReasoningQuestion[] {
  const usedTypes = new Set<string>();
  const seen = new Set<string>();
  return REASONING_BLUEPRINT.map((slot, i) => {
    let fallback: ReasoningQuestion | null = null;
    for (let reroll = 0; reroll < 60; reroll++) {
      const rng = createRng(`R${code}#${i + 1}#${reroll}`);
      const option = rng.pick(slot.options);
      const difficulty = rng.pick(option.d);
      const draft = getReasoningType(option.type).generate(rng, difficulty);
      const q: ReasoningQuestion = { format: 'reasoning', typeId: option.type, difficulty, marks: slot.marks, ...draft };
      const key = reasoningKey(q);
      if (seen.has(key)) continue;
      if (usedTypes.has(q.typeId)) {
        fallback ??= q;
        continue;
      }
      usedTypes.add(q.typeId);
      seen.add(key);
      return q;
    }
    if (!fallback) throw new Error(`Could not build slot ${i + 1} of reasoning paper ${code}`);
    seen.add(reasoningKey(fallback));
    return fallback;
  });
}
