import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { emptyAnswer, isBlank, typeKey, type AnswerField, type AnswerInput } from '../answer/answer';
import {
  addTime,
  openSession,
  setAnswer,
  setCurrent,
  submitSession,
  toggleFlag,
  type Attempt,
} from '../store/model';
import { AnswerBoxes } from '../ui/AnswerBoxes';
import { Keypad } from '../ui/Keypad';
import { MathText } from '../ui/MathText';
import { promptText } from '../gen/format';
import { formatDuration } from '../ui/time';

interface Props {
  attempt: Attempt;
  edit: (fn: (a: Attempt) => Attempt) => void;
  onFinished: (markedAt: number) => void;
  onExit: () => void;
}

const FLUSH_EVERY_MS = 10_000;
const MAX_CHUNK_MS = 60_000; // ignore gaps such as the iPad going to sleep

const firstField = (kind: string): AnswerField => (kind === 'frac' ? 'num' : 'whole');

export function TestScreen({ attempt, edit, onFinished, onExit }: Props) {
  const session = openSession(attempt);
  const index = session ? Math.min(Math.max(attempt.current, session.from), session.to - 1) : 0;
  const question = attempt.questions[index];
  const [focus, setFocus] = useState<AnswerField>(firstField(question.kind));
  const [confirming, setConfirming] = useState(false);
  // Clock for the on-screen timer, and when the current timing segment began (null while hidden).
  const [clock, setClock] = useState(() => Date.now());
  const [segmentStart, setSegmentStart] = useState<number | null>(null);

  // Time on each question, counted only while the app is on screen.
  const enteredAt = useRef<number | null>(null);
  const indexRef = useRef(index);
  const editRef = useRef(edit);
  useLayoutEffect(() => {
    indexRef.current = index;
    editRef.current = edit;
  });

  const flush = useCallback(() => {
    const started = enteredAt.current;
    const now = Date.now();
    enteredAt.current = document.visibilityState === 'visible' ? now : null;
    setSegmentStart(enteredAt.current);
    setClock(now);
    if (started === null) return;
    const ms = Math.min(now - started, MAX_CHUNK_MS);
    const i = indexRef.current;
    editRef.current((a) => addTime(a, i, ms));
  }, []);

  useEffect(() => {
    enteredAt.current = null;
    flush(); // starts the first segment
    const onVisibility = () => flush();
    const timer = window.setInterval(flush, FLUSH_EVERY_MS);
    const ticker = window.setInterval(() => setClock(Date.now()), 1000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);
    return () => {
      flush();
      window.clearInterval(timer);
      window.clearInterval(ticker);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
    };
  }, [flush]);

  // Keep the stored position inside the open session.
  const outOfPlace = session !== null && attempt.current !== index;
  useEffect(() => {
    if (outOfPlace) edit((a) => setCurrent(a, index));
  }, [outOfPlace, index, edit]);

  const finished = session === null;
  useEffect(() => {
    if (finished) onExit();
  }, [finished, onExit]);

  const goTo = useCallback(
    (i: number) => {
      if (i === indexRef.current) return;
      flush();
      edit((a) => setCurrent(a, i));
      setFocus(firstField(attempt.questions[i].kind));
    },
    [attempt.questions, edit, flush],
  );

  const onKey = useCallback(
    (key: string) => {
      const i = indexRef.current;
      edit((a) => {
        const prev: AnswerInput = a.answers[i] ?? emptyAnswer();
        const next = { ...prev, [focus]: typeKey(prev[focus], key, focus) };
        return setAnswer(a, i, isBlank(next) ? null : next);
      });
    },
    [edit, focus],
  );

  if (!session) return null;

  const answer = attempt.answers[index];
  const count = session.to - session.from;
  const position = index - session.from + 1;
  const indexes = Array.from({ length: count }, (_, k) => session.from + k);
  const answered = indexes.filter((i) => !isBlank(attempt.answers[i])).length;
  const flagged = indexes.filter((i) => attempt.flagged[i]).length;
  const live = segmentStart !== null ? Math.min(Math.max(clock - segmentStart, 0), MAX_CHUNK_MS) : 0;
  const elapsed = indexes.reduce((s, i) => s + attempt.timeMs[i], 0) + live;
  const title = session.day ? `Day ${session.day}` : 'Full paper';
  // Long calculations get a smaller font so they stay on one line.
  const length = promptText(question.parts).length;
  const sizeClass = length > 22 ? 'xlong' : length > 16 ? 'long' : '';
  const isLast = position === count;

  const finish = () => {
    flush();
    const now = Date.now();
    edit((a) => submitSession(a, now));
    setConfirming(false);
    onFinished(now);
  };

  return (
    <div className="page test-page">
      <header className="topbar test-top">
        <button type="button" className="btn btn-ghost" onClick={onExit} aria-label="Save and go home">
          ← Home
        </button>
        <div className="grow">
          <div className="test-title">{title}</div>
          <div className="muted small">
            Paper {attempt.paperCode} · {position} of {count}
            {session.day ? ' today' : ''}
          </div>
        </div>
        <div className="timer" aria-label="Time on this session">
          ⏱ {formatDuration(elapsed)}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
          Finish
        </button>
      </header>

      <nav className={`qmap ${count > 8 ? 'qmap-full' : ''}`} aria-label="Questions">
        {indexes.map((i) => {
          const state = [
            i === index ? 'current' : '',
            !isBlank(attempt.answers[i]) ? 'answered' : '',
            attempt.flagged[i] ? 'flagged' : '',
          ].join(' ');
          return (
            <button
              key={i}
              type="button"
              className={`qchip ${state}`}
              onClick={() => goTo(i)}
              aria-current={i === index}
              aria-label={`Question ${i + 1}${attempt.flagged[i] ? ', flagged' : ''}${
                isBlank(attempt.answers[i]) ? '' : ', answered'
              }`}
            >
              {i + 1}
              {attempt.flagged[i] && <span className="flag-mark">⚑</span>}
            </button>
          );
        })}
      </nav>

      <div className="test-body">
        <section className="card question-card" aria-live="polite">
          <div className="q-head">
            <span className="q-number">{index + 1}</span>
            {question.showMethod && <span className="method-tag">Show your method: work it out on paper</span>}
            <span className="grow" />
            <span className="muted small">1 mark</span>
          </div>
          <div className={`q-text ${sizeClass}`}>
            <MathText
              parts={question.parts}
              box={<AnswerBoxes kind={question.kind} value={answer} focus={focus} onFocus={setFocus} />}
            />
          </div>
          {question.kind === 'frac' && (
            <p className="muted small hint">
              Tap a box to fill it. Leave the whole-number box empty if there isn't one. A decimal goes in the
              whole-number box.
            </p>
          )}
          <div className="q-nav">
            <button type="button" className="btn" disabled={position === 1} onClick={() => goTo(index - 1)}>
              ← Back
            </button>
            <button
              type="button"
              className={`btn ${attempt.flagged[index] ? 'flag-on' : ''}`}
              aria-pressed={attempt.flagged[index]}
              onClick={() => edit((a) => toggleFlag(a, index))}
            >
              ⚑ {attempt.flagged[index] ? 'Flagged' : 'Flag'}
            </button>
            {isLast ? (
              <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
                Finish
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => goTo(index + 1)}>
                Next →
              </button>
            )}
          </div>
        </section>

        <aside className="keypad-wrap">
          <Keypad onKey={onKey} allowDecimal={focus === 'whole'} enabled={!confirming} />
        </aside>
      </div>

      {confirming && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="finish-title">
          <div className="modal">
            <h2 id="finish-title">Finish {title.toLowerCase() === 'full paper' ? 'the paper' : title}?</h2>
            <p>
              You have answered <strong>{answered}</strong> of {count} questions.
              {answered < count && ` ${count - answered} blank ${count - answered === 1 ? 'answer scores' : 'answers score'} 0.`}
              {flagged > 0 && ` ${flagged} flagged.`}
            </p>
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setConfirming(false)}>
                Keep going
              </button>
              <button type="button" className="btn btn-primary grow" onClick={finish}>
                Finish and mark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
