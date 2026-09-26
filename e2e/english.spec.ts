import {
  answerByTapping,
  chooseLevel,
  chooseSubject,
  createProfile,
  expectAnswered,
  expectMarkedRight,
  finish,
  goToQuestion,
  isItem,
  item,
  marksOf,
  note,
  questionMap,
  resultScore,
  startPaper,
  tapLetters,
  TAPPED,
} from './app';
import { expect, spokenLines, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await createProfile(page);
  await chooseSubject(page, 'English');
});

test('grammar and punctuation paper: every tapped answer scores', async ({ page }) => {
  await chooseLevel(page, 'Easy');
  const paper = await startPaper(page, 'Grammar, punctuation & vocabulary', 'New daily paper');
  const count = await questionMap(page).getByRole('button').count();

  // Choices, words to tap, true/false and punctuation gaps; typed answers stay blank.
  const tapped = paper.questions
    .slice(0, count)
    .flatMap((q, i) => (isItem(q) && TAPPED.includes(q.input.kind) ? [i] : []));
  expect(tapped.length, 'today has questions answered by tapping').toBeGreaterThan(0);
  for (const i of tapped) {
    await goToQuestion(page, i);
    await answerByTapping(page, item(paper.questions[i]));
    await expectAnswered(page, i);
  }

  await finish(page, tapped.length, count);
  await expect(resultScore(page)).toHaveText(`${tapped.length} / ${count}`);
  for (const i of tapped) await expectMarkedRight(page, i);
});

test('spelling test: the word is read out and the spelling typed on the letter keyboard scores', async ({ page }) => {
  const paper = await startPaper(page, 'Spelling', 'Quick test');
  const q = item(paper.questions[0]);
  const word = q.answer.split('|')[0];
  note(q, word);

  // Opening the test reads the first word out (the tap that opened it lets iPadOS speak).
  await expect.poll(async () => (await spokenLines(page)).some((line) => line.includes(word))).toBe(true);
  await tapLetters(page, word);
  await expect(page.getByLabel(`Your answer: ${word}`, { exact: true })).toBeVisible();
  await expectAnswered(page, 0);

  const count = paper.questions.length;
  await finish(page, 1, count);
  await expect(resultScore(page)).toHaveText(`1 / ${count}`);
  await expectMarkedRight(page, 0);
});

test('reading: a choice tapped beside the text shows as right', async ({ page }) => {
  const paper = await startPaper(page, 'Reading', 'One text');
  await expect(page.getByRole('complementary', { name: /^Text: / })).toBeVisible();

  const index = paper.questions.findIndex((q) => isItem(q) && q.input.kind === 'choice');
  expect(index, 'the text has a multiple-choice question').toBeGreaterThanOrEqual(0);
  const q = item(paper.questions[index]);
  await goToQuestion(page, index);
  await answerByTapping(page, q);
  await expectAnswered(page, index);

  await finish(page, 1, paper.questions.length);
  const total = paper.questions.reduce((sum, question) => sum + marksOf(question), 0);
  await expect(resultScore(page)).toHaveText(`${q.marks} / ${total}`);
  await expectMarkedRight(page, index);
});
