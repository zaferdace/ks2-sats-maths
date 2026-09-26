import { describe, expect, it } from 'vitest';
import { article, withArticle, wordingProblems } from './wording';

describe('article', () => {
  it('follows the sound, not just the letter', () => {
    expect(['adjective', 'adverb', 'exclamation', 'equilateral triangle', 'octagon', 'hour', 'honest answer', 'umbrella', 'uninvited guest'].map(article)).toEqual(
      Array(9).fill('an'),
    );
    expect(['noun', 'square', 'regular hexagon', 'unit', 'unicorn', 'useful tool', 'European city', 'one-off', 'house'].map(article)).toEqual(Array(9).fill('a'));
    expect(withArticle('**equilateral triangle**')).toBe('an **equilateral triangle**');
  });
});

describe('wordingProblems', () => {
  it('finds wrong articles and plurals after 1', () => {
    expect(wordingProblems('"quickly" is a adverb in this sentence.')).toEqual(['"a adverb"']);
    expect(wordingProblems('It is a exclamation.')).toEqual(['"a exclamation"']);
    expect(wordingProblems('What is the size of **each** angle inside a **equilateral triangle**?')).toEqual(['"a **equilateral"']);
    expect(wordingProblems('An cube has six faces.')).toEqual(['"An cube"']);
    expect(wordingProblems('A jug holds **1 litres** of juice.')).toEqual(['"1 litres"']);
    expect(wordingProblems('It lasts **2 hours 1 minutes**.')).toEqual(['"1 minutes"']);
  });

  it('leaves correct text, labels and algebra alone', () => {
    const fine = [
      'It is an exclamation.',
      'A film starts at **18:05**. It lasts **1 hour 5 minutes**.',
      'A jug holds **1 litre** of juice. Sam pours out **0.1 litres** and **11 litres**.',
      '**A**, **B** and **C** are marked. Bus A arrives before Bus B.',
      'The two angles marked **a** are equal. Calculate angle **a**.',
      '**a = 3b**\n**a + b = 12**\nWhat are the values of **a** and **b**?',
      'A model car is made to a scale of **1 : 20**. Pattern 1 uses **4** matchsticks.',
      'Tom pays with three £1 coins and an 8p stamp.',
    ];
    expect(fine.flatMap(wordingProblems)).toEqual([]);
  });
});
