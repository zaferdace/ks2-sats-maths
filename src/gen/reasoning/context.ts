// Problems in context: units of time, rounding large numbers, common multiples, best value,
// and finding every pair of values that fits an equation.
import { rat } from '../../math/rational';
import { lcm, retry } from '../build';
import type { Rng } from '../rng';
import type { NumberBox, ReasoningType } from '../types';
import { choices, draft, fmt, money, NAMES, number, nums, plural, text, timeBox, twoNames } from './helpers';

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** A larger and a smaller unit of time. */
const TIME_UNITS = [
  { big: 'hours', small: 'minutes', one: 'hour', factor: 60 },
  { big: 'minutes', small: 'seconds', one: 'minute', factor: 60 },
  { big: 'weeks', small: 'days', one: 'week', factor: 7 },
  { big: 'years', small: 'months', one: 'year', factor: 12 },
  { big: 'days', small: 'hours', one: 'day', factor: 24 },
];

export const timeUnits: ReasoningType = {
  id: 'r-time-units',
  label: 'Converting units of time',
  topic: 'measurement',
  generate(rng, d) {
    const u = rng.pick(TIME_UNITS);
    if (d === 1) {
      // 3 hours = 180 minutes; [[2 1/2]] years = 30 months; [[3/4]] of an hour = 45 minutes.
      if (u.big === 'hours' && rng.chance(0.25)) {
        const [n, den] = rng.pick([[1, 4], [3, 4], [1, 3], [2, 3]]);
        return draft([text(`How many **minutes** are there in [[${n}/${den}]] of an hour?`)], number({ suffix: 'minutes' }), nums((60 * n) / den));
      }
      const half = u.factor % 2 === 0 && rng.chance(0.4);
      const whole = rng.int(half ? 1 : 2, u.factor === 60 ? 9 : 12);
      const amount = half ? `[[${whole} 1/2]] ${u.big}` : `${whole} ${u.big}`;
      return draft(
        [text(`How many **${u.small}** are there in **${amount}**?`)],
        number({ suffix: u.small }),
        nums(whole * u.factor + (half ? u.factor / 2 : 0)),
      );
    }
    if (d === 2) {
      // 200 minutes = 3 hours 20 minutes: two boxes, both at least 2 so the units read right.
      const big = rng.int(2, u.factor === 24 ? 4 : 9);
      const small = rng.int(2, u.factor - 1);
      return draft(
        [text(`Write **${fmt(big * u.factor + small)} ${u.small}** in ${u.big} and ${u.small}.`)],
        { kind: 'number', boxes: [{ suffix: u.big }, { suffix: u.small }] },
        nums(big, small),
      );
    }
    const [p, q] = twoNames(rng);
    const kind = rng.pick(['films', 'practice', 'ages', 'race'] as const);
    if (kind === 'films') {
      const first = rng.int(1, 2) * 60 + rng.int(5, 55);
      const diff = rng.int(3, 25);
      return draft(
        [text(`${p}'s film lasts **${plural(Math.floor(first / 60), 'hour')} ${plural(first % 60, 'minute')}**. ${q}'s film lasts **${first + diff} minutes**.\nHow many minutes longer is ${q}'s film?`)],
        number({ suffix: 'minutes' }),
        nums(diff),
      );
    }
    if (kind === 'practice') {
      return retry(() => {
        const each = rng.pick([10, 15, 20, 25, 30, 35, 40, 45]);
        const weeks = rng.int(2, 4);
        const total = each * 7 * weeks;
        const [h, m] = [Math.floor(total / 60), total % 60];
        if (h < 2 || m < 2) return undefined;
        return draft(
          [text(`${p} practises the piano for **${each} minutes** every day for **${weeks} weeks**.\nHow long is that altogether, in hours and minutes?`)],
          { kind: 'number', boxes: [{ suffix: 'hours' }, { suffix: 'minutes' }] },
          nums(h, m),
        );
      });
    }
    if (kind === 'ages') {
      const older = rng.int(9, 11) * 12 + rng.int(1, 11);
      const younger = older - rng.int(14, 40);
      return draft(
        [text(`${p} is **${plural(Math.floor(older / 12), 'year')} ${plural(older % 12, 'month')}** old. ${q} is **${younger} months** old.\nHow many months older is ${p} than ${q}?`)],
        number({ suffix: 'months' }),
        nums(older - younger),
      );
    }
    const slow = rng.int(2, 4) * 60 + rng.int(5, 55);
    const fast = slow - rng.int(3, 30);
    return draft(
      [text(`${p} runs a race in **${plural(Math.floor(slow / 60), 'minute')} ${plural(slow % 60, 'second')}**. ${q} runs the same race in **${fast} seconds**.\nHow many seconds faster is ${q}?`)],
      number({ suffix: 'seconds' }),
      nums(slow - fast),
    );
  },
};

const roundTo = (n: number, to: number) => Math.floor(n / to + 0.5) * to;

export const roundLarge: ReasoningType = {
  id: 'r-round-large',
  label: 'Rounding large numbers',
  topic: 'place-value',
  generate(rng, d) {
    return retry(() => {
      if (d < 3) {
        const n = d === 1 ? rng.int(100_001, 999_999) : rng.int(1_000_001, 9_999_999);
        const to = d === 1 ? rng.pick([10_000, 100_000]) : rng.pick([100_000, 1_000_000]);
        if (n % to === 0 || roundTo(n, to) === roundTo(n, to / 10)) return undefined; // the place asked for must matter
        const context =
          d === 1
            ? rng.pick([`The population of a ${n < 300_000 ? 'town' : 'city'} is **${fmt(n)}**.`, `**${fmt(n)}** people visited a museum last year.`, `A football club sold **${fmt(n)}** tickets last season.`])
            : rng.pick([`The population of a city is **${fmt(n)}**.`, `A website had **${fmt(n)}** visits last month.`, `A country has **${fmt(n)}** cars on its roads.`]);
        return draft([text(`${context}\nRound this number to the nearest **${fmt(to)}**.`)], number(), nums(roundTo(n, to)));
      }
      if (rng.chance(0.5)) {
        // What could the number have been?
        const to = rng.pick([10_000, 100_000, 1_000_000]);
        const rounded = to * rng.int(to === 1_000_000 ? 2 : 11, to === 1_000_000 ? 9 : 99);
        const smallest = rng.chance(0.5);
        return draft(
          [text(`A whole number rounded to the nearest **${fmt(to)}** is **${fmt(rounded)}**.\nWhat is the **${smallest ? 'smallest' : 'largest'}** number it could be?`)],
          number(),
          nums(smallest ? rounded - to / 2 : rounded + to / 2 - 1),
        );
      }
      const million = rng.int(2, 8) * 1_000_000;
      const half = 500_000;
      const right = rng.shuffle([million - half, million + half - 1, million - half + rng.int(1, 9) * 10_000, million + rng.int(1, 49) * 10_000]).slice(0, 2);
      const wrong = rng.shuffle([million - half - 1, million + half, million - half - rng.int(1, 9) * 10_000, million + half + rng.int(1, 9) * 10_000]).slice(0, 3);
      if (new Set([...right, ...wrong]).size !== 5) return undefined;
      const { input, answer } = choices(rng, right.map((v) => fmt(v)), wrong.map((v) => fmt(v)));
      return draft([text(`Tick the **two** numbers that round to **${fmt(million)}** when rounded to the nearest million.`)], input, answer);
    });
  },
};

export const commonMultiples: ReasoningType = {
  id: 'r-lcm',
  label: 'Common multiples in context',
  topic: 'mul-div',
  generate(rng, d) {
    if (d === 1) {
      const [a, b] = rng.pick([[4, 6], [6, 8], [4, 10], [6, 9], [8, 12], [6, 10], [10, 15], [9, 12], [8, 10], [3, 8]]);
      const [c1, c2] = rng.shuffle(['red', 'green', 'blue', 'yellow']);
      return draft(
        [text(`A ${c1} light flashes every **${a} seconds**. A ${c2} light flashes every **${b} seconds**. They flash together at the start.\nAfter how many seconds will they next flash together?`)],
        number({ suffix: 'seconds' }),
        nums(lcm(a, b)),
      );
    }
    if (d === 2) {
      const [a, b] = rng.pick([[12, 18], [10, 15], [15, 20], [12, 20], [20, 30], [18, 24], [16, 24], [15, 25], [20, 25], [12, 15]]);
      const start = rng.int(14, 32) * 30; // 07:00 to 16:00
      const [p1, p2] = rng.shuffle(['the park', 'the zoo', 'the beach', 'the hospital', 'the station']);
      const next = start + lcm(a, b);
      return draft(
        [text(`Buses to ${p1} leave the bus station every **${a} minutes**. Buses to ${p2} leave every **${b} minutes**. One of each leaves at **${hhmm(start)}**.\nWhat is the next time that buses to both places leave together?`)],
        timeBox(),
        nums(Math.floor(next / 60), next % 60),
      );
    }
    const [thing, other, a, b] = rng.pick([
      ['hot dogs', 'bread rolls', 8, 6],
      ['hot dogs', 'bread rolls', 10, 8],
      ['burgers', 'burger buns', 4, 6],
      ['paper cups', 'paper plates', 12, 8],
      ['paper cups', 'paper plates', 10, 15],
      ['pencils', 'rubbers', 10, 4],
    ] as const);
    const n = lcm(a, b);
    const name = rng.pick(NAMES);
    const box = (label: string): NumberBox => ({ label: label[0].toUpperCase() + label.slice(1), suffix: 'packs' });
    return draft(
      [text(`${thing[0].toUpperCase() + thing.slice(1)} come in packs of **${a}**. ${other[0].toUpperCase() + other.slice(1)} come in packs of **${b}**.\n${name} wants exactly the same number of ${thing} and ${other}. What is the **smallest** number of packs of each that ${name} can buy?`)],
      { kind: 'number', boxes: [box(thing), box(other)] },
      nums(n / a, n / b),
    );
  },
};

/** Price of one item in pence, roughly what shops charge. */
const PACKS = [
  { many: 'yoghurts', lo: 25, hi: 60 },
  { many: 'pencils', lo: 15, hi: 40 },
  { many: 'batteries', lo: 40, hi: 90 },
  { many: 'cookies', lo: 20, hi: 50 },
];

/** Price of 250 g in pence. */
const BAGS = [
  { food: 'rice', lo: 40, hi: 75 },
  { food: 'pasta', lo: 40, hi: 75 },
  { food: 'flour', lo: 25, hi: 45 },
  { food: 'porridge oats', lo: 25, hi: 50 },
];

/** Prices for the same amount in each size, close together (so the pupil must work them out) but at least `gap` apart. */
function closePrices(rng: Rng, count: number, lo: number, hi: number, gap: number): number[] | undefined {
  const base = rng.int(lo + 6, hi - 6);
  const prices = Array.from({ length: count }, () => base + rng.int(-6, 6));
  const sorted = [...prices].sort((x, y) => x - y);
  return sorted.every((v, i) => i === 0 || v - sorted[i - 1] >= gap) ? prices : undefined;
}

const SAME = 'They are the same value';

export const bestValue: ReasoningType = {
  id: 'r-best-value',
  label: 'Best value',
  topic: 'ratio',
  generate(rng, d) {
    return retry(() => {
      if (d < 3) {
        // Packs of different sizes; the pupil finds the price of one in each.
        const item = rng.pick(PACKS);
        const sizes = rng.shuffle([2, 3, 4, 5, 6, 8, 10, 12]).slice(0, d === 1 ? 2 : 3).sort((x, y) => x - y);
        const same = d === 1 && rng.chance(0.15);
        const each = closePrices(rng, sizes.length, item.lo, item.hi, 2);
        if (!each) return undefined;
        if (same) each[1] = each[0];
        const sorted = [...each].sort((x, y) => x - y);
        const labels = sizes.map((n) => `${n} ${item.many}`);
        const best = each.indexOf(sorted[0]);
        const table = { b: 'table' as const, head: ['Pack', 'Price'], rows: labels.map((l, i) => [l, money(sizes[i] * each[i])]) };
        const { input, answer } = same
          ? choices(rng, [SAME], labels)
          : choices(rng, [labels[best]], d === 1 ? [...labels.filter((_, i) => i !== best), SAME] : labels.filter((_, i) => i !== best));
        return draft(
          [text(`A shop sells ${item.many} in packs of different sizes.`), table, text(d === 1 ? 'Which pack is better value for money? Tick one.' : 'Which pack is the best value for money? Tick one.')],
          input,
          answer,
        );
      }
      // Bags by mass: compare the price of the same amount (250 g) in each.
      const { food, lo, hi } = rng.pick(BAGS);
      const grams = rng.shuffle([250, 500, 750, 1000, 1500, 2000]).slice(0, 3).sort((x, y) => x - y);
      const per250 = closePrices(rng, 3, lo, hi, 3);
      if (!per250) return undefined;
      const sorted = [...per250].sort((x, y) => x - y);
      const label = (g: number) => (g < 1000 ? `${g} g bag` : `${fmt(rat(g, 1000))} kg bag`);
      const labels = grams.map(label);
      const best = per250.indexOf(sorted[0]);
      const table = { b: 'table' as const, head: ['Bag', 'Price'], rows: labels.map((l, i) => [l, money((grams[i] / 250) * per250[i])]) };
      const { input, answer } = choices(rng, [labels[best]], labels.filter((_, i) => i !== best));
      return draft([text(`A shop sells ${food} in three sizes of bag.`), table, text('Which bag is the best value for money? Tick one.')], input, answer);
    });
  },
};

/** "2a + b", "a + 3b": the left side of an equation in a and b. */
const side = (p: number, q: number) => `${p === 1 ? '' : p}a + ${q === 1 ? '' : q}b`;
const pair = (a: number, b: number) => `a = ${a}, b = ${b}`;

/** Every pair of whole numbers a, b ≥ 1 with pa + qb = r. */
const solutions = (p: number, q: number, r: number): [number, number][] =>
  Array.from({ length: Math.floor(r / p) }, (_, i) => i + 1).flatMap((a) => ((r - p * a) % q === 0 && r - p * a >= q ? [[a, (r - p * a) / q] as [number, number]] : []));

export const findPairs: ReasoningType = {
  id: 'r-pairs',
  label: 'Finding all possible pairs',
  topic: 'algebra',
  generate(rng, d) {
    return retry(() => {
      if (d === 3) {
        if (rng.chance(0.5)) {
          // Money: how many ways to spend an exact amount on two things, at least one of each.
          const [pp, pq] = rng.pick([[20, 30], [20, 50], [30, 50], [40, 30], [15, 20], [25, 10]]);
          const r = rng.int(8, 30) * 10;
          const count = solutions(pp, pq, r).length;
          if (count < 3 || count > 6) return undefined;
          const [x, y] = rng.pick([['pencils', 'rubbers'], ['stickers', 'badges'], ['apples', 'bananas']]);
          const name = rng.pick(NAMES);
          return draft(
            [text(`${x[0].toUpperCase() + x.slice(1)} cost **${pp}p** each and ${y} cost **${pq}p** each. ${name} spends exactly **${money(r)}** and buys at least one of each.\nHow many different ways are there for ${name} to do this?`)],
            number({ suffix: 'ways' }),
            nums(count),
          );
        }
        const [p, q] = rng.pick([[2, 3], [3, 2], [2, 5], [5, 2], [3, 4], [4, 3]]);
        const r = rng.int(20, 40);
        const count = solutions(p, q, r).length;
        if (count < 3 || count > 6) return undefined;
        return draft(
          [text(`**a** and **b** are whole numbers greater than 0.\n**${side(p, q)} = ${r}**\nHow many different pairs of values can **a** and **b** have?`)],
          number({ suffix: 'pairs' }),
          nums(count),
        );
      }
      const [p, q] = d === 1 ? rng.pick([[2, 1], [1, 2], [3, 1], [1, 3]]) : rng.pick([[2, 3], [3, 2], [3, 4], [4, 3], [2, 5], [5, 2]]);
      const r = rng.int(d === 1 ? 9 : 16, d === 1 ? 20 : 30);
      const all = solutions(p, q, r);
      const pick = d === 1 ? 2 : all.length;
      if (all.length < 2 || (d === 2 && all.length > 4)) return undefined;
      const right = rng.shuffle(all).slice(0, pick);
      // Near misses: one of a right pair's numbers is out by one.
      const misses = all.flatMap(([a, b]) => [[a + 1, b], [a, b + 1], [a - 1, b], [a, b - 1]] as [number, number][]).filter(([a, b]) => a > 0 && b > 0 && p * a + q * b !== r);
      const wrong = [...new Map(misses.map((m) => [pair(...m), m])).values()];
      if (wrong.length < 3) return undefined;
      const { input, answer } = choices(rng, right.map(([a, b]) => pair(a, b)), rng.shuffle(wrong).slice(0, d === 1 ? 3 : 2).map(([a, b]) => pair(a, b)));
      const ask = d === 1 ? 'Tick the **two** pairs of values that make this equation true.' : `There are **${all.length}** pairs of values that make this equation true. Tick all ${all.length}.`;
      return draft([text(`**a** and **b** are whole numbers greater than 0.\n**${side(p, q)} = ${r}**\n${ask}`)], input, answer);
    });
  },
};
