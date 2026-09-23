import { Fragment, useEffect, useRef, useState } from 'react';
import { emptyAnswer, type AnswerInput } from '../answer/answer';
import { readingText } from '../english/bank';
import type { Block, InputSpec, ItemQuestion } from '../gen/types';
import { RichInline, RichText } from './RichText';
import { canSpeak, dictate, sayWord } from './speech';
import { CLOSERS, OPENERS, spaceBefore, splitAround } from '../english/tokens';

type ItemOf<K extends InputSpec['kind']> = ItemQuestion & { input: Extract<InputSpec, { kind: K }> };

export interface EnglishAnswerProps<K extends InputSpec['kind']> {
  q: ItemOf<K>;
  answer: AnswerInput | null;
  /** Missing when the answer is shown read-only (results). */
  onAnswer?: (a: AnswerInput | null) => void;
  mark?: 'right' | 'wrong';
}

const indexes = (s: string): number[] => (s ? s.split(',').map(Number) : []);

const isWord = (t: string) => /[A-Za-z0-9]/.test(t);

/** Tap one or more words in a sentence. */
export function WordsAnswer({ q, answer, onAnswer, mark }: EnglishAnswerProps<'words'>) {
  const { tokens, pick } = q.input;
  const sel = answer?.sel ?? [];
  const space = spaceBefore(tokens);
  const expected = mark === 'wrong' ? new Set(indexes(q.answer)) : new Set<number>();
  const toggle = (i: number) => {
    if (!onAnswer) return;
    let next: number[];
    if (sel.includes(i)) next = sel.filter((x) => x !== i);
    else if (pick === 1) next = [i];
    else if (sel.length < pick) next = [...sel, i];
    else next = [...sel.slice(1), i]; // replace the oldest choice
    onAnswer(next.length ? { ...emptyAnswer(), sel: next } : null);
  };
  return (
    <div className="r-answer e-block">
      <p className={`e-sentence ${mark ?? ''}`}>
        {tokens.map((t, i) => (
          <Fragment key={i}>
            {space[i] && ' '}
            {isWord(t) ? (
              <button
                type="button"
                className={`e-word ${sel.includes(i) ? 'on' : ''} ${expected.has(i) ? 'expected' : ''}`}
                aria-pressed={sel.includes(i)}
                disabled={!onAnswer}
                onClick={() => toggle(i)}
              >
                {t}
              </button>
            ) : (
              <span className="e-punct">{t}</span>
            )}
          </Fragment>
        ))}
      </p>
      {onAnswer && (
        <p className="muted small">
          Tap {pick === 1 ? 'one word' : `${pick} words`}. Tap again to undo.
        </p>
      )}
    </div>
  );
}

/** Tap the gap(s) where a punctuation mark belongs. Gap i sits just after token i. */
export function GapAnswer({ q, answer, onAnswer, mark }: EnglishAnswerProps<'gap'>) {
  const { tokens, mark: symbol } = q.input;
  const sel = answer?.sel ?? [];
  const space = spaceBefore(tokens);
  const keyed = new Set(indexes(q.answer));
  // No gap in front of a full stop or comma, or just inside a bracket: nothing goes there.
  const hasGap = (i: number) => keyed.has(i - 1) || !(CLOSERS.test(tokens[i]) || OPENERS.has(tokens[i - 1]));
  const toggle = (g: number) => {
    if (!onAnswer) return;
    const next = sel.includes(g) ? sel.filter((x) => x !== g) : [...sel, g].sort((a, b) => a - b);
    onAnswer(next.length ? { ...emptyAnswer(), sel: next } : null);
  };
  return (
    <div className="r-answer e-block">
      <p className={`e-sentence e-gaps ${mark ?? ''}`}>
        {tokens.map((t, i) => (
          <Fragment key={i}>
            {i > 0 && !hasGap(i) && space[i] && ' '}
            {i > 0 && hasGap(i) && (
              <button
                type="button"
                className={`e-gap ${sel.includes(i - 1) ? 'on' : ''} ${space[i] ? 'spaced' : ''}`}
                aria-pressed={sel.includes(i - 1)}
                aria-label={`Gap after “${tokens[i - 1]}”`}
                disabled={!onAnswer}
                onClick={() => toggle(i - 1)}
              >
                {sel.includes(i - 1) ? symbol : ''}
              </button>
            )}
            <span className="e-token">{t}</span>
          </Fragment>
        ))}
      </p>
      {onAnswer && (
        <p className="muted small">
          Tap a gap to put <strong className="e-symbol">{symbol}</strong> there. Tap it again to take it out.
        </p>
      )}
    </div>
  );
}

/** True or false for each statement. */
export function TfAnswer({ q, answer, onAnswer, mark }: EnglishAnswerProps<'tf'>) {
  const { statements } = q.input;
  const values = statements.map((_, i) => answer?.tf?.[i] ?? null);
  const expected = q.answer.split(',').map((v) => v === '1');
  const set = (i: number, v: boolean) => {
    if (!onAnswer) return;
    const next = values.map((x, k) => (k === i ? (x === v ? null : v) : x));
    onAnswer(next.some((x) => x !== null) ? { ...emptyAnswer(), tf: next } : null);
  };
  return (
    <table className={`r-answer e-tf ${mark ?? ''}`}>
      <thead>
        <tr>
          <th />
          <th>True</th>
          <th>False</th>
        </tr>
      </thead>
      <tbody>
        {statements.map((s, i) => (
          <tr key={i} className={mark && values[i] !== expected[i] ? 'row-wrong' : ''}>
            <td>
              <RichInline text={s} />
            </td>
            {[true, false].map((v) => (
              <td key={String(v)} className="tf-cell">
                <button
                  type="button"
                  className={`tf-btn ${values[i] === v ? 'on' : ''}`}
                  aria-pressed={values[i] === v}
                  aria-label={v ? 'True' : 'False'}
                  disabled={!onAnswer}
                  onClick={() => set(i, v)}
                >
                  {values[i] === v ? '✓' : ''}
                </button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A typed word or short phrase (letter keyboard). Spelling words sit inside their sentence. */
export function TextAnswer({ q, answer, onAnswer, mark }: EnglishAnswerProps<'text'>) {
  const typed = answer?.text ?? '';
  const box = (
    <span
      className={['abox', 'tbox', onAnswer ? 'focus caret' : '', mark ?? '', typed ? '' : 'empty'].filter(Boolean).join(' ')}
      aria-label={`Your answer: ${typed || 'blank'}`}
    >
      {typed}
    </span>
  );
  const speak = q.input.spell ? q.body.find((b): b is Extract<Block, { b: 'speak' }> => b.b === 'speak') : undefined;
  if (speak) {
    const [before, after] = splitAround(speak.sentence, speak.word);
    return (
      <p className="r-answer e-dictation">
        {before}
        {box}
        {after}
      </p>
    );
  }
  return (
    <p className="r-answer e-text">
      {q.input.before && (
        <>
          <RichInline text={q.input.before} />{' '}
        </>
      )}
      {box}
      {q.input.after && (
        <>
          {' '}
          <RichInline text={q.input.after} />
        </>
      )}
    </p>
  );
}

/**
 * Explanation questions: the pupil writes an answer (or says it), then sees a model answer and
 * gives themselves marks. What they wrote is kept for a grown-up to look at.
 */
export function SelfAnswer({ q, answer, onAnswer }: EnglishAnswerProps<'self'>) {
  const { model, points } = q.input;
  const [draft, setDraft] = useState(answer?.text ?? '');
  // Typing is saved after a short pause rather than on every key.
  const pending = useRef<{ timer: number; save: () => void } | null>(null);
  const flush = () => {
    if (!pending.current) return;
    window.clearTimeout(pending.current.timer);
    pending.current.save();
    pending.current = null;
  };
  useEffect(() => flush, []);

  const commit = (patch: Partial<AnswerInput>) => {
    if (!onAnswer) return;
    const next: AnswerInput = { ...emptyAnswer(), ...answer, text: draft, ...patch };
    onAnswer(next.text?.trim() || next.checked || next.self !== undefined ? next : null);
  };
  const write = (text: string) => {
    setDraft(text);
    if (pending.current) window.clearTimeout(pending.current.timer);
    const save = () => commit({ text });
    const timer = window.setTimeout(() => {
      pending.current = null;
      save();
    }, 600);
    pending.current = { timer, save };
  };

  const written = onAnswer ? draft : (answer?.text ?? '');
  const open = onAnswer && !answer?.checked;
  return (
    <div className="r-answer e-self">
      {open ? (
        <>
          <textarea
            className="e-write"
            value={draft}
            maxLength={600}
            rows={4}
            autoCapitalize="sentences"
            placeholder="Write your answer here, or say it out loud."
            onChange={(e) => write(e.target.value)}
            onBlur={flush}
          />
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                flush();
                commit({ checked: true });
              }}
            >
              Check my answer
            </button>
            <span className="muted small grow">Then give yourself marks. After checking, the answer can't be changed.</span>
          </div>
        </>
      ) : (
        <>
          <div className="e-written">
            <div className="e-label">Your answer</div>
            {written.trim() ? <p>{written}</p> : <p className="muted">Nothing written.</p>}
          </div>
          <div className="e-model">
            <div className="e-label">A good answer</div>
            <RichText text={model} />
            {points.length > 0 && (
              <>
                <div className="e-label">
                  {q.marks === 1 ? 'The mark is for' : `Up to ${q.marks} marks, for`}
                </div>
                <ul>
                  {points.map((p, i) => (
                    <li key={i}>
                      <RichInline text={p} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {onAnswer && (
            <div className="e-selfmark">
              <strong>How many marks did your answer get?</strong>
              <div className="row">
                {Array.from({ length: q.marks + 1 }, (_, m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn grow ${answer?.self === m ? 'btn-primary' : ''}`}
                    aria-pressed={answer?.self === m}
                    onClick={() => commit({ self: m })}
                  >
                    {m} {m === 1 ? 'mark' : 'marks'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Spelling: play the word and its sentence. */
export function SpeakBlock({ word, sentence, compact }: { word: string; sentence: string; compact?: boolean }) {
  const [shown, setShown] = useState(false);
  if (!canSpeak()) {
    return (
      <div className="e-speak fallback">
        <p>This device can't read words aloud. Ask a grown-up to read the word and the sentence to you.</p>
        <button type="button" className="btn" onClick={() => setShown(!shown)}>
          {shown ? 'Hide' : 'Show the grown-up'}
        </button>
        {shown && (
          <p>
            <strong>{word}</strong>: {sentence}
          </p>
        )}
      </div>
    );
  }
  if (compact) {
    return (
      <button type="button" className="btn e-replay" onClick={() => dictate(word, sentence)} aria-label="Hear the word again">
        🔊 Hear it
      </button>
    );
  }
  return (
    <div className="e-speak">
      <button type="button" className="btn btn-primary btn-big" onClick={() => dictate(word, sentence)}>
        🔊 Hear the word
      </button>
      <button type="button" className="btn" onClick={() => sayWord(word)}>
        Word only
      </button>
      <button type="button" className="btn" onClick={() => sayWord(word, true)}>
        Slowly
      </button>
    </div>
  );
}

/** Which text (and paragraph) a reading question is about. */
export function PassageRef({ textId, paragraph }: { textId: string; paragraph?: number }) {
  const text = readingText(textId);
  const part = text?.genre === 'poetry' ? 'verse' : 'paragraph';
  return (
    <p className="passage-ref">
      <span aria-hidden="true">📖</span> {text?.title ?? 'the text'}
      {paragraph ? ` · ${part} ${paragraph}` : ''}
    </p>
  );
}
