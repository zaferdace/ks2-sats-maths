// Grammar topics the pupil can learn and practise one at a time (the English "Topics" screen).
// The explanations live in content/grammar-topics.json; this module says what each topic
// practises: which question types, and which tenses or word classes within those types.
import topicsJson from './content/grammar-topics.json';
import { GRAMMAR_TOPIC_IDS, type GrammarTopicId, type Tense } from './types';

export type TopicGroup = 'tenses' | 'verbs' | 'word-classes' | 'sentences';

export const TOPIC_GROUPS: Record<TopicGroup, string> = {
  tenses: 'Tenses',
  verbs: 'Verbs: voice, modals and the subjunctive',
  'word-classes': 'Word classes',
  sentences: 'Joining sentences',
};

/** One block of a topic's explanation, shown in order on the topic screen. */
export interface LearnBlock {
  heading: string;
  /** Markup: **bold**, __underline__, \n for a new line. Plain, short sentences for a 10-year-old. */
  text: string;
  /** Example sentences, shown one per line; the key words in **bold**. */
  examples?: string[];
}

export interface GrammarTopic {
  id: GrammarTopicId;
  title: string;
  group: TopicGroup;
  /** One line under the title: what the topic is, in the pupil's words. */
  blurb: string;
  /** Question types a practice draws from (ready-made items need `topic` set to this id). */
  typeIds: string[];
  /** For g-tense questions: only sentences in these tenses. */
  tenses?: Tense[];
  /** For g-find-word questions: only these word classes. */
  targets?: ('det' | 'prep' | 'conj' | 'modal')[];
  /** How the real test asks about it: one or two sentences. */
  inTheTest: string;
  learn: LearnBlock[];
  /** Where the explanation's facts come from (shown small at the bottom). */
  sources?: string[];
}

export const GRAMMAR_TOPICS: readonly GrammarTopic[] = topicsJson as GrammarTopic[];

const BY_ID = new Map(GRAMMAR_TOPICS.map((t) => [t.id, t]));
export const grammarTopic = (id: string): GrammarTopic | undefined => BY_ID.get(id as GrammarTopicId);

/** Every topic is listed once, in GRAMMAR_TOPIC_IDS order (checked by the tests). */
export const isTopicId = (id: string): id is GrammarTopicId => (GRAMMAR_TOPIC_IDS as readonly string[]).includes(id);
