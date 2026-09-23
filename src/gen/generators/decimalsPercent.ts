import { add, cmp, isInt, mul, rat, sub, type Rational } from '../../math/rational';
import { dec, gcd, intNoTrailingZero, num, op, pct, retry, scaled } from '../build';
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
      a = scaled(intNoTrailingZero(rng, 1001, 9999), 2);
      b = scaled(intNoTrailingZero(rng, 11, 999), 1);
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
      a = scaled(intNoTrailingZero(rng, 1, 99), 1);
      k = rng.int(2, 9);
    } else if (d === 2) {
      a = scaled(intNoTrailingZero(rng, 11, 99), 1);
      k = rng.chance(0.6) ? 10 * rng.int(2, 9) : rng.int(11, 19);
    } else if (rng.chance(0.5)) {
      a = scaled(intNoTrailingZero(rng, 101, 999), 2);
      k = rng.int(3, 9);
    } else {
      a = scaled(intNoTrailingZero(rng, 11, 99), 1);
      k = rng.int(12, 49);
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
      q = scaled(intNoTrailingZero(rng, 1, 99), 1);
      k = rng.int(2, 9);
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

export const pctOf: QuestionType = {
  id: 'pct-of',
  label: 'Percentages of amounts',
  topic: 'percentages',
  generate(rng, d) {
    const p = rng.pick(PERCENTS[d]);
    const step = 100 / gcd(p, 100); // amounts that give a whole-number answer
    const [lo, hi] = d === 1 ? [20, 900] : d === 2 ? [100, 2000] : [100, 5000];
    const amount = step * rng.int(Math.ceil(lo / step), Math.floor(hi / step));
    return { parts: [pct(p), op('of'), num(amount)], answer: rat((p * amount) / 100), kind: 'int' };
  },
};
