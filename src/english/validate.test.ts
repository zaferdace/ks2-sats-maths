// The reading checks themselves: each one must catch the mistake it is there for.
import { describe, expect, it } from 'vitest';
import { READING_TEXTS } from './bank';
import type { ReadingQuestion, ReadingText } from './types';
import { checkReading, partsNamed, typeable, wordsOnly } from './validate';

const text = (id: string): ReadingText => {
  const t = READING_TEXTS.find((x) => x.id === id);
  if (!t) throw new Error(`no text ${id}`);
  return t;
};

/** A copy of a text with one question changed. */
function changed(t: ReadingText, index: number, patch: Partial<ReadingQuestion>): ReadingText {
  return { ...t, questions: t.questions.map((q, i) => (i === index ? ({ ...q, ...patch } as ReadingQuestion) : q)) };
}

const indexOf = (t: ReadingText, test: (q: ReadingQuestion) => boolean): number => {
  const i = t.questions.findIndex(test);
  if (i < 0) throw new Error(`${t.id} has no such question`);
  return i;
};

const isCopy = (q: ReadingQuestion) => q.kind === 'text' && /\bcopy\b/i.test(q.prompt);

describe('partsNamed', () => {
  it('reads paragraph numbers, ranges, lists and ordinals in the order they are named', () => {
    expect(partsNamed('Look at paragraph 3.', 8)).toEqual([3]);
    expect(partsNamed('Which is the best summary of paragraphs 5 to 7?', 8)).toEqual([5, 6, 7]);
    expect(partsNamed("The words 'Not again!' appear in paragraphs 2, 4 and 8.", 9)).toEqual([2, 4, 8]);
    expect(partsNamed('Look at verses 3 and 4.', 6)).toEqual([3, 4]);
    expect(partsNamed('Compare the second stanza with the fourth stanza.', 6)).toEqual([2, 4]);
    expect(partsNamed('Look at the third stanza and the last stanza.', 6)).toEqual([3, 6]);
    expect(partsNamed('Look at the section headed **The perfect spot** (paragraphs 4 and 5).', 13)).toEqual([4, 5]);
  });
  it('ignores prompts that name no part', () => {
    expect(partsNamed('Some paragraphs begin with the words **First**, **Next** and **Then**.', 9)).toEqual([]);
    expect(partsNamed('Give **two** impressions of Gran.', 8)).toEqual([]);
  });
});

describe('wordsOnly', () => {
  it('keeps the words and drops punctuation the letter keyboard cannot type', () => {
    expect(wordsOnly('“Come back!” Ruby cried')).toBe('come back ruby cried');
    expect(wordsOnly("'Gran!' he whispered.")).toBe('gran he whispered');
    expect(wordsOnly('the wild, windy sea – and sand-eels')).toBe('the wild windy sea and sand-eels');
    expect(wordsOnly('Leo’s stomach')).toBe("leo's stomach");
  });
});

describe('typeable', () => {
  it('allows letters, apostrophes, hyphens and spaces, up to 40 characters', () => {
    expect(typeable('Crooked Mountain')).toBe(true);
    expect(typeable("it's a sand-eel.")).toBe(true);
    expect(typeable('30 centimetres')).toBe(false);
    expect(typeable('wild, windy')).toBe(false);
    expect(typeable('the whole house was plunged into darkness')).toBe(false);
  });
});

describe('checkReading', () => {
  const pup = text('rt-fiction-01');

  it('passes the texts it is tried on below', () => {
    expect(checkReading(pup)).toEqual([]);
    expect(checkReading(text('rt-fiction-03'))).toEqual([]);
  });

  it('finds copied words that are not in the part of the text the question names', () => {
    const i = indexOf(pup, isCopy);
    // "bouncy" is in paragraph 6, but the question sends the pupil to paragraph 1.
    expect(checkReading(changed(pup, i, { accept: ['bouncy'] }))).toContainEqual(expect.stringContaining('"bouncy" is not in the text'));
    // Part of a word is not a copied word.
    expect(checkReading(changed(pup, i, { accept: ['squab'] }))).toContainEqual(expect.stringContaining('"squab" is not in the text'));
  });

  it('accepts copied words without punctuation the keyboard cannot type', () => {
    const i = indexOf(pup, isCopy);
    // Paragraph 2 has "'Gran!' he whispered. 'It's a baby seal!'"
    const copied = changed(pup, i, { paragraph: 2, prompt: 'Look at paragraph 2.\nFind and copy what Leo whispered about the grey shape.', accept: ["It's a baby seal"] });
    expect(checkReading(copied)).toEqual([]);
  });

  it('finds typed answers the letter keyboard cannot type', () => {
    const i = indexOf(pup, (q) => q.kind === 'text' && !isCopy(q));
    expect(checkReading(changed(pup, i, { accept: ['binoculars', '2 binoculars'] }))).toContainEqual(expect.stringContaining('cannot be typed'));
  });

  it('finds a typed answer that another question gives away', () => {
    const i = indexOf(pup, (q) => q.kind === 'text' && !isCopy(q));
    const order = indexOf(pup, (q) => q.kind === 'order');
    const shown = pup.questions[order];
    if (shown.kind !== 'order') throw new Error('not an ordering question');
    // "What did Ella bring with her?" is answered by an event to put in order.
    const giveaway = changed(pup, order, { items: [...shown.items.slice(0, -1), 'Ella looks through her binoculars.'] });
    expect(checkReading(giveaway)).toContainEqual(`question ${pup.questions[i].id}: its answer "binoculars" can be read in question ${shown.id}`);
  });

  it('finds a paragraph that is not the first one the prompt names', () => {
    const i = indexOf(pup, isCopy);
    expect(checkReading(changed(pup, i, { paragraph: 2 }))).toContainEqual(expect.stringContaining('the prompt starts at paragraph 1'));
    expect(checkReading(changed(pup, i, { paragraph: undefined }))).toContainEqual(expect.stringContaining('"paragraph" is missing'));
    expect(checkReading(changed(pup, i, { prompt: 'Look at paragraph 12.\nFind and copy one word.' }))).toContainEqual(
      expect.stringContaining('names a paragraph the text does not have'),
    );
  });

  it('needs a model answer and marking points for every written explanation', () => {
    const i = indexOf(pup, (q) => q.kind === 'self' && q.marks === 2);
    expect(checkReading(changed(pup, i, { model: ' ' }))).toContainEqual(expect.stringContaining('needs a model answer'));
    expect(checkReading(changed(pup, i, { points: ['only one point'] }))).toContainEqual(expect.stringContaining('at least one per mark'));
  });

  it('needs written answers and questions worth more than one mark', () => {
    // Every written question turned into a 1-mark tick-one question.
    const tick = ({ id, domain, prompt, paragraph }: ReadingQuestion): ReadingQuestion => ({
      id,
      domain,
      prompt,
      paragraph,
      marks: 1,
      kind: 'choice',
      options: ['a', 'b', 'c'],
      pick: 1,
      answer: [0],
    });
    const ticks: ReadingText = { ...pup, questions: pup.questions.map((q) => (q.kind === 'self' || q.kind === 'text' ? tick(q) : q)) };
    const problems = checkReading(ticks);
    expect(problems).toContainEqual(expect.stringContaining('written answers carry'));
    expect(problems).toContainEqual('needs a 2-mark question');
    expect(problems).toContainEqual('needs a find-and-copy question');
  });

  it('needs a 3-mark question in a longer text', () => {
    const story = text('rt-fiction-03');
    const i = indexOf(story, (q) => q.marks === 3);
    expect(checkReading(changed(story, i, { marks: 2 }))).toContainEqual('a longer text needs a 3-mark question');
  });
});
