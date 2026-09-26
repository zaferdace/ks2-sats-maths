import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

export { expect };

/**
 * Stands in for the Web Speech API: headless Chromium has no voices, and a test must never make a
 * sound. What the app asks to say is kept in `window.__spoken`, so tests can check the dictation.
 */
function fakeSpeech() {
  const spoken: string[] = [];
  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null,
    speak: (utterance: SpeechSynthesisUtterance) => {
      spoken.push(utterance.text);
    },
    cancel: () => undefined,
    pause: () => undefined,
    resume: () => undefined,
    getVoices: () => [],
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  Object.defineProperty(window, '__spoken', { value: spoken });
}

/**
 * Sets up a browser context like a fresh iPad and returns the list of errors it collects: uncaught
 * exceptions (a crash leaves the child with a blank screen) and console errors (a missing file, a
 * failed save).
 */
async function prepare(context: BrowserContext): Promise<string[]> {
  const errors: string[] = [];
  context.on('weberror', (e) => errors.push(`Uncaught: ${e.error().stack ?? e.error().message}`));
  context.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  await context.addInitScript(fakeSpeech);
  return errors;
}

export const test = base.extend<{
  /** Opens a page in another fresh context: a second iPad, or this one after Safari data was cleared. */
  newAppPage: () => Promise<Page>;
}>({
  context: async ({ context }, use) => {
    const errors = await prepare(context);
    await use(context);
    expect(errors, 'errors in the page').toEqual([]);
  },
  newAppPage: async ({ browser }, use) => {
    const opened: { context: BrowserContext; errors: string[] }[] = [];
    await use(async () => {
      // Inside a test, newContext() takes the project's options (iPad viewport, touch, no service worker).
      const context = await browser.newContext();
      opened.push({ context, errors: await prepare(context) });
      return context.newPage();
    });
    for (const { context } of opened) await context.close();
    expect(
      opened.flatMap((o) => o.errors),
      'errors in the page',
    ).toEqual([]);
  },
});

/** Everything the app asked the speech API to say, in order. */
export const spokenLines = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __spoken?: string[] }).__spoken ?? []);
