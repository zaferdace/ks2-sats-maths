import { add, cmp, isInt, mul, rat, sub, type Rational } from '../../math/rational';
import { carries, dec, gcd, intNoTrailingZero, num, op, pct, retry, scaled } from '../build';
import type { Generated, Part, QuestionType } from '../types';

const decQ = (parts: Part[], answer: Rational): Generated => ({
  parts,
  answer,
  kind: isInt(answer) ? 'int' : 'dec',
});

export const decAdd: QuestionType = {
  id: 'dec-add',
  label: 'Adding decimals',
  topic: 'decimals',
  generate(rng, d) {
    let a: Rational;
    let b: Rational;
    if (d === 1) {
      a = scaled(intNoTrailingZero(rng, 11, 99), 1);
      b = scaled(intNoTrailingZero(rng, 11, 99), 1);
    } else if (d === 2) {
      a = scaled(intNoTrailingZero(rng, 11, 99), 1);
      b = scaled(intNoTrailingZero(rng, 101, 999), 2);
    } else {
      // 2 dp + 1 dp with at least one carry: 67.81 + 64.7
      [a, b] = retry<[Rational, Rational]>(() => {
        const hundredths = intNoTrailingZero(rng, 1001, 9999);
        const tenths = intNoTrailingZero(rng, 11, 999);
        return carries(hundredths, tenths * 10) > 0 ? [scaled(hundredths, 2), scaled(tenths, 1)] : undefined;
      });
    }
    if (rng.chance(0.5)) [a, b] = [b, a];
    return decQ([dec(a), op('+'), dec(b)], add(a, b));
  },
};

export const decSub: QuestionType = {
  id: 'dec-sub',
  label: 'Subtracting decimals',
  topic: 'decimals',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const a = intNoTrailingZero(rng, 21, 99);
        const b = intNoTrailingZero(rng, 11, a - 1);
        return decQ([dec(scaled(a, 1)), op('-'), dec(scaled(b, 1))], scaled(a - b, 1));
      }
      if (d === 2) {
        const w = rng.int(2, 20);
        const b = scaled(intNoTrailingZero(rng, 101, w * 100 - 1), 2);
        return decQ([num(w), op('-'), dec(b)], sub(rat(w), b));
      }
      const a = scaled(intNoTrailingZero(rng, 101, 999), 1);
      const b = scaled(intNoTrailingZero(rng, 101, 9999), 2);
      if (cmp(b, a) >= 0) return undefined;
      return decQ([dec(a), op('-'), dec(b)], sub(a, b));
    });
  },
};

export const decMul: QuestionType = {
  id: 'dec-mul',
  label: 'Multiplying decimals',
  topic: 'decimals',
  generate(rng, d) {
    let a: Rational;
    let k: number;
    if (d === 1) {
      // 1 dp × 1-digit, more than 1: 0.4 × 7 (not 0.1 × 2)
      [a, k] = retry<[Rational, number]>(() => {
        const x = scaled(intNoTrailingZero(rng, 1, 99), 1);
        const y = rng.int(2, 9);
        return cmp(mul(x, rat(y)), rat(1)) > 0 ? [x, y] : undefined;
      });
    } else if (d === 2) {
      // 1 dp × a multiple of 10: 2.4 × 90
      a = scaled(intNoTrailingZero(rng, 11, 99), 1);
      k = 10 * rng.int(2, 9);
    } else if (rng.chance(0.5)) {
      a = scaled(intNoTrailingZero(rng, 101, 999), 2);
      k = rng.int(3, 9);
    } else {
      // 1 dp × a 2-digit number that is not a multiple of 10 (those are the medium level)
      a = scaled(intNoTrailingZero(rng, 11, 99), 1);
      k = intNoTrailingZero(rng, 12, 49);
    }
    const parts = rng.chance(0.75) ? [dec(a), op('×'), num(k)] : [num(k), op('×'), dec(a)];
    return decQ(parts, mul(a, rat(k)));
  },
};

export const decDiv: QuestionType = {
  id: 'dec-div',
  label: 'Dividing decimals',
  topic: 'decimals',
  generate(rng, d) {
    let q: Rational;
    let k: number;
    if (d === 1) {
      // 1 dp ÷ 1-digit, more than 1: 7.2 ÷ 4 (not 1 ÷ 2, which divides a whole number, or 0.3 ÷ 3)
      [q, k] = retry<[Rational, number]>(() => {
        const answer = scaled(intNoTrailingZero(rng, 1, 99), 1);
        const divisor = rng.int(2, 9);
        const dividend = mul(answer, rat(divisor));
        return isInt(dividend) || cmp(dividend, rat(1)) < 0 ? undefined : [answer, divisor];
      });
    } else if (d === 2) {
      q = scaled(intNoTrailingZero(rng, 1, 999), 2);
      k = rng.int(2, 9);
    } else {
      q = scaled(intNoTrailingZero(rng, 101, 2999), 2);
      k = rng.int(3, 9);
    }
    return decQ([dec(mul(q, rat(k))), op('÷'), num(k)], q);
  },
};

const PERCENTS: Record<1 | 2 | 3, number[]> = {
  1: [10, 25, 50],
  2: [1, 4, 5, 20, 75],
  3: [12, 15, 35, 45, 60],
};

/** Multiples of 10%, worked out from 10% (30% of 320): 40% of the medium level. */
const TENS = [30, 40, 70, 80, 90];

export const pctOf: QuestionType = {
  id: 'pct-of',
  label: 'Percentages of amounts',
  topic: 'percentages',
  generate(rng, d) {
    const p = d === 2 && rng.chance(0.4) ? rng.pick(TENS) : rng.pick(PERCENTS[d]);
    const step = 100 / gcd(p, 100); // amounts that give a whole-number answer
    // Never x% of 100, and 1% of at least 1,000: the question should not give the answer away.
    const [lo, hi] = d === 1 ? [40, 900] : d === 2 ? [p === 1 ? 1000 : 200, 2000] : [200, 5000];
    return retry<Generated>(() => {
      const amount = step * rng.int(Math.ceil(lo / step), Math.floor(hi / step));
      if (amount === 100) return undefined;
      return { parts: [pct(p), op('of'), num(amount)], answer: rat((p * amount) / 100), kind: 'int' };
    });
  },
};
