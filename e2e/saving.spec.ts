import {
  answerArithmetic,
  answerBox,
  arithmetic,
  card,
  createProfile,
  decimal,
  expectAnswered,
  finish,
  note,
  questionChip,
  resultScore,
  savedData,
  shown,
  startPaper,
  tapNumber,
} from './app';
import { expect, test } from './fixtures';

test('resume: a typed answer is still there after the app is closed and opened again', async ({ page }) => {
  await createProfile(page);
  const paper = await startPaper(page, 'Paper 1: Arithmetic', 'New daily paper');
  const q = arithmetic(paper.questions[0]);
  const typed = decimal(q.answer);
  note(q, typed);
  await tapNumber(page, typed);
  await expect(answerBox(page, 'Answer')).toHaveText(shown(typed));

  await expect
    .poll(async () => (await savedData(page))?.attempts.find((a) => a.id === paper.id)?.answers[0]?.whole)
    .toBe(typed);
  await page.reload();

  await card(page, 'Paper 1: Arithmetic').getByRole('button', { name: 'Continue Day 1 (1/8 answered)' }).tap();
  await expect(page.getByText(`Paper ${paper.paperCode} · 1 of 8`)).toBeVisible();
  await expect(questionChip(page, 0)).toHaveAttribute('aria-current', 'true');
  await expect(answerBox(page, 'Answer')).toHaveText(shown(typed));
  await expectAnswered(page, 0);
});

test('backup: the backup text restores the profile and its paper on a fresh iPad', async ({ page, newAppPage }) => {
  // Copying is blocked, so the app puts the backup in the text box to copy by hand.
  await page.addInitScript(() => {
    const blocked = () => Promise.reject(new DOMException('Blocked by the test', 'NotAllowedError'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: blocked } });
  });
  await createProfile(page, 'Ava');
  const paper = await startPaper(page, 'Paper 1: Arithmetic', 'New daily paper');
  await answerArithmetic(page, arithmetic(paper.questions[0]));
  await finish(page, 1, 8);
  await expect(resultScore(page)).toHaveText('1 / 8');

  await page.getByRole('button', { name: 'Home', exact: true }).tap();
  await page.getByRole('button', { name: 'Settings' }).tap();
  await page.getByRole('button', { name: 'Copy backup text' }).tap();
  await expect(page.getByText('Copying is blocked here.')).toBeVisible();
  const backup = await page.getByLabel('Backup text').inputValue();
  expect(JSON.parse(backup)).toMatchObject({ profiles: [{ name: 'Ava' }], attempts: [{ id: paper.id }] });

  // A fresh iPad: someone new, then restore the backup from Settings.
  const fresh = await newAppPage();
  await createProfile(fresh, 'Ben');
  await fresh.getByRole('button', { name: 'Settings' }).tap();
  await fresh.getByLabel('Backup text').fill(backup);
  await fresh.getByRole('button', { name: 'Restore pasted text' }).tap();
  await expect(fresh.getByText('Restored 1 paper and 1 profile')).toBeVisible();
  await fresh.getByRole('button', { name: 'Done' }).tap();

  await fresh.getByRole('button', { name: 'Switch' }).tap();
  await fresh.getByRole('button', { name: 'Ava', exact: true }).tap();
  await expect(fresh.getByRole('heading', { name: 'Hi, Ava' })).toBeVisible();
  await expect(fresh.getByRole('row').filter({ hasText: 'Arithmetic · Day 1' })).toContainText('1 / 8');

  // The restored paper carries on at Day 2.
  await card(fresh, 'Paper 1: Arithmetic').getByRole('button', { name: 'Start Day 2' }).tap();
  await expect(fresh.getByText(`Paper ${paper.paperCode} · 1 of 8 today`)).toBeVisible();
  await expect(questionChip(fresh, 8)).toHaveAttribute('aria-current', 'true');
});
