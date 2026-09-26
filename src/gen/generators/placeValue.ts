import { isInt, mul, rat, type Rational } from '../../math/rational';
import { box, chain, dec, digitsOf, intNoTrailingZero, nDigits, num, op, retry, scaled } from '../build';
import type { Rng } from '../rng';
import type { Generated, Part, QuestionType } from '../types';

const kindOf = (r: Rational): 'int' | 'dec' => (isInt(r) ? 'int' : 'dec');

/** total = a + □ + c + d with the parts in shuffled order. */
function partition(rng: Rng, total: Rational, values: Rational[]): Generated {
  const order = rng.shuffle(values);
  const missing = rng.int(0, order.length - 1);
  const addends: Part[] = order.map((v, i) => (i === missing ? box() : dec(v)));
  const answer = order[missing];
  return { parts: [dec(total), op('='), ...chain(addends, '+')], answer, kind: kindOf(answer) };
}

export const pvPartition: QuestionType = {
  id: 'pv-partition',
  label: 'Partitioning numbers',
  topic: 'place-value',
  generate(rng, d) {
    if (d === 3) {
      // 36.47 = 30 + □ + 0.4 + 0.07
      const ds = [rng.int(1, 9), rng.int(1, 9), rng.int(1, 9), rng.int(1, 9)];
      const values = [rat(ds[0] * 10), rat(ds[1]), rat(ds[2], 10), rat(ds[3], 100)];
      return partition(rng, scaled(ds[0] * 1000 + ds[1] * 100 + ds[2] * 10 + ds[3], 2), values);
    }
    const len = d === 1 ? 4 : 5;
    const n = retry(() => {
      const v = nDigits(rng, len);
      const zeros = digitsOf(v).filter((x) => x === 0).length;
      return (d === 1 ? zeros === 0 : zeros <= 1) ? v : undefined;
    });
    const digits = digitsOf(n);
    const values = digits
      .map((digit, i) => rat(digit * 10 ** (digits.length - 1 - i)))
      .filter((r) => r.n !== 0);
    return partition(rng, rat(n), values);
  },
};

export const pvAddSubPower: QuestionType = {
  id: 'pv-add-sub-power',
  label: 'Adding and subtracting 10, 100, 1,000',
  topic: 'place-value',
  generate(rng, d) {
    const plus = rng.chance(0.5);
    const len = d === 1 ? 3 : d === 2 ? 4 : rng.pick([5, 6]);
    const powers = d === 1 ? [10, 100] : d === 2 ? [10, 100, 1000] : [1000, 10000];
    return retry(() => {
      const p = rng.pick(powers);
      const ds = digitsOf(nDigits(rng, len));
      const col = ds.length - 1 - Math.round(Math.log10(p)); // index of the digit that changes
      if (d === 1) {
        // No bridging: the changing digit has room.
        if (plus && ds[col] === 9) return undefined;
        if (!plus && ds[col] === 0) return undefined;
        if (!plus && col === 0 && ds[col] === 1) return undefined;
      } else {
        // Bridging: + needs a 9 in that column, − needs a 0 (never the leading digit).
        if (!plus && col === 0) return undefined;
        ds[col] = plus ? 9 : 0;
      }
      const n = Number(ds.join(''));
      const answer = plus ? n + p : n - p;
      if (answer <= 0 || answer >= 1_000_000) return undefined;
      return { parts: [num(n), op(plus ? '+' : '-'), num(p)], answer: rat(answer), kind: 'int' };
    });
  },
};

export const pvMulDiv10: QuestionType = {
  id: 'pv-mul-div-10',
  label: 'Multiplying and dividing by 10, 100, 1,000',
  topic: 'place-value',
  generate(rng, d) {
    if (d === 1) {
      // Whole numbers only: 34 × 1,000 and 5,600 ÷ 100.
      const p = rng.pick([10, 100, 1000]);
      if (rng.chance(0.55)) {
        const a = rng.int(12, 999);
        return { parts: [num(a), op('×'), num(p)], answer: rat(a * p), kind: 'int' };
      }
      const q = rng.int(12, 999);
      return { parts: [num(q * p), op('÷'), num(p)], answer: rat(q), kind: 'int' };
    }
    if (d === 2) {
      const p = rng.pick([10, 100]);
      if (rng.chance(0.5)) {
        const a = intNoTrailingZero(rng, 101, 9999);
        const answer = rat(a, p);
        return { parts: [num(a), op('÷'), num(p)], answer, kind: kindOf(answer) };
      }
      const x = scaled(intNoTrailingZero(rng, 11, 999), rng.pick([1, 2]));
      const answer = mul(x, rat(p));
      return { parts: [dec(x), op('×'), num(p)], answer, kind: kindOf(answer) };
    }
    if (rng.chance(0.65)) {
      // 0.06 ÷ 10 = 0.006: pick a three-place answer first.
      const p = rng.pick([10, 100, 1000]);
      const answer = scaled(intNoTrailingZero(rng, 1, 9999), 3);
      return { parts: [dec(mul(answer, rat(p))), op('÷'), num(p)], answer, kind: 'dec' };
    }
    const x = scaled(intNoTrailingZero(rng, 1, 9999), 3);
    const answer = mul(x, rat(1000));
    return { parts: [dec(x), op('×'), num(1000)], answer, kind: kindOf(answer) };
  },
};
