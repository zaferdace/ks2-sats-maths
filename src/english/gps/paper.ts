// A grammar, punctuation and vocabulary paper (GPS paper 1): 50 one-mark questions.
import { createRng, type Rng } from '../../gen/rng';
import type { ItemQuestion, LevelChoice } from '../../gen/types';
import { GPS_ITEMS } from '../bank';
import { freshFirst, type History } from '../history';
import { shuffleOptions } from '../options';
import type { GpsItem, Level } from '../types';
import { GENERATORS, isGenerated } from './generated';

export const GPS_QUESTIONS = 50;

const WORD_CLASSES = ['g-word-class', 'g-find-word', 'g-determiners', 'g-pronouns', 'g-prepositions'];
const SENTENCES = ['g-sentence-type', 'g-clauses', 'g-subject', 'g-fronted', 'g-noun-phrase', 'g-conjunctions', 'g-relative-pronouns', 'g-adverbials'];
const VERBS = ['g-tense', 'g-verb-forms', 'g-voice', 'g-active-passive', 'g-modals', 'g-subjunctive'];
const STANDARD = ['g-standard-english', 'g-formality'];
const PUNCTUATION = ['g-capitals', 'g-end-punctuation', 'g-commas', 'g-parenthesis', 'g-apostrophes', 'g-contractions', 'g-speech', 'g-colons-semicolons', 'g-hyphens'];
const VOCABULARY = ['g-synonyms', 'g-antonyms', 'g-prefixes', 'g-suffixes', 'g-word-families', 'g-homophones'];

/** Ten slots repeated five times: grammar about 55%, punctuation 30%, vocabulary 10%. */
const CYCLE = [WORD_CLASSES, PUNCTUATION, SENTENCES, VERBS, PUNCTUATION, VOCABULARY, WORD_CLASSES, PUNCTUATION, SENTENCES, [...VERBS, ...STANDARD]];

export const GPS_TYPES_IN_PAPER = [...new Set(CYCLE.flat())];

/** "mixed" rises from easy to hard across the paper, like the real test. */
const levelAt = (i: number, total: number, choice: LevelChoice): Level => {
  if (choice !== 'mixed') return choice;
  const f = i / total;
  return f < 1 / 3 ? 1 : f < 2 / 3 ? 2 : 3;
};

const encode = (answer: (number | string | boolean)[]): string => {
  if (answer.every((a) => typeof a === 'boolean')) return answer.map((a) => (a ? '1' : '0')).join(',');
  if (answer.every((a) => typeof a === 'number')) return [...(answer as number[])].sort((x, y) => x - y).join(',');
  return (answer as string[]).join('|');
};

/** A bank item as a question. With `rng`, choice options are shuffled. */
export function fromGpsItem(item: GpsItem, rng?: Rng): ItemQuestion {
  const { input } = item;
  if (input.kind === 'choice' && rng) {
    const shuffled = shuffleOptions(input.options, item.answer as number[], rng);
    return fromGpsItem({ ...item, input: { ...input, options: shuffled.options }, answer: shuffled.answer });
  }
  const spec: ItemQuestion['input'] =
    input.kind === 'choice'
      ? { kind: 'choice', options: input.options, pick: input.pick }
      : input.kind === 'text'
        ? { kind: 'text', before: input.before, after: input.after }
        : input.kind === 'words'
          ? { kind: 'words', tokens: input.tokens, pick: input.pick }
          : input.kind === 'gap'
            ? { kind: 'gap', tokens: input.tokens, mark: input.mark }
            : { kind: 'tf', statements: input.statements };
  return {
    format: 'english',
    typeId: item.type,
    difficulty: item.level,
    marks: 1,
    body: [{ b: 'text', text: item.prompt }],
    input: spec,
    answer: encode(item.answer),
    explain: item.explain,
    sourceId: item.id,
  };
}

function readyMade(type: string, level: Level, rng: Rng, used: Set<string>, history: History): ItemQuestion | null {
  const items = GPS_ITEMS.filter((it) => it.type === type && !used.has(it.id));
  if (!items.length) return null;
  const atLevel = items.filter((it) => it.level === level);
  const pool = atLevel.length ? atLevel : items;
  // Now and then bring back something answered wrongly last time.
  const mistakes = pool.filter((it) => history.get(it.id)?.lastCorrect === false);
  const item = mistakes.length && rng.chance(0.3) ? rng.pick(mistakes) : freshFirst(pool, (it) => it.id, history, rng.shuffle)[0];
  return fromGpsItem(item, rng);
}

function generated(type: string, level: Level, rng: Rng, used: Set<string>): ItemQuestion | null {
  if (!isGenerated(type)) return null;
  for (let t = 0; t < 12; t++) {
    const q = GENERATORS[type](rng, level);
    if (q && !used.has(q.sourceId ?? '')) return q;
  }
  return null;
}

function question(type: string, level: Level, rng: Rng, used: Set<string>, history: History): ItemQuestion | null {
  // End punctuation comes from both sources.
  if (type === 'g-end-punctuation' && rng.chance(0.5)) return generated(type, level, rng, used) ?? readyMade(type, level, rng, used, history);
  return isGenerated(type) && type !== 'g-end-punctuation' ? generated(type, level, rng, used) : readyMade(type, level, rng, used, history);
}

/** Builds a GPS paper. Types rotate so one paper covers as much as possible. */
export function buildGpsPaper(code: string, choice: LevelChoice, history: History, count = GPS_QUESTIONS): ItemQuestion[] {
  const rng = createRng(`G${code}`);
  const used = new Set<string>();
  const typeUse = new Map<string, number>();
  const out: ItemQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const level = levelAt(i, count, choice);
    const pools = [CYCLE[i % CYCLE.length], GPS_TYPES_IN_PAPER];
    let q: ItemQuestion | null = null;
    for (const pool of pools) {
      const types = rng.shuffle(pool).sort((a, b) => (typeUse.get(a) ?? 0) - (typeUse.get(b) ?? 0));
      for (const type of types) {
        q = question(type, level, rng, used, history);
        if (q) break;
      }
      if (q) break;
    }
    if (!q) break; // no content at all
    out.push(q);
    if (q.sourceId) used.add(q.sourceId);
    typeUse.set(q.typeId, (typeUse.get(q.typeId) ?? 0) + 1);
  }
  return out;
}

/** A short practice set of some GPS question types ("mixed" goes from easy to hard). */
export function buildGpsPractice(code: string, types: string[], choice: LevelChoice, history: History, count = 10): ItemQuestion[] {
  const rng = createRng(`GP${code}`);
  const used = new Set<string>();
  const out: ItemQuestion[] = [];
  for (let i = 0; i < count * 3 && out.length < count; i++) {
    const q = question(rng.pick(types), levelAt(out.length, count, choice), rng, used, history);
    if (!q) continue;
    out.push(q);
    if (q.sourceId) used.add(q.sourceId);
  }
  return out;
}
