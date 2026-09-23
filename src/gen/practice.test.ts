import { describe, expect, it } from 'vitest';
import { ALL_TYPES } from './catalog';
import { buildMathsPractice } from './practice';

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
});
