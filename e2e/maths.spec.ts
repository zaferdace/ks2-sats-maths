import {
  answerArithmetic,
  answerNumber,
  arithmetic,
  card,
  createProfile,
  decimal,
  digits,
  expectAnswered,
  expectMarkedBlank,
  expectMarkedRight,
  finish,
  fraction,
  goToQuestion,
  isItem,
  item,
  marksOf,
  openedPaper,
  promptDigits,
  questionChip,
  resultScore,
  startPaper,
  tapNumber,
} from './app';
import { expect, test } from './fixtures';

test('arithmetic daily paper: the answer typed on the keypad scores 1 / 8', async ({ page }) => {
  await createProfile(page);
  const paper = await startPaper(page, 'Paper 1: Arithmetic', 'New daily paper');
  const q = arithmetic(paper.questions[0]);

  const prompt = await page.locator('.q-text').innerText();
  expect(digits(prompt), `question 1 on screen ("${prompt}") is the saved one`).toBe(promptDigits(q.parts));
  await answerArithmetic(page, q);

  await page.getByRole('button', { name: /^Next/ }).tap();
  await expect(questionChip(page, 1)).toHaveAttribute('aria-current', 'true');
  await expectAnswered(page, 0);

  await finish(page, 1, 8);
  await expect(page.getByRole('heading', { name: 'Arithmetic · Day 1' })).toBeVisible();
  await expect(resultScore(page)).toHaveText('1 / 8');
  await expectMarkedRight(page, 0);
  await expectMarkedBlank(page, 1);
});

test('arithmetic fractions practice: a fraction typed in the boxes scores', async ({ page }) => {
  await createProfile(page);
  await card(page, 'Practise a topic').getByRole('button', { name: 'Choose a topic' }).tap();
  const chooser = page.getByRole('dialog', { name: 'Practise a topic' });
  const fractions = chooser.locator('section').filter({
    has: page.getByRole('heading', { name: 'Arithmetic · Fractions', exact: true }),
  });
  await fractions.getByRole('button', { name: 'Fractions (all)' }).tap();
  const paper = await openedPaper(page);

  const index = paper.questions.findIndex((q) => !isItem(q) && q.kind === 'frac' && fraction(q.answer).d > 1);
  expect(index, 'the practice has a question with a fraction answer').toBeGreaterThanOrEqual(0);
  await goToQuestion(page, index);
  await answerArithmetic(page, arithmetic(paper.questions[index]));
  await expectAnswered(page, index);

  const count = paper.questions.length;
  await finish(page, 1, count);
  await expect(page.getByRole('heading', { name: 'Arithmetic · Practice: Fractions' })).toBeVisible();
  await expect(resultScore(page)).toHaveText(`1 / ${count}`);
  await expectMarkedRight(page, index);
});

test('reasoning full paper: numbers typed on the keypad score their marks', async ({ page }) => {
  await createProfile(page);
  const paper = await startPaper(page, 'Papers 2 & 3: Reasoning', 'New full paper');

  // Questions with one number box (the time boxes are tested elsewhere): the first whole number,
  // and the first decimal and negative answers when the paper has them (the . and − keys).
  const oneBox = paper.questions.flatMap((q, i) =>
    isItem(q) && q.input.kind === 'number' && q.input.boxes.length === 1 && q.input.layout !== 'time' ? [i] : [],
  );
  const typed = (i: number) => decimal(paper.questions[i].answer);
  const picked = [
    oneBox.find((i) => /^\d+$/.test(typed(i))),
    oneBox.find((i) => typed(i).includes('.')),
    oneBox.find((i) => typed(i).startsWith('-')),
  ].filter((i, k, all): i is number => i !== undefined && all.indexOf(i) === k);
  expect(picked.length, 'the paper has a one-box number question').toBeGreaterThan(0);
  for (const i of picked) {
    await goToQuestion(page, i);
    await answerNumber(page, item(paper.questions[i]));
    await expectAnswered(page, i);
  }

  await finish(page, picked.length, paper.questions.length);
  const scored = picked.reduce((sum, i) => sum + marksOf(paper.questions[i]), 0);
  const total = paper.questions.reduce((sum, question) => sum + marksOf(question), 0);
  await expect(resultScore(page)).toHaveText(`${scored} / ${total}`);
  for (const i of picked) await expectMarkedRight(page, i);
});

test('time answers: typed as the timetable shows them (08:58), the leading zero stays and the minutes follow', async ({ page }) => {
  await createProfile(page);
  await page.getByRole('button', { name: /Choose a topic/ }).tap();
  await page.locator('.topic-lists').getByRole('button', { name: 'Time and timetables', exact: true }).tap();
  const paper = await openedPaper(page);
  const index = paper.questions.findIndex((q) => isItem(q) && q.input.kind === 'number' && q.input.layout === 'time');
  expect(index, 'the practice has a question answered with a time').toBeGreaterThanOrEqual(0);
  const [h, m] = item(paper.questions[index]).answer.split(';').map((v) => fraction(v).n);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');

  await goToQuestion(page, index);
  await tapNumber(page, hh + mm);
  await expect(page.getByRole('button', { name: `Hours: ${hh}` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Minutes: ${mm}` })).toBeVisible();

  await finish(page, 1, paper.questions.length);
  await expectMarkedRight(page, index);
});

test('portrait: the box being typed into is never hidden under the keypad', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-portrait', 'the keypad sits below the question only in portrait');
  await createProfile(page);
  const paper = await startPaper(page, 'Papers 2 & 3: Reasoning', 'New full paper');
  const clearOfKeypad = () =>
    page.evaluate(() => {
      const box = document.querySelector('.question-card .abox.focus')?.getBoundingClientRect();
      const pad = document.querySelector('.keypad-wrap')?.getBoundingClientRect();
      return box !== undefined && pad !== undefined && box.bottom <= pad.top + 1;
    });
  let checked = 0;
  for (const [i, q] of paper.questions.entries()) {
    if (!isItem(q) || q.input.kind !== 'number' || checked === 8) continue;
    await goToQuestion(page, i);
    await expect.poll(clearOfKeypad, { message: `question ${i + 1}: the answer box is above the keypad` }).toBe(true);
    checked++;
  }
  expect(checked, 'the paper has questions with number boxes').toBeGreaterThan(0);
});

