// Reading sessions: one text with its questions, or a full paper of three texts (easy to hard).
import { createRng, type Rng } from '../gen/rng';
import type { InputSpec, ItemQuestion } from '../gen/types';
import { READING_TEXTS } from './bank';
import { readingTypeId } from './catalog';
import type { LevelChoice } from '../gen/types';
import type { History } from './history';
import { shuffleOptions } from './options';
import type { Level, ReadingQuestion, ReadingText } from './types';

function inputOf(q: ReadingQuestion, rng?: Rng): { input: InputSpec; answer: string } {
  switch (q.kind) {
    case 'choice': {
      const { options, answer } = rng ? shuffleOptions(q.options, q.answer, rng) : { options: q.options, answer: q.answer };
      return { input: { kind: 'choice', options, pick: q.pick }, answer: [...answer].sort((a, b) => a - b).join(',') };
    }
    case 'tf':
      return { input: { kind: 'tf', statements: q.statements }, answer: q.answer.map((v) => (v ? '1' : '0')).join(',') };
    case 'order':
      return { input: { kind: 'order', items: q.items, first: 'earliest' }, answer: q.answer.join(',') };
    case 'text':
      return { input: { kind: 'text' }, answer: q.accept.join('|') };
    case 'self':
      return { input: { kind: 'self', model: q.model, points: q.points }, answer: '' };
  }
}

/** Questions that send the pupil to a paragraph ("Look at paragraph 3", "the second verse"). */
const POINTS_TO_PART = /\b(paragraphs?|verses?|stanzas?)\b/i;

/** A text's questions. With `rng`, choice options are shuffled. */
export function readingQuestions(t: ReadingText, rng?: Rng): ItemQuestion[] {
  return t.questions.map((q) => {
    const { input, answer } = inputOf(q, rng);
    // Only highlight a paragraph the question itself points to: finding the place is part of the skill.
    const paragraph = q.paragraph && POINTS_TO_PART.test(q.prompt) ? q.paragraph : undefined;
    return {
      format: 'english',
      typeId: readingTypeId(q.domain),
      difficulty: t.level,
      marks: q.marks,
      body: [
        { b: 'passage', textId: t.id, ...(paragraph && { paragraph }) },
        { b: 'text', text: q.prompt },
      ],
      input,
      answer,
      sourceId: `${t.id}#${q.id}`,
    };
  });
}

/** When each text was last read (from its questions' history). */
function lastRead(history: History): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, seen] of history) {
    const textId = id.split('#')[0];
    if (id.includes('#')) out.set(textId, Math.max(out.get(textId) ?? 0, seen.last));
  }
  return out;
}

export function buildReading(code: string, choice: LevelChoice, history: History, texts: 1 | 3): ItemQuestion[] {
  const rng = createRng(`R${code}`);
  const read = lastRead(history);
  const levels: Level[] = texts === 3 ? (choice === 'mixed' ? [1, 2, 3] : [choice, choice, choice]) : [choice === 'mixed' ? rng.pick([1, 2, 3] as const) : choice];
  const picked: ReadingText[] = [];
  for (const level of levels) {
    const fresh = (t: ReadingText) => !picked.includes(t);
    const atLevel = READING_TEXTS.filter((t) => t.level === level && fresh(t));
    const pool = atLevel.length ? atLevel : READING_TEXTS.filter(fresh);
    if (!pool.length) break;
    // Unread texts first, then the one read longest ago.
    const ordered = rng.shuffle(pool).sort((a, b) => (read.get(a.id) ?? 0) - (read.get(b.id) ?? 0));
    picked.push(ordered[0]);
  }
  return picked.flatMap((t) => readingQuestions(t, rng));
}
