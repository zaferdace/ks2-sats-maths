// Small helpers shared by the question generators.
import { rat, toDecimalString, type Rational } from '../math/rational';
import type { Rng } from './rng';
import type { Difficulty, Op, Part } from './types';

export const num = (v: number): Part => {
  if (!Number.isSafeInteger(v) || v < 0) throw new Error(`num() needs a non-negative integer, got ${v}`);
  return { t: 'num', v: String(v) };
};

export const dec = (r: Rational): Part => {
  const s = toDecimalString(r);
  if (s === null || r.n < 0) throw new Error(`dec() needs a non-negative terminating decimal, got ${r.n}/${r.d}`);
  return { t: 'num', v: s };
};

export const op = (v: Op): Part => ({ t: 'op', v });
export const frac = (n: number, d: number, w = 0): Part => (w ? { t: 'frac', n, d, w } : { t: 'frac', n, d });
export const pow = (b: number, e: 2 | 3): Part => ({ t: 'pow', b, e });
export const pct = (v: number): Part => ({ t: 'pct', v: String(v) });
export const box = (): Part => ({ t: 'box' });

/** [a, b, c] joined by one operator: a + b + c. */
export function chain(operands: Part[], o: Op): Part[] {
  return operands.flatMap((p, i) => (i === 0 ? [p] : [op(o), p]));
}

/** True when a prompt starts with its answer box: □ = 6 × 70. */
export const isBoxFirst = (parts: Part[]): boolean =>
  parts.length > 2 && parts[0].t === 'box' && parts[1].t === 'op' && parts[1].v === '=';

/**
 * Real papers print some calculations with the answer box first (□ = 7,000 − 3, □ = 6 × 70).
 * Easy and medium +, −, × and ÷ items do so about a quarter of the time. Call it once the numbers
 * are chosen: the choice is the last random draw, so it never changes the numbers.
 */
export function sometimesBoxFirst(rng: Rng, d: Difficulty, parts: Part[]): Part[] {
  return d <= 2 && rng.chance(0.25) ? [box(), op('='), ...parts] : parts;
}

/** Value of a (possibly mixed) fraction w n/d. */
export const fracValue = (n: number, d: number, w = 0): Rational => rat(w * d + n, d);

/** Decimal from a scaled integer: scaled(347, 2) = 3.47. */
export const scaled = (v: number, dp: number): Rational => rat(v, 10 ** dp);

/** Random integer with exactly `len` digits. */
export const nDigits = (rng: Rng, len: number): number => rng.int(10 ** (len - 1), 10 ** len - 1);

/** Digits, most significant first. */
export const digitsOf = (v: number): number[] => String(v).split('').map(Number);

/** Runs `fn` until it returns a value; generators use it to satisfy constraints by rejection. */
export function retry<T>(fn: () => T | undefined, tries = 500): T {
  for (let i = 0; i < tries; i++) {
    const v = fn();
    if (v !== undefined) return v;
  }
  throw new Error('Generator could not satisfy its constraints');
}

/** Random integer in [min, max] that does not end in 0, so a scaled decimal keeps every place. */
export const intNoTrailingZero = (rng: Rng, min: number, max: number): number =>
  retry(() => {
    const v = rng.int(min, max);
    return v % 10 === 0 ? undefined : v;
  });

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a);
}

export const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

/** Number of carries in the column addition a + b. */
export function carries(a: number, b: number): number {
  let count = 0;
  let carry = 0;
  while (a > 0 || b > 0) {
    carry = (a % 10) + (b % 10) + carry >= 10 ? 1 : 0;
    count += carry;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return count;
}

/** Number of exchanges in the column subtraction a − b (a ≥ b). */
export function exchanges(a: number, b: number): number {
  let count = 0;
  let borrow = 0;
  while (a > 0 || b > 0) {
    const top = (a % 10) - borrow;
    borrow = top < b % 10 ? 1 : 0;
    count += borrow;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return count;
}
