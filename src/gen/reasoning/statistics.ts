// Statistics: bar charts, line graphs, pie charts, tables and the mean.
import { rat } from '../../math/rational';
import { retry } from '../build';
import type { ReasoningType } from '../types';
import { choices, draft, number, nums, text } from './helpers';

const CHILDREN = {
  unit: 'Number of children',
  more: (a: string, b: string) => `How many more children chose **${a}** than **${b}**?`,
  total: 'How many children were asked **altogether**?',
};

const THEMES = [
  { ...CHILDREN, title: 'Favourite fruit', labels: ['Apple', 'Banana', 'Grapes', 'Orange', 'Pear'] },
  { ...CHILDREN, title: 'Favourite sport', labels: ['Football', 'Swimming', 'Tennis', 'Netball', 'Cricket'] },
  { ...CHILDREN, title: 'How children travel to school', labels: ['Walk', 'Car', 'Bus', 'Bike', 'Scooter'] },
  {
    title: 'Books read in a week',
    unit: 'Number of books',
    labels: ['Class 3', 'Class 4', 'Class 5', 'Class 6'],
    more: (a: string, b: string) => `How many more books did **${a}** read than **${b}**?`,
    total: 'How many books were read **altogether**?',
  },
];

export const barCharts: ReasoningType = {
  id: 'r-bar-chart',
  label: 'Bar charts',
  topic: 'statistics',
  generate(rng, d) {
    const theme = rng.pick(THEMES);
    // Hard charts have bars ending between gridlines, so their scale goes up in tens.
    const step = d === 1 ? 2 : d === 3 ? 10 : rng.pick([5, 10]);
    const values = retry(() => {
      const v = theme.labels.map(() => rng.int(1, 9) * step + (d === 3 && rng.chance(0.5) ? step / 2 : 0));
      return new Set(v).size === v.length && v.every(Number.isInteger) ? v : undefined;
    });
    const max = Math.ceil((Math.max(...values) + 1) / step) * step;
    const chart = { b: 'bar' as const, title: theme.title, labels: theme.labels, values, axis: theme.unit, max, step };
    if (d === 2) {
      return draft(
        [text('The bar chart shows the results of a survey.'), chart, text(theme.total)],
        number(),
        nums(values.reduce((a, b) => a + b, 0)),
      );
    }
    const [i, j] = rng.shuffle(theme.labels.map((_, k) => k)).slice(0, 2);
    const [hi, lo] = values[i] > values[j] ? [i, j] : [j, i];
    return draft(
      [text('The bar chart shows the results of a survey.'), chart, text(theme.more(theme.labels[hi], theme.labels[lo]))],
      number(),
      nums(values[hi] - values[lo]),
    );
  },
};

const HOURS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

export const lineGraphs: ReasoningType = {
  id: 'r-line-graph',
  label: 'Line graphs',
  topic: 'statistics',
  generate(rng, d) {
    const values = retry(() => {
      const peak = rng.int(2, 4);
      const v = [rng.int(1, 5) * 2];
      for (let i = 1; i < HOURS.length; i++) v.push(v[i - 1] + (i <= peak ? 1 : -1) * rng.pick([2, 4]));
      return v.every((x) => x >= 0 && x <= 24) && new Set(v).size >= 4 ? v : undefined;
    });
    const chart = { b: 'line' as const, title: 'Temperature in the playground', labels: HOURS, values, axis: 'Temperature (°C)', min: 0, max: 24, step: 2 };
    if (d === 1) {
      const i = rng.int(0, HOURS.length - 1);
      return draft([text('The graph shows the temperature during one day.'), chart, text(`What was the temperature at **${HOURS[i]}**?`)], number({ suffix: '°C' }), nums(values[i]));
    }
    if (d === 2) {
      const [i, j] = retry(() => {
        const a = rng.int(0, 2);
        const b = rng.int(a + 1, HOURS.length - 1);
        return values[a] !== values[b] ? [a, b] : undefined;
      });
      return draft(
        [text('The graph shows the temperature during one day.'), chart, text(`How many degrees did the temperature change between **${HOURS[i]}** and **${HOURS[j]}**?`)],
        number({ suffix: 'degrees' }),
        nums(Math.abs(values[j] - values[i])),
      );
    }
    return draft(
      [text('The graph shows the temperature during one day.'), chart, text('What is the difference between the **highest** and the **lowest** temperature?')],
      number({ suffix: 'degrees' }),
      nums(Math.max(...values) - Math.min(...values)),
    );
  },
};

export const pieCharts: ReasoningType = {
  id: 'r-pie-chart',
  label: 'Pie charts',
  topic: 'statistics',
  generate(rng, d) {
    return retry(() => {
      const labels = rng.shuffle(['Football', 'Swimming', 'Tennis', 'Dance', 'Cricket']).slice(0, d === 1 ? 3 : 4);
      // Shares of the circle: halves and quarters, then eighths, then angles.
      const turns =
        d === 1
          ? rng.pick([[1 / 2, 1 / 4, 1 / 4], [1 / 4, 1 / 2, 1 / 4]])
          : d === 2
            ? rng.pick([[1 / 2, 1 / 8, 1 / 4, 1 / 8], [3 / 8, 1 / 8, 1 / 4, 1 / 4], [1 / 4, 3 / 8, 1 / 8, 1 / 4]])
            : rng.pick([[1 / 3, 1 / 6, 1 / 4, 1 / 4], [5 / 12, 1 / 4, 1 / 6, 1 / 6], [1 / 3, 1 / 3, 1 / 4, 1 / 12]]);
      const total = rng.pick(d === 3 ? [36, 48, 60, 72, 120] : [24, 32, 40, 48, 80, 120]);
      const i = rng.int(0, labels.length - 1);
      const answer = total * turns[i];
      if (!Number.isInteger(answer)) return undefined;
      // Every sector must be readable without judging by eye. Right angles carry a mark, but a
      // 45° or 135° sector cannot be told from its neighbours, so at difficulty 2 every sector
      // that is not a right angle shows its angle (at difficulty 3 every sector does).
      const rightAngle = (turn: number) => Math.abs(turn - 1 / 4) < 1e-9;
      const showAngle = (turn: number) => d === 3 || (d === 2 && !rightAngle(turn));
      const slices = labels.map((label, k) => ({ label: showAngle(turns[k]) ? `${label} ${Math.round(turns[k] * 360)}°` : label, turn: turns[k] }));
      const chart = { b: 'pie' as const, title: 'Favourite sport', slices };
      const note = d === 3 ? 'The angle of each sector is shown.' : d === 2 ? 'Right angles are marked and the other angles are shown.' : 'Right angles are marked.';
      return draft(
        [text(`**${total}** children chose their favourite sport. The pie chart shows the results. ${note}`), chart, text(`How many children chose **${labels[i]}**?`)],
        number({ suffix: 'children' }),
        nums(answer),
      );
    });
  },
};

export const mean: ReasoningType = {
  id: 'r-mean',
  label: 'Mean',
  topic: 'statistics',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const n = rng.int(4, 5);
        const values = Array.from({ length: n }, () => rng.int(5, 30));
        const sum = values.reduce((a, b) => a + b, 0);
        if (sum % n) return undefined;
        return draft([text(`Find the **mean** of these numbers:\n**${values.join(', ')}**`)], number(), nums(sum / n));
      }
      if (d === 2) {
        const m = rng.int(6, 20);
        const known = [rng.int(2, 25), rng.int(2, 25), rng.int(2, 25)];
        const fourth = 4 * m - known.reduce((a, b) => a + b, 0);
        if (fourth <= 0) return undefined;
        return draft(
          [text(`The mean of **four** numbers is **${m}**. Three of the numbers are **${known.join(', ')}**.\nWhat is the fourth number?`)],
          number(),
          nums(fourth),
        );
      }
      const matches = ['Match 1', 'Match 2', 'Match 3', 'Match 4', 'Match 5'];
      const goals = matches.map(() => rng.int(0, 6));
      const sum = goals.reduce((a, b) => a + b, 0);
      if (!sum) return undefined;
      return draft(
        [
          text('The table shows how many goals a team scored in five matches.'),
          { b: 'table', head: ['Match', 'Goals'], rows: matches.map((m, i) => [m, String(goals[i])]) },
          text('What was the **mean** number of goals per match?'),
        ],
        number({ decimal: true }),
        nums(rat(sum, 5)),
      );
    });
  },
};

export const tables: ReasoningType = {
  id: 'r-table',
  label: 'Tables',
  topic: 'statistics',
  generate(rng, d) {
    const clubs = rng.shuffle(['Art', 'Chess', 'Choir', 'Coding', 'Drama']).slice(0, 4);
    const [boys, girls] = retry(() => {
      const b = clubs.map(() => rng.int(3, 19));
      const g = clubs.map(() => rng.int(3, 19));
      const t = b.map((x, i) => x + g[i]);
      return t.filter((x) => x === Math.max(...t)).length === 1 ? [b, g] : undefined;
    });
    const totals = clubs.map((_, i) => boys[i] + girls[i]);
    if (d === 1) {
      const i = rng.int(0, 3);
      return draft(
        [
          text('The table shows how many boys and girls go to each after-school club.'),
          { b: 'table', head: ['Club', 'Boys', 'Girls'], rows: clubs.map((c, k) => [c, String(boys[k]), String(girls[k])]) },
          text(`How many children go to **${clubs[i]}** club altogether?`),
        ],
        number(),
        nums(totals[i]),
      );
    }
    if (d === 2) {
      // Total column given, one cell missing.
      const i = rng.int(0, 3);
      return draft(
        [
          text('The table shows how many boys and girls go to each after-school club. One number is missing.'),
          {
            b: 'table',
            head: ['Club', 'Boys', 'Girls', 'Total'],
            rows: clubs.map((c, k) => [c, String(boys[k]), k === i ? '?' : String(girls[k]), String(totals[k])]),
          },
          text(`How many girls go to **${clubs[i]}** club?`),
        ],
        number(),
        nums(girls[i]),
      );
    }
    const best = totals.indexOf(Math.max(...totals));
    const { input, answer } = choices(rng, [clubs[best]], clubs.filter((_, k) => k !== best));
    return draft(
      [
        text('The table shows how many boys and girls go to each after-school club.'),
        { b: 'table', head: ['Club', 'Boys', 'Girls'], rows: clubs.map((c, k) => [c, String(boys[k]), String(girls[k])]) },
        text('Which club has the **most** children altogether? Tick one.'),
      ],
      input,
      answer,
    );
  },
};
