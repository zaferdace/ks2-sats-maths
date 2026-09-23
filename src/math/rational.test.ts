import { describe, expect, it } from 'vitest';
import {
  add,
  cmp,
  decimalPlaces,
  div,
  eq,
  fromDecimalString,
  mul,
  rat,
  ratFromString,
  ratToString,
  sub,
  toDecimalString,
  toMixed,
} from './rational';

describe('rational', () => {
  it('normalises sign and common factors', () => {
    expect(rat(6, 8)).toEqual({ n: 3, d: 4 });
    expect(rat(3, -9)).toEqual({ n: -1, d: 3 });
    expect(rat(0, 7)).toEqual({ n: 0, d: 1 });
  });

  it('rejects zero denominators and non-integers', () => {
    expect(() => rat(1, 0)).toThrow();
    expect(() => rat(0.5, 2)).toThrow();
  });

  it('does exact arithmetic', () => {
    expect(add(rat(1, 3), rat(1, 6))).toEqual(rat(1, 2));
    expect(sub(rat(3, 4), rat(3, 8))).toEqual(rat(3, 8));
    expect(mul(rat(3, 4), rat(2, 5))).toEqual(rat(3, 10));
    expect(div(rat(3, 5), rat(4))).toEqual(rat(3, 20));
    expect(() => div(rat(1), rat(0))).toThrow();
  });

  it('compares values', () => {
    expect(eq(rat(3, 4), rat(6, 8))).toBe(true);
    expect(cmp(rat(1, 3), rat(1, 2))).toBe(-1);
    expect(cmp(rat(2, 3), rat(4, 6))).toBe(0);
  });

  it('converts decimals both ways without floating-point error', () => {
    expect(fromDecimalString('0.06')).toEqual(rat(3, 50));
    expect(fromDecimalString('.5')).toEqual(rat(1, 2));
    expect(fromDecimalString('5.')).toEqual(rat(5));
    expect(fromDecimalString('-2.25')).toEqual(rat(-9, 4));
    expect(() => fromDecimalString('.')).toThrow();
    expect(() => fromDecimalString('1.2.3')).toThrow();
    expect(toDecimalString(div(rat(6, 100), rat(10)))).toBe('0.006');
    expect(toDecimalString(add(fromDecimalString('0.1'), fromDecimalString('0.2')))).toBe('0.3');
    expect(toDecimalString(rat(1635))).toBe('1635');
    expect(toDecimalString(rat(-5, 2))).toBe('-2.5');
    expect(toDecimalString(rat(1, 3))).toBeNull();
    expect(decimalPlaces(rat(7, 40))).toBe(3);
  });

  it('splits mixed numbers and round-trips strings', () => {
    expect(toMixed(rat(9, 8))).toEqual({ w: 1, n: 1, d: 8 });
    expect(toMixed(rat(3, 4))).toEqual({ w: 0, n: 3, d: 4 });
    expect(ratFromString(ratToString(rat(-7, 3)))).toEqual(rat(-7, 3));
  });
});
