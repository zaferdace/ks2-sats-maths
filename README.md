# KS2 SATs

SATs-style practice for Year 6, maths and English, as an offline web app made for an iPad.

**Maths**

- **Paper 1: Arithmetic.** 40 questions generated on the device from 31 question types (place
  value, the four operations, long multiplication and division, order of operations, squares and
  cubes, fractions, decimals, percentages). Long multiplication and division are worth 2 marks, as
  in the real test, so a paper has 44 marks; the mock test is the real format: 36 questions, 40
  marks, 30 minutes.
- **Papers 2 and 3: Reasoning.** 25 questions worth 35 marks from 40 templates, with tables,
  charts, angle diagrams and coordinate grids. Two-mark questions score 2 or 0, because a typed
  answer cannot show working.
- Both run from easy to hard and can be done as a daily paper (five days), in one go, or as a
  timed mock test. Equivalent answers score as in the real mark schemes (3/4, 6/8 and 0.75 for 3/4),
  and forms the real test refuses do not: 6 9/8 for 7 1/8, £4.4 for £4.40, 50 for 50.0.

**English**

- **Grammar, punctuation & vocabulary (GPS Paper 1).** 50 one-mark questions: ready-made items
  and questions built from annotated sentences (word classes, clauses, tenses, the passive and
  more). Answers are tapped (words, gaps for punctuation, choices, true/false) or typed on an
  on-screen letter keyboard.
- **Spelling (GPS Paper 2).** The iPad reads each word, a sentence and the word again in a British
  voice; the pupil types the word into the printed sentence. Words come from the statutory
  Year 3/4 and Year 5/6 lists, the spelling rules and the homophones. Misspelt words come back in
  later tests.
- **Reading.** Stories, poems and non-fiction texts with questions across the reading domains
  (vocabulary, retrieval, inference, prediction, summary, structure, language). Each text carries
  16-17 marks, so three texts make a paper close to the real 50 marks, and written answers
  (including 2- and 3-mark explanations) are over half of them, as in the real test. The text stays
  on screen beside the questions; with the letter keyboard in landscape, the text and the question
  each scroll above it. Explanation questions are self-marked against a model answer, and what the
  pupil wrote is kept for a grown-up to read.
- **Levels.** Every English paper can be Easy, Medium, Hard or Mixed (easy to hard, like the real
  test). New papers prefer questions not seen before. Mock tests (grammar 45 minutes, reading
  60 minutes) are Mixed, like the real papers.
- **Written answers** are marked after Finish against a model answer and marking points, ideally
  with a grown-up, who can also accept a typed reading answer with a spelling slip.

**Everywhere**

- **Report.** A SATs estimate (recent full papers scaled to the real tests, against the 2025
  expected standard), then three tabs: an overview (accuracy, streak, the question types to
  practise next and the score per session), topics and skills (accuracy by topic and a heat map of
  every question type) and progress over time (by week and by question number), for maths,
  English or both.
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
npm run e2e      # browser smoke tests at iPad sizes (builds, then serves dist/ on port 4173)
```

`.npmrc` pins the public npm registry so installs work on machines with a different default.

The interface uses Tailwind CSS v4 (theme and utilities, no preflight: the older hand-written
styles sit in a lower cascade layer, so a utility class always wins), Radix UI primitives in the
shadcn/ui style (`src/components/ui`), lucide icons, Motion for the score ring and confetti, and the
Nunito font bundled with the app so it works offline.

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

Every push to `main` lints, runs the tests, builds the app, runs the browser smoke tests
(`e2e/`) on that build and only then publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). The design notes are in `docs/superpowers/specs/`.
