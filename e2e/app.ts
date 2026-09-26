// Drives the app the way the child does on the iPad: taps on the on-screen keypads, never the
// iPad keyboard. Correct answers come from the paper the app saved (each question's `answer`).
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { AnyQuestion, ItemQuestion, Part, Question } from '../src/gen/types';
import type { Attempt, StoreData } from '../src/store/model';

// ---- Saved data --------------------------------------------------------------

/** The app's localStorage copy of its data (IndexedDB holds the same, saved at the same time). */
const STORAGE_KEY = 'ks2-arithmetic/v1';

export async function savedData(page: Page): Promise<StoreData | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoreData) : null;
  }, STORAGE_KEY);
}

/** The newest paper, once the app has saved it (a save lands a moment after each change). */
async function savedAttempt(page: Page): Promise<Attempt> {
  let newest: Attempt | undefined;
  await expect
    .poll(
      async () => {
        const attempts = (await savedData(page))?.attempts ?? [];
        newest = attempts.reduce<Attempt | undefined>((a, b) => (a && a.createdAt >= b.createdAt ? a : b), undefined);
        return newest?.id;
      },
      { message: 'the new paper is saved' },
    )
    .toBeDefined();
  return newest!;
}

export const isItem = (q: AnyQuestion): q is ItemQuestion => 'format' in q;

export function arithmetic(q: AnyQuestion): Question {
  if (isItem(q)) throw new Error(`Expected a Paper 1 question, got ${q.typeId}`);
  return q;
}

export function item(q: AnyQuestion): ItemQuestion {
  if (!isItem(q)) throw new Error(`Expected a reasoning or English question, got ${q.typeId}`);
  return q;
}

/** Marks for a question: 1 for Paper 1, as stored for the others. */
export const marksOf = (q: AnyQuestion): number => (isItem(q) ? q.marks : 1);

// ---- Answers -----------------------------------------------------------------

/** A stored answer ("n/d") as numerator and denominator. */
export function fraction(answer: string): { n: number; d: number } {
  const m = /^(-?\d+)\/(\d+)$/.exec(answer);
  if (!m) throw new Error(`Not a stored fraction: "${answer}"`);
  return { n: Number(m[1]), d: Number(m[2]) };
}

/** A stored answer written for the keypad: "1685/1" → "1685", "3/4" → "0.75", "-13/2" → "-6.5". */
export function decimal(answer: string): string {
  const { n, d } = fraction(answer);
  for (let places = 0; places <= 8; places++) {
    const scaled = (Math.abs(n) * 10 ** places) / d;
    if (!Number.isInteger(scaled)) continue;
    const text = String(scaled).padStart(places + 1, '0');
    const cut = text.length - places;
    return `${n < 0 ? '-' : ''}${text.slice(0, cut)}${places ? `.${text.slice(cut)}` : ''}`;
  }
  throw new Error(`${answer} has no exact decimal`);
}

/** A number as the app shows it: commas from four digits (4,478) and a real minus sign. */
export function shown(value: string): string {
  const negative = value.startsWith('-');
  const [whole, decimals] = (negative ? value.slice(1) : value).split('.');
  const grouped = whole.length >= 4 ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : whole;
  return `${negative ? '−' : ''}${grouped}${decimals !== undefined ? `.${decimals}` : ''}`;
}

/** Only the digits of a calculation, in order: "4,478 + ¾" → "447834". */
export const digits = (text: string): string => text.replace(/\D/g, '');

/** Digits of a saved Paper 1 question, in the order the page shows them. */
export function promptDigits(parts: Part[]): string {
  const text = parts.map((p) => {
    switch (p.t) {
      case 'num':
      case 'pct':
        return p.v;
      case 'frac':
        return `${p.w || ''} ${p.n} ${p.d}`;
      case 'pow':
        return `${p.b} ${p.e}`;
      default:
        return '';
    }
  });
  return digits(text.join(' '));
}

const indexes = (s: string): number[] => (s ? s.split(',').map(Number) : []);

/** Records what a test answered in the report: papers are random, so a failure says which question. */
export function note(q: AnyQuestion, answer: string): void {
  test.info().annotations.push({ type: q.typeId, description: answer });
}

// ---- Home ----------------------------------------------------------------------

/** First launch: types a name and starts, which opens Home. */
export async function createProfile(page: Page, name = 'Ava'): Promise<void> {
  await page.goto('./');
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  await expect(page.getByRole('heading', { name: `Hi, ${name}` })).toBeVisible();
}

/** Maths or English on Home. */
export async function chooseSubject(page: Page, subject: 'Maths' | 'English'): Promise<void> {
  const tab = page.getByRole('radiogroup', { name: 'Subject' }).getByRole('radio', { name: subject, exact: true });
  await tab.tap();
  await expect(tab).toBeChecked();
}

/** English level: Easy, Medium, Hard or Mixed. */
export async function chooseLevel(page: Page, level: 'Easy' | 'Medium' | 'Hard' | 'Mixed'): Promise<void> {
  const choice = page.getByRole('radiogroup', { name: 'Level' }).getByRole('radio', { name: level, exact: true });
  await choice.tap();
  await expect(choice).toBeChecked();
}

/** A card on Home, found by its heading ("Paper 1: Arithmetic", "Spelling", ...). */
export const card = (page: Page, heading: string): Locator =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: heading, exact: true }) });

/** Starts a paper from its card ("New daily paper", "Quick test", ...) and returns it as saved. */
export async function startPaper(page: Page, heading: string, option: string): Promise<Attempt> {
  await card(page, heading).getByRole('button', { name: option }).tap();
  return openedPaper(page);
}

/** The paper on the test screen, as the app saved it. */
export async function openedPaper(page: Page): Promise<Attempt> {
  await expect(questionMap(page)).toBeVisible();
  const attempt = await savedAttempt(page);
  await expect(page.getByText(`Paper ${attempt.paperCode} ·`), 'the saved paper is the one on screen').toBeVisible();
  return attempt;
}

// ---- Test screen ---------------------------------------------------------------

export const questionMap = (page: Page): Locator => page.getByRole('navigation', { name: 'Questions' });

/** A question's button in the question map ("Question 3", "Question 3, answered"). */
export const questionChip = (page: Page, index: number): Locator =>
  questionMap(page).getByRole('button', { name: new RegExp(`^Question ${index + 1}(,|$)`) });

/** Taps a question in the question map and waits for it to open. */
export async function goToQuestion(page: Page, index: number): Promise<void> {
  const chip = questionChip(page, index);
  if ((await chip.getAttribute('aria-current')) !== 'true') await chip.tap();
  await expect(chip).toHaveAttribute('aria-current', 'true');
}

export async function expectAnswered(page: Page, index: number): Promise<void> {
  await expect(questionChip(page, index)).toHaveAccessibleName(/, answered$/);
}

const PAD_KEYS: Record<string, string> = { '.': 'Decimal point', '-': 'Minus sign' };

/** Taps digits (and the decimal point or minus sign) on the on-screen number pad. */
export async function tapNumber(page: Page, text: string): Promise<void> {
  const pad = page.getByRole('group', { name: 'Number pad' });
  for (const key of text) await pad.getByRole('button', { name: PAD_KEYS[key] ?? key, exact: true }).tap();
}

const LETTER_KEYS: Record<string, string> = { "'": 'Apostrophe', '-': 'Hyphen', ' ': 'Space' };

/** Taps a word on the on-screen letter keyboard. */
export async function tapLetters(page: Page, text: string): Promise<void> {
  const keyboard = page.getByRole('group', { name: 'Letter keyboard' });
  for (const key of text.toLowerCase()) {
    await keyboard.getByRole('button', { name: LETTER_KEYS[key] ?? key, exact: true }).tap();
  }
}

/** A Paper 1 answer box: "Answer", "Whole number", "Numerator" or "Denominator". */
export const answerBox = (page: Page, name: string): Locator =>
  page.getByRole('button', { name: new RegExp(`^${name}:`) });

/** Types the right answer to a Paper 1 question: a number in its box, a fraction as a mixed number. */
export async function answerArithmetic(page: Page, q: Question): Promise<void> {
  note(q, `${q.kind} ${q.answer}`);
  const { n, d } = fraction(q.answer);
  if (q.kind !== 'frac' || d === 1) {
    const box = answerBox(page, q.kind === 'frac' ? 'Whole number' : 'Answer');
    const value = decimal(q.answer);
    await box.tap();
    await tapNumber(page, value);
    await expect(box).toHaveText(shown(value));
    return;
  }
  const whole = Math.floor(n / d);
  const fields: [string, number][] = [
    ['Whole number', whole],
    ['Numerator', n - whole * d],
    ['Denominator', d],
  ];
  for (const [name, value] of fields) {
    if (!value) continue; // no whole-number part
    await answerBox(page, name).tap();
    await tapNumber(page, String(value));
    // Only the whole number gets thousands commas.
    await expect(answerBox(page, name)).toHaveText(name === 'Whole number' ? shown(String(value)) : String(value));
  }
}

/** Types the right answer to a reasoning question with one number box. */
export async function answerNumber(page: Page, q: ItemQuestion): Promise<void> {
  if (q.input.kind !== 'number' || q.input.boxes.length !== 1) throw new Error(`Not a one-box number question: ${q.typeId}`);
  const value = decimal(q.answer);
  note(q, value);
  // The box taking keypad input is the pressed one; it has focus when the question opens.
  const box = page.getByRole('button', { pressed: true });
  await box.tap();
  await tapNumber(page, value);
  await expect(box).toHaveText(q.input.boxes[0].plain ? value.replace('-', '−') : shown(value));
}

/** Question kinds answered by tapping, which answerByTapping handles. */
export const TAPPED: readonly string[] = ['choice', 'words', 'tf', 'gap'];

/** Taps the right answer to a choice, tap-the-words, true/false or punctuation-gap question. */
export async function answerByTapping(page: Page, q: ItemQuestion): Promise<void> {
  const input = q.input;
  note(q, `${input.kind} ${q.answer}`);
  switch (input.kind) {
    case 'choice': {
      const options = page.locator('.r-choices').getByRole('button');
      await expect(options).toHaveCount(input.options.length);
      for (const i of indexes(q.answer)) await options.nth(i).tap();
      return;
    }
    case 'words': {
      // Words are buttons; the same word can appear twice in a sentence.
      const sentence = page.locator('.e-sentence');
      for (const i of indexes(q.answer)) {
        const word = input.tokens[i];
        const before = input.tokens.slice(0, i).filter((t) => t === word).length;
        await sentence.getByRole('button', { name: word, exact: true }).nth(before).tap();
      }
      return;
    }
    case 'tf': {
      const rows = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'True', exact: true }) });
      await expect(rows).toHaveCount(input.statements.length);
      for (const [i, value] of q.answer.split(',').entries()) {
        await rows.nth(i).getByRole('button', { name: value === '1' ? 'True' : 'False', exact: true }).tap();
      }
      return;
    }
    case 'gap': {
      // Gap g sits just after word g: the button right before the next word.
      const tokens = page.locator('.e-sentence .e-token');
      await expect(tokens).toHaveCount(input.tokens.length);
      for (const g of indexes(q.answer)) await tokens.nth(g + 1).locator('xpath=preceding-sibling::*[1][self::button]').tap();
      return;
    }
    default:
      throw new Error(`Not a tapped question: ${input.kind}`);
  }
}

/** Taps Finish, checks the dialog's count of answered questions, then marks the paper. */
export async function finish(page: Page, answered: number, count: number): Promise<void> {
  await page.getByRole('button', { name: 'Finish', exact: true }).first().tap();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(`You have answered ${answered} of ${count} questions.`);
  const blank = count - answered;
  if (blank) await expect(dialog).toContainText(`${blank} blank ${blank === 1 ? 'answer scores' : 'answers score'} 0.`);
  await dialog.getByRole('button', { name: 'Finish and mark' }).tap();
  await expect(page.getByRole('button', { name: 'See the report' })).toBeVisible();
}

// ---- Results -------------------------------------------------------------------

/** The big score on the result screen: "1 / 8". */
export const resultScore = (page: Page): Locator => page.locator('.result-hero .hero');

/** One question in the result's list, in paper order within the session. */
const resultItem = (page: Page, index: number): Locator => page.locator('ol.review > li').nth(index);

/** The result marks a question right (the row's state, and the word the child sees). */
export async function expectMarkedRight(page: Page, index: number): Promise<void> {
  await expect(resultItem(page, index)).toHaveClass(/\bis-right\b/);
  await expect(resultItem(page, index)).toContainText('Correct');
}

/** The result shows a question left blank. */
export async function expectMarkedBlank(page: Page, index: number): Promise<void> {
  await expect(resultItem(page, index)).toHaveClass(/\bis-wrong\b/);
  await expect(resultItem(page, index)).toContainText('No answer');
}
