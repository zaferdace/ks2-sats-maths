import {
  ArrowRight,
  ChartColumn,
  ClipboardCheck,
  Flag,
  House,
  PenLine,
  RotateCcw,
  Sparkles,
  Target,
  ThumbsUp,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { awaitingMark, formatCorrect, formatInput, formNote, isBlank, maxMarks } from '../answer/answer';
import { Button } from '../components/ui/button';
import { Card, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { readingText } from '../english/bank';
import { LEVEL_NAME, PAPER_NAME, typeInfo } from '../gen/catalog';
import { isItem, TOPICS } from '../gen/types';
import { METHOD_TIPS } from '../gen/tips';
import { openSession, scoreOf, sessionAt, type Attempt, type StartRequest } from '../store/model';
import { AnswerBoxes } from '../ui/AnswerBoxes';
import { sessionTitle, textsOf } from '../ui/labels';
import { MathText } from '../ui/MathText';
import { Passage } from '../ui/Passage';
import { ReasoningAnswer, ReasoningBody } from '../ui/ReasoningView';
import { cn } from '../lib/utils';
import { Confetti } from '../report/Confetti';
import { ScoreRing } from '../report/ScoreRing';
import { RichText } from '../ui/RichText';
import { formatDateTime, formatDuration, formatSeconds } from '../ui/time';
import { gpsPractice, mathsPractice } from './practiceRequests';

interface Props {
  attempt: Attempt;
  at: number;
  onHome: () => void;
  onReport: () => void;
  onContinue: () => void;
  /** Gives a written explanation its marks (or changes them). */
  onSelfMark: (index: number, marks: number) => void;
  /** A grown-up accepts, or stops accepting, a typed reading answer marked wrong. */
  onAccept: (index: number, accepted: boolean) => void;
  /** Starts a topic practice (the question types that went wrong). */
  onPractise: (request: StartRequest) => void;
}

/** At most this many question types in a "practise what went wrong" set. */
const PRACTISE_TYPES = 6;

function praise(pct: number): string {
  if (pct >= 90) return 'Brilliant work!';
  if (pct >= 75) return 'Great work!';
  if (pct >= 50) return 'Good effort. Check the ones to fix below.';
  return 'Keep practising. Go through the corrections below.';
}

export function ResultScreen({ attempt, at, onHome, onReport, onContinue, onSelfMark, onAccept, onPractise }: Props) {
  // Confetti only when the session has just been marked, not on a later visit.
  const [justMarked] = useState(() => Date.now() - at < 20_000);
  const first = attempt.markedAt.indexOf(at);
  if (first === -1) {
    return (
      <div className="page">
        <p>This session could not be found.</p>
        <button type="button" className="btn" onClick={onHome}>
          Home
        </button>
      </div>
    );
  }
  const session = sessionAt(attempt, first);
  const { score, total, pending, pendingMarks } = scoreOf(attempt, session.from, session.to);
  const pct = total ? Math.round((score / total) * 100) : 0;
  const indexes = Array.from({ length: session.to - session.from }, (_, k) => session.from + k);
  const timeMs = indexes.reduce((s, i) => s + attempt.timeMs[i], 0);
  const soFar = scoreOf(attempt);
  // Paper 1's two-mark questions (long multiplication and division) get their own note below.
  const hasTwoMarkers = attempt.paper === 'reasoning' && indexes.some((i) => maxMarks(attempt.questions[i]) > 1);
  const hasMethod = indexes.some((i) => {
    const q = attempt.questions[i];
    return !isItem(q) && q.showMethod;
  });
  // A paper put aside for a newer one is only reviewed here, not carried on.
  const next = attempt.abandonedAt === undefined ? openSession(attempt) : null;
  const selfMarked = indexes.some((i) => {
    const q = attempt.questions[i];
    return isItem(q) && q.input.kind === 'self';
  });
  const paperName = PAPER_NAME[attempt.paper];
  const limit = attempt.timeLimitMs;
  // Question types that went wrong, to practise straight away (maths and grammar questions come in types).
  const wrongTypes = [
    ...new Set(
      indexes
        .filter((i) => attempt.marks[i] !== maxMarks(attempt.questions[i]) && !awaitingMark(attempt.questions[i], attempt.answers[i]))
        .map((i) => attempt.questions[i].typeId),
    ),
  ].slice(0, PRACTISE_TYPES);
  const practiceRequest: StartRequest | null =
    wrongTypes.length === 0
      ? null
      : attempt.paper === 'arithmetic' || attempt.paper === 'reasoning'
        ? { ...mathsPractice(attempt.paper, wrongTypes, 'What went wrong'), level: 'mixed' }
        : attempt.paper === 'gps'
          ? { ...gpsPractice(wrongTypes, 'What went wrong'), level: attempt.level ?? 'mixed' }
          : null;
  const texts = textsOf(attempt);

  const topics = TOPICS.map((t) => {
    const qs = indexes.filter(
      (i) => typeInfo(attempt.questions[i].typeId)?.topic === t.id && !awaitingMark(attempt.questions[i], attempt.answers[i]),
    );
    return {
      label: t.label,
      total: qs.length,
      correct: qs.filter((i) => attempt.marks[i] === maxMarks(attempt.questions[i])).length,
    };
  }).filter((t) => t.total > 0);

  const Praise = pct >= 90 ? Trophy : pct >= 75 ? Sparkles : pct >= 50 ? ThumbsUp : Target;
  const celebrate = justMarked && pct >= 85 && total > 0;
  const note = (tone: 'info' | 'good' | 'warn', icon: LucideIcon, children: ReactNode) => {
    const Icon = icon;
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border p-4 text-[15px] leading-snug font-semibold',
          tone === 'good' ? 'border-good/30 bg-good-soft text-good-ink' : tone === 'warn' ? 'border-warn/40 bg-warn-soft text-warn-ink' : 'border-brand/20 bg-brand-soft text-ink',
        )}
      >
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>{children}</div>
      </div>
    );
  };

  return (
    <div className="page gap-5">
      {celebrate && <Confetti />}
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 min-w-0 flex-1 text-3xl font-black text-ink">
          {paperName} · {sessionTitle(attempt, session.day)}
        </h1>
        <Button onClick={onHome}>
          <House aria-hidden />
          Home
        </Button>
      </header>

      <Card className="result-hero flex-row flex-wrap items-center gap-6">
        <ScoreRing pct={pct} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="hero text-5xl font-black text-ink">
            {score} / {total}
          </div>
          <p className="praise m-0 flex items-center gap-2 text-xl font-extrabold text-ink">
            <Praise className={cn('size-6 shrink-0', pct >= 75 ? 'text-warn' : 'text-brand')} aria-hidden />
            {praise(pct)}
          </p>
          <p className="m-0 text-sm text-muted">
            {total !== indexes.length ? 'Marks, not questions · ' : ''}Paper {attempt.paperCode} · {formatDateTime(at)}
            {attempt.level !== undefined && ` · ${LEVEL_NAME[attempt.level]}`}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="tile">
          <div className="label">Time</div>
          <div className="value">{formatDuration(timeMs)}</div>
        </div>
        <div className="tile">
          <div className="label">Average per question</div>
          <div className="value">{formatSeconds(timeMs / indexes.length)}</div>
        </div>
        {attempt.mode === 'daily' && (
          <div className="tile">
            <div className="label">{attempt.completedAt ? 'Paper total' : 'Paper so far'}</div>
            <div className="value">
              {soFar.score} / {soFar.total}
            </div>
          </div>
        )}
      </div>

      {limit !== undefined &&
        note(
          timeMs <= limit ? 'good' : 'warn',
          Timer,
          <>
            Mock test:{' '}
            {timeMs <= limit
              ? `finished with ${formatDuration(limit - timeMs)} to spare out of ${formatDuration(limit)}.`
              : `${formatDuration(timeMs - limit)} over the ${formatDuration(limit)} allowed. In the real test, answers written after the time is up do not count.`}
          </>,
        )}
      {hasTwoMarkers &&
        note(
          'info',
          PenLine,
          'Two-mark questions score 2 or 0 here. In the real test, a correct method can still earn 1 mark when the answer is wrong, so show your working on paper.',
        )}
      {hasMethod &&
        note(
          'info',
          PenLine,
          'Long multiplication and long division are worth 2 marks in the real test. Write out the formal method in the answer space: if the answer is wrong, a correct method with one slip still earns 1 mark.',
        )}
      {pending > 0 &&
        note(
          'warn',
          ClipboardCheck,
          <>
            {pending === 1 ? 'One written answer' : `${pending} written answers`} (up to {pendingMarks} {pendingMarks === 1 ? 'mark' : 'marks'})
            still {pending === 1 ? 'needs' : 'need'} marking. Read each one with a grown-up, compare it with the model answer below and
            choose the marks. Until then {pending === 1 ? 'it is' : 'they are'} left out of the score.
          </>,
        )}
      {selfMarked && pending === 0 && note('info', ClipboardCheck, 'Written answers were marked against a model answer. A grown-up can change a mark below.')}

      <div className="flex flex-wrap gap-3">
        {next && (
          <Button variant="primary" size="lg" onClick={onContinue}>
            Start Day {next.day}
            <ArrowRight aria-hidden />
          </Button>
        )}
        {practiceRequest && (
          <Button size="lg" onClick={() => onPractise(practiceRequest)}>
            <RotateCcw aria-hidden />
            Practise what went wrong
          </Button>
        )}
        <Button size="lg" onClick={onReport}>
          <ChartColumn aria-hidden />
          See the report
        </Button>
      </div>

      <Card>
        <CardTitle>By topic</CardTitle>
        <ul className="m-0 grid list-none gap-3 p-0">
          {topics.map((t) => {
            const share = t.total ? t.correct / t.total : 0;
            return (
              <li key={t.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
                <span className="font-bold text-ink">{t.label}</span>
                <span className="text-sm font-bold text-ink-2 tabular-nums">
                  {t.correct} / {t.total}
                </span>
                <Progress
                  className="col-span-2 h-2.5"
                  value={share * 100}
                  indicatorClassName={share >= 0.85 ? 'bg-good' : share >= 0.7 ? 'bg-warn' : share >= 0.5 ? 'bg-orange-500' : 'bg-bad'}
                  aria-label={`${t.label}: ${t.correct} of ${t.total}`}
                />
              </li>
            );
          })}
        </ul>
      </Card>

      <section className="card">
        <h2>Questions</h2>
        {texts.map((id) => (
          <details key={id} className="review-text">
            <summary>Read “{readingText(id)?.title ?? 'the text'}” again</summary>
            <Passage textId={id} />
          </details>
        ))}
        <ol className="review">
          {indexes.map((i) => {
            const q = attempt.questions[i];
            const max = maxMarks(q);
            const got = attempt.marks[i] ?? 0;
            const right = got === max;
            const given = attempt.answers[i];
            const selfQ = isItem(q) && q.input.kind === 'self';
            const waiting = awaitingMark(q, given);
            const note = right ? null : formNote(q, given);
            const acceptable = isItem(q) && q.input.kind === 'text' && attempt.paper === 'reading' && !isBlank(given);
            return (
              <li key={i} className={`review-item ${waiting ? 'is-waiting' : right ? 'is-right' : 'is-wrong'}`}>
                <span className="q-number small-num">
                  {i + 1}
                  {attempt.flagged[i] && (
                    <span className="flag-mark" role="img" aria-label="flagged">
                      <Flag aria-hidden fill="currentColor" />
                    </span>
                  )}
                </span>
                <div className="review-main">
                  {isItem(q) ? (
                    <div className="review-reasoning">
                      <ReasoningBody q={q} review />
                      <ReasoningAnswer q={q} answer={given} mark={right ? 'right' : 'wrong'} />
                    </div>
                  ) : (
                    <div className="review-math">
                      <MathText parts={q.parts} box={<AnswerBoxes kind={q.kind} value={given} mark={right ? 'right' : 'wrong'} />} />
                    </div>
                  )}
                  <div className="review-meta">
                    <span className={`status ${waiting ? 'wait' : right ? 'good' : got > 0 ? 'part' : 'bad'}`}>
                      <span className="dot" aria-hidden="true">
                        {waiting ? '?' : right ? '✓' : got > 0 ? '½' : '✕'}
                      </span>
                      {selfQ
                        ? waiting
                          ? 'To mark'
                          : isBlank(given)
                            ? 'No answer'
                            : `${got} of ${max} ${max === 1 ? 'mark' : 'marks'}`
                        : right
                          ? given?.accepted
                            ? 'Accepted by a grown-up'
                            : 'Correct'
                          : isBlank(given)
                            ? 'No answer'
                            : 'Not quite'}
                      {!selfQ && max > 1 && ` · ${got}/${max} marks`}
                    </span>
                    {selfQ && !isBlank(given) && (
                      <span className="self-mark" role="group" aria-label={`Marks for question ${i + 1}`}>
                        {Array.from({ length: max + 1 }, (_, m) => (
                          <button
                            key={m}
                            type="button"
                            className={`btn ${given?.self === m ? 'btn-primary' : ''}`}
                            aria-pressed={given?.self === m}
                            onClick={() => onSelfMark(i, m)}
                          >
                            {m} {m === 1 ? 'mark' : 'marks'}
                          </button>
                        ))}
                      </span>
                    )}
                    {!right && !selfQ && (
                      <span>
                        Answer: <strong>{formatCorrect(q)}</strong>
                        {!isBlank(given) && <span className="muted"> (you wrote {formatInput(given, q)})</span>}
                      </span>
                    )}
                    {note && <span className="form-note">{note}</span>}
                    {!right && !isItem(q) && METHOD_TIPS[q.typeId] && (
                      <span className="method-tip">
                        <strong>How to do it:</strong> {METHOD_TIPS[q.typeId]}
                      </span>
                    )}
                    {acceptable && (!right || given?.accepted) && (
                      <button type="button" className="btn btn-ghost small" onClick={() => onAccept(i, !given?.accepted)}>
                        {given?.accepted ? 'Undo: mark it wrong again' : 'Grown-up: the meaning is right (a spelling slip), accept it'}
                      </button>
                    )}
                    {!right && isItem(q) && q.explain && <RichText className="explain" text={q.explain} />}
                    <span className="muted small">
                      {typeInfo(q.typeId)?.label} · {formatSeconds(attempt.timeMs[i])}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
