// Checks on the real past-paper questions in content/gps-items-past-papers.json.
import { describe, expect, it } from 'vitest';
import items from './content/gps-items-past-papers.json';
import { GRAMMAR_TOPICS } from './topics';
import { type GpsItem } from './types';

const all = items as GpsItem[];

describe('past-paper GPS items', () => {
  it('has at least 60 items', () => {
    expect(all.length).toBeGreaterThanOrEqual(60);
  });

  it('every item names its paper, with a year from 2016 to 2026 and a question number', () => {
    const bad = all.filter((it) => {
      const s = it.source;
      return !s || s.paper !== 'KS2 GPS Paper 1' || !s.year || s.year < 2016 || s.year > 2026 || !s.question?.trim();
    });
    expect(bad.map((it) => it.id)).toEqual([]);
  });

  it('ids are unique and look like gi-past-<year>-<question><part>', () => {
    const ids = all.map((it) => it.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const wrong = all.filter((it) => {
      const m = /^gi-past-(\d{4})-(\d{3})([a-z]?)$/.exec(it.id);
      return !m || Number(m[1]) !== it.source?.year || Number(m[2]) !== parseInt(it.source?.question ?? '', 10);
    });
    expect(wrong.map((it) => it.id)).toEqual([]);
  });

  it('every item with a topic has a type that topic practises', () => {
    const byTopic = new Map(GRAMMAR_TOPICS.map((t) => [t.id, t.typeIds]));
    const wrong = all.filter((it) => it.topic && !byTopic.get(it.topic)?.includes(it.type));
    expect(wrong.map((it) => `${it.id}: ${it.type} is not a ${it.topic} type`)).toEqual([]);
  });
});
