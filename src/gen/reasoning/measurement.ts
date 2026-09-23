// Measurement: converting units, time and timetables, perimeter and area, volume.
import { rat } from '../../math/rational';
import { retry } from '../build';
import type { ReasoningType } from '../types';
import { draft, fmt, NAMES, number, nums, text, timeBox } from './helpers';

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const UNITS = [
  { big: 'litres', small: 'millilitres', abbrBig: 'l', abbrSmall: 'ml', factor: 1000 },
  { big: 'kilograms', small: 'grams', abbrBig: 'kg', abbrSmall: 'g', factor: 1000 },
  { big: 'kilometres', small: 'metres', abbrBig: 'km', abbrSmall: 'm', factor: 1000 },
  { big: 'metres', small: 'centimetres', abbrBig: 'm', abbrSmall: 'cm', factor: 100 },
  { big: 'centimetres', small: 'millimetres', abbrBig: 'cm', abbrSmall: 'mm', factor: 10 },
];

export const convertUnits: ReasoningType = {
  id: 'r-convert',
  label: 'Converting units',
  topic: 'measurement',
  generate(rng, d) {
    const u = rng.pick(UNITS);
    if (d === 1) {
      // Big → small: 2.5 litres = 2,500 ml
      const places = u.factor === 10 ? 1 : rng.pick([1, 2]);
      const big = rat(rng.int(11, 99) * (places === 1 ? 10 : 1), 100);
      const small = rat(big.n * u.factor, big.d);
      return draft([text(`How many **${u.small}** are in **${fmt(big)} ${u.big}**?`)], number({ suffix: u.abbrSmall }), nums(small));
    }
    if (d === 2) {
      // Small → big: 3,450 g = 3.45 kg
      const small = retry(() => {
        const v = rng.int(u.factor + 1, u.factor * 9);
        return v % 10 === 0 && u.factor > 10 ? v : u.factor === 10 ? v : undefined;
      });
      return draft(
        [text(`Write **${fmt(small)} ${u.abbrSmall}** in **${u.big}**.`)],
        number({ decimal: true, suffix: u.abbrBig }),
        nums(rat(small, u.factor)),
      );
    }
    if (rng.chance(0.5)) {
      const miles = rng.int(2, 12) * 5;
      return draft(
        [text(`**5 miles** is about **8 kilometres**.\nAbout how many kilometres is **${miles} miles**?`)],
        number({ suffix: 'km' }),
        nums((miles / 5) * 8),
      );
    }
    const bottle = rng.pick([250, 500, 750, 200]);
    const litres = retry(() => {
      const l = rng.int(2, 9);
      return (l * 1000) % bottle === 0 ? l : undefined;
    });
    return draft(
      [text(`A bottle holds **${bottle} ml**. How many bottles can be filled from **${litres} litres** of water?`)],
      number({ suffix: 'bottles' }),
      nums((litres * 1000) / bottle),
    );
  },
};

const STOPS = ['Market Square', 'Hill Road', 'Park Lane', 'Station'];

export const timeProblems: ReasoningType = {
  id: 'r-time',
  label: 'Time and timetables',
  topic: 'measurement',
  generate(rng, d) {
    if (d === 1) {
      const start = rng.int(9 * 12, 20 * 12) * 5; // minutes after midnight, 09:00-20:00
      const length = retry(() => {
        const m = rng.int(70, 170);
        return m % 60 === 0 ? undefined : m;
      });
      const what = rng.pick(['film', 'football match', 'concert', 'play']);
      return draft(
        [text(`A ${what} starts at **${hhmm(start)}**. It lasts **${Math.floor(length / 60)} hour${length >= 120 ? 's' : ''} ${length % 60} minutes**.\nWhat time does it finish?`)],
        timeBox(),
        nums(Math.floor((start + length) / 60) % 24, (start + length) % 60),
      );
    }
    if (d === 2) {
      const leave = rng.int(6 * 60, 16 * 60);
      const journey = rng.int(35, 150);
      return draft(
        [text(`A bus leaves at **${hhmm(leave)}** and arrives at **${hhmm(leave + journey)}**.\nHow many minutes does the journey take?`)],
        number({ suffix: 'minutes' }),
        nums(journey),
      );
    }
    // Timetable: three buses, four stops.
    const gaps = STOPS.slice(1).map(() => rng.int(6, 18));
    const firstBus = rng.int(7 * 12, 9 * 12) * 5;
    const buses = [0, 1, 2].map((k) => firstBus + k * rng.pick([25, 30, 40]) + k * 5);
    const rows = STOPS.map((stop, s) => [stop, ...buses.map((b) => hhmm(b + gaps.slice(0, s).reduce((x, y) => x + y, 0)))]);
    const table = { b: 'table' as const, head: ['Stop', 'Bus A', 'Bus B', 'Bus C'], rows };
    const name = rng.pick(NAMES);
    if (rng.chance(0.5)) {
      const from = rng.int(0, 1);
      const to = rng.int(from + 2, 3);
      return draft(
        [text('Here is part of a bus timetable.'), table, text(`How many minutes does it take a bus to travel from **${STOPS[from]}** to **${STOPS[to]}**?`)],
        number({ suffix: 'minutes' }),
        nums(gaps.slice(from, to).reduce((x, y) => x + y, 0)),
      );
    }
    const k = rng.int(1, 2);
    const at = buses[k] + gaps[0] - rng.int(3, 12); // arrives at Hill Road just before bus k
    const arrive = buses[k] + gaps.reduce((x, y) => x + y, 0);
    return draft(
      [
        text('Here is part of a bus timetable.'),
        table,
        text(`${name} gets to **Hill Road** at **${hhmm(at)}** and catches the next bus.\nWhat time does ${name} arrive at the **Station**?`),
      ],
      timeBox(),
      nums(Math.floor(arrive / 60), arrive % 60),
    );
  },
};

export const perimeterArea: ReasoningType = {
  id: 'r-perimeter-area',
  label: 'Perimeter and area',
  topic: 'measurement',
  generate(rng, d) {
    if (d === 1) {
      const w = rng.int(3, 15);
      const h = rng.int(2, 12);
      if (rng.chance(0.5)) {
        return draft(
          [text('Calculate the **area** of this rectangle.'), { b: 'rect', labels: [`${w} cm`, `${h} cm`] }],
          number({ suffix: 'cm²' }),
          nums(w * h),
        );
      }
      return draft(
        [text('Calculate the **perimeter** of this rectangle.'), { b: 'rect', labels: [`${w} cm`, `${h} cm`] }],
        number({ suffix: 'cm' }),
        nums(2 * (w + h)),
      );
    }
    if (d === 2) {
      const w = rng.int(3, 12);
      const l = rng.int(w + 1, 20);
      if (rng.chance(0.5)) {
        return draft(
          [text(`A rectangle has a perimeter of **${2 * (w + l)} cm**. It is **${w} cm** wide.\nHow long is it?`)],
          number({ suffix: 'cm' }),
          nums(l),
        );
      }
      return draft(
        [text(`A rectangle has an area of **${w * l} cm²**. It is **${w} cm** wide.\nWhat is its perimeter?`)],
        number({ suffix: 'cm' }),
        nums(2 * (w + l)),
      );
    }
    if (rng.chance(0.4)) {
      const base = rng.int(4, 16);
      const height = rng.int(3, 12);
      const area = base * height;
      if (rng.chance(0.5)) {
        return draft(
          [text(`A triangle has a base of **${base} cm** and a perpendicular height of **${height} cm**.\nWhat is its area?`)],
          number({ decimal: true, suffix: 'cm²' }),
          nums(rat(area, 2)),
        );
      }
      return draft(
        [text(`A parallelogram has a base of **${base} cm** and a perpendicular height of **${height} cm**.\nWhat is its area?`)],
        number({ suffix: 'cm²' }),
        nums(area),
      );
    }
    // L-shape: a W × H rectangle with a w × h corner cut from the top right.
    return retry(() => {
      const W = rng.int(6, 14);
      const H = rng.int(5, 12);
      const w = rng.int(2, W - 3);
      const h = rng.int(2, H - 2);
      const sides = [W - w, h, w, H - h, W, H]; // clockwise from the top edge
      // Two edges are left unlabelled, as on the test: the pupil works them out.
      const labels = sides.map((v, i) => (i === 0 || i === 3 ? '' : `${v} cm`));
      const area = W * H - w * h;
      if (rng.chance(0.5)) {
        return draft(
          [text('Calculate the **area** of this shape. All the corners are right angles.'), { b: 'lshape', labels }],
          number({ suffix: 'cm²' }),
          nums(area),
        );
      }
      return draft(
        [text('Calculate the **perimeter** of this shape. All the corners are right angles.'), { b: 'lshape', labels }],
        number({ suffix: 'cm' }),
        nums(2 * (W + H)),
      );
    });
  },
};

export const volume: ReasoningType = {
  id: 'r-volume',
  label: 'Volume',
  topic: 'measurement',
  generate(rng, d) {
    const l = rng.int(3, 12);
    const w = rng.int(2, 8);
    const h = rng.int(2, 10);
    if (d === 1) {
      return draft(
        [text('What is the volume of this cuboid?'), { b: 'cuboid', labels: [`${l} cm`, `${w} cm`, `${h} cm`] }],
        number({ suffix: 'cm³' }),
        nums(l * w * h),
      );
    }
    if (d === 2) {
      return draft(
        [text(`A cuboid has a volume of **${l * w * h} cm³**. It is **${l} cm** long and **${w} cm** wide.\nHow tall is it?`)],
        number({ suffix: 'cm' }),
        nums(h),
      );
    }
    const L = rng.int(2, 6) * 10;
    const W = rng.int(1, 4) * 10;
    const H = rng.int(1, 3) * 10;
    return draft(
      [text(`A fish tank is **${L} cm** long, **${W} cm** wide and **${H} cm** tall. It is **half full** of water.\nWhat is the volume of the water?`), { b: 'cuboid', labels: [`${L} cm`, `${W} cm`, `${H} cm`] }],
      number({ suffix: 'cm³' }),
      nums((L * W * H) / 2),
    );
  },
};
