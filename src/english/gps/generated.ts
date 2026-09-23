// GPS questions built from annotated sentences. A template only uses a sentence whose annotation
// makes the answer unambiguous (e.g. "Tap the adverb" needs a sentence with one adverb and no
// words a teacher might argue about).
import { choices } from '../../gen/reasoning/helpers';
import type { Rng } from '../../gen/rng';
import type { ItemQuestion } from '../../gen/types';
import { SENTENCES } from '../bank';
import type { GrammarSentence, Level, Span, Tag } from '../types';
import { joinTokens } from '../tokens';

export type GeneratedGpsType =
  | 'g-word-class'
  | 'g-find-word'
  | 'g-sentence-type'
  | 'g-clauses'
  | 'g-subject'
  | 'g-fronted'
  | 'g-noun-phrase'
  | 'g-tense'
  | 'g-voice'
  | 'g-end-punctuation';

type Target = 'noun' | 'verb' | 'modal' | 'adj' | 'adv' | 'prep' | 'det' | 'pron' | 'conj';

const LABEL: Record<Target, string> = {
  noun: 'noun',
  verb: 'verb',
  modal: 'modal verb',
  adj: 'adjective',
  adv: 'adverb',
  prep: 'preposition',
  det: 'determiner',
  pron: 'pronoun',
  conj: 'conjunction',
};

const targetOf = (tag: Tag): Target | null => {
  if (tag === 'conj-co' || tag === 'conj-sub') return 'conj';
  return tag in LABEL ? (tag as Target) : null;
};

const words = (s: GrammarSentence) => s.tokens.map((t) => t[0]);
const text = (s: GrammarSentence) => joinTokens(words(s));
const spanText = (s: GrammarSentence, [a, b]: Span) => joinTokens(words(s).slice(a, b));
const isContraction = (w: string) => /'/.test(w);

/** "my", "her" and friends: KS2 calls them determiners, but many adults say possessive pronouns. */
const POSSESSIVES = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
const isPossessive = (w: string) => POSSESSIVES.includes(w.toLowerCase());
const hasPossessive = (s: GrammarSentence) => s.tokens.some(([w]) => isPossessive(w));
/** Two nouns side by side ("football boots", "Mr Patel") make "tap the nouns" arguable. */
const hasNounPair = (s: GrammarSentence) => s.tokens.some(([, t], i) => t === 'noun' && s.tokens[i + 1]?.[1] === 'noun');

/** Sentences at the level, or any sentence when none match. */
function pool(level: Level, ok: (s: GrammarSentence) => boolean): GrammarSentence[] {
  const all = SENTENCES.filter(ok);
  const exact = all.filter((s) => s.level === level);
  return exact.length ? exact : all;
}

/** A sentence with one word underlined. */
function underlined(s: GrammarSentence, index: number): string {
  return joinTokens(words(s).map((w, i) => (i === index ? `__${w}__` : w)));
}

const base = (typeId: GeneratedGpsType, level: Level, s: GrammarSentence): Pick<ItemQuestion, 'format' | 'typeId' | 'difficulty' | 'marks' | 'sourceId'> => ({
  format: 'english',
  typeId,
  difficulty: level,
  marks: 1,
  sourceId: s.id,
});

/** Easy questions stick to the word classes met first. */
const EASY_CLASSES: Target[] = ['noun', 'verb', 'adj', 'adv', 'pron'];

function wordClass(rng: Rng, level: Level): ItemQuestion | null {
  const askable = ([w, tag]: [string, Tag]) => {
    const target = targetOf(tag);
    return target !== null && !isPossessive(w) && (level > 1 || EASY_CLASSES.includes(target));
  };
  const candidates = pool(level, (s) => s.tokens.some(askable));
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  const indexes = s.tokens.map((t, i) => (askable(t) ? i : -1)).filter((i) => i >= 0);
  const i = rng.pick(indexes);
  const target = targetOf(s.tokens[i][1])!;
  // A modal verb is also a verb: never offer both.
  const others = (Object.keys(LABEL) as Target[]).filter(
    (t) => t !== target && !(target === 'modal' && t === 'verb') && !(target === 'verb' && t === 'modal'),
  );
  const { input, answer } = choices(rng, [LABEL[target]], rng.shuffle(others).slice(0, 3).map((t) => LABEL[t]));
  return {
    ...base('g-word-class', level, s),
    body: [{ b: 'text', text: `What is the word class of the underlined word?\n**${underlined(s, i)}**` }],
    input,
    answer,
    explain: `"${s.tokens[i][0]}" is a ${LABEL[target]} in this sentence.`,
  };
}

const NUMBER_WORDS = ['', 'the', 'the two', 'the three'];

function findWord(rng: Rng, level: Level): ItemQuestion | null {
  const target = rng.pick<Target>(['noun', 'verb', 'adj', 'adv', 'prep', 'det', 'pron', 'conj']);
  const hits = (s: GrammarSentence) => s.tokens.map((t, i) => (targetOf(t[1]) === target ? i : -1)).filter((i) => i >= 0);
  // Words tagged "other" (noun modifiers like "school" in "school gates", "not", "please",
  // question words, infinitive "to") could each be argued into some class, so "tap every …"
  // questions avoid sentences that have any.
  const risky = (s: GrammarSentence) =>
    s.tokens.some(([, t]) => t === 'other') ||
    (target === 'verb' && s.tokens.some(([w, t]) => t === 'aux' || t === 'modal' || isContraction(w))) ||
    ((target === 'det' || target === 'pron') && hasPossessive(s)) ||
    (target === 'noun' && hasNounPair(s));
  const candidates = pool(level, (s) => hits(s).length >= 1 && hits(s).length <= 3 && !risky(s));
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  const answerIdx = hits(s);
  const n = answerIdx.length;
  const noun = n === 1 ? LABEL[target] : `${LABEL[target]}s`;
  return {
    ...base('g-find-word', level, s),
    body: [{ b: 'text', text: `Tap ${NUMBER_WORDS[n]} ${noun} in this sentence.` }],
    input: { kind: 'words', tokens: words(s), pick: n },
    answer: answerIdx.join(','),
    explain: `The ${noun}: ${answerIdx.map((i) => `"${s.tokens[i][0]}"`).join(', ')}.`,
  };
}

const TYPES = ['statement', 'question', 'command', 'exclamation'] as const;

function sentenceType(rng: Rng, level: Level): ItemQuestion | null {
  const kind = rng.pick(TYPES);
  const candidates = pool(level, (s) => s.type === kind);
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  const options = [...TYPES];
  return {
    ...base('g-sentence-type', level, s),
    body: [{ b: 'text', text: `What type of sentence is this?\n**${text(s)}**` }],
    input: { kind: 'choice', options: [...options], pick: 1 },
    answer: String(options.indexOf(s.type)),
    explain: `It is a ${s.type}.`,
  };
}

/** A sentence without its final punctuation mark. */
const unpunctuated = (s: GrammarSentence) => joinTokens(words(s).slice(0, -1));

function endPunctuation(rng: Rng, level: Level): ItemQuestion | null {
  // Only questions and exclamations: an exciting statement could fairly end with "!" too.
  const kind = rng.pick(['question', 'exclamation'] as const);
  const mark = kind === 'question' ? 'question mark' : 'exclamation mark';
  const candidates = pool(level, (s) => s.type === kind);
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  if (rng.chance(0.5)) {
    // Which of four sentences needs the mark? The others are plain statements.
    const statements = SENTENCES.filter((x) => x.type === 'statement' && x.level <= Math.max(level, 2) && x.id !== s.id);
    if (statements.length < 3) return null;
    const { input, answer } = choices(rng, [unpunctuated(s)], rng.shuffle(statements).slice(0, 3).map(unpunctuated));
    return {
      ...base('g-end-punctuation', level, s),
      body: [{ b: 'text', text: `Which sentence should end with ${kind === 'question' ? 'a' : 'an'} **${mark}**?` }],
      input,
      answer,
      explain: `"${unpunctuated(s)}" is ${kind === 'question' ? 'a question' : 'an exclamation'}, so it ends with ${kind === 'question' ? 'a' : 'an'} ${mark}.`,
    };
  }
  const { input, answer } = choices(rng, [mark], ['full stop', 'question mark', 'exclamation mark'].filter((m) => m !== mark));
  return {
    ...base('g-end-punctuation', level, s),
    body: [{ b: 'text', text: `Which punctuation mark should end this sentence?\n**${unpunctuated(s)}**` }],
    input,
    answer,
    explain: `This sentence is ${kind === 'question' ? 'a question' : 'an exclamation'}, so it ends with ${kind === 'question' ? 'a' : 'an'} ${mark}.`,
  };
}

function tense(rng: Rng, level: Level): ItemQuestion | null {
  const candidates = pool(level, (s) => Boolean(s.tense));
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  const all = ['simple present', 'simple past', 'present progressive', 'past progressive', 'present perfect', 'past perfect', 'future'];
  const { input, answer } = choices(rng, [s.tense!], rng.shuffle(all.filter((t) => t !== s.tense)).slice(0, 3));
  const clause = s.subordinateClause || s.relativeClause ? ' in the main clause' : '';
  return {
    ...base('g-tense', level, s),
    body: [{ b: 'text', text: `Which tense is used${clause} of this sentence?\n**${text(s)}**` }],
    input,
    answer,
    explain: `The main verb is in the ${s.tense}.`,
  };
}

/** Noun phrases elsewhere in the sentence: determiners and adjectives before a noun. */
function otherNounPhrases(s: GrammarSentence, avoid: Span): string[] {
  const out: string[] = [];
  s.tokens.forEach(([, tag], i) => {
    if (tag !== 'noun' || (i >= avoid[0] && i < avoid[1])) return;
    let a = i;
    while (a > 0 && ['det', 'adj'].includes(s.tokens[a - 1][1]) && !(a - 1 >= avoid[0] && a - 1 < avoid[1])) a--;
    out.push(spanText(s, [a, i + 1]));
  });
  return out;
}

function subject(rng: Rng, level: Level): ItemQuestion | null {
  const candidates = pool(level, (s) => Boolean(s.subject) && s.type !== 'command' && otherNounPhrases(s, s.subject!).length >= 2);
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  const right = spanText(s, s.subject!);
  const wrong = [...new Set(otherNounPhrases(s, s.subject!))].filter((w) => w !== right).slice(0, 3);
  if (wrong.length < 2) return null;
  const { input, answer } = choices(rng, [right], wrong);
  return {
    ...base('g-subject', level, s),
    body: [{ b: 'text', text: `What is the subject of this sentence?\n**${text(s)}**` }],
    input,
    answer,
    explain: `The subject is "${right}": it is who or what the sentence is about.`,
  };
}

/** Word tokens of a span (punctuation inside it can't be tapped). */
const spanWords = (s: GrammarSentence, [a, b]: Span) =>
  Array.from({ length: b - a }, (_, k) => a + k).filter((i) => s.tokens[i][1] !== 'punct');

/** Tap every word of a span. */
function tapSpan(s: GrammarSentence, span: Span): Pick<ItemQuestion, 'input' | 'answer'> {
  const answer = spanWords(s, span);
  return { input: { kind: 'words', tokens: words(s), pick: answer.length }, answer: answer.join(',') };
}

function clauses(rng: Rng, level: Level): ItemQuestion | null {
  const variant = rng.pick(['subordinate', 'relative', 'which-relative'] as const);
  if (variant === 'which-relative') {
    const withRel = pool(level, (s) => Boolean(s.relativeClause));
    const without = SENTENCES.filter((s) => !s.relativeClause && !s.tokens.some(([w]) => ['who', 'which', 'that', 'whose'].includes(w.toLowerCase())));
    if (!withRel.length || without.length < 3) return null;
    const s = rng.pick(withRel);
    const { input, answer } = choices(rng, [text(s)], rng.shuffle(without).slice(0, 3).map(text));
    return {
      ...base('g-clauses', level, s),
      body: [{ b: 'text', text: 'Which sentence contains a **relative clause**?' }],
      input,
      answer,
      explain: `"${spanText(s, s.relativeClause!)}" is a relative clause.`,
    };
  }
  // A relative clause is a kind of subordinate clause too, so "the subordinate clause" needs a
  // sentence without one.
  const candidates =
    variant === 'subordinate'
      ? pool(level, (s) => Boolean(s.subordinateClause) && !s.relativeClause)
      : pool(level, (s) => Boolean(s.relativeClause));
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  const span = (variant === 'subordinate' ? s.subordinateClause : s.relativeClause)!;
  return {
    ...base('g-clauses', level, s),
    body: [{ b: 'text', text: `Tap every word in the **${variant} clause**.` }],
    ...tapSpan(s, span),
    explain: `The ${variant} clause is "${spanText(s, span)}".`,
  };
}

function fronted(rng: Rng, level: Level): ItemQuestion | null {
  if (rng.chance(0.5)) {
    const candidates = pool(level, (s) => Boolean(s.frontedAdverbial));
    // Distractors start with their subject, so none of them opens with an adverbial.
    const plainStart = SENTENCES.filter(
      (s) => !s.frontedAdverbial && s.subordinateClause?.[0] !== 0 && ['det', 'noun', 'pron'].includes(s.tokens[0][1]),
    );
    if (!candidates.length || plainStart.length < 3) return null;
    const s = rng.pick(candidates);
    const { input, answer } = choices(rng, [text(s)], rng.shuffle(plainStart).slice(0, 3).map(text));
    return {
      ...base('g-fronted', level, s),
      body: [{ b: 'text', text: 'Which sentence begins with a **fronted adverbial**?' }],
      input,
      answer,
      explain: `"${spanText(s, s.frontedAdverbial!)}" is a fronted adverbial, followed by a comma.`,
    };
  }
  const candidates = pool(level, (s) => Boolean(s.frontedAdverbial));
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  const span = s.frontedAdverbial!;
  return {
    ...base('g-fronted', level, s),
    body: [{ b: 'text', text: 'Tap every word in the **fronted adverbial**.' }],
    ...tapSpan(s, span),
    explain: `The fronted adverbial is "${spanText(s, span)}".`,
  };
}

function nounPhrase(rng: Rng, level: Level): ItemQuestion | null {
  // Only when the phrase is the whole subject, so where it ends is not in doubt.
  const candidates = pool(level, (s) => {
    const np = s.expandedNounPhrase;
    return np?.[0] === 0 && s.subject?.[0] === 0 && s.subject[1] === np[1];
  });
  if (!candidates.length) return null;
  const s = rng.pick(candidates);
  const span = s.expandedNounPhrase!;
  return {
    ...base('g-noun-phrase', level, s),
    body: [{ b: 'text', text: 'This sentence starts with an **expanded noun phrase**. Tap every word in it.' }],
    ...tapSpan(s, span),
    explain: `The expanded noun phrase is "${spanText(s, span)}".`,
  };
}

function voice(rng: Rng, level: Level): ItemQuestion | null {
  const passive = pool(level, (s) => s.voice === 'passive');
  const active = SENTENCES.filter((s) => s.voice === 'active' && s.type === 'statement');
  if (!passive.length || active.length < 3) return null;
  const s = rng.pick(passive);
  const { input, answer } = choices(rng, [text(s)], rng.shuffle(active).slice(0, 3).map(text));
  return {
    ...base('g-voice', level, s),
    body: [{ b: 'text', text: 'Which sentence is written in the **passive** voice?' }],
    input,
    answer,
    explain: `In "${text(s)}" the subject has the action done to it, so it is passive.`,
  };
}

export const GENERATORS: Record<GeneratedGpsType, (rng: Rng, level: Level) => ItemQuestion | null> = {
  'g-word-class': wordClass,
  'g-find-word': findWord,
  'g-sentence-type': sentenceType,
  'g-clauses': clauses,
  'g-subject': subject,
  'g-fronted': fronted,
  'g-noun-phrase': nounPhrase,
  'g-tense': tense,
  'g-voice': voice,
  'g-end-punctuation': endPunctuation,
};

export const isGenerated = (type: string): type is GeneratedGpsType => type in GENERATORS;
