// Comparing fractions, decimals and percentages (<, > and =; true or false), mixed numbers and
// improper fractions, and ordering numbers written in different ways.
import { add, cmp, eq, mul, rat, sub, toDecimalString, type Rational } from '../../math/rational';
import { gcd, retry } from '../build';
import type { Rng } from '../rng';
import type { ReasoningType } from '../types';
import { draft, fmt, NAMES, number, nums, ordering, text } from './helpers';

/** A number as a pupil reads it, with its exact value. */
interface Term {
  text: string;
  value: Rational;
}

const frac = (n: number, d: number): Term => ({ text: `[[${n}/${d}]]`, value: rat(n, d) });
/** A value as a fraction in its simplest form, or a whole number. */
const fracText = (v: Rational): string => (v.d === 1 ? String(v.n) : `[[${v.n}/${v.d}]]`);
const mixed = (w: number, n: number, d: number): Term => ({ text: `[[${w} ${n}/${d}]]`, value: rat(w * d + n, d) });
const dec = (v: Rational): Term => ({ text: fmt(v), value: v });
const pct = (p: number): Term => ({ text: `${p}%`, value: rat(p, 100) });

const terminates = (v: Rational) => toDecimalString(v) !== null;

/** Proper fractions in their simplest form with these denominators. */
const properFractions = (dens: number[]): [number, number][] =>
  dens.flatMap((d) => Array.from({ length: d - 1 }, (_, i) => [i + 1, d] as [number, number]).filter(([n]) => gcd(n, d) === 1));

/** A proper fraction in its simplest form: the denominator first, so twentieths do not crowd out halves. */
const someFraction = (rng: Rng, dens: number[]): [number, number] => rng.pick(properFractions([rng.pick(dens)]));

const SIGNS = ['<', '>', '='];
const signOf = (a: Rational, b: Rational) => SIGNS[[-1, 1, 0].indexOf(cmp(a, b))];

/** The same number written as a decimal (hundredths) or a percentage. */
const hundredths = (rng: Rng, h: number): Term => (rng.chance(0.5) ? dec(rat(h, 100)) : pct(h));

export const compareSigns: ReasoningType = {
  id: 'r-compare-signs',
  label: 'Comparing with <, > and =',
  topic: 'place-value',
  generate(rng, d) {
    const [left, right] = retry((): [Term, Term] | undefined => {
      if (d === 1) {
        const kind = rng.pick(['whole', 'whole', 'decimal', 'decimal', 'zero']);
        if (kind === 'whole') {
          // The same digits with two swapped: 45,302 and 45,320.
          const digits = String(rng.int(10_000, 999_999)).split('');
          const i = rng.int(1, digits.length - 2);
          if (digits[i] === digits[i + 1]) return undefined;
          const swapped = [...digits];
          [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
          return [dec(rat(Number(digits.join('')))), dec(rat(Number(swapped.join(''))))];
        }
        const whole = rng.int(0, 9);
        const a = rng.int(2, 8);
        if (kind === 'zero') {
          // 4.6 and 4.60 are the same number.
          const v = rat(whole * 10 + a, 10);
          return [dec(v), { text: `${fmt(v)}0`, value: v }];
        }
        // One decimal place against two or three: 0.5 and 0.45, 3.7 and 3.07, 0.5 and 0.505.
        const shorter = rat(whole * 10 + a, 10);
        const longer = rng.pick([
          rat(whole * 100 + (a - 1) * 10 + rng.int(1, 9), 100),
          rat(whole * 100 + a * 10 + rng.int(1, 9), 100),
          rat(whole * 100 + a, 100),
          rat(whole * 1000 + a * 100 + rng.int(1, 9), 1000),
          rat(whole * 1000 + (a - 1) * 100 + rng.int(11, 99), 1000),
        ]);
        return [dec(shorter), dec(longer)];
      }
      if (d === 2) {
        // A fraction against a decimal or a percentage close to it, or equal to it.
        const [n, den] = someFraction(rng, [2, 3, 4, 5, 8, 10, 20, 25]);
        const f = frac(n, den);
        if (terminates(f.value) && rng.chance(0.3)) {
          const h = mul(f.value, rat(100));
          return [f, h.d === 1 ? hundredths(rng, h.n) : dec(f.value)];
        }
        const near = Math.round((n * 100) / den) + rng.pick([-10, -5, -2, -1, 1, 2, 5, 10]);
        if (near <= 0 || near >= 100 || eq(rat(near, 100), f.value)) return undefined;
        return [f, hundredths(rng, near)];
      }
      const kind = rng.pick(['of', 'times', 'negative']);
      if (kind === 'of') {
        // 25% of 60 and 2/3 of 24.
        const p = rng.pick([10, 20, 25, 50, 75]);
        const x = rng.int(1, 10) * 20;
        const [n, den] = rng.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5]]);
        const target = (p * x) / 100 + rng.pick([0, 0, -1, 1, -2, 2, 3]);
        if ((target * den) % n !== 0 || target <= 0) return undefined;
        const y = (target * den) / n;
        if (y === x) return undefined;
        return [
          { text: `${p}% of ${fmt(x)}`, value: rat((p * x) / 100) },
          { text: `[[${n}/${den}]] of ${fmt(y)}`, value: rat(target) },
        ];
      }
      if (kind === 'times') {
        // 4 × 0.3 and 0.5 + 0.8.
        const k = rng.int(2, 9);
        const m = rng.int(1, 9);
        const product = rat(k * m, 10);
        const total = add(product, rat(rng.pick([0, 0, -1, 1, -2, 2]), 10));
        const first = rat(rng.int(1, 9), 10);
        const second = sub(total, first);
        if (second.n <= 0 || eq(second, first)) return undefined;
        return [
          { text: `${k} × ${fmt(rat(m, 10))}`, value: product },
          { text: `${fmt(first)} + ${fmt(second)}`, value: total },
        ];
      }
      // Below zero: 3 − 8 and −4.
      const a = rng.int(1, 6);
      const b = rng.int(a + 2, a + 9);
      const other = a - b + rng.pick([-2, -1, 0, 1, 2]);
      if (other >= 0) return undefined;
      return [{ text: `${a} − ${b}`, value: rat(a - b) }, dec(rat(other))];
    });
    const [l, r] = rng.chance(0.5) ? [left, right] : [right, left];
    return draft(
      [text(`Which sign makes this statement correct? Tick one.\n**${l.text}  □  ${r.text}**`)],
      { kind: 'choice', options: [...SIGNS], pick: 1 },
      String(SIGNS.indexOf(signOf(l.value, r.value))),
    );
  },
};

interface Statement {
  text: string;
  truth: boolean;
}

/** "0.25 = 25%", "[[1/4]] = 0.4": equivalent forms, and the usual mix-ups. */
function equivalence(rng: Rng): Statement {
  const [n, den] = rng.pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [1, 20], [1, 8], [3, 8]]);
  const f = frac(n, den);
  const percent = mul(f.value, rat(100));
  const kind = rng.pick(['fraction-decimal', 'fraction-percent', 'decimal-percent'] as const);
  const truth = rng.chance(0.5);
  if (kind === 'decimal-percent') {
    const h = rng.pick([5, 7, 20, 35, 40, 50, 70, 75]);
    // 0.4 = 4%, 0.35 = 3.5% and 0.05 = 50% move the digits the wrong way.
    const shown = truth ? rat(h) : h < 10 ? rat(h * 10) : rat(h, 10);
    return { text: `${fmt(rat(h, 100))} = ${fmt(shown)}%`, truth: eq(shown, rat(h)) };
  }
  if (kind === 'fraction-percent' && percent.d === 1) {
    // [[1/5]] = 15% and [[3/4]] = 34% read the digits instead of the value.
    const slip = Number(`${n}${den}`);
    const shown = truth || slip >= 100 ? percent.n : slip;
    return { text: `${f.text} = ${shown}%`, truth: shown === percent.n };
  }
  // [[1/4]] = 0.4 (the denominator), [[3/4]] = 0.34 (both digits), [[3/5]] = 0.3 (the numerator).
  const wrong = [...(den < 10 ? [`0.${den}`] : []), `0.${n}${den}`, `0.${n}`]
    .map((s) => ({ s, v: rat(Number(s.replace('0.', '')), 10 ** (s.length - 2)) }))
    .filter((w) => !eq(w.v, f.value));
  const shown = truth || !wrong.length ? dec(f.value) : dec(rng.pick(wrong).v);
  return { text: `${f.text} = ${shown.text}`, truth: eq(shown.value, f.value) };
}

/** "[[3/8]] < 0.4", "65% > [[2/3]]": two forms, close in size. */
function comparison(rng: Rng): Statement {
  return retry(() => {
    const [n, den] = rng.pick(properFractions([3, 4, 5, 6, 8, 10, 12]));
    const f = frac(n, den);
    const near = Math.round((n * 100) / den) + rng.pick([-8, -5, -3, -2, 2, 3, 5, 8]);
    if (near <= 0 || near >= 100) return undefined;
    const other = rng.chance(0.3) ? frac(...rng.pick(properFractions([3, 4, 5, 6, 8, 10, 12]))) : hundredths(rng, near);
    if (eq(other.value, f.value)) return undefined;
    const [a, b] = rng.chance(0.5) ? [f, other] : [other, f];
    const sign = rng.pick(['<', '>']);
    return { text: `${a.text} ${sign} ${b.text}`, truth: cmp(a.value, b.value) === (sign === '<' ? -1 : 1) };
  });
}

/** "[[3/4]] of 60 = 45", "1 − 0.35 = 0.75": calculations, right or with a usual slip. */
function calculation(rng: Rng): Statement {
  const truth = rng.chance(0.5);
  const kind = rng.pick(['of', 'percent', 'add', 'subtract', 'times', 'divide'] as const);
  if (kind === 'of') {
    const [n, den] = rng.pick([[2, 3], [3, 4], [2, 5], [3, 5], [5, 8], [3, 10]]);
    const x = den * rng.int(3, 12);
    const right = (x / den) * n;
    // Slips: one part only, or a part too many or too few.
    const shown = truth ? right : rng.pick([x / den, (x / den) * (n + 1), (x / den) * (n - 1)]);
    return { text: `[[${n}/${den}]] of ${x} = ${shown}`, truth: shown === right };
  }
  if (kind === 'percent') {
    const p = rng.pick([10, 20, 25, 50]);
    const x = p === 10 ? rng.int(12, 99) : rng.int(3, 19) * (p === 25 ? 4 : p === 20 ? 5 : 2);
    const right = rat(p * x, 100); // at least 1.2
    // Slips: dividing by the percentage (20% of 30 = 1.5; 10% of 45 = 0.45), or out by one.
    const offByOne = add(right, rat(rng.pick([-1, 1])));
    const shown = truth ? right : p === 50 ? offByOne : rng.pick([rat(x, p === 10 ? 100 : p), offByOne]);
    return { text: `${p}% of ${x} = ${fmt(shown)}`, truth: eq(shown, right) };
  }
  if (kind === 'add') {
    // [[1/2]] + [[1/4]] is not [[2/6]]: denominators are not added.
    const [a, b] = rng.pick([[2, 4], [3, 6], [2, 8], [4, 8], [5, 10], [3, 9]]);
    const right = add(rat(1, a), rat(1, b));
    // Written as the slip gives it, not simplified: [[2/6]].
    const shown = truth ? { text: fracText(right), value: right } : { text: `[[2/${a + b}]]`, value: rat(2, a + b) };
    return { text: `[[1/${a}]] + [[1/${b}]] = ${shown.text}`, truth: eq(shown.value, right) };
  }
  if (kind === 'subtract') {
    const tenths = rng.int(1, 8);
    const hundredthsDigit = rng.int(1, 9);
    const x = rat(tenths * 10 + hundredthsDigit, 100);
    const right = sub(rat(1), x);
    // 1 − 0.35 = 0.75: each digit taken from 10, forgetting the exchange.
    const slip = rat((10 - tenths) * 10 + (10 - hundredthsDigit), 100);
    const shown = truth ? right : slip;
    return { text: `1 − ${fmt(x)} = ${fmt(shown)}`, truth: eq(shown, right) };
  }
  if (kind === 'times') {
    const k = rng.int(3, 9);
    const m = rng.int(2, 9);
    const right = rat(k * m, 10);
    const shown = truth ? right : rat(k * m, 100); // the point moved one place too far
    return { text: `${fmt(rat(m, 10))} × ${k} = ${fmt(shown)}`, truth: eq(shown, right) };
  }
  const [n, den] = rng.pick([[1, 4], [1, 3], [2, 5], [3, 4], [1, 2]]);
  const k = rng.int(2, 4);
  const right = rat(n, den * k);
  const shown = truth ? right : rat(n * k, den); // multiplied instead of divided
  return { text: `[[${n}/${den}]] ÷ ${k} = ${fracText(shown)}`, truth: eq(shown, right) };
}

export const trueFalse: ReasoningType = {
  id: 'r-true-false',
  label: 'True or false: fractions, decimals and percentages',
  topic: 'fractions',
  generate(rng, d) {
    const make = d === 1 ? equivalence : d === 2 ? comparison : calculation;
    const count = rng.int(3, 4);
    const statements = retry(() => {
      const list: Statement[] = [];
      for (let tries = 0; list.length < count && tries < 40; tries++) {
        const s = make(rng);
        if (!list.some((x) => x.text === s.text)) list.push(s);
      }
      return list.length === count && list.some((s) => s.truth) && list.some((s) => !s.truth) ? list : undefined;
    });
    return draft(
      [text('Tick **true** or **false** for each statement.')],
      { kind: 'tf', statements: statements.map((s) => s.text) },
      statements.map((s) => (s.truth ? '1' : '0')).join(','),
    );
  },
};

/** Names of the parts, for "how many quarters are there in [[2 3/4]]?" */
const PARTS: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths', 8: 'eighths', 10: 'tenths' };

const FOOD = [
  { one: 'pizza', many: 'pizzas', slices: [6, 8] },
  { one: 'cake', many: 'cakes', slices: [8, 10, 12] },
  { one: 'pie', many: 'pies', slices: [4, 6] },
];

export const mixedNumbers: ReasoningType = {
  id: 'r-mixed-numbers',
  label: 'Mixed numbers and improper fractions',
  topic: 'fractions',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const den = rng.pick([2, 3, 4, 5, 6, 8]);
        const n = rng.int(1, den - 1);
        const w = rng.int(1, 4);
        if (gcd(n, den) !== 1) return undefined;
        if (rng.chance(0.5)) {
          // Mixed number to improper fraction: as a number of parts, or written as a fraction.
          if (rng.chance(0.5)) {
            return draft(
              [text(`How many **${PARTS[den]}** are there in ${mixed(w, n, den).text}?\n(This is the numerator when ${mixed(w, n, den).text} is written as an improper fraction.)`)],
              number({ suffix: PARTS[den] }),
              nums(w * den + n),
            );
          }
          return draft(
            [text(`Write ${mixed(w, n, den).text} as an **improper fraction**.`)],
            { kind: 'fraction', form: 'improper' },
            nums(rat(w * den + n, den)),
          );
        }
        return draft([text(`Write ${frac(w * den + n, den).text} as a **mixed number**.`)], { kind: 'fraction', form: 'mixed' }, nums(rat(w * den + n, den)));
      }
      if (d === 2) {
        const den = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12]);
        const n = rng.int(1, den - 1);
        const w = rng.int(1, 5);
        if (gcd(n, den) !== 1) return undefined;
        return draft([text(`Write ${frac(w * den + n, den).text} as a **mixed number**.`)], { kind: 'fraction', form: 'mixed' }, nums(rat(w * den + n, den)));
      }
      if (rng.chance(0.5)) {
        const food = rng.pick(FOOD);
        const den = rng.pick(food.slices);
        const left = rng.int(den + 1, 4 * den - 1);
        if (left % den === 0) return undefined;
        return draft(
          [text(`At a party, each ${food.one} is cut into **${den}** equal slices. At the end, **${left}** slices are left.\nHow many ${food.many} is that? Write your answer as a **mixed number**.`)],
          { kind: 'fraction', form: 'mixed' },
          nums(rat(left, den)),
        );
      }
      const [n, den] = rng.pick([[3, 4], [1, 4], [2, 5], [3, 5], [1, 2]]);
      const days = rng.int(3, 9);
      if ((n * days) % den === 0 || n * days < den) return undefined;
      const name = rng.pick(NAMES);
      return draft(
        [text(`${name} drinks [[${n}/${den}]] of a litre of water every day.\nHow many litres does ${name} drink in **${days}** days? Write your answer as a **mixed number**.`)],
        { kind: 'fraction', form: 'mixed' },
        nums(rat(n * days, den)),
      );
    });
  },
};

/** Four different numbers whose sizes differ by at least `gap`. */
function spread(terms: Term[], gap: number): boolean {
  const v = terms.map((t) => t.value.n / t.value.d).sort((a, b) => a - b);
  return v.every((x, i) => i === 0 || x - v[i - 1] >= gap - 1e-9);
}

export const orderFdp: ReasoningType = {
  id: 'r-order-fdp',
  label: 'Ordering fractions, decimals and percentages',
  topic: 'fractions',
  generate(rng, d) {
    const terms = retry(() => {
      let t: Term[];
      if (d === 1) {
        // Halves, quarters, fifths and tenths with decimals: [[1/4]], 0.3, [[1/2]], 0.45.
        const fs = rng.shuffle(properFractions([2, 4, 5, 10])).slice(0, 2).map(([n, den]) => frac(n, den));
        const ds = [rat(rng.int(1, 9), 10), rat(rng.int(11, 99), 100)].map(dec);
        t = [...fs, ...ds];
        if (!spread(t, 0.03)) return undefined;
      } else if (d === 2) {
        // Different denominators with a decimal and a percentage: [[2/3]], 0.6, 65%, [[5/8]].
        const [n1, d1] = someFraction(rng, [3, 6, 8, 12]);
        const [n2, d2] = someFraction(rng, [5, 20, 25]);
        const centre = Math.round((100 * n1) / d1);
        const decimal = rat(Math.min(Math.max(centre + rng.int(-12, 12), 1), 99), 100);
        const percent = Math.min(Math.max(centre + rng.int(-12, 12), 1), 99);
        t = [frac(n1, d1), frac(n2, d2), dec(decimal), pct(percent)];
        if (!spread(t, 0.01)) return undefined;
      } else {
        // Between 1 and 3: [[1 3/4]], [[7/5]], 1.6, [[13/8]].
        const [n1, d1] = rng.pick(properFractions([3, 4, 5, 8]));
        const w = rng.int(1, 2);
        const [n2, d2] = rng.pick(properFractions([4, 5, 6, 8, 10]));
        const [n3, d3] = rng.pick(properFractions([2, 3, 4, 5]));
        const w2 = rng.int(1, 2);
        const w3 = rng.int(1, 2);
        t = [mixed(w, n1, d1), frac(w2 * d2 + n2, d2), frac(w3 * d3 + n3, d3), dec(rat(rng.int(1, 2) * 100 + rng.int(1, 99), 100))];
        if (!spread(t, 0.02)) return undefined;
      }
      return t;
    });
    const largest = rng.chance(0.3);
    const { input, answer } = ordering(
      rng,
      terms.map((t) => ({ text: t.text, value: (largest ? -1 : 1) * (t.value.n / t.value.d) })),
      largest ? 'largest' : 'smallest',
    );
    return draft([text(`Write these numbers in order, starting with the **${largest ? 'largest' : 'smallest'}**.`)], input, answer);
  },
};
