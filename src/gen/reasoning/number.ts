// Number and place value, factors and estimation.
import { rat } from '../../math/rational';
import { digitsOf, nDigits, retry } from '../build';
import type { ReasoningType } from '../types';
import { choices, draft, fmt, number, numberWords, nums, ordering, roman, text } from './helpers';

const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];

export const digitValue: ReasoningType = {
  id: 'r-digit-value',
  label: 'Place value in large numbers',
  topic: 'place-value',
  generate(rng, d) {
    if (d === 3 && rng.chance(0.5)) {
      // Write in digits from words.
      const n = retry(() => {
        const v = nDigits(rng, 7);
        const ds = digitsOf(v);
        ds[1] = 0; // a zero placeholder makes it a real place-value question
        if (rng.chance(0.5)) ds[4] = 0;
        return Number(ds.join(''));
      });
      return draft([text(`Write this number in digits:\n**${numberWords(n)}**`)], number(), nums(n));
    }
    if (d === 3) {
      // Value of a digit in a decimal: the 5 in 12.358 is worth 0.05.
      return retry(() => {
        const scaled = rng.int(10001, 99999); // two whole digits, three decimal places
        const ds = digitsOf(scaled);
        const pos = rng.int(2, 4); // a decimal place
        const digit = ds[pos];
        if (digit === 0 || ds.filter((x) => x === digit).length > 1) return undefined;
        const value = rat(digit, 10 ** (pos - 1));
        return draft(
          [text(`What is the value of the digit **${digit}** in the number **${fmt(rat(scaled, 1000))}**?`)],
          number({ decimal: true }),
          nums(value),
        );
      });
    }
    return retry(() => {
      const n = nDigits(rng, d === 1 ? 6 : 7);
      const ds = digitsOf(n);
      const pos = rng.int(0, ds.length - 2);
      const digit = ds[pos];
      if (digit === 0 || ds.filter((x) => x === digit).length > 1) return undefined;
      const place = ds.length - 1 - pos;
      if (rng.chance(0.3)) {
        return draft(
          [text(`In the number **${fmt(n)}**, which digit is in the **${PLACE_NAMES[place]}** place?`)],
          number(),
          nums(digit),
        );
      }
      return draft(
        [text(`What is the value of the digit **${digit}** in **${fmt(n)}**?`)],
        number(),
        nums(digit * 10 ** place),
      );
    });
  },
};

export const rounding: ReasoningType = {
  id: 'r-rounding',
  label: 'Rounding',
  topic: 'place-value',
  generate(rng, d) {
    if (d === 3) {
      const scaled = retry(() => {
        const v = rng.int(1001, 99999);
        return v % 10 === 0 ? undefined : v;
      });
      const n = rat(scaled, 1000);
      if (rng.chance(0.5)) {
        const rounded = Math.floor(scaled / 100 + 0.5); // tenths
        return draft([text(`Round **${fmt(n)}** to one decimal place.`)], number({ decimal: true }), nums(rat(rounded, 10)));
      }
      const rounded = Math.floor(scaled / 1000 + 0.5);
      return draft([text(`Round **${fmt(n)}** to the nearest whole number.`)], number({ decimal: true }), nums(rounded));
    }
    return retry(() => {
      const n = d === 1 ? nDigits(rng, 4) : nDigits(rng, rng.pick([6, 7]));
      const to = d === 1 ? rng.pick([10, 100, 1000]) : rng.pick([1000, 10000, 100000]);
      if (n % to === 0) return undefined;
      const rounded = Math.floor(n / to + 0.5) * to;
      return draft([text(`Round **${fmt(n)}** to the nearest **${fmt(to)}**.`)], number(), nums(rounded));
    });
  },
};

export const negatives: ReasoningType = {
  id: 'r-negative',
  label: 'Negative numbers',
  topic: 'place-value',
  generate(rng, d) {
    const box = number({ negative: true, suffix: '°C' });
    if (d === 1) {
      const start = -rng.int(2, 9);
      const rise = rng.int(4, 15);
      return draft(
        [text(`At midnight the temperature was **${fmt(start)}°C**. By midday it had risen by **${rise}** degrees.\nWhat was the temperature at midday?`)],
        box,
        nums(start + rise),
      );
    }
    if (d === 2) {
      const cold = -rng.int(3, 12);
      const warm = rng.int(2, 14);
      return draft(
        [text(`At 6 am the temperature was **${fmt(cold)}°C**. At 3 pm it was **${fmt(warm)}°C**.\nHow many degrees warmer was it at 3 pm?`)],
        number({ suffix: 'degrees' }),
        nums(warm - cold),
      );
    }
    const cities = rng.shuffle(['Oslo', 'Moscow', 'Helsinki', 'Toronto', 'London', 'Berlin']).slice(0, 5);
    const temps = retry(() => {
      const t = cities.map(() => rng.int(-15, 20));
      return new Set(t).size === t.length && t.some((x) => x < 0) && t.some((x) => x > 0) ? t : undefined;
    });
    if (rng.chance(0.5)) {
      return draft(
        [
          text('The table shows the temperature in five cities at midday.'),
          { b: 'table', head: ['City', 'Temperature'], rows: cities.map((c, i) => [c, `${fmt(temps[i])}°C`]) },
          text('What is the difference between the highest and the lowest temperature?'),
        ],
        number({ suffix: 'degrees' }),
        nums(Math.max(...temps) - Math.min(...temps)),
      );
    }
    const i = temps.findIndex((t) => t > 0);
    const fall = rng.int(temps[i] + 2, temps[i] + 12);
    return draft(
      [
        text('The table shows the temperature in five cities at midday.'),
        { b: 'table', head: ['City', 'Temperature'], rows: cities.map((c, k) => [c, `${fmt(temps[k])}°C`]) },
        text(`By midnight the temperature in **${cities[i]}** had fallen by **${fall}** degrees.\nWhat was the temperature in ${cities[i]} at midnight?`),
      ],
      box,
      nums(temps[i] - fall),
    );
  },
};

export const romanNumerals: ReasoningType = {
  id: 'r-roman',
  label: 'Roman numerals',
  topic: 'place-value',
  generate(rng, d) {
    if (d === 1) {
      const n = rng.int(14, 99);
      return draft([text(`What number is written as **${roman(n)}** in Roman numerals?`)], number(), nums(n));
    }
    if (d === 2) {
      const year = rng.int(1900, 2030);
      return draft([text(`A building has the year **${roman(year)}** carved above the door.\nWrite this year in digits.`)], number({ plain: true }), nums(year));
    }
    const a = rng.int(1940, 1999);
    const b = rng.int(2001, 2025);
    return draft(
      [text(`A bridge was built in **${roman(a)}** and repaired in **${roman(b)}**.\nHow many years after it was built was it repaired?`)],
      number({ suffix: 'years' }),
      nums(b - a),
    );
  },
};

export const orderNumbers: ReasoningType = {
  id: 'r-order-numbers',
  label: 'Ordering numbers',
  topic: 'place-value',
  generate(rng, d) {
    let values: number[];
    let labels: string[];
    if (d === 1) {
      // The same thousands, then the same three digits rearranged: 45,302 / 45,230 / 45,320 / 45,023.
      const base = rng.int(10, 98) * 1000;
      const digits = rng.shuffle([0, ...rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 2)]);
      const perms = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ].map(([x, y, z]) => base + digits[x] * 100 + digits[y] * 10 + digits[z]);
      values = rng.shuffle(perms).slice(0, 4);
      labels = values.map((v) => fmt(v));
    } else if (d === 2) {
      // Decimals with different numbers of places: 0.5, 0.54, 0.504, 0.45
      const whole = rng.int(0, 3);
      const a = rng.int(1, 8);
      const b = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== a));
      values = [a * 100, a * 100 + b * 10, a * 100 + b, b * 100 + a * 10].map((x) => whole * 1000 + x);
      labels = values.map((v) => fmt(rat(v, 1000)));
    } else {
      // Negatives and decimals: −2.35, −2, 0.7, −0.5
      values = retry(() => {
        const v = [0, 0, 0, 0].map(() => rng.int(-60, 20) * 5); // hundredths in steps of 0.05
        return new Set(v).size === 4 && v.filter((x) => x < 0).length >= 2 ? v : undefined;
      });
      labels = values.map((v) => fmt(rat(v, 100)));
    }
    const { input, answer } = ordering(
      rng,
      values.map((v, i) => ({ text: labels[i], value: v })),
    );
    return draft([text('Write these numbers in order, starting with the **smallest**.')], input, answer);
  },
};

export const factorsMultiples: ReasoningType = {
  id: 'r-factors',
  label: 'Factors, multiples and primes',
  topic: 'mul-div',
  generate(rng, d) {
    if (d === 1) {
      const k = rng.int(3, 9);
      const right = rng.shuffle(Array.from({ length: 11 }, (_, i) => k * (i + 2))).slice(0, 2);
      const wrong = rng.shuffle(Array.from({ length: 90 }, (_, i) => i + 10).filter((x) => x % k !== 0)).slice(0, 3);
      const { input, answer } = choices(rng, right.map(String), wrong.map(String));
      return draft([text(`Tick the **two** numbers that are multiples of **${k}**.`)], input, answer);
    }
    if (d === 2) {
      if (rng.chance(0.5)) {
        const primes = rng.shuffle([23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89]).slice(0, 2);
        const composite = rng.shuffle([21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91]).slice(0, 3);
        const { input, answer } = choices(rng, primes.map(String), composite.map(String));
        return draft([text('Tick the **two** prime numbers.')], input, answer);
      }
      const others = rng.shuffle([4, 8, 9, 16, 25, 27, 36, 49, 81, 100, 125]).slice(0, 3);
      const { input, answer } = choices(rng, ['64'], others.map(String));
      return draft([text('Which number is **both** a square number and a cube number? Tick one.')], input, answer);
    }
    return retry(() => {
      const [a, b] = rng.pick([
        [24, 36],
        [36, 48],
        [30, 45],
        [42, 56],
        [48, 72],
        [40, 60],
      ]);
      const common = Array.from({ length: a }, (_, i) => i + 1).filter((x) => a % x === 0 && b % x === 0 && x > 2);
      const right = rng.shuffle(common).slice(0, 2);
      const factorsOfOne = Array.from({ length: b }, (_, i) => i + 1).filter((x) => (a % x === 0) !== (b % x === 0) && x > 2);
      if (right.length < 2 || factorsOfOne.length < 3) return undefined;
      const wrong = rng.shuffle(factorsOfOne).slice(0, 3);
      const { input, answer } = choices(rng, right.map(String), wrong.map(String));
      return draft([text(`Tick the **two** numbers that are factors of **both ${a} and ${b}**.`)], input, answer);
    });
  },
};

export const estimating: ReasoningType = {
  id: 'r-estimate',
  label: 'Estimating',
  topic: 'mul-div',
  generate(rng, d) {
    let question: string;
    let best: number;
    if (d === 1) {
      const a = rng.int(2, 8) * 100 - rng.int(1, 4);
      const b = rng.int(2, 8) * 100 - rng.int(1, 4);
      question = `${fmt(a)} + ${fmt(b)}`;
      best = Math.round(a / 100) * 100 + Math.round(b / 100) * 100;
    } else if (d === 2) {
      const a = rng.int(2, 9) * 1000 - rng.int(5, 30);
      const b = rng.int(2, 9) * 10 + rng.pick([-1, 1]);
      question = `${fmt(a)} × ${fmt(b)}`;
      best = Math.round(a / 1000) * 1000 * Math.round(b / 10) * 10;
    } else {
      const q = rng.int(2, 9) * 100;
      const b = rng.int(2, 9) * 10 + rng.pick([-1, 1]);
      const a = q * Math.round(b / 10) * 10 + rng.pick([-1, 1]) * rng.int(5, 40);
      question = `${fmt(a)} ÷ ${fmt(b)}`;
      best = q;
    }
    // Addition estimates differ by hundreds; multiplication and division by powers of ten.
    const wrong = d === 1 ? [best - 100, best + 100, best + 200] : [best / 10, best * 10, best * 100];
    const { input, answer } = choices(rng, [fmt(best)], wrong.map((x) => fmt(x)));
    return draft([text(`Which is the best estimate for **${question}**? Tick one.`)], input, answer);
  },
};

