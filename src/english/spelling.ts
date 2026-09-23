// Spelling tests (GPS paper 2): 20 dictated words. Misspelt words come back in later tests.
import { createRng } from '../gen/rng';
import type { ItemQuestion } from '../gen/types';
import { SPELLING_WORDS } from './bank';
import { spellingTypeId } from './catalog';
import type { LevelChoice } from '../gen/types';
import { freshFirst, type History } from './history';
import type { Level, SpellingWord } from './types';

export const SPELLING_QUESTIONS = 20;

export function spellingQuestion(w: SpellingWord): ItemQuestion {
  return {
    format: 'english',
    typeId: spellingTypeId(w.group),
    difficulty: w.level,
    marks: 1,
    body: [{ b: 'speak', word: w.word, sentence: w.sentence }],
    input: { kind: 'text', spell: true },
    answer: w.word,
    explain: w.hint,
    sourceId: w.word,
  };
}

/** Level of each word in a test: "mixed" leans on Year 5/6 words, like the real test. */
function plan(choice: LevelChoice, count: number): Level[] {
  if (choice !== 'mixed') return Array(count).fill(choice);
  const easy = Math.round(count * 0.25);
  const hard = Math.round(count * 0.3);
  return [...Array(easy).fill(1), ...Array(count - easy - hard).fill(2), ...Array(hard).fill(3)];
}

export function buildSpellingTest(code: string, choice: LevelChoice, history: History, count = SPELLING_QUESTIONS, groups?: string[]): ItemQuestion[] {
  const rng = createRng(`S${code}`);
  const bank = SPELLING_WORDS.filter((w) => !groups || groups.includes(w.group));
  const chosen = new Set<string>();
  // Up to a third of the test revisits words spelt wrongly last time.
  let reviews = Math.floor(count / 3);
  const mistakes = rng.shuffle(bank.filter((w) => history.get(w.word)?.lastCorrect === false));
  const out: ItemQuestion[] = [];
  for (const level of plan(choice, count)) {
    let word: SpellingWord | undefined;
    if (reviews > 0) {
      word = mistakes.find((w) => w.level === level && !chosen.has(w.word));
      if (word) reviews--;
    }
    if (!word) {
      const atLevel = bank.filter((w) => w.level === level && !chosen.has(w.word));
      const pool = atLevel.length ? atLevel : bank.filter((w) => !chosen.has(w.word));
      word = freshFirst(pool, (w) => w.word, history, rng.shuffle)[0];
    }
    if (!word) break;
    chosen.add(word.word);
    out.push(spellingQuestion(word));
  }
  return out;
}
