// Short names for a paper's sessions, shared by the home, test and result screens.
import { readingText } from '../english/bank';
import { isItem } from '../gen/types';
import type { Attempt } from '../store/model';

/** Reading texts used by an attempt, in order. */
export function textsOf(attempt: Attempt): string[] {
  const ids = attempt.questions.flatMap((q) => (isItem(q) ? q.body.flatMap((b) => (b.b === 'passage' ? [b.textId] : [])) : []));
  return [...new Set(ids)];
}

/** "Day 3", "Full paper", "20 words" or a reading text's title. */
export function sessionTitle(attempt: Attempt, day: number | null): string {
  if (day) return `Day ${day}`;
  if (attempt.paper === 'spelling') return `${attempt.questions.length} words`;
  if (attempt.paper === 'reading') {
    const texts = textsOf(attempt);
    if (texts.length === 1) return readingText(texts[0])?.title ?? 'One text';
  }
  return 'Full paper';
}
