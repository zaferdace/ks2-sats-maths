// Runs the structural checks on every English content file.
import { describe, expect, it } from 'vitest';
import type { GpsItem, GrammarSentence, ReadingText, SpellingWord } from './types';
import { checkGpsItem, checkReading, checkSentence, checkSpelling } from './validate';

const files = import.meta.glob<{ default: unknown }>('./content/**/*.json', { eager: true });

const of = <T>(pattern: RegExp): { file: string; data: T }[] =>
  Object.entries(files)
    .filter(([file]) => pattern.test(file))
    .map(([file, mod]) => ({ file, data: mod.default as T }));

function report<T extends { id?: string; word?: string }>(label: string, entries: T[], check: (e: T) => string[]): string[] {
  return entries.flatMap((e) => check(e).map((p) => `${label} ${e.id ?? e.word}: ${p}`));
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
});

describe('reading texts', () => {
  const all = of<ReadingText>(/reading\/.*\.json$/).map((f) => f.data);
  it('are well formed', () => {
    expect(report('text', all, checkReading)).toEqual([]);
  });
  it('have unique ids', () => {
    const ids = all.map((t) => t.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});
