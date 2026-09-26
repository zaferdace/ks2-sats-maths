// Runs the structural checks on every English content file.
import { describe, expect, it } from 'vitest';
import { createRng } from '../gen/rng';
import { GPS_GENERATED_TYPES } from './catalog';
import { GENERATORS, mainClauseSpan, nounPhraseAskable, sentencesFor } from './gps/generated';
import { SPELLING_QUESTIONS } from './spelling';
import { splitAround } from './tokens';
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

/** Homophones and near-homophones in the National Curriculum spelling appendix, Years 3/4 then 5/6. */
const NC_HOMOPHONES: string[][] = [
  ['accept', 'except'], ['affect', 'effect'], ['ball', 'bawl'], ['berry', 'bury'], ['brake', 'break'],
  ['fair', 'fare'], ['grate', 'great'], ['groan', 'grown'], ['here', 'hear'], ['heel', 'heal', "he'll"],
  ['knot', 'not'], ['mail', 'male'], ['main', 'mane'], ['meat', 'meet'], ['medal', 'meddle'],
  ['missed', 'mist'], ['peace', 'piece'], ['plain', 'plane'], ['rain', 'rein', 'reign'], ['scene', 'seen'],
  ['weather', 'whether'], ['whose', "who's"],
  ['advice', 'advise'], ['device', 'devise'], ['licence', 'license'], ['practice', 'practise'],
  ['prophecy', 'prophesy'], ['farther', 'father'], ['guessed', 'guest'], ['heard', 'herd'], ['led', 'lead'],
  ['morning', 'mourning'], ['past', 'passed'], ['precede', 'proceed'], ['principal', 'principle'],
  ['profit', 'prophet'], ['stationary', 'stationery'], ['steal', 'steel'], ['wary', 'weary'],
  ['aisle', 'isle'], ['aloud', 'allowed'], ['altar', 'alter'], ['ascent', 'assent'], ['bridal', 'bridle'],
  ['cereal', 'serial'], ['compliment', 'complement'], ['descent', 'dissent'], ['desert', 'dessert'],
  ['draft', 'draught'],
];

/**
 * NC homophones never dictated. "lead", the metal, sounds like "led", but a device voice reading
 * "The word is: lead." may say the verb ("leed"), a word the sentence does not use, so the pair
 * is practised with "led", which has one pronunciation.
 */
const NOT_DICTATED = ['lead'];

/** The homophones in spelling-homophones.json, by level: Years 3/4 easy, 5/6 medium, the hardest pairs hard. */
const ADDED_HOMOPHONES: Record<Level, string[]> = {
  1: [
    'accept', 'except', 'ball', 'bawl', 'berry', 'bury', 'brake', 'break', 'fair', 'fare', 'grate', 'great',
    'groan', 'grown', 'heel', 'heal', "he'll", 'knot', 'not', 'mail', 'male', 'main', 'mane', 'meat', 'meet',
    'medal', 'meddle', 'missed', 'mist', 'peace', 'piece', 'plain', 'plane', 'rain', 'rein', 'scene', 'seen',
  ],
  2: [
    'aisle', 'isle', 'cereal', 'serial', 'desert', 'dessert', 'draft', 'draught', 'farther', 'father', 'guessed',
    'guest', 'herd', 'led', 'morning', 'mourning', 'profit', 'prophet', 'steal', 'steel', 'wary', 'weary',
    'device', 'devise', 'licence', 'license',
  ],
  3: [
    'altar', 'alter', 'ascent', 'assent', 'bridal', 'bridle', 'compliment', 'complement', 'descent', 'dissent',
    'precede', 'proceed', 'prophecy', 'prophesy',
  ],
};

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
  it('give every template at least 16 sentences of its own at every level', () => {
    // With fewer than 12 a level borrows sentences from the next level, and the question is
    // recorded at that level: easy clause practice used to come out as medium, and medium or hard
    // commands, exclamations and questions as easy or hard.
    const short = ([1, 2, 3] as Level[]).flatMap((level) =>
      Object.entries(sentencesFor(level))
        .filter(([, ss]) => ss.length < 16)
        .map(([template, ss]) => `level ${level} ${template}: ${ss.length}`),
    );
    expect(short).toEqual([]);
  });
  it('give "tap the main clause" one right answer', () => {
    // Worked out again from the annotation, independently of mainClauseSpan: two clauses in all
    // (one conj-sub, one verb in each), the subordinate clause first (then its comma) or last, and
    // the main clause is every other word, in one unbroken run.
    const problems: string[] = [];
    for (const s of all) {
      const span = mainClauseSpan(s);
      if (!span) continue;
      const [a, b] = s.subordinateClause!;
      const end = s.tokens.length - 1;
      const wordsOutside = s.tokens.map((_, i) => i).filter((i) => (i < a || i >= b) && s.tokens[i][1] !== 'punct');
      const tapped = s.tokens.map((_, i) => i).filter((i) => i >= span[0] && i < span[1]);
      const tags = (idx: number[]) => idx.map((i) => s.tokens[i][1]);
      const inside = s.tokens.slice(a, b).map(([, t]) => t);
      if (tapped.join() !== wordsOutside.join()) problems.push(`${s.id}: main clause is not every word outside the subordinate clause`);
      if (tapped.some((i, k) => k > 0 && i !== tapped[k - 1] + 1)) problems.push(`${s.id}: main clause is broken up`);
      if (!(a === 0 && s.tokens[b][0] === ',') && b !== end) problems.push(`${s.id}: subordinate clause is in the middle`);
      if (s.relativeClause || s.frontedAdverbial) problems.push(`${s.id}: has a relative clause or fronted adverbial`);
      if (s.tokens.filter(([, t]) => t === 'conj-sub').length !== 1) problems.push(`${s.id}: more than one subordinate clause`);
      if (tags(tapped).filter((t) => t === 'verb').length !== 1 || inside.filter((t) => t === 'verb').length !== 1) {
        problems.push(`${s.id}: a clause without exactly one verb (a second clause or "to" + verb)`);
      }
      if (tags(tapped).includes('punct')) problems.push(`${s.id}: punctuation inside the main clause`);
    }
    expect(problems).toEqual([]);
    for (const level of [1, 2, 3]) expect(all.filter((s) => s.level === level && mainClauseSpan(s)).length).toBeGreaterThanOrEqual(16);
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
  it('give every ready-made type questions at every level', () => {
    // Practice needs ten different questions of a type, and a paper at one level needs some at
    // that level (ellipsis, bullet points and the object were once never asked at all).
    const thin = Object.keys(GPS_ITEM_TYPES).flatMap((type) => {
      const mine = all.filter((i) => i.type === type);
      const perLevel = [1, 2, 3].map((l) => mine.filter((i) => i.level === l).length);
      return mine.length < 10 || perLevel.some((n) => n < 3) ? [`${type}: ${perLevel.join('/')}`] : [];
    });
    expect(thin).toEqual([]);
  });
});

describe('spelling words', () => {
  const all = of<SpellingWord[]>(/spelling.*\.json$/).flatMap((f) => f.data);
  it('are well formed', () => {
    expect(report('word', all, checkSpelling)).toEqual([]);
  });
  it('are unique across every spelling file', () => {
    const ws = all.map((w) => w.word);
    expect(ws.filter((w, i) => ws.indexOf(w) !== i)).toEqual([]);
  });
  it('sit in their sentence as a whole word, where the dictation blanks them out', () => {
    // The screen blanks out the first match; it must be the word itself, not part of
    // "heel-to-toe" or "Sam's", and it must be the one occurrence the sentence has.
    const wrong = all.filter((w) => {
      const [before, after] = splitAround(w.sentence, w.word);
      const shown = w.sentence.slice(before.length, w.sentence.length - after.length);
      return shown.toLowerCase() !== w.word || /[A-Za-z'’-]$/.test(before) || /^[A-Za-z'’-]/.test(after);
    });
    expect(wrong.map((w) => w.word)).toEqual([]);
  });
  it('have enough words at every level for five tests without a repeat', () => {
    // A 20-word hard test used to run out of hard words during the third test.
    for (const level of [1, 2, 3]) expect(all.filter((w) => w.level === level).length).toBeGreaterThanOrEqual(5 * SPELLING_QUESTIONS);
  });
  it('include every homophone the National Curriculum lists for Years 3 to 6, except those a voice may misread', () => {
    const missing = NC_HOMOPHONES.flat().filter((word) => !NOT_DICTATED.includes(word) && !all.some((w) => w.word === word));
    expect(missing).toEqual([]);
    expect(all.filter((w) => NOT_DICTATED.includes(w.word)).map((w) => w.word)).toEqual([]);
    // Added as homophones, at the level of their year group; the hardest pairs are hard.
    const wrong = Object.entries(ADDED_HOMOPHONES).flatMap(([level, list]) =>
      list.filter((word) => !all.some((w) => w.word === word && w.group === 'homophones' && w.level === Number(level))),
    );
    expect(wrong).toEqual([]);
  });
  it('never put a homophone’s partner in its sentence', () => {
    // The sentence is what tells the pupil which spelling is meant, so it must not contain the other one.
    const has = (sentence: string, word: string) =>
      new RegExp(`(^|[^A-Za-z'-])${word.replace(/[-']/g, (c) => `\\${c}`)}(?![A-Za-z'-])`, 'i').test(sentence);
    const clashes = NC_HOMOPHONES.flatMap((set) =>
      set.flatMap((word) => {
        const entry = all.find((w) => w.word === word);
        return entry ? set.filter((other) => other !== word && has(entry.sentence, other)).map((other) => `${word}: ${other}`) : [];
      }),
    );
    expect(clashes).toEqual([]);
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
