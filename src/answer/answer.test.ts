import { describe, expect, it } from 'vitest';
import type { Question } from '../gen/types';
import { rat } from '../math/rational';
import { formatInput, formNote, hoursComplete, incompleteFraction, isCorrect, parseAnswer, typeKey, typeTimeKey, type AnswerInput } from './answer';

const a = (whole: string, num = '', den = ''): AnswerInput => ({ whole, num, den });
const q = (answer: string, kind: Question['kind'] = 'frac'): Question => ({
  typeId: 'x',
  difficulty: 1,
  parts: [],
  answer,
  kind,
});

describe('parseAnswer', () => {
  it('reads whole numbers, decimals, fractions and mixed numbers', () => {
    expect(parseAnswer(a('1635'))).toEqual(rat(1635));
    expect(parseAnswer(a('0.006'))).toEqual(rat(6, 1000));
    expect(parseAnswer(a('.5'))).toEqual(rat(1, 2));
    expect(parseAnswer(a('', '6', '8'))).toEqual(rat(3, 4));
    expect(parseAnswer(a('2', '1', '4'))).toEqual(rat(9, 4));
  });

  it('returns null for empty or malformed input', () => {
    expect(parseAnswer(null)).toBeNull();
    expect(parseAnswer(a(''))).toBeNull();
    expect(parseAnswer(a('', '3', ''))).toBeNull();
    expect(parseAnswer(a('', '3', '0'))).toBeNull();
    expect(parseAnswer(a('1.5', '1', '2'))).toBeNull();
    expect(parseAnswer(a('.'))).toBeNull();
  });
});

describe('isCorrect', () => {
  it('accepts every equivalent form', () => {
    const threeQuarters = q('3/4');
    expect(isCorrect(threeQuarters, a('', '3', '4'))).toBe(true);
    expect(isCorrect(threeQuarters, a('', '6', '8'))).toBe(true);
    expect(isCorrect(threeQuarters, a('0.75'))).toBe(true);
    expect(isCorrect(threeQuarters, a('', '4', '3'))).toBe(false);
    const nineEighths = q('9/8');
    expect(isCorrect(nineEighths, a('1', '1', '8'))).toBe(true);
    expect(isCorrect(nineEighths, a('', '9', '8'))).toBe(true);
    expect(isCorrect(nineEighths, a('1.125'))).toBe(true);
    expect(isCorrect(q('56/1', 'int'), a('56.0'))).toBe(true);
    expect(isCorrect(q('56/1', 'int'), null)).toBe(false);
  });
});

describe('the real test\'s forms', () => {
  it('a mixed number needs a proper fraction part; an improper fraction on its own is fine', () => {
    const sevenAndAnEighth = q('57/8');
    expect(isCorrect(sevenAndAnEighth, a('7', '1', '8'))).toBe(true);
    expect(isCorrect(sevenAndAnEighth, a('', '57', '8'))).toBe(true);
    expect(isCorrect(sevenAndAnEighth, a('7.125'))).toBe(true);
    expect(isCorrect(sevenAndAnEighth, a('6', '9', '8'))).toBe(false);
    expect(isCorrect(q('5/2'), a('1', '6', '4'))).toBe(false);
    expect(formNote(sevenAndAnEighth, a('6', '9', '8'))).toMatch(/less than 1/);
    expect(formNote(sevenAndAnEighth, a('7', '1', '8'))).toBeNull();
  });

  it('spots a fraction with a missing top or bottom number', () => {
    expect(incompleteFraction(a('', '3', ''))).toBe(true);
    expect(incompleteFraction(a('', '', '4'))).toBe(true);
    expect(incompleteFraction(a('2', '3', '4'))).toBe(false);
    expect(incompleteFraction(a('3'))).toBe(false);
  });
});

describe('typing times', () => {
  it('keeps a leading zero and knows when the hours are complete', () => {
    let h = '';
    for (const k of ['0', '8']) h = typeTimeKey(h, k);
    expect(h).toBe('08');
    expect(typeTimeKey('08', '5')).toBe('08');
    expect(hoursComplete('08')).toBe(true);
    expect(hoursComplete('0')).toBe(false);
    expect(hoursComplete('1')).toBe(false);
    expect(hoursComplete('2')).toBe(false);
    expect(hoursComplete('8')).toBe(true);
  });
});

describe('typeKey', () => {
  it('builds numbers from keypad presses', () => {
    let v = '';
    for (const k of ['0', '.', '0', '6']) v = typeKey(v, k, 'whole');
    expect(v).toBe('0.06');
    expect(typeKey('12', '.', 'whole')).toBe('12.');
    expect(typeKey('1.2', '.', 'whole')).toBe('1.2');
    expect(typeKey('', '.', 'whole')).toBe('0.');
    expect(typeKey('3', '.', 'num')).toBe('3');
    expect(typeKey('0', '7', 'whole')).toBe('7');
    expect(typeKey('123', 'back', 'whole')).toBe('12');
    expect(typeKey('123', 'clear', 'whole')).toBe('');
    expect(typeKey('1234', '5', 'den')).toBe('1234');
  });

  it('formats typed answers for display', () => {
    expect(formatInput(a('1635'))).toBe('1,635');
    expect(formatInput(a('2', '3', '4'))).toBe('2 3/4');
    expect(formatInput(a('', '5', ''))).toBe('5/?');
    expect(formatInput(null)).toBe('');
  });
});
