import { card, chooseSubject, createProfile, savedData } from './app';
import { expect, test } from './fixtures';

test('a new pupil makes a profile and gets Home with Maths and English', async ({ page }) => {
  await createProfile(page, 'Ava');

  const subject = page.getByRole('radiogroup', { name: 'Subject' });
  await expect(subject.getByRole('radio', { name: 'Maths' })).toBeChecked();
  for (const heading of ['Paper 1: Arithmetic', 'Papers 2 & 3: Reasoning', 'Practise a topic']) {
    await expect(card(page, heading)).toBeVisible();
  }

  await chooseSubject(page, 'English');
  await expect(page.getByRole('radiogroup', { name: 'Level' })).toBeVisible();
  for (const heading of ['Grammar, punctuation & vocabulary', 'Spelling', 'Reading']) {
    await expect(card(page, heading)).toBeVisible();
  }

  // Once saved, the profile is there after the app is closed and opened again.
  await expect.poll(async () => (await savedData(page))?.profiles.map((p) => p.name)).toEqual(['Ava']);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hi, Ava' })).toBeVisible();
  await expect(subject.getByRole('radio', { name: 'English' })).toBeChecked();
});
