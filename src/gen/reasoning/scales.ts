// Reading number lines, measuring scales and conversion graphs.
import { add, mul, rat, type Rational } from '../../math/rational';
import { retry } from '../build';
import type { Block, NumberBox, ReasoningType } from '../types';
import { draft, fmt, NAMES, number, nums, text } from './helpers';

const ARROW = 'What number is the arrow pointing to?';

/** Tick indexes 1 … ticks − 1 that carry no label. */
const unlabelled = (ticks: number, per: number): number[] => Array.from({ length: ticks - 1 }, (_, i) => i + 1).filter((i) => i % per !== 0);

/**
 * A number line from `start` in `ticks` equal steps of `step`, labelled every `per` ticks, with the
 * arrow at `arrow` (a tick index, or halfway between two: 3.5). Returns the figure and the value at the arrow.
 */
function numberLine(start: Rational, step: Rational, per: number, segments: number, arrow: number) {
  const ticks = per * segments;
  const at = (i: number) => add(start, mul(step, rat(Math.round(i * 2), 2)));
  const block: Block = {
    b: 'numberline',
    ticks,
    labels: Array.from({ length: segments + 1 }, (_, k) => ({ at: k * per, text: fmt(at(k * per)) })),
    arrow,
  };
  return { block, value: at(arrow) };
}

export const numberLines: ReasoningType = {
  id: 'r-number-line',
  label: 'Number lines',
  topic: 'place-value',
  generate(rng, d) {
    if (d === 1) {
      // Whole numbers: the pupil works out what each small step is worth.
      const [step, per] = rng.pick([[2, 5], [5, 4], [5, 10], [10, 5], [10, 10], [20, 5], [25, 4], [50, 4], [50, 10], [100, 5], [100, 10], [250, 4]]);
      const segments = rng.int(1, 2);
      const start = rat(step * per * rng.int(0, 9));
      const arrow = rng.pick(unlabelled(per * segments, per));
      const { block, value } = numberLine(start, rat(step), per, segments, arrow);
      return draft([text(ARROW), block], number(), nums(value));
    }
    if (d === 2) {
      if (rng.chance(0.5)) {
        // Tenths and hundredths: 3 to 4 in tenths, 2.3 to 2.4 in hundredths, 0 to 1 in quarters.
        const [n, den, per] = rng.pick([[1, 10, 10], [2, 10, 5], [1, 4, 4], [1, 100, 10], [2, 100, 5], [5, 100, 10]]);
        const step = rat(n, den);
        const span = mul(step, rat(per));
        const start = mul(span, rat(span.d === 1 ? rng.int(0, 9) : rng.int(10, 59)));
        const segments = rng.int(1, 2);
        const arrow = rng.pick(unlabelled(per * segments, per));
        const { block, value } = numberLine(start, step, per, segments, arrow);
        return draft([text(ARROW), block], number({ decimal: true }), nums(value));
      }
      // Negative numbers: the line crosses zero and the arrow is below it.
      return retry(() => {
        const [step, per] = rng.pick([[1, 5], [2, 5], [5, 2], [5, 4], [10, 5]]);
        const span = step * per;
        const segments = rng.int(2, 3);
        const start = rat(-span * rng.int(1, segments - 1));
        const arrow = rng.pick(unlabelled(per * segments, per));
        const { block, value } = numberLine(start, rat(step), per, segments, arrow);
        return value.n < 0 ? draft([text(ARROW), block], number({ negative: true }), nums(value)) : undefined;
      });
    }
    const kind = rng.pick(['large', 'negative decimal', 'halfway'] as const);
    if (kind === 'large') {
      // 40,000 to 50,000 in four steps of 2,500; KS2 numbers go up to 10,000,000.
      const span = 10 ** rng.int(3, 6);
      const per = rng.pick([4, 5, 8, 10]);
      const segments = rng.int(1, 2);
      const start = rat(span * rng.int(1, Math.min(9, 10 - segments)));
      const arrow = rng.pick(unlabelled(per * segments, per));
      const { block, value } = numberLine(start, rat(span, per), per, segments, arrow);
      return draft([text(ARROW), block], number(), nums(value));
    }
    if (kind === 'negative decimal') {
      return retry(() => {
        const [n, den, per] = rng.pick([[1, 10, 5], [2, 10, 5], [1, 4, 4], [1, 2, 4]]);
        const step = rat(n, den);
        const span = mul(step, rat(per));
        const segments = rng.int(2, 3);
        const start = mul(span, rat(-rng.int(1, segments - 1)));
        const arrow = rng.pick(unlabelled(per * segments, per));
        const { block, value } = numberLine(start, step, per, segments, arrow);
        return value.n < 0 ? draft([text(ARROW), block], number({ negative: true, decimal: true }), nums(value)) : undefined;
      });
    }
    // Halfway between two marks: one more decimal place (or a 5 in the next place).
    const [n, den, per] = rng.pick([[1, 10, 10], [1, 1, 10], [10, 1, 10], [100, 1, 10], [1, 10, 5]]);
    const step = rat(n, den);
    const span = mul(step, rat(per));
    const start = mul(span, rat(rng.int(1, 9)));
    const arrow = rng.int(0, per - 1) + 0.5;
    const { block, value } = numberLine(start, step, per, 1, arrow);
    return draft(
      [text(`The arrow points exactly **halfway** between two marks.\n${ARROW}`), block],
      number({ decimal: true }),
      nums(value),
    );
  },
};

/** Measuring jugs in millilitres: top mark, a label every `label` ml, a mark every `step` ml. */
const JUGS = {
  easy: [
    { max: 500, label: 100, step: 20 },
    { max: 500, label: 100, step: 50 },
    { max: 400, label: 100, step: 20 },
    { max: 300, label: 100, step: 20 },
    { max: 200, label: 50, step: 10 },
    { max: 1000, label: 200, step: 50 },
    { max: 1000, label: 100, step: 50 },
  ],
  hard: [
    { max: 500, label: 100, step: 25 },
    { max: 1000, label: 250, step: 50 },
    { max: 1000, label: 500, step: 100 },
    { max: 2000, label: 500, step: 100 },
    { max: 400, label: 200, step: 25 },
    { max: 750, label: 250, step: 50 },
  ],
};

/** Thermometers in °C: bottom and top marks, a label every 10 degrees, a mark every `step` degrees. */
const THERMOMETERS = [
  { lo: -10, hi: 30, step: 2 },
  { lo: -20, hi: 20, step: 2 },
  { lo: -20, hi: 30, step: 5 },
  { lo: -30, hi: 20, step: 5 },
  { lo: -10, hi: 40, step: 5 },
];

function jug(max: number, label: number, step: number, level: number): Block {
  const ticks = max / step;
  const per = label / step;
  return {
    b: 'scale',
    kind: 'jug',
    ticks,
    labels: Array.from({ length: ticks / per }, (_, k) => ({ at: (k + 1) * per, text: fmt((k + 1) * label) })),
    level,
    unit: 'ml',
  };
}

function thermometer(lo: number, hi: number, step: number, level: number): Block {
  const ticks = (hi - lo) / step;
  const per = 10 / step;
  return {
    b: 'scale',
    kind: 'thermometer',
    ticks,
    labels: Array.from({ length: ticks / per + 1 }, (_, k) => ({ at: k * per, text: fmt(lo + k * 10) })),
    level,
    unit: '°C',
  };
}

export const readingScales: ReasoningType = {
  id: 'r-scales',
  label: 'Reading scales',
  topic: 'measurement',
  generate(rng, d) {
    const name = rng.pick(NAMES);
    const useJug = d === 1 || rng.chance(0.5);
    if (useJug) {
      const { max, label, step } = rng.pick(d === 1 ? JUGS.easy : JUGS.hard);
      const ticks = max / step;
      const level = rng.pick(unlabelled(ticks, label / step).filter((i) => i >= 2 && i <= ticks - 2 && (d < 3 || i * step >= 60)));
      const ml = level * step;
      const figure = jug(max, label, step, level);
      if (d < 3) return draft([text('How much water is in this measuring jug?'), figure], number({ suffix: 'ml' }), nums(ml));
      if (rng.chance(0.5)) {
        return draft(
          [text(`${name} wants to fill this jug up to the **${fmt(max)} ml** mark.`), figure, text(`How much more water does ${name} need to add?`)],
          number({ suffix: 'ml' }),
          nums(max - ml),
        );
      }
      const pour = rng.int(2, Math.min(30, Math.floor((ml - 20) / 10))) * 10; // a glass holds up to 300 ml
      return draft(
        [text('This jug has some water in it.'), figure, text(`${name} pours **${fmt(pour)} ml** of the water into a glass.\nHow much water is left in the jug?`)],
        number({ suffix: 'ml' }),
        nums(ml - pour),
      );
    }
    const { lo, hi, step } = rng.pick(THERMOMETERS);
    const ticks = (hi - lo) / step;
    // Outdoor temperatures in the story questions stay between −10°C and 20°C.
    const marks = unlabelled(ticks, 10 / step).filter((i) => d === 2 || (lo + i * step >= -10 && lo + i * step <= 20));
    const below = marks.filter((i) => lo + i * step < 0);
    const level = rng.chance(0.6) && below.length ? rng.pick(below) : rng.pick(marks);
    const reading = lo + level * step;
    const figure = thermometer(lo, hi, step, level);
    const box: NumberBox = { negative: true, suffix: '°C' };
    if (d === 2) return draft([text('What temperature does this thermometer show?'), figure], number(box), nums(reading));
    const fall = rng.chance(0.5);
    const change = rng.int(3, fall ? Math.min(12, reading + 15) : 12); // never colder than −15°C
    const later = fall
      ? { text: `By the evening the temperature had fallen by **${change}** degrees.`, value: reading - change }
      : { text: `By midday the temperature had risen by **${change}** degrees.`, value: reading + change };
    return draft(
      [text('The thermometer shows the temperature outside one morning.'), figure, text(`${later.text}\nWhat was the temperature then?`)],
      number(box),
      nums(later.value),
    );
  },
};

/** Conversion graphs: `xStep` units on the x axis match `yStep` on the y axis, ten squares across. */
const CONVERSIONS = [
  { title: 'Miles and kilometres', x: 'Miles', y: 'Kilometres', xStep: 5, yStep: 8, xBox: { suffix: 'miles' }, yBox: { suffix: 'km' }, xWord: (v: string) => `${v} miles`, yWord: (v: string) => `${v} km` },
  { title: 'Pounds and euros', x: 'Pounds (£)', y: 'Euros (€)', xStep: 5, yStep: 6, xBox: { prefix: '£' }, yBox: { prefix: '€' }, xWord: (v: string) => `£${v}`, yWord: (v: string) => `€${v}` },
  { title: 'Pounds and US dollars', x: 'Pounds (£)', y: 'Dollars ($)', xStep: 4, yStep: 5, xBox: { prefix: '£' }, yBox: { prefix: '$' }, xWord: (v: string) => `£${v}`, yWord: (v: string) => `$${v}` },
  { title: 'Inches and centimetres', x: 'Inches', y: 'Centimetres', xStep: 2, yStep: 5, xBox: { suffix: 'inches' }, yBox: { suffix: 'cm' }, xWord: (v: string) => `${v} inches`, yWord: (v: string) => `${v} cm` },
];

export const conversionGraphs: ReasoningType = {
  id: 'r-conversion-graph',
  label: 'Conversion graphs',
  topic: 'statistics',
  generate(rng, d) {
    const c = rng.pick(CONVERSIONS);
    const n = 10;
    const graph: Block = {
      b: 'line',
      title: c.title,
      labels: Array.from({ length: n + 1 }, (_, i) => String(i * c.xStep)),
      values: Array.from({ length: n + 1 }, (_, i) => i * c.yStep),
      axis: c.y,
      min: 0,
      max: n * c.yStep,
      step: c.yStep,
      xAxis: c.x,
      dots: false,
    };
    const intro = text(`The graph converts between ${c.x.replace(/ \(.*\)$/, '').toLowerCase()} and ${c.y.replace(/ \(.*\)$/, '').toLowerCase()}.`);
    const i = rng.int(1, n - 1);
    if (d === 1) {
      return draft([intro, graph, text(`Use the graph to convert **${c.xWord(fmt(i * c.xStep))}** into ${c.y.replace(/ \(.*\)$/, '').toLowerCase()}.`)], number(c.yBox), nums(i * c.yStep));
    }
    if (d === 2) {
      return draft([intro, graph, text(`Use the graph to convert **${c.yWord(fmt(i * c.yStep))}** into ${c.x.replace(/ \(.*\)$/, '').toLowerCase()}.`)], number(c.xBox), nums(i * c.xStep));
    }
    // Past the end of the graph: read a pair of values, then scale up.
    const k = rng.pick([3, 4, 5, 6, 10]);
    const x = retry(() => {
      const v = rng.int(2, n) * c.xStep * k;
      return v > n * c.xStep ? v : undefined;
    });
    return draft(
      [intro, graph, text(`The graph stops at ${c.xWord(fmt(n * c.xStep))}.\nUse it to convert **${c.xWord(fmt(x))}** into ${c.y.replace(/ \(.*\)$/, '').toLowerCase()}.`)],
      number(c.yBox),
      nums((x / c.xStep) * c.yStep),
    );
  },
};
