# KS2 Arithmetic Practice — Design

Date: 2026-09-23 · Status: approved, building autonomously

## Goal

An offline-capable web app (PWA) for one Year 6 pupil on an iPad, generating unlimited
SATs-style **Paper 1 (arithmetic)** practice papers, marking them, and showing where the
pupil is weak (statistics + heat maps).

## Scope (v1)

- Paper 1 arithmetic only. Reasoning papers (2 and 3) are a later phase.
- Paper format: **40 questions, 1 mark each, easy → hard, split into Day 1–5 (8 a day)**,
  the format of the practice papers the class teacher sends.
- Out of scope for v1: targeted "weak spot" practice sets, cloud sync, on-screen scratchpad,
  timed countdown, reasoning papers.

## Screens

1. **Profiles** — pick or create a profile by name. No password. Data stays on the device.
2. **Home** — continue the paper in progress, start a new paper (Daily 8-a-day or Full 40),
   recent sessions, links to Report and Settings.
3. **Test** — one question at a time, big type; question map for the session (8 or 40 chips:
   current / answered / flagged); custom on-screen keypad (never the iOS keyboard); Back / Next /
   Flag; elapsed timer (counts only while the app is visible, no countdown); Finish with a
   confirmation when questions are unanswered. Answers are marked only at Finish, like the real
   test.
4. **Result** — session score (e.g. 7/8, 88 %), time, average time per question, paper total when
   the paper is complete, per-topic breakdown, every question with the pupil's answer, ✓/✗ and
   the correct answer.
5. **Report** — statistics and heat maps (see below).
6. **Settings** — backup (share / download / copy JSON) and restore (file or pasted JSON, merged
   by id), switch profile.

UI language is English (the pupil is taught in English). Light theme only.

## Answer input and marking

- Answer kinds: `int`, `dec` → one box; `frac` → mixed-number boxes (whole, numerator,
  denominator). In a fraction answer the whole box also accepts a decimal when numerator and
  denominator are empty ("as decimal").
- Keypad: 0–9, `.`, ⌫, Clear. Boxes are display elements, not `<input>`s.
- Marking is exact rational comparison: any equivalent form scores (3/4 = 6/8 = 0.75,
  9/8 = 1 1/8). Empty or malformed answers score 0.
- "Show your method" questions (long multiplication / long division) score 1 mark on the
  answer; working is done on paper.

## Question model

A question is a serialisable snapshot so history survives generator changes:

```ts
type Part =
  | { t: 'num'; v: string }                        // canonical decimal string: "4478", "0.06"
  | { t: 'op'; v: '+' | '-' | '×' | '÷' | '=' | '(' | ')' | 'of' }
  | { t: 'frac'; n: number; d: number; w?: number } // w = whole part of a mixed number
  | { t: 'pow'; b: number; e: 2 | 3 }
  | { t: 'pct'; v: string }                        // "20" → 20%
  | { t: 'box' };                                  // answer position when inline

interface Question {
  typeId: string;
  difficulty: 1 | 2 | 3;
  parts: Part[];         // without a box: rendered as parts, "=", answer box
  answer: string;        // exact rational "n/d"
  kind: 'int' | 'dec' | 'frac';
  showMethod?: boolean;
}
```

`of` has the precedence of ×. Numbers render with thousands commas (4,478) and `−` for minus.

## Question types (31) and difficulty bands

| Topic | Type id | d1 | d2 | d3 |
|---|---|---|---|---|
| Place value | `pv-partition` | 4-digit, N = parts with one □ | 5-digit | decimal with 2 dp |
| | `pv-add-sub-power` | 3-digit ± 10/100, no bridging | 4-digit ± 10/100/1000, bridging | 5–6-digit ± 1000/10000, bridging |
| | `pv-mul-div-10` | whole × 10/100 | whole ÷ 10/100 → decimal, decimal × 10/100 | decimal ÷ 10/100/1000, decimal × 1000 |
| Addition & subtraction | `add-column` | 3-digit + 3-digit | 4-digit + 4-digit, carries | 5-digit + 4/5-digit |
| | `add-three` | three 2-digit | 4-digit + 3-digit + 2-digit | 5-digit + 4-digit + 3-digit |
| | `sub-column` | 2/3-digit − 2-digit | 4-digit − 4-digit, exchange | 5-digit with zeros − 4/5-digit |
| | `sub-round` | 1,000 − hundreds/tens | 2,000–9,000 − 3-digit | 10,000 / 100,000 − 4/5-digit |
| | `missing-add-sub` | □ ± a = c, 2–3-digit | 3–4-digit | 4–5-digit |
| Multiplication & division | `mul-div-0-1` | n × 1, n ÷ 1, n × 0, 0 ÷ n, n ÷ n | larger n | larger n |
| | `mul-mental` | 1-digit × multiple of 10, a × b × 10 | 30 × 40 | 600 × 70, 3 × 50 × 20 |
| | `mul-short` | 2-digit × 1-digit | 3-digit × 1-digit | 4-digit × 1-digit |
| | `div-short` | 2-digit ÷ 1-digit, exact | 3-digit ÷ 1-digit | 4-digit ÷ 1-digit |
| | `mul-long` (method) | 3-digit × 2-digit | 4-digit × 2-digit (11–49) | 4-digit × 2-digit (31–99) |
| | `div-long` (method) | 3-digit ÷ 11–19, exact | 4-digit ÷ 12–25 | 4-digit ÷ 26–59 |
| | `missing-mul-div` | times tables with □ | multiples of 10 | 3-digit × 1-digit, □ × 210 = 1,470 |
| Order & powers | `order-ops` | a + b × c, a + b ÷ c | a − b × c, (a + b) × c | brackets + 3 operations |
| | `squares-cubes` | n², n ≤ 12 | n³, n ≤ 5 or 10 | a² + b³, a³ − b², a² × b |
| Fractions | `frac-add-same` | sum < 1 | sum > 1 | three fractions / mixed + proper |
| | `frac-sub-same` | a/d − b/d | 1 − a/d, 2 − a/d | whole − mixed |
| | `frac-add-diff` | related denominators | related, sum > 1 | unrelated denominators |
| | `frac-sub-diff` | related | related, larger | unrelated |
| | `frac-mixed` | same denominator, no exchange | exchange / related denominators | different denominators |
| | `frac-mul-frac` | unit × unit | proper × proper | proper × proper, cancelling |
| | `frac-mul-whole` | unit fraction × whole | non-unit × whole | mixed × whole |
| | `frac-div-whole` | unit ÷ whole | non-unit ÷ whole | numerator divisible / mixed ÷ whole |
| | `frac-of` | unit fraction of amount | non-unit of amount | 7/12 of 1,800 style |
| Decimals | `dec-add` | 1 dp + 1 dp | mixed dp | 2 dp + 1 dp, carries |
| | `dec-sub` | 1 dp − 1 dp | whole − decimal | mixed dp, exchange |
| | `dec-mul` | 1 dp × 1-digit | 1 dp × multiple of 10 | 2 dp × 1-digit, 1 dp × 2-digit |
| | `dec-div` | 1 dp ÷ 1-digit | 2 dp answers | 2 dp ÷ 1-digit |
| Percentages | `pct-of` | 10 / 25 / 50 % | 1 / 4 / 5 / 20 / 75 % | 12 / 15 / 35 / 45 / 60 % |

All answers are positive; division answers are exact; percentage and fraction-of-amount answers
are whole numbers.

## Paper blueprint

40 ordered slots; each slot lists `{ type, d: [difficulties] }` options. Generation picks an
option and a difficulty with a seeded RNG. Each slot derives its own seed from
`paperCode + slot`, so a paper code always regenerates the same paper. Exact duplicate prompts
inside one paper are rerolled. Day 1 is warm-up (+, −, place value), long multiplication first
appears at Q16, decimals / squares on Day 3, percentages and fraction × on Day 4, unlike
denominators, mixed numbers and long division on Day 5. Every type appears in some slot.

Paper codes are 6 characters from an unambiguous alphabet (no 0/O/1/I/L).

## Data

One `localStorage` key holding `{ schemaVersion, profiles, attempts, currentProfileId }`.
An attempt covers one paper:

```ts
interface Attempt {
  id: string; profileId: string; paperCode: string;
  mode: 'daily' | 'full';
  createdAt: number; completedAt: number | null;
  questions: Question[];               // 40 snapshots
  answers: (AnswerInput | null)[];     // 40
  flagged: boolean[]; timeMs: number[]; // 40 each
  marks: (0 | 1 | null)[];             // null until the question's session is submitted
  markedAt: (number | null)[];
  current: number;                     // question index on screen
}
```

Daily mode sessions are slots 1–8, 9–16, …; full mode is one session of 40. Saved on every
answer. Backup/restore merges attempts and profiles by id.

## Statistics and heat maps (Report)

Built from every marked question (type, topic, difficulty, slot, correct, time, date):

- Summary: papers completed, sessions, questions answered, accuracy, average time per question,
  questions in the last 7 days.
- Score history: % per session, chronological.
- Accuracy by topic (7 topics).
- **Skill heat map**: every type as a tile grouped by topic, coloured by accuracy, showing
  `correct/n`; tiles with n < 3 are dimmed, unattempted tiles show "—".
- **Progress heat map**: types × last 8 weeks, coloured by that week's accuracy.
- **Paper position heat map**: Day 1–5 × question 1–8 accuracy (does accuracy fall off late in
  the paper?).
- Type table: answered, accuracy, average time, sorted weakest first.

Charts are hand-written SVG/CSS; no chart library.

## Tech

Vite + React + TypeScript (no enums: `erasableSyntaxOnly`), in-memory screen state (no history
routing), `vite-plugin-pwa` (generateSW, auto update, `@vite-pwa/assets-generator` icons incl.
180 px `apple-touch-icon`), iOS meta tags, safe-area padding, `touch-action: manipulation`.
`base: '/ks2-sats-maths/'`. Hosted on GitHub Pages from a public repo, deployed by a GitHub
Actions workflow on every push to `main` (tests must pass).

## Testing

Vitest:
- Rational arithmetic and answer parsing/equivalence.
- Property tests per type × difficulty over 1,000 seeds: never throws, answer re-derived by an
  independent evaluator of the prompt (box substituted, both sides of `=` compared), positive
  answers, integer answers where required, bounded decimal places, no `NaN`/`undefined` in
  rendered text.
- Paper: 40 questions, deterministic per code, every type reachable, no duplicate prompts.
- Statistics aggregation on fixtures; store merge/validation.

Manual: production build previewed in the browser at tablet sizes (768×1024, 1024×768),
playing a Day session and a full paper end to end.

## Build order

1. Rational, RNG, question model, evaluator.
2. Generators + blueprint + property tests.
3. Answer parsing/marking, store.
4. UI: profiles, home, test, keypad, result.
5. Statistics + report with heat maps.
6. PWA, icons, iOS polish, README, deploy workflow, GitHub repo + Pages.

---

# Phase 2: Reasoning papers (Papers 2 and 3)

Date: 2026-09-23 · Status: approved ("do Papers 2 and 3"), building autonomously

## Format

- Papers 2 and 3 share one format, so the app has one **reasoning paper** generator; each new
  paper is a fresh draw. The UI labels it "Papers 2 & 3: Reasoning".
- **25 questions, 35 marks**, easy → hard. Daily mode: 5 days × 5 questions, each day 3 one-mark
  and 2 two-mark questions (7 marks). Full mode: all 25, suggested time 40 minutes (shown next to
  the timer, never enforced).
- Two-mark questions score 2 or 0: a typed answer cannot show working, so no method mark. Results
  say this, since the real test can give 1 mark for a correct method.
- Left out because they cannot be marked automatically: "Explain how you know", drawing
  (reflections, nets, completing shapes), measuring with a protractor or ruler.

## Question model

`ReasoningQuestion` (discriminated by `format: 'reasoning'`; arithmetic questions stay as they are):
`body` (paragraphs with light markup and figures: table, bar chart, line graph, pie chart,
coordinate grid, angle diagrams, labelled shapes, cuboid, fraction grid), `input` (number boxes
with prefix/suffix, negative/decimal flags and row/time/coordinate/sequence layouts; fraction;
single or multiple choice; ordering), `marks` (1 or 2) and an encoded `answer`.

Answers compare exactly: numbers as rationals per box (so £3.5 = £3.50), choices as sets,
orderings as sequences.

## Coverage (about 35 templates)

Number and place value, calculation in context, fractions/decimals/percentages, ratio, algebra,
measurement, geometry (shapes and angles), position and direction, statistics. New topics:
ratio, algebra, measurement, geometry, position, statistics.

## Data

Schema version 2: attempts gain `paper: 'arithmetic' | 'reasoning'`, and `marks` holds awarded
marks (0-2). Version 1 data and backups are migrated on load, never rejected. One unfinished paper
per paper type, so a daily arithmetic paper and a daily reasoning paper can run side by side.

## Report

A paper filter (Paper 1 / Papers 2 & 3 / Both) scopes every chart. Heat-map rows are grouped by
topic within the selected paper; the question-position map is shown per paper.

## Verification

Per template × difficulty over 1,000 seeds: no NaN/undefined, numbers in range, whole pence,
exactly the declared number of correct choices, distinct options and order items, answers that the
input can express. Then three full papers are printed and read for sense. The browser run plays a
whole reasoning paper at 768×1024.
