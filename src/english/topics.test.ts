import { describe, expect, it } from 'vitest';
import { GPS_ITEMS, SENTENCES } from './bank';
import { GPS_GENERATED_TYPES } from './catalog';
import { GRAMMAR_TOPICS, isTopicId } from './topics';
import { GPS_ITEM_TYPES, GRAMMAR_TOPIC_IDS, TENSES } from './types';

const KNOWN_TYPES = new Set([...Object.keys(GPS_ITEM_TYPES), ...Object.keys(GPS_GENERATED_TYPES)]);

describe('grammar topics', () => {
  it('lists every topic id once, in order', () => {
    expect(GRAMMAR_TOPICS.map((t) => t.id)).toEqual([...GRAMMAR_TOPIC_IDS]);
  });

  it.each(GRAMMAR_TOPICS.map((t) => [t.id, t] as const))('%s is complete', (_id, t) => {
    expect(t.title.trim()).not.toBe('');
    expect(t.blurb.trim()).not.toBe('');
    expect(t.inTheTest.trim()).not.toBe('');
    expect(t.inTheTest).not.toBe('TODO');
    expect(t.learn.length).toBeGreaterThanOrEqual(2);
    for (const block of t.learn) {
      expect(block.heading.trim()).not.toBe('');
      expect(block.text.trim()).not.toBe('');
    }
    for (const id of t.typeIds) expect(KNOWN_TYPES.has(id), `${id} is a question type`).toBe(true);
    for (const tense of t.tenses ?? []) expect(TENSES).toContain(tense);
  });

  it.each(GRAMMAR_TOPICS.map((t) => [t.id, t] as const))('%s has enough to practise', (_id, t) => {
    // Ready-made items tagged with the topic, plus annotated sentences in its tenses.
    const items = GPS_ITEMS.filter((it) => it.topic === t.id).length;
    const sentences = t.tenses ? SENTENCES.filter((s) => s.tense && t.tenses!.includes(s.tense)).length : 0;
    const passive = t.typeIds.includes('g-voice') ? SENTENCES.filter((s) => s.voice === 'passive').length : 0;
    const generated = t.targets ? SENTENCES.length : 0;
    expect(items + sentences + passive + generated, `${t.id}: ${items} items, ${sentences} sentences`).toBeGreaterThanOrEqual(30);
  });

  it('tagged items use known topics', () => {
    for (const it of GPS_ITEMS) if (it.topic !== undefined) expect(isTopicId(it.topic), `${it.id} topic ${it.topic}`).toBe(true);
  });
});
