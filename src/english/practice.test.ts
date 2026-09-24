// Every English topic in "Practise a topic" must give a full set at every level.
import { describe, expect, it } from 'vitest';
import { ENGLISH_TYPES } from './catalog';
import { buildGpsPractice } from './gps/paper';
import type { History } from './history';
import { buildSpellingTest } from './spelling';
import { SPELLING_GROUPS } from './types';

const empty: History = new Map();
const LEVELS = [1, 2, 3, 'mixed'] as const;

describe('English topic practice', () => {
  it('gives ten questions for every GPS question type at every level', () => {
    const short: string[] = [];
    for (const t of ENGLISH_TYPES.filter((x) => x.paper === 'gps')) {
      for (const level of LEVELS) {
        const qs = buildGpsPractice(`PR-${t.id}-${level}`, [t.id], level, empty);
        if (qs.length < 10) short.push(`${t.id} at ${level}: ${qs.length}`);
        if (qs.some((q) => q.typeId !== t.id)) short.push(`${t.id} at ${level}: other types mixed in`);
      }
    }
    expect(short).toEqual([]);
  });

  it('gives ten words for every spelling group at every level', () => {
    const short: string[] = [];
    for (const group of Object.keys(SPELLING_GROUPS)) {
      for (const level of LEVELS) {
        const qs = buildSpellingTest(`SP-${group}-${level}`, level, empty, 10, [group]);
        if (qs.length !== 10) short.push(`${group} at ${level}: ${qs.length}`);
      }
    }
    expect(short).toEqual([]);
  });
});
