import { describe, expect, it } from 'vitest';
import type { InputSpec, ItemQuestion } from '../gen/types';
import { emptyAnswer, formatCorrect, formatInput, isBlank, markFor, normText, typeLetter, withMarks } from './answer';

const item = (input: InputSpec, answer: string, marks = 1): ItemQuestion => ({
  format: 'english',
  typeId: 'g-commas',
  difficulty: 2,
  marks,
  body: [],
  input,
  answer,
});

describe('typed English answers', () => {
  const q = item({ kind: 'text' }, "didn't|did not");

  it('ignore case, extra spaces, curly apostrophes and a final full stop', () => {
    expect(normText('  Didn’t.  ')).toBe("didn't");
    expect(markFor(q, { ...emptyAnswer(), text: 'DIDN’T' })).toBe(1);
    expect(markFor(q, { ...emptyAnswer(), text: 'did  not' })).toBe(1);
    expect(markFor(q, { ...emptyAnswer(), text: 'didnt' })).toBe(0);
    expect(markFor(q, { ...emptyAnswer(), text: ' ' })).toBe(0);
  });

  it('ignore quotation marks around the whole answer, but not an apostrophe', () => {
    expect(normText("'fine'")).toBe('fine');
    expect(normText('“Fine.”')).toBe('fine');
    expect(normText("'fine.'")).toBe('fine');
    expect(normText("James'")).toBe("james'");
    expect(normText("'twas")).toBe("'twas");
  });

  it('ignore a leading article on a phrase', () => {
    const tape = item({ kind: 'text' }, 'a roll of blue tape|tape');
    expect(markFor(tape, { ...emptyAnswer(), text: 'roll of blue tape' })).toBe(1);
    expect(markFor(tape, { ...emptyAnswer(), text: 'the tape' })).toBe(1);
    const the = item({ kind: 'text' }, 'the');
    expect(markFor(the, { ...emptyAnswer(), text: 'the' })).toBe(1);
    expect(markFor(the, { ...emptyAnswer(), text: 'a' })).toBe(0);
  });

  it('come from the letter keyboard', () => {
    expect(typeLetter('', 'A')).toBe('a');
    expect(typeLetter('don', "'")).toBe("don'");
    expect(typeLetter('co', '-')).toBe('co-');
    expect(typeLetter('ab', '7')).toBe('ab');
    expect(typeLetter('', 'space')).toBe('');
    expect(typeLetter('a', 'space')).toBe('a ');
    expect(typeLetter('a ', 'space')).toBe('a ');
    expect(typeLetter('abc', 'back')).toBe('ab');
    expect(typeLetter('abc', 'clear')).toBe('');
    expect(typeLetter('x'.repeat(40), 'y')).toHaveLength(40);
  });
});

describe('tapped answers', () => {
  it('need exactly the right words or gaps, in any order', () => {
    const words = item({ kind: 'words', tokens: ['She', 'ran', 'quickly', 'home', '.'], pick: 1 }, '2');
    expect(markFor(words, { ...emptyAnswer(), sel: [2] })).toBe(1);
    expect(markFor(words, { ...emptyAnswer(), sel: [1] })).toBe(0);
    const gaps = item({ kind: 'gap', tokens: ['I', 'bought', 'eggs', 'milk', 'and', 'bread', '.'], mark: ',' }, '2');
    expect(markFor(gaps, { ...emptyAnswer(), sel: [2] })).toBe(1);
    expect(markFor(gaps, { ...emptyAnswer(), sel: [2, 3] })).toBe(0);
    expect(formatCorrect(gaps)).toBe('I bought eggs, milk and bread.');
    const two = item({ kind: 'choice', options: ['a', 'b', 'c', 'd'], pick: 2 }, '1,3');
    expect(markFor(two, { ...emptyAnswer(), sel: [3, 1] })).toBe(1);
  });

  it('show punctuation marks in the right places', () => {
    expect(withMarks(['Ben', 'my', 'friend', 'is', 'here', '.'], [0, 2], ',')).toBe('Ben, my friend, is here.');
  });
});

describe('true or false', () => {
  const q = item({ kind: 'tf', statements: ['one', 'two', 'three'] }, '1,0,1');
  it('scores only when every row is right', () => {
    expect(markFor(q, { ...emptyAnswer(), tf: [true, false, true] })).toBe(1);
    expect(markFor(q, { ...emptyAnswer(), tf: [true, false, null] })).toBe(0);
    expect(formatInput({ ...emptyAnswer(), tf: [true, null, false] }, q)).toBe('true, ?, false');
  });
});

describe('written answers marked by the pupil', () => {
  const q = item({ kind: 'self', model: 'Because…', points: ['one', 'two'] }, '', 2);
  it('score the marks given, up to the question marks', () => {
    expect(markFor(q, { ...emptyAnswer(), text: 'my answer', checked: true, self: 1 })).toBe(1);
    expect(markFor(q, { ...emptyAnswer(), checked: true, self: 5 })).toBe(2);
    expect(markFor(q, { ...emptyAnswer(), text: 'my answer' })).toBe(0);
  });
  it('count as blank until something is written or marked', () => {
    expect(isBlank({ ...emptyAnswer(), checked: true })).toBe(true);
    expect(isBlank({ ...emptyAnswer(), checked: true, self: 0 })).toBe(false);
    expect(isBlank({ ...emptyAnswer(), text: 'x' })).toBe(false);
  });
});
