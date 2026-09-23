import { formatBoxValue, type AnswerField, type AnswerInput } from '../answer/answer';
import type { NumberBox, ReasoningQuestion } from '../gen/types';
import { AnswerBoxes } from './AnswerBoxes';
import { Figure } from './Figure';
import { RichInline, RichText } from './RichText';

/** Keypad target: a fraction field, or the index of a number box. */
export type Focus = AnswerField | number;

/** The question's paragraphs and figures. */
export function ReasoningBody({ q }: { q: ReasoningQuestion }) {
  return (
    <div className="r-body">
      {q.body.map((block, i) =>
        block.b === 'text' ? (
          <RichText key={i} text={block.text} />
        ) : (
          <div key={i} className="r-figure">
            <Figure block={block} />
          </div>
        ),
      )}
    </div>
  );
}

interface AnswerProps {
  q: ReasoningQuestion;
  answer: AnswerInput | null;
  focus?: Focus;
  onFocus?: (f: Focus) => void;
  onSelect?: (sel: number[]) => void;
  mark?: 'right' | 'wrong';
}

function NumberBoxView({
  box,
  value,
  focused,
  onFocus,
  mark,
  placeholder,
}: {
  box: NumberBox;
  value: string;
  focused: boolean;
  onFocus?: () => void;
  mark?: 'right' | 'wrong';
  placeholder?: string;
}) {
  const shown = value ? formatBoxValue(value, { plain: box.plain }) : '';
  const cls = ['abox', 'rbox', focused ? 'focus caret' : '', mark ?? '', shown ? '' : 'empty'].filter(Boolean).join(' ');
  const label = `${box.label ? `${box.label}: ` : ''}${shown || 'blank'}`;
  const inner = shown || (placeholder && !focused ? <span className="placeholder">{placeholder}</span> : '');
  return (
    <span className="rbox-wrap">
      {box.label && <span className="rbox-label">{box.label} =</span>}
      {box.prefix && <span className="rbox-affix">{box.prefix}</span>}
      {onFocus ? (
        <button type="button" className={cls} aria-label={label} aria-pressed={focused} onClick={onFocus}>
          {inner}
        </button>
      ) : (
        <span className={cls} aria-label={label}>
          {inner}
        </span>
      )}
      {box.suffix && <span className="rbox-affix">{box.suffix}</span>}
    </span>
  );
}

function NumberAnswer({ q, answer, focus, onFocus, mark }: AnswerProps & { q: ReasoningQuestion & { input: { kind: 'number' } } }) {
  const { boxes, layout, tokens } = q.input;
  const view = (i: number, placeholder?: string) => (
    <NumberBoxView
      key={`b${i}`}
      box={boxes[i]}
      value={answer?.boxes?.[i] ?? ''}
      focused={focus === i}
      onFocus={onFocus ? () => onFocus(i) : undefined}
      mark={mark}
      placeholder={placeholder}
    />
  );
  if (layout === 'time') {
    return (
      <div className="r-answer r-time">
        {view(0, 'hh')}
        <span className="r-sep">:</span>
        {view(1, 'mm')}
      </div>
    );
  }
  if (layout === 'coord') {
    return (
      <div className="r-answer r-coord">
        <span className="r-sep">(</span>
        {view(0, 'x')}
        <span className="r-sep">,</span>
        {view(1, 'y')}
        <span className="r-sep">)</span>
      </div>
    );
  }
  if (layout === 'sequence' && tokens) {
    let next = 0;
    return (
      <div className="r-answer r-sequence">
        {tokens.map((t, i) => (
          <span key={i} className="r-seq-item">
            {t === null ? view(next++) : <span className="r-seq-num">{t}</span>}
            {i < tokens.length - 1 && <span className="r-sep">,</span>}
          </span>
        ))}
      </div>
    );
  }
  return <div className="r-answer r-row">{boxes.map((_, i) => view(i))}</div>;
}

function ChoiceAnswer({ q, answer, onSelect, mark }: AnswerProps & { q: ReasoningQuestion & { input: { kind: 'choice' } } }) {
  const { options, pick } = q.input;
  const sel = answer?.sel ?? [];
  const toggle = (i: number) => {
    if (!onSelect) return;
    if (pick === 1) onSelect(sel[0] === i ? [] : [i]);
    else if (sel.includes(i)) onSelect(sel.filter((x) => x !== i));
    else if (sel.length < pick) onSelect([...sel, i]);
    else onSelect([...sel.slice(1), i]); // replace the oldest choice
  };
  return (
    <div className={`r-answer r-choices ${mark ?? ''}`}>
      {options.map((o, i) => {
        const on = sel.includes(i);
        return (
          <button
            key={i}
            type="button"
            className={`r-choice ${on ? 'on' : ''}`}
            aria-pressed={on}
            disabled={!onSelect}
            onClick={() => toggle(i)}
          >
            <span className="tick" aria-hidden="true">
              {on ? '✓' : ''}
            </span>
            <RichInline text={o} />
          </button>
        );
      })}
    </div>
  );
}

function OrderAnswer({ q, answer, onSelect, mark }: AnswerProps & { q: ReasoningQuestion & { input: { kind: 'order' } } }) {
  const { items } = q.input;
  const sel = answer?.sel ?? [];
  return (
    <div className={`r-answer r-order ${mark ?? ''}`}>
      <div className="r-order-row" aria-label="Your order">
        {items.map((_, slot) => (
          <span key={slot} className={`r-slot ${sel[slot] !== undefined ? 'filled' : ''}`}>
            {sel[slot] !== undefined ? <RichInline text={items[sel[slot]]} /> : slot + 1}
          </span>
        ))}
      </div>
      {onSelect && (
        <>
          <div className="r-order-items">
            {items.map((item, i) => {
              const used = sel.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  className={`r-choice ${used ? 'used' : ''}`}
                  onClick={() => onSelect(used ? sel.filter((x) => x !== i) : [...sel, i])}
                >
                  <RichInline text={item} />
                </button>
              );
            })}
          </div>
          <div className="row">
            <span className="muted small grow">Tap them in order, {q.input.first} first. Tap again to take one back.</span>
            <button type="button" className="btn" disabled={!sel.length} onClick={() => onSelect([])}>
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Where the pupil answers a reasoning question (or, read-only, what they answered). */
export function ReasoningAnswer(props: AnswerProps) {
  const { q } = props;
  switch (q.input.kind) {
    case 'number':
      return <NumberAnswer {...props} q={q as ReasoningQuestion & { input: { kind: 'number' } }} />;
    case 'fraction':
      return (
        <div className="r-answer r-fraction">
          <AnswerBoxes
            kind="frac"
            value={props.answer}
            focus={typeof props.focus === 'string' ? props.focus : undefined}
            onFocus={props.onFocus}
            mark={props.mark}
          />
        </div>
      );
    case 'choice':
      return <ChoiceAnswer {...props} q={q as ReasoningQuestion & { input: { kind: 'choice' } }} />;
    case 'order':
      return <OrderAnswer {...props} q={q as ReasoningQuestion & { input: { kind: 'order' } }} />;
  }
}
