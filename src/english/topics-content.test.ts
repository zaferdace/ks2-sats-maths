// The practice material behind each grammar topic: enough ready-made items per topic, enough
// annotated sentences per tense at every level, and the Oak National Academy imports marked as such.
import { describe, expect, it } from 'vitest';
import { GPS_ITEMS, SENTENCES } from './bank';
import { sentencesFor } from './gps/generated';
import { GRAMMAR_TOPIC_IDS, TENSES, type GpsItem, type GrammarTopicId, type Level } from './types';

const files = import.meta.glob<{ default: unknown }>('./content/gps-items*.json', { eager: true });
const topicsFile = Object.entries(files).find(([file]) => file.endsWith('gps-items-topics.json'))?.[1].default as GpsItem[] | undefined;

/** Ready-made items a topic needs from the bank, whatever a real past paper adds later. */
const ITEMS_NEEDED: Record<GrammarTopicId, number> = {
  'simple-present': 12,
  'simple-past': 12,
  'present-progressive': 12,
  'past-progressive': 12,
  'present-perfect': 12,
  'past-perfect': 12,
  future: 30,
  'future-progressive': 30,
  modals: 30,
  'active-passive': 20,
  subjunctive: 30,
  determiners: 12,
  prepositions: 12,
  conjunctions: 12,
};

/** Sentences of its own that each tense needs at every level (below 12 a level borrows from the next). */
const SENTENCES_PER_LEVEL = 16;

const byTopic = (topic: GrammarTopicId) => GPS_ITEMS.filter((it) => it.topic === topic);

describe('grammar topic items', () => {
  it.each(GRAMMAR_TOPIC_IDS.map((t) => [t] as const))('%s has enough ready-made items', (topic) => {
    expect(byTopic(topic).length, topic).toBeGreaterThanOrEqual(ITEMS_NEEDED[topic]);
  });

  it('asks about every topic at every level', () => {
    const thin = GRAMMAR_TOPIC_IDS.flatMap((topic) => {
      const perLevel = [1, 2, 3].map((l) => byTopic(topic).filter((it) => it.level === l).length);
      return perLevel.some((n) => n < 3) ? [`${topic}: ${perLevel.join('/')}`] : [];
    });
    expect(thin).toEqual([]);
  });

  it('practise the simple present with "to be" and third-person -s, and the simple past with was/were and irregular verbs', () => {
    const text = (it: GpsItem) => JSON.stringify(it).toLowerCase();
    const present = byTopic('simple-present').map(text).join(' ');
    expect(/\b(am|is|are)\b/.test(present)).toBe(true);
    expect(/"(goes|flies|brushes|has|is)"/.test(present)).toBe(true);
    const past = byTopic('simple-past').map(text).join(' ');
    expect(/\b(was|were)\b/.test(past)).toBe(true);
    for (const irregular of ['went', 'bought', 'thought', 'swam']) expect(past).toContain(irregular);
  });

  it('keeps the tense topics on verb-form questions and the others on their own type', () => {
    const expectedType: Partial<Record<GrammarTopicId, string>> = {
      modals: 'g-modals',
      subjunctive: 'g-subjunctive',
      'active-passive': 'g-active-passive',
      determiners: 'g-determiners',
      prepositions: 'g-prepositions',
      conjunctions: 'g-conjunctions',
    };
    const wrong = GPS_ITEMS.filter((it) => it.topic && it.type !== (expectedType[it.topic] ?? 'g-verb-forms')).map((it) => it.id);
    expect(wrong).toEqual([]);
  });

  it('every item of the seven topic-bearing types carries a topic', () => {
    const types = ['g-modals', 'g-subjunctive', 'g-active-passive', 'g-determiners', 'g-prepositions', 'g-conjunctions', 'g-verb-forms'];
    expect(GPS_ITEMS.filter((it) => types.includes(it.type) && !it.topic).map((it) => it.id)).toEqual([]);
  });
});

describe('Oak National Academy imports', () => {
  const oak = GPS_ITEMS.filter((it) => it.source?.paper === 'Oak National Academy');

  it('are in the topics file, with the lesson and its year group as the source', () => {
    expect(oak.length).toBeGreaterThanOrEqual(150);
    expect(topicsFile).toBeDefined();
    const inFile = new Set(topicsFile!.map((it) => it.id));
    for (const it of oak) {
      expect(inFile.has(it.id), `${it.id} is in gps-items-topics.json`).toBe(true);
      expect(it.source!.question, `${it.id} names its lesson`).toMatch(/^[a-z0-9-]+$/);
      expect([3, 4, 5, 6], `${it.id} year group`).toContain(it.source!.year);
      expect(it.topic, `${it.id} has a topic`).toBeDefined();
      expect(it.explain?.trim(), `${it.id} keeps the hint as its explanation`).toBeTruthy();
    }
  });

  it('never point at a picture or at "this lesson"', () => {
    const bad = oak.filter((it) => /\[image\]|\bthis lesson\b/i.test(JSON.stringify(it)));
    expect(bad.map((it) => it.id)).toEqual([]);
  });

  it('cover modals, voice, determiners, prepositions, conjunctions and every tense', () => {
    const covered = new Set(oak.map((it) => it.topic));
    for (const topic of GRAMMAR_TOPIC_IDS) if (topic !== 'subjunctive') expect(covered, topic).toContain(topic);
  });
});

describe('ready-made items across every file', () => {
  it('have unique ids across every gps-items file', () => {
    const ids = Object.values(files).flatMap((mod) => (mod.default as GpsItem[]).map((it) => it.id));
    expect(ids.length).toBe(GPS_ITEMS.length);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});

describe('annotated sentences for the tenses', () => {
  it.each(TENSES.map((t) => [t] as const))('%s has at least 16 sentences of its own at every level', (tense) => {
    for (const level of [1, 2, 3] as Level[]) {
      const own = sentencesFor(level)['g-tense'].filter((s) => s.tense === tense);
      expect(own.length, `level ${level}`).toBeGreaterThanOrEqual(SENTENCES_PER_LEVEL);
    }
  });

  it('has at least 16 passive sentences at every level', () => {
    for (const level of [1, 2, 3] as Level[]) expect(sentencesFor(level)['g-voice'].length, `level ${level}`).toBeGreaterThanOrEqual(SENTENCES_PER_LEVEL);
  });

  it('gives every sentence in the tenses file a tense, a voice and a subject', () => {
    const tenses = SENTENCES.filter((s) => Number(s.id.slice(2)) >= 438);
    expect(tenses.length).toBeGreaterThanOrEqual(100);
    for (const s of tenses) {
      expect(TENSES, s.id).toContain(s.tense);
      expect(['active', 'passive'], s.id).toContain(s.voice);
      expect(s.subject, s.id).toBeDefined();
    }
  });
});
