// Every English question the app can build must be answerable: the stored answer scores full
// marks, a blank scores nothing, and the answer indexes point at real options.
import { describe, expect, it } from 'vitest';
import { emptyAnswer, markFor, type AnswerInput } from '../answer/answer';
import { typeInfo } from '../gen/catalog';
import { createRng } from '../gen/rng';
import type { ItemQuestion } from '../gen/types';
import { wordingProblems } from '../gen/wording';
import { createAttempt, submitSession, setAnswer } from '../store/model';
import { GPS_ITEMS, READING_TEXTS, SENTENCES, SPELLING_WORDS } from './bank';
import { buildGpsPaper, buildGpsPractice, fromGpsItem, GPS_QUESTIONS, GPS_TYPES_IN_PAPER } from './gps/paper';
import { GENERATORS, mainClauseSpan, sentencesFor } from './gps/generated';
import { englishHistory, type History } from './history';
import { buildReading, readingQuestions } from './reading';
import { buildSpellingTest, spellingQuestion } from './spelling';
import type { GrammarSentence, Level, Tag } from './types';

const indexes = (s: string) => (s ? s.split(',').map(Number) : []);

/** The input a pupil would give to get the question right. */
function correctInput(q: ItemQuestion): AnswerInput {
  const a = emptyAnswer();
  switch (q.input.kind) {
    case 'choice':
    case 'words':
    case 'gap':
    case 'order':
      return { ...a, sel: indexes(q.answer) };
    case 'text':
      return { ...a, text: q.answer.split('|')[0] };
    case 'tf':
      return { ...a, tf: q.answer.split(',').map((v) => v === '1') };
    case 'self':
      return { ...a, checked: true, self: q.marks };
    default:
      throw new Error(`unexpected input ${q.input.kind}`);
  }
}

function checkQuestion(q: ItemQuestion): string[] {
  const out: string[] = [];
  const where = `${q.typeId} ${q.sourceId}`;
  if (!typeInfo(q.typeId)) out.push(`${where}: unknown type`);
  if (markFor(q, correctInput(q)) !== q.marks) out.push(`${where}: right answer does not score`);
  if (markFor(q, emptyAnswer()) !== 0) out.push(`${where}: blank answer scores`);
  const input = q.input;
  const sel = indexes(q.answer);
  if (input.kind === 'choice') {
    if (sel.length !== input.pick || sel.some((i) => i < 0 || i >= input.options.length)) out.push(`${where}: bad choice answer`);
    if (new Set(input.options).size !== input.options.length) out.push(`${where}: repeated option`);
  }
  if (input.kind === 'words') {
    if (sel.length !== input.pick || sel.some((i) => !/[A-Za-z0-9]/.test(input.tokens[i] ?? ''))) out.push(`${where}: answer is not tappable words`);
  }
  if (input.kind === 'gap' && sel.some((i) => i < 0 || i > input.tokens.length - 2)) out.push(`${where}: gap out of range`);
  if (input.kind === 'order') {
    const sorted = [...sel].sort((x, y) => x - y);
    if (sel.length !== input.items.length || sorted.some((v, i) => v !== i)) out.push(`${where}: order is not a permutation`);
  }
  if (input.kind === 'tf' && q.answer.split(',').length !== input.statements.length) out.push(`${where}: tf length`);
  return out;
}

const empty: History = new Map();

describe('English questions are answerable', () => {
  it('ready-made GPS items', () => {
    expect(GPS_ITEMS.flatMap((item) => checkQuestion(fromGpsItem(item)))).toEqual([]);
  });

  it('generated GPS questions', () => {
    if (!SENTENCES.length) return;
    const rng = createRng('gen-check');
    const problems: string[] = [];
    for (const [type, generate] of Object.entries(GENERATORS)) {
      for (const level of [1, 2, 3] as Level[]) {
        for (let k = 0; k < 60; k++) {
          const q = generate(rng, level);
          if (q) problems.push(...checkQuestion(q).map((p) => `${type}: ${p}`));
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('generated GPS questions are worded correctly and are as hard as their sentence', () => {
    const levelOf = new Map(SENTENCES.map((s) => [s.id, s.level]));
    const rng = createRng('gen-wording');
    const problems = new Set<string>();
    for (const [type, generate] of Object.entries(GENERATORS)) {
      for (const level of [1, 2, 3] as Level[]) {
        for (let k = 0; k < 200; k++) {
          const q = generate(rng, level);
          if (!q) continue;
          const where = `${type} ${q.sourceId}`;
          // "is an adverb", "It is an exclamation."
          const texts = [...q.body.flatMap((b) => (b.b === 'text' ? [b.text] : [])), q.explain ?? ''];
          if (q.input.kind === 'choice') texts.push(...q.input.options);
          for (const p of texts.flatMap(wordingProblems)) problems.add(`${where}: ${p}`);
          // The report shows how hard each question was: the level of the sentence it uses,
          // which is the level asked for or the one next to it.
          const actual = levelOf.get(q.sourceId!);
          if (q.difficulty !== actual) problems.add(`${where}: difficulty ${q.difficulty}, sentence level ${actual}`);
          if (Math.abs(q.difficulty - level) > 1) problems.add(`${where}: asked for level ${level}, got ${q.difficulty}`);
          // English has no future tense.
          if (type === 'g-tense' && q.input.kind === 'choice' && q.input.options.includes('future')) problems.add(`${where}: offers "future"`);
        }
      }
    }
    expect([...problems]).toEqual([]);
  });

  it('spelling words', () => {
    expect(SPELLING_WORDS.flatMap((w) => checkQuestion(spellingQuestion(w)))).toEqual([]);
  });

  it('reading questions', () => {
    expect(READING_TEXTS.flatMap((t) => readingQuestions(t).flatMap(checkQuestion))).toEqual([]);
  });
});

describe('GPS paper', () => {
  it('has 50 different questions, rising from easy to hard when mixed', () => {
    if (!GPS_ITEMS.length || !SENTENCES.length) return;
    const paper = buildGpsPaper('ABC234', 'mixed', empty);
    expect(paper).toHaveLength(GPS_QUESTIONS);
    const ids = paper.map((q) => q.sourceId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(paper.slice(0, 10).every((q) => q.difficulty === 1)).toBe(true);
    expect(paper.slice(-10).every((q) => q.difficulty === 3)).toBe(true);
    // Covers the paper: punctuation, vocabulary and several grammar areas.
    const topics = new Set(paper.map((q) => typeInfo(q.typeId)?.topic));
    for (const t of ['punctuation', 'vocabulary', 'word-classes', 'sentence-structure', 'verb-forms']) expect(topics).toContain(t);
    expect(new Set(paper.map((q) => q.typeId)).size).toBeGreaterThanOrEqual(20);
  });

  it('keeps one level when a level is picked', () => {
    if (!GPS_ITEMS.length || !SENTENCES.length) return;
    for (const level of [1, 2, 3] as Level[]) {
      const paper = buildGpsPaper(`LV${level}XYZ`, level, empty);
      expect(paper.filter((q) => q.difficulty === level).length).toBeGreaterThanOrEqual(45);
    }
  });

  it('stays full and at the level asked for, whatever the code', () => {
    // Generated questions record their sentence's real level, so a paper must choose on-level
    // questions rather than borrow easier or harder ones under the wrong label.
    if (!GPS_ITEMS.length || !SENTENCES.length) return;
    const wrong: string[] = [];
    for (let k = 0; k < 20; k++) {
      for (const level of [1, 2, 3] as Level[]) {
        const paper = buildGpsPaper(`LVL${k}${level}`, level, empty);
        if (paper.length !== GPS_QUESTIONS) wrong.push(`LVL${k}${level}: ${paper.length} questions`);
        for (const q of paper) if (q.difficulty !== level) wrong.push(`LVL${k}${level}: ${q.typeId} ${q.sourceId} is level ${q.difficulty}`);
      }
      const mixed = buildGpsPaper(`MIX${k}`, 'mixed', empty);
      if (!mixed.slice(0, 10).every((q) => q.difficulty === 1) || !mixed.slice(-10).every((q) => q.difficulty === 3)) {
        wrong.push(`MIX${k}: does not run from easy to hard`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('prefers ready-made items not seen before', () => {
    if (!GPS_ITEMS.length || !SENTENCES.length) return;
    const first = buildGpsPaper('FIRST2', 'mixed', empty);
    const seen: History = new Map(first.map((q) => [q.sourceId!, { times: 1, last: 1, lastCorrect: true }]));
    const second = buildGpsPaper('SECND3', 'mixed', seen);
    const repeats = second.filter((q) => q.sourceId?.startsWith('gi-') && seen.has(q.sourceId));
    expect(repeats.length).toBeLessThanOrEqual(3);
  });

  it('has answerable questions with the right answer in any position', () => {
    if (!GPS_ITEMS.length || !SENTENCES.length) return;
    const first: number[] = [];
    for (let k = 0; k < 20; k++) {
      const paper = buildGpsPaper(`POS${k}AB`, 'mixed', empty);
      expect(paper.flatMap(checkQuestion)).toEqual([]);
      for (const q of paper) if (q.input.kind === 'choice' && q.input.pick === 1) first.push(Number(q.answer) === 0 ? 1 : 0);
    }
    // With four options the right one should come first about a quarter of the time.
    const share = first.reduce((s, x) => s + x, 0) / first.length;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.4);
  });

  it('is the same paper for the same code and history', () => {
    if (!GPS_ITEMS.length || !SENTENCES.length) return;
    expect(buildGpsPaper('SAME22', 2, empty)).toEqual(buildGpsPaper('SAME22', 2, empty));
  });
});

/** A sentence for the tests: "When/conj-sub it/pron rains/verb ,/punct ...". */
function sentence(text: string, spans: Partial<Pick<GrammarSentence, 'subordinateClause' | 'relativeClause' | 'frontedAdverbial'>>): GrammarSentence {
  const tokens = text.split(' ').map((t) => t.split('/') as [string, Tag]);
  return { id: 'gs999', level: 1, tokens, type: 'statement', voice: 'active', ...spans };
}

describe('tap the main clause', () => {
  const byId = new Map(SENTENCES.map((s) => [s.id, s]));
  const generate = GENERATORS['g-main-clause'];

  it('scores full marks with the stored answer and nothing when blank, at every level', () => {
    const rng = createRng('main-clause-marks');
    const problems: string[] = [];
    for (const level of [1, 2, 3] as Level[]) {
      for (let k = 0; k < 200; k++) {
        const q = generate(rng, level);
        if (!q) problems.push(`level ${level}: no question`);
        else problems.push(...checkQuestion(q));
      }
    }
    expect(problems).toEqual([]);
  });

  it('is never ambiguous: the answer is every word outside the one subordinate clause', () => {
    const rng = createRng('main-clause-answer');
    const problems = new Set<string>();
    for (const level of [1, 2, 3] as Level[]) {
      for (let k = 0; k < 300; k++) {
        const q = generate(rng, level)!;
        const s = byId.get(q.sourceId!)!;
        const [a, b] = s.subordinateClause!;
        const outside = s.tokens.map((_, i) => i).filter((i) => (i < a || i >= b) && s.tokens[i][1] !== 'punct');
        if (q.answer !== outside.join(',')) problems.add(`${s.id}: answer is not every word outside the subordinate clause`);
        if (q.input.kind !== 'words' || q.input.pick !== outside.length) problems.add(`${s.id}: wrong number of words to tap`);
        if (s.relativeClause || s.frontedAdverbial) problems.add(`${s.id}: another clause or adverbial could be argued in or out`);
        if (s.tokens.filter(([, t]) => t === 'conj-sub').length !== 1) problems.add(`${s.id}: not exactly one subordinate clause`);
        if (s.tokens.filter(([, t]) => t === 'verb').length !== 2) problems.add(`${s.id}: not exactly two clauses`);
      }
    }
    expect([...problems]).toEqual([]);
  });

  it('is asked at every level from sentences of that level', () => {
    for (const level of [1, 2, 3] as Level[]) {
      expect(sentencesFor(level)['g-main-clause'].length).toBeGreaterThanOrEqual(16);
      const rng = createRng(`main-clause-${level}`);
      for (let k = 0; k < 50; k++) expect(generate(rng, level)?.difficulty).toBe(level);
      const practice = buildGpsPractice(`MAIN${level}`, ['g-main-clause'], level, empty);
      expect(practice).toHaveLength(10);
      expect(practice.every((q) => q.typeId === 'g-main-clause' && q.difficulty === level)).toBe(true);
    }
  });

  it('only uses sentences whose main clause cannot be argued about', () => {
    const ok = sentence('When/conj-sub it/pron rains/verb ,/punct we/pron play/verb indoors/adv ./punct', { subordinateClause: [0, 3] });
    expect(mainClauseSpan(ok)).toEqual([4, 7]);
    const last = sentence('We/pron play/verb indoors/adv when/conj-sub it/pron rains/verb ./punct', { subordinateClause: [3, 6] });
    expect(mainClauseSpan(last)).toEqual([0, 3]);
    const arguable = [
      // Two main clauses joined by "and".
      sentence('When/conj-sub the/det bell/noun rings/verb ,/punct walk/verb to/prep the/det hall/noun and/conj-co sit/verb down/adv ./punct', { subordinateClause: [0, 4] }),
      // "to" + verb is a clause inside the main clause.
      sentence('Once/conj-sub the/det paint/noun dries/verb ,/punct use/verb a/det brush/noun to/other add/verb details/noun ./punct', { subordinateClause: [0, 4] }),
      // A fronted adverbial could be argued in or out of the main clause.
      sentence('Luckily/adv ,/punct we/pron stayed/verb dry/adj because/conj-sub we/pron had/verb umbrellas/noun ./punct', { subordinateClause: [5, 9], frontedAdverbial: [0, 1] }),
      // A relative clause is a second subordinate clause.
      sentence('We/pron saw/verb the/det dog/noun that/pron barks/verb when/conj-sub we/pron walked/verb past/prep ./punct', { subordinateClause: [6, 10], relativeClause: [4, 6] }),
      // The subordinate clause in the middle splits the main clause.
      sentence('We/pron ,/punct when/conj-sub it/pron rained/verb ,/punct stayed/verb indoors/adv ./punct', { subordinateClause: [2, 5] }),
      // A comma before a final subordinate clause.
      sentence('We/pron stayed/verb indoors/adv ,/punct because/conj-sub it/pron rained/verb ./punct', { subordinateClause: [4, 7] }),
    ];
    expect(arguable.map(mainClauseSpan)).toEqual(arguable.map(() => null));
  });

  it('is in the GPS paper with the new ready-made types', () => {
    for (const type of ['g-main-clause', 'g-object', 'g-ellipsis', 'g-bullet-points']) expect(GPS_TYPES_IN_PAPER).toContain(type);
  });
});

describe('the subject of a sentence', () => {
  it('names the main clause when the sentence has two clauses', () => {
    const byId = new Map(SENTENCES.map((s) => [s.id, s]));
    const rng = createRng('subject-main');
    for (let k = 0; k < 300; k++) {
      const q = GENERATORS['g-subject'](rng, rng.pick([1, 2, 3] as Level[]))!;
      const s = byId.get(q.sourceId!)!;
      const prompt = q.body[0].b === 'text' ? q.body[0].text : '';
      expect(prompt.startsWith('What is the subject of the main clause')).toBe(Boolean(s.subordinateClause || s.relativeClause));
    }
  });
});

describe('spelling test', () => {
  it('has 20 different words, mostly Year 5 and 6 when mixed', () => {
    if (SPELLING_WORDS.length < 60) return;
    const test = buildSpellingTest('SPELL2', 'mixed', empty);
    expect(test).toHaveLength(20);
    expect(new Set(test.map((q) => q.answer)).size).toBe(20);
    const counts = [1, 2, 3].map((l) => test.filter((q) => q.difficulty === l).length);
    expect(counts).toEqual([5, 9, 6]);
  });

  it('brings back words spelt wrongly last time', () => {
    if (SPELLING_WORDS.length < 60) return;
    const wrong = SPELLING_WORDS.filter((w) => w.level === 2).slice(0, 4).map((w) => w.word);
    const history: History = new Map(wrong.map((w) => [w, { times: 1, last: 1, lastCorrect: false }]));
    const test = buildSpellingTest('AGAIN2', 'mixed', history);
    for (const w of wrong) expect(test.map((q) => q.answer)).toContain(w);
  });
});

describe('reading', () => {
  it('builds one text, or three texts from easy to hard', () => {
    const one = buildReading('READ22', 2, empty, 1);
    const texts = new Set(one.map((q) => q.sourceId!.split('#')[0]));
    expect(texts.size).toBe(1);
    expect(one.every((q) => q.difficulty === 2)).toBe(true);
    expect(one.flatMap(checkQuestion)).toEqual([]);
    const three = buildReading('READ33', 'mixed', empty, 3);
    expect(three.flatMap(checkQuestion)).toEqual([]);
    const order = [...new Set(three.map((q) => q.sourceId!.split('#')[0]))];
    expect(order).toHaveLength(3);
    expect([...new Set(three.map((q) => q.difficulty))]).toEqual([1, 2, 3]);
  });

  it('picks a text not read before', () => {
    const level1 = READING_TEXTS.filter((t) => t.level === 1);
    if (level1.length < 2) return;
    const [fresh, ...read] = level1;
    const history: History = new Map(
      read.flatMap((t) => t.questions.map((q) => [`${t.id}#${q.id}`, { times: 1, last: 5, lastCorrect: true }] as const)),
    );
    const qs = buildReading('FRESH2', 1, history, 1);
    expect(qs[0].sourceId!.split('#')[0]).toBe(fresh.id);
  });
});

describe('englishHistory', () => {
  it('remembers the latest result for each question', () => {
    const q = spellingQuestion({ word: 'necessary', level: 3, group: 'y56-list', sentence: 'It is necessary to rest.' });
    let a = createAttempt('p', 'full', 'CODE22', [q], 100, 'a1', 'spelling', 'mixed');
    a = setAnswer(a, 0, { ...emptyAnswer(), text: 'neccessary' });
    a = submitSession(a, 200);
    let b = createAttempt('p', 'full', 'CODE33', [q], 300, 'a2', 'spelling', 'mixed');
    b = setAnswer(b, 0, { ...emptyAnswer(), text: 'necessary' });
    b = submitSession(b, 400);
    expect(englishHistory([a]).get('necessary')).toEqual({ times: 1, last: 200, lastCorrect: false });
    expect(englishHistory([b, a]).get('necessary')).toEqual({ times: 2, last: 400, lastCorrect: true });
  });
});
