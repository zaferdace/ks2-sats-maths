import { describe, expect, it } from 'vitest';
import { SENTENCES } from '../bank';
import { grammarTopic } from '../topics';
import { buildGpsPractice } from './paper';

const empty = new Map();
const sentence = (id: string | undefined) => SENTENCES.find((s) => s.id === id);

describe('a grammar topic practice', () => {
  it('asks tense questions only in the topic\'s tenses', () => {
    for (const id of ['present-perfect', 'past-progressive', 'simple-past'] as const) {
      const topic = grammarTopic(id)!;
      for (let n = 0; n < 20; n++) {
        const qs = buildGpsPractice(`T${id}${n}`, ['g-tense'], 'mixed', empty, 10, id);
        expect(qs.length).toBeGreaterThan(0);
        for (const q of qs) {
          expect(q.typeId).toBe('g-tense');
          expect(topic.tenses).toContain(sentence(q.sourceId)?.tense);
        }
      }
    }
  });

  it('asks find-the-word questions only about the topic\'s word class', () => {
    for (const [id, label] of [
      ['determiners', 'determiner'],
      ['prepositions', 'preposition'],
      ['conjunctions', 'conjunction'],
    ] as const) {
      const qs = buildGpsPractice(`W${id}`, ['g-find-word'], 'mixed', empty, 10, id);
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) {
        const text = q.body[0].b === 'text' ? q.body[0].text : '';
        expect(text).toMatch(new RegExp(`${label}s? in this sentence`));
      }
    }
  });

  it('drops a type with nothing for the topic and fills the set from the others', () => {
    // Nothing is tagged for a made-up combination, so only the generated tense questions remain.
    const qs = buildGpsPractice('D1', ['g-verb-forms', 'g-tense'], 'mixed', empty, 10, 'past-perfect');
    expect(qs.length).toBe(10);
    expect(qs.every((q) => q.typeId === 'g-tense' || sentence(q.sourceId) === undefined)).toBe(true);
  });

  it('never repeats a sentence or item within one set', () => {
    const qs = buildGpsPractice('R1', ['g-tense', 'g-find-word'], 'mixed', empty, 10, 'simple-present');
    const ids = qs.map((q) => q.sourceId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
