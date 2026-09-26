// Runs the structural checks on every English content file.
import { describe, expect, it } from 'vitest';
import { createRng } from '../gen/rng';
import { GPS_GENERATED_TYPES } from './catalog';
import { GENERATORS, nounPhraseAskable } from './gps/generated';
import {
  GPS_ITEM_TYPES,
  READING_DOMAINS,
  SPELLING_GROUPS,
  type GpsItem,
  type GrammarSentence,
  type Level,
  type ReadingQuestion,
  type ReadingText,
  type SpellingWord,
} from './types';
import { checkGpsItem, checkReading, checkSentence, checkSpelling, isWritten } from './validate';

const files = import.meta.glob<{ default: unknown }>('./content/**/*.json', { eager: true });

const of = <T>(pattern: RegExp): { file: string; data: T }[] =>
  Object.entries(files)
    .filter(([file]) => pattern.test(file))
    .map(([file, mod]) => ({ file, data: mod.default as T }));

function report<T extends { id?: string; word?: string }>(label: string, entries: T[], check: (e: T) => string[]): string[] {
  return entries.flatMap((e) => check(e).map((p) => `${label} ${e.id ?? e.word}: ${p}`));
}

const wordCount = (s: GrammarSentence, [a, b]: [number, number]) => s.tokens.slice(a, b).filter(([, t]) => t !== 'punct').length;

/**
 * Word counts of the expanded noun phrases outside the keyed one, found independently of the
 * template: an optional determiner, then adjectives (perhaps after an adverb), noun modifiers
 * or nouns, then the noun itself ("the heavy rain", "the football pitch", "our pocket money").
 */
function otherExpandedPhraseSizes(s: GrammarSentence): number[] {
  const [a, b] = s.expandedNounPhrase!;
  const notModifiers = ['not', 'please', 'to', "don't", 'what', 'how', 'where', 'why'];
  const codes = s.tokens
    .map(([w, t], i) => {
      if (i >= a && i < b) return 'k';
      if (t === 'other') return notModifiers.includes(w.toLowerCase()) ? '.' : 'M';
      return { det: 'D', adj: 'J', adv: 'R', noun: 'N' }[t as string] ?? '.';
    })
    .join('');
  return [...codes.matchAll(/D?(?:R*J|M|N)+N(?!N)/g)].map((m) => m[0].length);
}

describe('grammar sentences', () => {
  const all = of<GrammarSentence[]>(/grammar-sentences.*\.json$/).flatMap((f) => f.data);
  it('are well formed', () => {
    expect(report('sentence', all, checkSentence)).toEqual([]);
  });
  it('have unique ids', () => {
    const ids = all.map((s) => s.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
  it('never give "tap the expanded noun phrase" two right answers', () => {
    // The pupil is told how many words to tap. In "The heavy rain had flooded the football
    // pitch." both three-word phrases are expanded noun phrases, so the sentence must not be used.
    const ambiguous = all
      .filter((s) => s.expandedNounPhrase && nounPhraseAskable(s))
      .filter((s) => otherExpandedPhraseSizes(s).includes(wordCount(s, s.expandedNounPhrase!)))
      .map((s) => s.id);
    expect(ambiguous).toEqual([]);
    for (const level of [1, 2, 3]) {
      expect(all.filter((s) => s.level === level && nounPhraseAskable(s)).length).toBeGreaterThanOrEqual(12);
    }
  });
  it('give noun-phrase questions with one right answer', () => {
    const byId = new Map(all.map((s) => [s.id, s]));
    const rng = createRng('noun-phrase-check');
    const ambiguous = new Set<string>();
    for (const level of [1, 2, 3] as Level[]) {
      for (let k = 0; k < 300; k++) {
        const q = GENERATORS['g-noun-phrase'](rng, level)!;
        const s = byId.get(q.sourceId!)!;
        if (q.input.kind === 'words' && otherExpandedPhraseSizes(s).includes(q.input.pick)) ambiguous.add(s.id);
      }
    }
    expect([...ambiguous]).toEqual([]);
  });
  it('have no future tense', () => {
    expect(all.filter((s) => (s.tense as string | undefined) === 'future').map((s) => s.id)).toEqual([]);
  });
});

describe('GPS items', () => {
  const all = of<GpsItem[]>(/gps-items.*\.json$/).flatMap((f) => f.data);
  it('are well formed', () => {
    expect(report('item', all, checkGpsItem)).toEqual([]);
  });
  it('have unique ids and prompts', () => {
    const ids = all.map((s) => s.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const keys = all.map((s) => `${s.prompt}|${JSON.stringify(s.input)}`);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });
  it('spell grammar terms the way the National Curriculum does', () => {
    // "co-ordinating conjunction", with a hyphen, as in the NC and STA glossaries.
    const everywhere = [
      ...Object.entries(files).map(([file, mod]) => [file, JSON.stringify(mod.default)]),
      ...Object.entries({ ...GPS_ITEM_TYPES, ...GPS_GENERATED_TYPES, ...SPELLING_GROUPS }),
    ];
    expect(everywhere.filter(([, text]) => /\bcoordinat(?:ing|ion)\b/i.test(text)).map(([where]) => where)).toEqual([]);
  });
});

describe('spelling words', () => {
  const all = of<SpellingWord[]>(/spelling.*\.json$/).flatMap((f) => f.data);
  it('are well formed', () => {
    expect(report('word', all, checkSpelling)).toEqual([]);
  });
  it('are unique', () => {
    const ws = all.map((w) => w.word);
    expect(ws.filter((w, i) => ws.indexOf(w) !== i)).toEqual([]);
  });
  it('include every spelling pattern their group label names', () => {
    // "-able/-ably and -ible/-ibly" promises -ably and -ibly words; "(co-, re-)" promises words
    // starting co- and re-. ("-fer" words are "referring" and friends, so a suffix may be inside.)
    const missing: string[] = [];
    for (const [group, label] of Object.entries(SPELLING_GROUPS)) {
      const words = all.filter((w) => w.group === group).map((w) => w.word);
      for (const [pattern] of label.matchAll(/(?<![a-z])-[a-z]+|[a-z]+-(?![a-z])/g)) {
        const found = pattern.endsWith('-') ? words.some((w) => w.startsWith(pattern)) : words.some((w) => w.includes(pattern.slice(1)));
        if (!found) missing.push(`${group}: ${pattern}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('reading texts', () => {
  const all = of<ReadingText>(/reading\/.*\.json$/).map((f) => f.data);
  const marksOf = (qs: ReadingQuestion[]) => qs.reduce((s, q) => s + q.marks, 0);
  const questions = all.flatMap((t) => t.questions);

  it('are well formed', () => {
    expect(report('text', all, checkReading)).toEqual([]);
  });
  it('have unique ids', () => {
    const ids = all.map((t) => t.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
  it('give written answers at least 45% of the marks, as the real test does', () => {
    // Released papers ask for copied words, short answers and explanations far more often than
    // for ticks: a bank of tick-one questions would overstate how a pupil will do in May.
    expect(marksOf(questions.filter(isWritten)) / marksOf(questions)).toBeGreaterThanOrEqual(0.45);
    // Every kind of written answer is practised: typed words, and explanations worth 1, 2 or 3 marks.
    const count = (kind: ReadingQuestion['kind'], marks: number) => questions.filter((q) => q.kind === kind && q.marks === marks).length;
    expect(count('text', 1)).toBeGreaterThanOrEqual(all.length);
    for (const m of [1, 2, 3]) expect(count('self', m)).toBeGreaterThanOrEqual(10);
  });
  it('have multi-mark questions of more than one kind', () => {
    // Not only "explain, using evidence" (2d): impressions, predictions, language and comparisons too.
    const multiMark = new Set(questions.filter((q) => q.marks > 1).map((q) => q.domain));
    for (const d of ['2b', '2d', '2e', '2g', '2h']) expect(multiMark).toContain(d);
  });
  it('ask about every content domain, with predictions in at least 8 texts', () => {
    const asked = new Set(questions.map((q) => q.domain));
    expect([...asked].sort()).toEqual(Object.keys(READING_DOMAINS).sort());
    expect(all.filter((t) => t.questions.some((q) => q.domain === '2e')).length).toBeGreaterThanOrEqual(8);
  });
  it('make any three-text paper about as long as the real 50-mark test', () => {
    const totals = (level: Level) => all.filter((t) => t.level === level).map((t) => marksOf(t.questions));
    const [easy, medium, hard] = ([1, 2, 3] as Level[]).map(totals);
    // A mixed paper has one text of each level; a paper at one level has any three texts of it.
    const mixed = easy.flatMap((a) => medium.flatMap((b) => hard.map((c) => a + b + c)));
    const sameLevel = [easy, medium, hard].flatMap((ts) => {
      const sorted = [...ts].sort((a, b) => a - b);
      return [sorted[0] + sorted[1] + sorted[2], sorted[sorted.length - 1] + sorted[sorted.length - 2] + sorted[sorted.length - 3]];
    });
    for (const total of [...mixed, ...sameLevel]) {
      expect(total).toBeGreaterThanOrEqual(47);
      expect(total).toBeLessThanOrEqual(52);
    }
  });
});
