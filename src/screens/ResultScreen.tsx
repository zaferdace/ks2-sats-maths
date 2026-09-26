import { awaitingMark, formatCorrect, formatInput, formNote, isBlank, maxMarks } from '../answer/answer';
import { readingText } from '../english/bank';
import { LEVEL_NAME, PAPER_NAME, typeInfo } from '../gen/catalog';
import { isItem, SUBJECT_OF, TOPICS } from '../gen/types';
import { openSession, scoreOf, sessionAt, type Attempt } from '../store/model';
import { AnswerBoxes } from '../ui/AnswerBoxes';
import { sessionTitle, textsOf } from '../ui/labels';
import { MathText } from '../ui/MathText';
import { Passage } from '../ui/Passage';
import { ReasoningAnswer, ReasoningBody } from '../ui/ReasoningView';
import { RichText } from '../ui/RichText';
import { formatDateTime, formatDuration, formatSeconds } from '../ui/time';

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
}

function praise(pct: number): string {
  if (pct >= 90) return 'Brilliant work!';
  if (pct >= 75) return 'Great work!';
  if (pct >= 50) return 'Good effort. Check the ones to fix below.';
  return 'Keep practising. Go through the corrections below.';
}

export function ResultScreen({ attempt, at, onHome, onReport, onContinue, onSelfMark, onAccept }: Props) {
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
  const maths = SUBJECT_OF[attempt.paper] === 'maths';
  const hasTwoMarkers = maths && indexes.some((i) => maxMarks(attempt.questions[i]) > 1);
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

  return (
    <div className="page">
      <header className="topbar">
        <h1>
          {paperName} · {sessionTitle(attempt, session.day)}
        </h1>
        <button type="button" className="btn" onClick={onHome}>
          Home
        </button>
      </header>

      <section className="card result-hero">
        <div>
          <div className="hero">
            {score} / {total}
          </div>
          <div className="result-pct">
            {total !== indexes.length ? 'marks · ' : ''}
            {pct}%
          </div>
        </div>
        <div className="grow">
          <p className="praise">{praise(pct)}</p>
          <p className="muted small">
            Paper {attempt.paperCode} · {formatDateTime(at)}
            {attempt.level !== undefined && ` · ${LEVEL_NAME[attempt.level]}`}
          </p>
        </div>
      </section>

      <div className="tiles">
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

      {hasTwoMarkers && (
        <p className="banner small">
          Two-mark questions score 2 or 0 here. In the real test, a correct method can still earn 1 mark when the
          answer is wrong, so show your working on paper.
        </p>
      )}
      {hasMethod && (
        <p className="banner small">
          Long multiplication and long division are worth 2 marks in the real test. Write out the formal method in the
          answer space: if the answer is wrong, a correct method with one slip still earns 1 mark.
        </p>
      )}
      {pending > 0 && (
        <p className="banner">
          {pending === 1 ? 'One written answer' : `${pending} written answers`} (up to {pendingMarks}{' '}
          {pendingMarks === 1 ? 'mark' : 'marks'}) still {pending === 1 ? 'needs' : 'need'} marking. Read each one with a
          grown-up, compare it with the model answer below and choose the marks. Until then {pending === 1 ? 'it is' : 'they are'} left
          out of the score.
        </p>
      )}
      {selfMarked && pending === 0 && (
        <p className="banner small">
          Written answers were marked against a model answer. A grown-up can change a mark below.
        </p>
      )}

      <div className="row">
        {next && (
          <button type="button" className="btn btn-primary btn-big" onClick={onContinue}>
            Start Day {next.day}
          </button>
        )}
        <button type="button" className="btn btn-big" onClick={onReport}>
          See the report
        </button>
      </div>

      <section className="card">
        <h2>By topic</h2>
        <table>
          <tbody>
            {topics.map((t) => (
              <tr key={t.label}>
                <td>{t.label}</td>
                <td className="num">
                  {t.correct} / {t.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
                <span className="q-number small-num">{i + 1}</span>
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
