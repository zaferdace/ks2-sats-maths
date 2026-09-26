# KS2 SATs

SATs-style practice for Year 6, maths and English, as an offline web app made for an iPad.

**Maths**

- **Paper 1: Arithmetic.** 40 questions worth 1 mark each, generated on the device from 31
  question types (place value, the four operations, long multiplication and division, order of
  operations, squares and cubes, fractions, decimals, percentages).
- **Papers 2 and 3: Reasoning.** 25 questions worth 35 marks from 60 templates, with tables,
  charts, conversion graphs, angle diagrams, coordinate grids, number lines, measuring jugs and
  thermometers, column calculations with missing digits, shapes made of cubes and shapes on
  square grids. Two-mark questions score 2 or 0, because a typed answer cannot show working.
- Both run from easy to hard and can be done as a daily paper (five days) or in one go. Any
  equivalent answer scores: 3/4, 6/8 and 0.75 are all right for 3/4.

**English**

- **Grammar, punctuation & vocabulary (GPS Paper 1).** 50 one-mark questions: ready-made items
  and questions built from annotated sentences (word classes, clauses, tenses, the passive and
  more). Answers are tapped (words, gaps for punctuation, choices, true/false) or typed on an
  on-screen letter keyboard.
- **Spelling (GPS Paper 2).** The iPad reads each word, a sentence and the word again in a British
  voice; the pupil types the word into the printed sentence. Words come from the statutory
  Year 3/4 and Year 5/6 lists and the spelling rules. Misspelt words come back in later tests.
- **Reading.** Stories, poems and non-fiction texts with questions across the reading domains
  (vocabulary, retrieval, inference, summary, structure, language). The text stays on screen
  beside the questions. Explanation questions are self-marked against a model answer, and what the
  pupil wrote is kept for a grown-up to read.
- **Levels.** Every English paper can be Easy, Medium, Hard or Mixed (easy to hard, like the real
  test). New papers prefer questions not seen before.

**Everywhere**

- **Report.** Score per session, accuracy by topic, a skill heat map of every question type,
  progress by week and the question types to practise next, for maths, English or both.
- **Private.** Everything happens on the device; results stay in the browser's storage
  (IndexedDB). Settings has backup and restore.

## Install on an iPad

1. Open <https://zaferdace.github.io/ks2-sats-maths/> in Safari.
2. Tap **Share**, then **Add to Home Screen**.
3. Open the app from its icon. After the first visit it also works offline.

Make a backup from Settings now and then: clearing Safari's website data removes the results.
Spelling tests need the sound on.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/ks2-sats-maths/
npm test         # unit, property and content tests
npm run build    # type-check and build to dist/
```

`.npmrc` pins the public npm registry so installs work on machines with a different default.

## How the questions are made

| Path | What it holds |
|---|---|
| `src/math/rational.ts` | Exact fractions, so 0.1 + 0.2 is 0.3 and answers compare exactly |
| `src/gen/generators/` | One arithmetic generator per question type, each with three difficulty bands |
| `src/gen/reasoning/` | Reasoning templates, the 25-question blueprint and the paper builder |
| `src/gen/paper.ts` | Paper code → seeded random numbers → the same 40 questions every time |
| `src/gen/evaluate.ts` | An independent evaluator the tests use to check every generated answer |
| `src/english/content/` | The English bank: annotated sentences, GPS items, spelling words, reading texts |
| `src/english/validate.ts` | Checks every bank entry (run by `content.test.ts`) |
| `src/english/gps/` | Sentence templates and the 50-question GPS paper builder |
| `src/english/spelling.ts`, `reading.ts` | Spelling tests and reading sessions |
| `src/stats/stats.ts` | Statistics and heat-map data |

The maths property tests generate 1,000 questions per type and difficulty and check each answer
by re-evaluating the calculation with the answer put back in the box. The English tests check
that every bank entry and every generated question scores full marks with its stored answer and
nothing when left blank.

## Deployment

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). The design notes are in `docs/superpowers/specs/`.
