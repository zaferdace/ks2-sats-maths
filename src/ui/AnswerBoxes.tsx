import type { AnswerField, AnswerInput } from '../answer/answer';
import { formatNumber } from '../gen/format';
import type { AnswerKind } from '../gen/types';
import { FracView } from './MathText';

interface Props {
  kind: AnswerKind;
  value: AnswerInput | null;
  /** Field receiving keypad input; omit for read-only display. */
  focus?: AnswerField;
  onFocus?: (field: AnswerField) => void;
  /** Marked state for the results list. */
  mark?: 'right' | 'wrong';
}

const shown = (v: string, field: AnswerField) => (field === 'whole' && v && !v.endsWith('.') ? formatNumber(v) : v);

/** The answer box(es): one box for numbers, whole + numerator/denominator for fractions. */
export function AnswerBoxes({ kind, value, focus, onFocus, mark }: Props) {
  const v = value ?? { whole: '', num: '', den: '' };
  const box = (field: AnswerField, extra = '') => {
    const text = shown(v[field], field);
    const cls = ['abox', extra, focus === field ? 'focus caret' : '', mark ?? '', text ? '' : 'empty']
      .filter(Boolean)
      .join(' ');
    const label = { whole: kind === 'frac' ? 'Whole number' : 'Answer', num: 'Numerator', den: 'Denominator' }[field];
    if (!onFocus) {
      return (
        <span className={cls} aria-label={`${label}: ${text || 'blank'}`}>
          {text}
        </span>
      );
    }
    return (
      <button
        type="button"
        className={cls}
        aria-label={`${label}: ${text || 'blank'}`}
        aria-pressed={focus === field}
        onClick={() => onFocus(field)}
      >
        {text}
      </button>
    );
  };

  if (kind !== 'frac') return box('whole');
  // Read-only fraction answers show only what was typed.
  if (!onFocus && !v.num && !v.den) return box('whole');
  return <FracView w={onFocus || v.whole ? box('whole', 'small') : undefined} n={box('num', 'small')} d={box('den', 'small')} />;
}
