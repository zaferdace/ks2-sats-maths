import { ArrowLeft, ArrowRight, Flag, Timer } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  emptyAnswer,
  hoursComplete,
  incompleteFraction,
  isBlank,
  keyboardFor,
  maxMarks,
  typeBoxKey,
  typeKey,
  typeLetter,
  typeTimeKey,
  type AnswerField,
  type AnswerInput,
} from '../answer/answer';
import { LEVEL_NAME, PAPER_NAME } from '../gen/catalog';
import { promptText } from '../gen/format';
import { PACE } from '../gen/exam';
import { isItem, type AnyQuestion, type Block } from '../gen/types';
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
import { LetterKeyboard } from '../ui/LetterKeyboard';
import { MathText } from '../ui/MathText';
import { Passage } from '../ui/Passage';
import { ReasoningAnswer, ReasoningBody, type Focus } from '../ui/ReasoningView';
import { dictate, stopSpeaking } from '../ui/speech';
import { sessionTitle } from '../ui/labels';
import { formatDuration } from '../ui/time';
import { onBeforeSave } from '../useStore';

interface Props {
  attempt: Attempt;
  edit: (fn: (a: Attempt) => Attempt) => void;
  onFinished: (markedAt: number) => void;
  onExit: () => void;
}

const FLUSH_EVERY_MS = 10_000;
const MAX_CHUNK_MS = 60_000; // ignore gaps such as the iPad going to sleep

/** Where typing goes when a question opens. */
function firstFocus(q: AnyQuestion): Focus {
  if (!isItem(q)) return q.kind === 'frac' ? 'num' : 'whole';
  return q.input.kind === 'number' ? 0 : 'num';
}

/**
 * Scrolls the page so the answer box being typed into is not hidden: in portrait the keypad (or
 * letter keyboard) sits over the bottom of the page and a reading text over the top.
 */
function revealAnswerBox() {
  const box = document.querySelector<HTMLElement>('.question-card .abox.focus');
  if (!box) return;
  // Reading with the letter keyboard in landscape fits the screen: the question card scrolls, not the page.
  const card = box.closest<HTMLElement>('.fit-screen .question-card');
  if (card && getComputedStyle(card).overflowY === 'auto') {
    box.scrollIntoView({ block: 'nearest' });
    return;
  }
  const r = box.getBoundingClientRect();
  const over = (selector: string) => {
    const el = document.querySelector(selector)?.getBoundingClientRect();
    return el && el.left < r.right && el.right > r.left ? el : null;
  };
  const pad = over('.test-body .keypad-wrap');
  const passage = over('.test-body .passage-panel');
  const margin = 16;
  // A keypad below the question (portrait) is either stuck over the bottom of the screen or further down
  // the page, so its top edge is always the limit.
  const bottom = Math.min(pad ? pad.top : window.innerHeight, window.innerHeight) - margin;
  const top = (passage && passage.top <= 1 ? passage.bottom : 0) + margin;
  if (r.bottom > bottom) window.scrollBy({ top: Math.max(Math.min(r.bottom - bottom, r.top - top), 0) });
  else if (r.top < top) window.scrollBy({ top: r.top - top });
}

type SpeakBlock = Extract<Block, { b: 'speak' }>;
type PassageBlock = Extract<Block, { b: 'passage' }>;

const speakOf = (q: AnyQuestion | undefined) =>
  q && isItem(q) ? q.body.find((b): b is SpeakBlock => b.b === 'speak') : undefined;
const passageOf = (q: AnyQuestion | undefined) =>
  q && isItem(q) ? q.body.find((b): b is PassageBlock => b.b === 'passage') : undefined;

export function TestScreen({ attempt, edit, onFinished, onExit }: Props) {
  const session = openSession(attempt);
  const index = session ? Math.min(Math.max(attempt.current, session.from), session.to - 1) : 0;
  const question = attempt.questions[index];
  const [focus, setFocus] = useState<Focus>(firstFocus(question));
  const [confirming, setConfirming] = useState(false);
  const [overTimeOk, setOverTimeOk] = useState(false);
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
    // When the app is hidden, the time on this question is saved with everything else.
    const off = onBeforeSave(flush);
    return () => {
      off();
      flush();
      stopSpeaking();
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

  // On a tall question the answer box can sit under the keypad: bring it into view (again on the
  // next frame, once a sticky reading text has settled at the top).
  useEffect(() => {
    revealAnswerBox();
    const frame = requestAnimationFrame(revealAnswerBox);
    return () => cancelAnimationFrame(frame);
  }, [index, focus]);

  // In a long paper's scrolling question map, keep the current question in sight (sideways only,
  // so the page itself doesn't jump).
  useEffect(() => {
    const map = document.querySelector<HTMLElement>('.qmap-scroll');
    const chip = map?.querySelector<HTMLElement>('.qchip.current');
    if (map && chip) map.scrollTo({ left: chip.offsetLeft - map.offsetLeft - (map.clientWidth - chip.offsetWidth) / 2 });
  }, [index]);

  const goTo = useCallback(
    (i: number) => {
      if (i === indexRef.current) return;
      flush();
      edit((a) => setCurrent(a, i));
      setFocus(firstFocus(attempt.questions[i]));
      // Spelling: read the next word straight away (iPadOS only speaks in response to a tap).
      const speak = speakOf(attempt.questions[i]);
      if (speak) dictate(speak.word, speak.sentence);
      else stopSpeaking();
    },
    [attempt.questions, edit, flush, setFocus],
  );

  const onKey = useCallback(
    (key: string) => {
      const i = indexRef.current;
      const q = attempt.questions[i];
      if (isItem(q) && q.input.kind === 'number' && typeof focus === 'number') {
        const box = q.input.boxes[focus];
        const time = q.input.layout === 'time';
        const type = (value: string) => (time ? typeTimeKey(value, key) : typeBoxKey(value, key, box));
        // The store applies an edit at once, so the box's value before and after this key is known here.
        let before = '';
        let after = '';
        edit((a) => {
          const prev: AnswerInput = a.answers[i] ?? emptyAnswer();
          const boxes = q.input.kind === 'number' ? q.input.boxes.map((_, k) => prev.boxes?.[k] ?? '') : [];
          before = boxes[focus];
          after = type(before);
          boxes[focus] = after;
          const next = { ...prev, boxes };
          return setAnswer(a, i, isBlank(next) ? null : next);
        });
        // Hours typed in full ("08", "14", or a single 3-9): move on to the minutes.
        if (time && focus === 0 && /^\d$/.test(key) && after !== before && hoursComplete(after)) setFocus(1);
        return;
      }
      if (typeof focus !== 'string') return;
      const field: AnswerField = focus;
      edit((a) => {
        const prev: AnswerInput = a.answers[i] ?? emptyAnswer();
        const next = { ...prev, [field]: typeKey(prev[field], key, field) };
        return setAnswer(a, i, isBlank(next) ? null : next);
      });
    },
    [attempt.questions, edit, focus, setFocus],
  );

  const onLetter = useCallback(
    (key: string) => {
      const i = indexRef.current;
      edit((a) => {
        const prev: AnswerInput = a.answers[i] ?? emptyAnswer();
        const next = { ...prev, text: typeLetter(prev.text ?? '', key) };
        return setAnswer(a, i, isBlank(next) ? null : next);
      });
    },
    [edit],
  );

  const onSelect = useCallback(
    (sel: number[]) => {
      const i = indexRef.current;
      edit((a) => setAnswer(a, i, sel.length ? { ...emptyAnswer(), sel } : null));
    },
    [edit],
  );

  if (!session) return null;

  // Bound to this question, so a late save (a written answer) never lands on the next one.
  const onAnswer = (a: AnswerInput | null) => edit((att) => setAnswer(att, index, a));

  const answer = attempt.answers[index];
  const count = session.to - session.from;
  const position = index - session.from + 1;
  const indexes = Array.from({ length: count }, (_, k) => session.from + k);
  const answered = indexes.filter((i) => !isBlank(attempt.answers[i])).length;
  const flagged = indexes.filter((i) => attempt.flagged[i]).length;
  const halfFractions = indexes.filter((i) => incompleteFraction(attempt.answers[i])).map((i) => i + 1);
  const unmarked = indexes.filter((i) => {
    const q = attempt.questions[i];
    const a = attempt.answers[i];
    return isItem(q) && q.input.kind === 'self' && (a?.checked || !isBlank(a)) && a?.self === undefined;
  }).length;
  const live = segmentStart !== null ? Math.min(Math.max(clock - segmentStart, 0), MAX_CHUNK_MS) : 0;
  const elapsed = indexes.reduce((s, i) => s + attempt.timeMs[i], 0) + live;
  const title = sessionTitle(attempt, session.day);
  const item = isItem(question);
  // Long calculations get a smaller font so they stay on one line.
  const length = item ? 0 : promptText(question.parts).length;
  const sizeClass = length > 22 ? 'xlong' : length > 16 ? 'long' : '';
  const isLast = position === count;
  const marks = maxMarks(question);
  const keyboard = keyboardFor(question);
  const passage = passageOf(question);
  const numberInput = item && question.input.kind === 'number' ? question.input : undefined;
  const box = numberInput && typeof focus === 'number' ? numberInput.boxes[focus] : undefined;
  // Reasoning fraction questions ask for a fraction; Paper 1 accepts an exact decimal instead.
  const allowDecimal = box ? Boolean(box.decimal) && numberInput?.layout !== 'time' : !item && focus === 'whole';
  const allowNegative = Boolean(box?.negative);
  const sessionMarks = indexes.reduce((s, i) => s + maxMarks(attempt.questions[i]), 0);
  // A mock counts down from the real test's time; other papers show the real pace as a guide.
  const limit = attempt.timeLimitMs ?? null;
  const left = limit !== null ? limit - elapsed : null;
  const pace = PACE[attempt.paper];
  const suggested = limit === null && pace ? Math.max(Math.round((sessionMarks / pace[0]) * pace[1]), 1) * 60_000 : null;
  const timeUp = left !== null && left <= 0 && !overTimeOk && !confirming;

  const nav = (where: string) => (
    <div className={`q-nav ${where}`}>
      <button type="button" className="btn" disabled={position === 1} onClick={() => goTo(index - 1)}>
        <ArrowLeft aria-hidden />
        Back
      </button>
      <button
        type="button"
        className={`btn ${attempt.flagged[index] ? 'flag-on' : ''}`}
        aria-pressed={attempt.flagged[index]}
        onClick={() => edit((a) => toggleFlag(a, index))}
      >
        <Flag aria-hidden fill={attempt.flagged[index] ? 'currentColor' : 'none'} />
        {attempt.flagged[index] ? 'Flagged' : 'Flag'}
      </button>
      {isLast ? (
        <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
          Finish
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => goTo(index + 1)}>
          Next
          <ArrowRight aria-hidden />
        </button>
      )}
    </div>
  );

  const finish = () => {
    flush();
    stopSpeaking();
    const now = Date.now();
    edit((a) => submitSession(a, now));
    setConfirming(false);
    onFinished(now);
  };

  const layout = [
    'test-body',
    keyboard ? `kb-${keyboard}` : 'no-keypad',
    passage ? 'with-passage' : '',
  ].join(' ');

  return (
    <div className={`page test-page ${passage ? 'reading-page' : ''} ${passage && keyboard === 'letters' ? 'fit-screen' : ''}`}>
      <header className="topbar test-top">
        <button type="button" className="btn btn-ghost" onClick={onExit} aria-label="Save and go home">
          <ArrowLeft aria-hidden />
          Home
        </button>
        <div className="grow">
          <div className="test-title">
            {PAPER_NAME[attempt.paper]} · {title}
          </div>
          <div className="muted small">
            Paper {attempt.paperCode} · {position} of {count}
            {session.day ? ' today' : ''}
            {attempt.level !== undefined && ` · ${LEVEL_NAME[attempt.level]}`}
          </div>
        </div>
        <div
          className={`timer ${left !== null && left <= 5 * 60_000 ? 'timer-low' : ''}`}
          aria-label={left !== null ? 'Time left in the mock test' : 'Time on this session'}
        >
          <Timer className="timer-icon" aria-hidden />
          {left === null
            ? formatDuration(elapsed)
            : left >= 0
              ? `${formatDuration(left)} left`
              : `${formatDuration(-left)} over`}
          {suggested !== null && <span className="muted small"> / {formatDuration(suggested)}</span>}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
          Finish
        </button>
      </header>

      <nav className={`qmap ${count > 8 ? 'qmap-full' : ''} ${count > 30 ? 'qmap-scroll' : ''}`} aria-label="Questions">
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
              {attempt.flagged[i] && <Flag className="flag-mark" aria-hidden fill="currentColor" />}
            </button>
          );
        })}
      </nav>

      <div className={layout}>
        {passage && <Passage key={passage.textId} textId={passage.textId} paragraph={passage.paragraph} className="passage-panel" />}

        <section className={`card question-card ${item ? 'reasoning-card' : ''}`} aria-live="polite">
          <div className="q-head">
            <span className="q-number">{index + 1}</span>
            {!item && question.showMethod && <span className="method-tag">Show your method: work it out on paper</span>}
            <span className="grow" />
            <span className={marks > 1 ? 'marks-tag' : 'muted small'}>{marks > 1 ? `${marks} marks` : '1 mark'}</span>
          </div>
          {item ? (
            <div className="r-question" key={index}>
              <ReasoningBody q={question} />
              <ReasoningAnswer
                q={question}
                answer={answer}
                focus={focus}
                onFocus={setFocus}
                onSelect={onSelect}
                onAnswer={onAnswer}
              />
              {question.input.kind === 'fraction' && (
                <p className="muted small hint">Tap a box to fill it. Leave the whole-number box empty if there isn't one.</p>
              )}
            </div>
          ) : (
            <>
              <div className={`q-text ${sizeClass}`}>
                <MathText
                  parts={question.parts}
                  box={
                    <AnswerBoxes
                      kind={question.kind}
                      value={answer}
                      focus={typeof focus === 'string' ? focus : undefined}
                      onFocus={setFocus}
                    />
                  }
                />
              </div>
              {question.kind === 'frac' && (
                <p className="muted small hint">
                  Tap a box to fill it. Leave the whole-number box empty if there isn't one. A decimal goes in the
                  whole-number box.
                </p>
              )}
            </>
          )}
          {nav('card-nav')}
        </section>

        {keyboard === 'numbers' && (
          <aside className="keypad-wrap">
            {nav('keypad-nav')}
            <Keypad onKey={onKey} allowDecimal={allowDecimal} allowNegative={allowNegative} enabled={!confirming && !timeUp} />
          </aside>
        )}
        {keyboard === 'letters' && (
          <aside className="keypad-wrap letters-wrap">
            {nav('keypad-nav')}
            <LetterKeyboard onKey={onLetter} enabled={!confirming && !timeUp} />
          </aside>
        )}
      </div>

      {timeUp && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="timeup-title">
          <div className="modal">
            <h2 id="timeup-title">Time is up</h2>
            <p>
              In the real test you would put your pencil down now. You have answered <strong>{answered}</strong> of {count}{' '}
              questions.
            </p>
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setOverTimeOk(true)}>
                Keep going (over time)
              </button>
              <button type="button" className="btn btn-primary grow" onClick={finish}>
                Finish and mark
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="finish-title">
          <div className="modal">
            <h2 id="finish-title">Finish {session.day ? title : 'the paper'}?</h2>
            <p>
              You have answered <strong>{answered}</strong> of {count} questions.
              {answered < count && ` ${count - answered} blank ${count - answered === 1 ? 'answer scores' : 'answers score'} 0.`}
              {flagged > 0 && ` ${flagged} flagged.`}
            </p>
            {halfFractions.length > 0 && (
              <p className="banner small">
                {halfFractions.length === 1 ? `Question ${halfFractions[0]} has` : `Questions ${halfFractions.join(', ')} have`} a
                fraction with only a top or only a bottom number, which scores 0. A whole number goes in the big box.
              </p>
            )}
            {unmarked > 0 && (
              <p className="small">
                {unmarked === 1 ? 'Your written answer is' : `Your ${unmarked} written answers are`} marked after you finish:
                compare with a model answer, with a grown-up if you can.
              </p>
            )}
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
