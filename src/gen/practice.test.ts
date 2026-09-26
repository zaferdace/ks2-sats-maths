import { describe, expect, it } from 'vitest';
import { ALL_TYPES } from './catalog';
import { promptText } from './format';
import { buildMathsPractice } from './practice';
import { REASONING_BLUEPRINT } from './reasoning/blueprint';
import { isItem } from './types';

describe('maths topic practice', () => {
  for (const paper of ['arithmetic', 'reasoning'] as const) {
    it(`builds 10 ${paper} questions of every type, easy to hard`, () => {
      for (const t of ALL_TYPES.filter((x) => x.paper === paper)) {
        const qs = buildMathsPractice(`CODE-${t.id}`, paper, [t.id]);
        expect(qs.length, t.id).toBe(10);
        expect(qs.every((q) => q.typeId === t.id)).toBe(true);
        const d = qs.map((q) => q.difficulty);
        expect(d, t.id).toEqual([...d].sort());
        expect(d[0]).toBe(1);
      }
    });
  }

  it('varies every type in a mixed-topic practice as much as on its own', () => {
    const topics = new Map<string, string[]>();
    for (const t of ALL_TYPES.filter((x) => x.paper === 'arithmetic')) topics.set(t.topic, [...(topics.get(t.topic) ?? []), t.id]);
    for (const ids of topics.values()) {
      if (ids.length < 2) continue;
      const prompts = new Map<string, Map<string, number>>();
      for (let c = 0; c < 400; c++) {
        for (const q of buildMathsPractice(`MIX${c}`, 'arithmetic', ids)) {
          if (isItem(q)) continue;
          const group = `${q.typeId} d${q.difficulty}`;
          const counts = prompts.get(group) ?? new Map<string, number>();
          const p = promptText(q.parts);
          counts.set(p, (counts.get(p) ?? 0) + 1);
          prompts.set(group, counts);
        }
      }
      for (const [group, counts] of prompts) {
        const n = [...counts.values()].reduce((s, v) => s + v, 0);
        if (n < 40) continue;
        const top = Math.max(...counts.values());
        expect(top / n, `${group}: most common prompt share`).toBeLessThan(0.3);
      }
    }
  });

  it('gives reasoning practice the marks the question has in a paper', () => {
    for (let c = 0; c < 30; c++) {
      for (const q of buildMathsPractice(`MARK${c}`, 'reasoning', ['r-pie-chart', 'r-money', 'r-rounding'])) {
        if (!isItem(q)) continue;
        const slot = REASONING_BLUEPRINT.find((s) => s.options.some((o) => o.type === q.typeId && o.d.includes(q.difficulty)));
        if (slot) expect(q.marks, `${q.typeId} d${q.difficulty}`).toBe(slot.marks);
      }
    }
  });
});
