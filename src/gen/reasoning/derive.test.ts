// Each newer reasoning template's answer is worked out again here from what the pupil sees (the
// text, the options and the figure), with nothing shared with the generator, and must match the key.
import { describe, expect, it } from 'vitest';
import { add, cmp, div, eq, fromDecimalString, mul, neg, rat, sub, type Rational } from '../../math/rational';
import { createRng } from '../rng';
import type { Block, Difficulty, ItemQuestion } from '../types';
import { nums } from './helpers';
import { generateReasoningPaper } from './paper';
import { REASONING_TYPES } from './registry';

const SEEDS = 1000;

// ---- Reading what is printed ----

const textOf = (q: ItemQuestion) => q.body.flatMap((b) => (b.b === 'text' ? [b.text] : [])).join('\n');
const bolds = (q: ItemQuestion) => [...textOf(q).matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);

function block<K extends Block['b']>(q: ItemQuestion, kind: K): Extract<Block, { b: K }> {
  const b = q.body.find((x) => x.b === kind);
  if (!b) throw new Error(`no ${kind} figure`);
  return b as Extract<Block, { b: K }>;
}

/** A printed number: "1,288", "−0.5", "[[3/4]]", "[[2 1/4]]", "45%", "3.5%", "£2.40", "85p". */
function value(printed: string): Rational {
  const t = printed.replace(/\*\*/g, '').trim();
  const f = /^\[\[(?:(\d+)[ _])?(\d+)\/(\d+)\]\]$/.exec(t);
  if (f) return rat(Number(f[1] ?? 0) * Number(f[3]) + Number(f[2]), Number(f[3]));
  const p = /^(\d+)p$/.exec(t);
  if (p) return rat(Number(p[1]), 100);
  const m = /^([−-])?£?([\d,]+(?:\.\d+)?)(%)?$/.exec(t);
  if (!m) throw new Error(`not a number: "${printed}"`);
  let r = fromDecimalString(m[2].replace(/,/g, ''));
  if (m[1]) r = neg(r);
  if (m[3]) r = div(r, rat(100));
  return r;
}

/** Works out "3 × 0.4", "1,000 − 365", "[[2/3]] of 24", "25% of 60", "3 − 8": ×, ÷ and "of" before + and −. */
function evaluate(expression: string): Rational {
  const tokens = expression
    .replace(/\*\*/g, '')
    .replace(/\[\[(\d+) (\d+)\/(\d+)\]\]/g, '[[$1_$2/$3]]')
    .trim()
    .split(/\s+/);
  const values: Rational[] = [];
  const ops: string[] = [];
  tokens.forEach((t, i) => (i % 2 === 0 ? values.push(value(t)) : ops.push(t)));
  const sums: Rational[] = [values[0]];
  const signs: string[] = [];
  ops.forEach((o, i) => {
    const v = values[i + 1];
    if (o === '×' || o === 'of') sums[sums.length - 1] = mul(sums[sums.length - 1], v);
    else if (o === '÷') sums[sums.length - 1] = div(sums[sums.length - 1], v);
    else if (o === '+' || o === '−') {
      signs.push(o);
      sums.push(v);
    } else throw new Error(`unknown operation "${o}" in "${expression}"`);
  });
  return sums.slice(1).reduce((acc, v, i) => (signs[i] === '+' ? add(acc, v) : sub(acc, v)), sums[0]);
}

/** Whether "L = R", "L < R" or "L > R" is true. */
function holds(statement: string): boolean {
  const m = /^(.+) ([=<>]) (.+)$/.exec(statement);
  if (!m) throw new Error(`not a statement: "${statement}"`);
  const c = cmp(evaluate(m[1]), evaluate(m[3]));
  return m[2] === '=' ? c === 0 : m[2] === '<' ? c < 0 : c > 0;
}

/** Value at tick `at` of a scale whose first two labels are known. */
function scaleValue(labels: { at: number; text: string }[], at: number): Rational {
  const [a, b] = labels;
  const step = div(sub(value(b.text), value(a.text)), rat(b.at - a.at));
  return add(value(a.text), mul(step, rat(Math.round(at * 2) - 2 * a.at, 2)));
}

const indexesOf = (options: string[], ok: (o: string, i: number) => boolean) =>
  options.flatMap((o, i) => (ok(o, i) ? [i] : [])).join(',');

const choiceOptions = (q: ItemQuestion) => {
  if (q.input.kind !== 'choice') throw new Error('not a choice question');
  return q.input.options;
};

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

type AngleKind = 'acute' | 'right angle' | 'obtuse' | 'reflex';
const kindOf = (a: number): AngleKind | 'other' => (a < 90 ? 'acute' : a === 90 ? 'right angle' : a < 180 ? 'obtuse' : a > 180 && a < 360 ? 'reflex' : 'other');

const POLYGON_SIDES: Record<string, number> = { pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8, nonagon: 9, decagon: 10 };
const PARTS: Record<string, number> = { halves: 2, thirds: 3, quarters: 4, fifths: 5, sixths: 6, eighths: 8, tenths: 10 };
const TIME: Record<string, [string, number]> = { hours: ['minutes', 60], minutes: ['seconds', 60], weeks: ['days', 7], years: ['months', 12], days: ['hours', 24] };

/** Every way to fill the lettered boxes of a column calculation (no number starts with 0). */
function fillings(b: Extract<Block, { b: 'column' }>): number[][] {
  const letters = [...new Set([...b.rows, b.total].join('').match(/[A-Z]/g) ?? [])].sort();
  const out: number[][] = [];
  const digits: number[] = [];
  const walk = (k: number) => {
    if (k === letters.length) {
      const fill = (s: string) => s.replace(/[A-Z]/g, (ch) => String(digits[letters.indexOf(ch)]));
      const [x, y, z] = [...b.rows.map(fill), fill(b.total)];
      if ([x, y, z].some((s) => s.length > 1 && s[0] === '0')) return;
      const [p, r, t] = [x, y, z].map(Number);
      if (b.op === '+' ? p + r === t : b.op === '−' ? p - r === t : p * r === t) out.push([...digits]);
      return;
    }
    for (let dgt = 0; dgt <= 9; dgt++) {
      digits[k] = dgt;
      walk(k + 1);
    }
  };
  walk(0);
  return out;
}

/** Angles where lines cross, from the labels: vertically opposite angles are equal, a straight line is 180°. */
function crossAngles(labels: string[]): (number | null)[] {
  const n = labels.length;
  const half = n / 2;
  const v = labels.map((l) => (/^\d+°$/.test(l) ? Number(l.slice(0, -1)) : null));
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) v[i] ??= v[(i + half) % n];
    for (let i = 0; i < n; i++) {
      if (v[i] !== null) continue;
      const others = Array.from({ length: half - 1 }, (_, k) => v[(i + 1 + k) % n]);
      if (others.every((x) => x !== null)) v[i] = 180 - others.reduce<number>((s, x) => s + (x ?? 0), 0);
    }
  }
  return v;
}

// ---- The answer each template should have, worked out from the question ----

const DERIVE: Record<string, (q: ItemQuestion) => string> = {
  'r-number-line': (q) => {
    const b = block(q, 'numberline');
    return nums(scaleValue(b.labels, b.arrow));
  },

  'r-scales': (q) => {
    const b = block(q, 'scale');
    const reading = scaleValue(b.labels, b.level);
    const t = textOf(q);
    if (/How much water is in this measuring jug\?|What temperature does this thermometer show\?/.test(t)) return nums(reading);
    const fill = /up to the \*\*([\d,]+) ml\*\* mark/.exec(t);
    if (fill) return nums(sub(value(fill[1]), reading));
    const pour = /pours \*\*([\d,]+) ml\*\*/.exec(t);
    if (pour) return nums(sub(reading, value(pour[1])));
    const change = /(fallen|risen) by \*\*(\d+)\*\* degrees/.exec(t);
    if (change) return nums(change[1] === 'fallen' ? sub(reading, value(change[2])) : add(reading, value(change[2])));
    throw new Error('unknown scale question');
  },

  'r-conversion-graph': (q) => {
    const b = block(q, 'line');
    const rate = rat(b.values[1], Number(b.labels[1]));
    const target = bolds(q).at(-1)!;
    const amount = value(target.replace(/[€$]/, '').replace(/ (miles|km|inches|cm)$/, ''));
    // The x axis is miles, inches or pounds; the y axis kilometres, centimetres, euros or dollars.
    return nums(/^£|miles$|inches$/.test(target) ? mul(amount, rate) : div(amount, rate));
  },

  'r-missing-digits': (q) => {
    const all = fillings(block(q, 'column'));
    if (all.length !== 1) return `${all.length} ways to fill the boxes`;
    return nums(...all[0]);
  },

  'r-known-facts': (q) => {
    const [fact, target] = bolds(q);
    const [left, right] = fact.split(' = ');
    if (!eq(evaluate(left), value(right))) return 'the given fact is wrong';
    return nums(evaluate(target));
  },

  'r-compare-signs': (q) => {
    const [left, right] = bolds(q).find((s) => s.includes('□'))!.split('□');
    const sign = ['<', '=', '>'][cmp(evaluate(left), evaluate(right)) + 1];
    return String(choiceOptions(q).indexOf(sign));
  },

  'r-true-false': (q) => {
    if (q.input.kind !== 'tf') throw new Error('not true or false');
    return q.input.statements.map((s) => (holds(s) ? '1' : '0')).join(',');
  },

  'r-mixed-numbers': (q) => {
    const t = textOf(q);
    const parts = /How many \*\*(\w+)\*\* are there in \[\[(\d+) (\d+)\/(\d+)\]\]/.exec(t);
    if (parts) {
      const [, name, w, n, d] = parts;
      if (PARTS[name] !== Number(d)) return `${name} are not 1/${d}`;
      return nums(Number(w) * Number(d) + Number(n));
    }
    const improper = /Write \[\[(\d+)\/(\d+)\]\] as a \*\*mixed number\*\*/.exec(t);
    if (improper) return Number(improper[1]) > Number(improper[2]) ? nums(rat(Number(improper[1]), Number(improper[2]))) : 'not improper';
    const slices = /cut into \*\*(\d+)\*\* equal slices\. At the end, \*\*(\d+)\*\* slices/.exec(t);
    if (slices) return nums(rat(Number(slices[2]), Number(slices[1])));
    const drink = /drinks \[\[(\d+)\/(\d+)\]\] of a litre[^]*in \*\*(\d+)\*\* days/.exec(t);
    if (drink) return nums(rat(Number(drink[1]) * Number(drink[3]), Number(drink[2])));
    throw new Error('unknown mixed-number question');
  },

  'r-order-fdp': (q) => {
    if (q.input.kind !== 'order') throw new Error('not an ordering question');
    const sign = q.input.first === 'largest' ? -1 : 1;
    return q.input.items
      .map((text, i) => ({ v: value(text), i }))
      .sort((a, b) => sign * cmp(a.v, b.v))
      .map((x) => x.i)
      .join(',');
  },

  'r-time-units': (q) => {
    const t = textOf(q);
    const quarter = /How many \*\*minutes\*\* are there in \[\[(\d+)\/(\d+)\]\] of an hour\?/.exec(t);
    if (quarter) return nums(div(rat(60 * Number(quarter[1])), rat(Number(quarter[2]))));
    const howMany = /How many \*\*(\w+)\*\* are there in \*\*(.+) (\w+)\*\*\?/.exec(t);
    if (howMany) {
      const [small, factor] = TIME[howMany[3]];
      if (small !== howMany[1]) return 'units do not match';
      return nums(mul(evaluate(howMany[2]), rat(factor)));
    }
    const split = /Write \*\*([\d,]+) (\w+)\*\* in (\w+) and (\w+)\./.exec(t);
    if (split) {
      const [small, factor] = TIME[split[3]];
      if (small !== split[2] || small !== split[4]) return 'units do not match';
      const total = Number(split[1].replace(/,/g, ''));
      return nums(Math.floor(total / factor), total % factor);
    }
    const films = /lasts \*\*(\d+) hours? (\d+) minutes?\*\*\. .* lasts \*\*(\d+) minutes\*\*/.exec(t);
    if (films) return nums(Number(films[3]) - 60 * Number(films[1]) - Number(films[2]));
    const practice = /for \*\*(\d+) minutes\*\* every day for \*\*(\d+) weeks\*\*/.exec(t);
    if (practice) {
      const total = Number(practice[1]) * 7 * Number(practice[2]);
      return nums(Math.floor(total / 60), total % 60);
    }
    const ages = /is \*\*(\d+) years? (\d+) months?\*\* old\. .* is \*\*(\d+) months\*\* old/.exec(t);
    if (ages) return nums(12 * Number(ages[1]) + Number(ages[2]) - Number(ages[3]));
    const race = /in \*\*(\d+) minutes? (\d+) seconds?\*\*\. .* in \*\*(\d+) seconds\*\*/.exec(t);
    if (race) return nums(60 * Number(race[1]) + Number(race[2]) - Number(race[3]));
    throw new Error('unknown time question');
  },

  'r-angles-cross': (q) => {
    const b = block(q, 'angles');
    if (b.shape !== 'cross' || q.input.kind !== 'number') return 'not crossing lines';
    const angles = crossAngles(b.labels);
    const found = q.input.boxes.map((box) => angles[b.labels.indexOf(box.label ?? 'a')]);
    return found.every((a) => a !== null && a !== undefined) ? nums(...(found as number[])) : 'the diagram does not give the angle';
  },

  'r-angle-types': (q) => {
    const t = textOf(q);
    const options = choiceOptions(q);
    const asked = /\*\*(acute|obtuse|reflex)\*\*|\*\*two\*\* (acute|obtuse|reflex) angles/.exec(t);
    if (q.body.some((b) => b.b === 'angleset')) {
      const kind = asked![1] ?? asked![2];
      const angles = block(q, 'angleset').angles;
      return indexesOf(options, (o) => kindOf(angles[o.charCodeAt(0) - 65]) === kind);
    }
    if (options.every((o) => /^\d+°$/.test(o))) {
      const kind = asked![1] ?? asked![2];
      return indexesOf(options, (o) => kindOf(Number(o.slice(0, -1))) === kind);
    }
    const clock = /shows \*\*(\d+) o'clock\*\*/.exec(t);
    if (clock) {
      const a = (30 * Number(clock[1])) % 360;
      return String(options.indexOf(kindOf(Math.min(a, 360 - a))));
    }
    const compass = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    const turn = /facing \*\*([\w-]+)\*\*\. .* until facing \*\*([\w-]+)\*\*/.exec(t);
    if (turn) {
      const steps = (compass.indexOf(turn[2]) - compass.indexOf(turn[1]) + 8) % 8;
      return String(options.indexOf(kindOf(steps * 45)));
    }
    throw new Error('unknown angle-type question');
  },

  'r-regular-polygon': (q) => {
    const b = block(q, 'polygon');
    const t = textOf(q);
    const named = /regular \*\*(\w+)\*\*/.exec(t)![1];
    if (POLYGON_SIDES[named] !== b.sides) return `a ${named} does not have ${b.sides} sides`;
    const total = (b.sides - 2) * 180;
    const stated = /add up to \*\*([\d,]+)°\*\*/.exec(t);
    if (stated && !eq(value(stated[1]), rat(total))) return 'the stated total is wrong';
    const inside = rat(total, b.sides);
    if (b.label !== 'a') return b.label === `${total / b.sides}°` && /What do all the angles/.test(t) ? nums(total) : 'bad label';
    switch (b.mark) {
      case 'interior':
        return nums(inside);
      case 'exterior':
        return nums(sub(rat(180), inside));
      case 'diagonal':
        return nums(div(sub(rat(180), inside), rat(2)));
      case 'centre':
        return nums(rat(360, b.sides));
      case 'spoke':
        return nums(div(sub(rat(180), rat(360, b.sides)), rat(2)));
    }
  },

  'r-cubes': (q) => {
    const hs = block(q, 'cubes').heights;
    const count = hs.flat().reduce((s, h) => s + h, 0);
    const cuboid = /\*\*(\d+) cubes long\*\*, \*\*(\d+) cubes wide\*\* and \*\*(\d+) cubes high\*\*/.exec(textOf(q));
    if (!cuboid) return nums(count);
    const [l, w, h] = cuboid.slice(1).map(Number);
    if (l !== hs[0].length || w !== hs.length || h !== Math.max(...hs.flat())) return 'the cuboid is not the one round the shape';
    return nums(l * w * h - count);
  },

  'r-area-squares': (q) => {
    const g = block(q, 'grid');
    if (!g.shape) return nums(g.shaded.length);
    const twice = g.shape.reduce((s, [x, y], i) => {
      const [nx, ny] = g.shape![(i + 1) % g.shape!.length];
      return s + x * ny - nx * y;
    }, 0);
    return nums(rat(Math.abs(twice), 2));
  },

  'r-pairs': (q) => {
    const t = textOf(q);
    const eqn = /\*\*(\d*)a \+ (\d*)b = (\d+)\*\*/.exec(t);
    const money = /cost \*\*(\d+)p\*\* each and .* cost \*\*(\d+)p\*\* each\. .* spends exactly \*\*(.+?)\*\*/.exec(t);
    const [p, r, total] = eqn
      ? [Number(eqn[1] || 1), Number(eqn[2] || 1), Number(eqn[3])]
      : [Number(money![1]), Number(money![2]), mul(value(money![3]), rat(100)).n];
    const works = (a: number, b: number) => a > 0 && b > 0 && p * a + r * b === total;
    const all: [number, number][] = [];
    for (let a = 1; a * p < total; a++) for (let b = 1; b * r < total; b++) if (works(a, b)) all.push([a, b]);
    if (q.input.kind === 'number') return nums(all.length);
    const told = /There are \*\*(\d+)\*\* pairs/.exec(t);
    if (told && Number(told[1]) !== all.length) return 'the number of pairs is wrong';
    return indexesOf(choiceOptions(q), (o) => {
      const [a, b] = o.match(/\d+/g)!.map(Number);
      return works(a, b);
    });
  },

  'r-round-large': (q) => {
    const t = textOf(q);
    const round = (n: number, to: number) => Math.floor(n / to + 0.5) * to;
    const plain = /\*\*([\d,]+)\*\*[^*]*\nRound this number to the nearest \*\*([\d,]+)\*\*/.exec(t);
    if (plain) return nums(round(value(plain[1]).n, value(plain[2]).n));
    const back = /rounded to the nearest \*\*([\d,]+)\*\* is \*\*([\d,]+)\*\*\.\nWhat is the \*\*(smallest|largest)\*\*/.exec(t);
    if (back) {
      const [to, r] = [value(back[1]).n, value(back[2]).n];
      // Search outwards from the rounded number for the last whole number that still rounds to it.
      let n = r;
      const dir = back[3] === 'smallest' ? -1 : 1;
      while (round(n + dir * 1000, to) === r) n += dir * 1000;
      while (round(n + dir, to) === r) n += dir;
      return nums(n);
    }
    const tick = /round to \*\*([\d,]+)\*\* when rounded to the nearest million/.exec(t);
    if (tick) return indexesOf(choiceOptions(q), (o) => round(value(o).n, 1_000_000) === value(tick[1]).n);
    throw new Error('unknown rounding question');
  },

  'r-lcm': (q) => {
    const t = textOf(q);
    const every = [...t.matchAll(/every \*\*(\d+) (?:seconds|minutes)\*\*/g)].map((m) => Number(m[1]));
    const packs = [...t.matchAll(/packs of \*\*(\d+)\*\*/g)].map((m) => Number(m[1]));
    if (packs.length === 2) {
      const n = lcm(packs[0], packs[1]);
      return nums(n / packs[0], n / packs[1]);
    }
    const n = lcm(every[0], every[1]);
    const at = /leaves at \*\*(\d\d):(\d\d)\*\*/.exec(t);
    if (!at) return nums(n);
    const next = Number(at[1]) * 60 + Number(at[2]) + n;
    return nums(Math.floor(next / 60), next % 60);
  },

  'r-best-value': (q) => {
    const rows = block(q, 'table').rows;
    const amount = (label: string) => {
      const m = /^([\d.]+) (kg|g|\w+)/.exec(label)!;
      return mul(value(m[1]), rat(m[2] === 'kg' ? 1000 : 1));
    };
    const each = rows.map(([label, price]) => ({ label, per: div(value(price), amount(label)) }));
    const least = each.reduce((m, x) => (cmp(x.per, m) < 0 ? x.per : m), each[0].per);
    const best = each.filter((x) => eq(x.per, least));
    return indexesOf(choiceOptions(q), (o) => (best.length > 1 ? o === 'They are the same value' : o === best[0].label));
  },
};

const NEW = Object.keys(DERIVE);

describe('newer templates: the answer follows from what is printed', () => {
  it('every one of them is a real template', () => {
    const ids = new Set(REASONING_TYPES.map((t) => t.id));
    expect(NEW.filter((id) => !ids.has(id))).toEqual([]);
    expect(NEW).toHaveLength(19);
  });

  describe.each(NEW)('%s', (id) => {
    const type = REASONING_TYPES.find((t) => t.id === id)!;
    it.each([1, 2, 3] as Difficulty[])('difficulty %i', (d) => {
      const failures: string[] = [];
      for (let s = 0; s < SEEDS; s++) {
        const q: ItemQuestion = { format: 'reasoning', typeId: id, difficulty: d, marks: 1, ...type.generate(createRng(`derive/${id}/${d}/${s}`), d) };
        const expected = DERIVE[id](q);
        if (expected !== q.answer) failures.push(`${expected} ≠ ${q.answer}: ${textOf(q).slice(0, 140)} ${JSON.stringify(q.input).slice(0, 120)}`);
      }
      expect(failures.slice(0, 3)).toEqual([]);
    });
  });

  it('holds in whole papers too', () => {
    for (let i = 0; i < 150; i++) {
      for (const q of generateReasoningPaper(`DERIVE${i}`)) {
        if (DERIVE[q.typeId]) expect(DERIVE[q.typeId](q), `${q.typeId}: ${textOf(q).slice(0, 80)}`).toBe(q.answer);
      }
    }
  });
});

describe('the checker itself', () => {
  it('reads printed numbers and calculations', () => {
    expect(evaluate('[[2/3]] of 24')).toEqual(rat(16));
    expect(evaluate('25% of 60')).toEqual(rat(15));
    expect(evaluate('1,000 − 365')).toEqual(rat(635));
    expect(evaluate('3 − 8')).toEqual(rat(-5));
    expect(evaluate('−4')).toEqual(rat(-4));
    expect(evaluate('4 × 0.3')).toEqual(rat(6, 5));
    expect(evaluate('0.5 + 0.8')).toEqual(rat(13, 10));
    expect(evaluate('[[1 3/4]]')).toEqual(rat(7, 4));
    expect(evaluate('2 + 3 × 4')).toEqual(rat(14));
    expect(value('3.5%')).toEqual(rat(7, 200));
    expect(value('£2.40')).toEqual(rat(12, 5));
    expect(value('85p')).toEqual(rat(17, 20));
  });

  it('judges statements', () => {
    expect(holds('[[1/4]] = 0.25')).toBe(true);
    expect(holds('[[1/3]] = 0.3')).toBe(false);
    expect(holds('[[1/2]] + [[1/4]] = [[2/6]]')).toBe(false);
    expect(holds('0.45 < [[1/2]]')).toBe(true);
    expect(holds('65% > [[2/3]]')).toBe(false);
  });

  it('finds every way to fill a column calculation', () => {
    expect(fillings({ b: 'column', op: '+', rows: ['4A6', '828'], total: '1B04' })).toEqual([[7, 3]]);
    // 2A × 5 = 1B0 has five answers: A can be 0, 2, 4, 6 or 8.
    expect(fillings({ b: 'column', op: '×', rows: ['2A', '5'], total: '1B0' })).toHaveLength(5);
  });

  it('works out crossing lines', () => {
    expect(crossAngles(['65°', 'a', 'b', ''])).toEqual([65, 115, 65, 115]);
    expect(crossAngles(['40°', '', 'a', '', '60°', ''])).toEqual([40, 60, 80, 40, 60, 80]);
  });
});
