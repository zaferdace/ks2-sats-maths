# KS2 Arithmetic

SATs-style maths practice for Year 6 (Paper 1 arithmetic and Papers 2 and 3 reasoning), as an
offline web app made for an iPad.

- **Unlimited papers.** Paper 1 has 40 arithmetic questions worth 1 mark each. A reasoning paper
  (Papers 2 and 3 share the format) has 25 questions worth 35 marks, with tables, charts, angle
  diagrams and coordinate grids. Both run from easy to hard and can be done as a daily paper
  (five days) or in one go.
- **31 arithmetic question types** (place value, the four operations, long multiplication and
  long division, order of operations, squares and cubes, fractions, decimals, percentages) and
  **40 reasoning templates** across number, calculation, fractions, ratio, algebra, measurement,
  geometry, position and statistics. Each has three difficulty bands.
- **Two-mark questions** score 2 or 0, because a typed answer cannot show working.
- **Marked like the real test.** Answers are checked when the session is finished. Any
  equivalent form scores: 3/4, 6/8 and 0.75 are all right for 3/4.
- **Report.** Score per session, accuracy by topic, a skill heat map of every question type,
  progress by week, accuracy by question number, and the question types to practise next.
- **Private.** Questions are generated on the device and results stay in the browser's storage.
  Settings has backup and restore.

## Install on an iPad

1. Open <https://zaferdace.github.io/ks2-sats-maths/> in Safari.
2. Tap **Share**, then **Add to Home Screen**.
3. Open the app from its icon. After the first visit it also works offline.

Make a backup from Settings now and then: clearing Safari's website data removes the results.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/ks2-sats-maths/
npm test         # unit and property tests
npm run build    # type-check and build to dist/
```

`.npmrc` pins the public npm registry so installs work on machines with a different default.

## How the questions are made

| Path | What it holds |
|---|---|
| `src/math/rational.ts` | Exact fractions, so 0.1 + 0.2 is 0.3 and answers compare exactly |
| `src/gen/generators/` | One arithmetic generator per question type, each with three difficulty bands |
| `src/gen/reasoning/` | Reasoning templates, the 25-question blueprint and the paper builder |
| `src/gen/blueprint.ts` | The 40 slots of a paper, eight a day, easy to hard |
| `src/gen/paper.ts` | Paper code → seeded random numbers → the same 40 questions every time |
| `src/gen/evaluate.ts` | An independent evaluator the tests use to check every generated answer |
| `src/stats/stats.ts` | Statistics and heat-map data |

The property tests generate 1,000 questions per type and difficulty and check each answer by
re-evaluating the calculation with the answer put back in the box.

## Deployment

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). The design notes are in `docs/superpowers/specs/`.
