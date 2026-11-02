// What the Home and Report screens start when a topic is practised, and small per-device choices.
import { typeInfo } from '../gen/catalog';
import type { LevelChoice } from '../gen/types';
import { grammarTopic } from '../english/topics';
import type { GrammarTopicId } from '../english/types';
import type { StartRequest } from '../store/model';

export const gpsPractice = (ids: string[], topic: string): Omit<StartRequest, 'level'> => ({
  paper: 'gps',
  mode: 'practice',
  types: ids,
  topic,
});

/** A practice request for a grammar topic: its question types, narrowed to the topic. */
export function topicPractice(topicId: GrammarTopicId, level: LevelChoice): StartRequest | null {
  const topic = grammarTopic(topicId);
  if (!topic) return null;
  return { ...gpsPractice(topic.typeIds, topic.title), level, grammarTopic: topic.id };
}

export const spellingPractice = (group: string, label: string): Omit<StartRequest, 'level'> => ({
  paper: 'spelling',
  mode: 'practice',
  groups: [group],
  size: 10,
  topic: `Spelling: ${label}`,
});

export const mathsPractice = (paper: 'arithmetic' | 'reasoning', ids: string[], topic: string): Omit<StartRequest, 'level'> => ({
  paper,
  mode: 'practice',
  types: ids,
  topic,
});

/** A practice for one question type from the report (reading questions belong to their texts). */
export function practiceFor(typeId: string, label: string): Omit<StartRequest, 'level'> | null {
  const paper = typeInfo(typeId)?.paper;
  if (paper === 'arithmetic' || paper === 'reasoning') return mathsPractice(paper, [typeId], label);
  if (paper === 'spelling') return spellingPractice(typeId.slice(2), label);
  if (paper === 'gps') return gpsPractice([typeId], label);
  return null;
}

// Small per-device preferences; the app works the same when storage is unavailable.
export function loadPref<T extends string>(key: string, fallback: T, allowed: readonly string[]): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null && allowed.includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // not saved: fine
  }
}

export const SUBJECT_KEY = 'ks2-sats/subject';
export const LEVEL_KEY = 'ks2-sats/english-level';


/** The English level last chosen on Home (Mixed until one is). */
export function englishLevel(): LevelChoice {
  const v = loadPref(LEVEL_KEY, 'mixed', ['1', '2', '3', 'mixed']);
  return v === 'mixed' ? 'mixed' : (Number(v) as 1 | 2 | 3);
}
