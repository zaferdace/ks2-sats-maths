import { formatCorrect, formatInput, isBlank, maxMarks } from '../answer/answer';
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
}

function praise(pct: number): string {
  if (pct >= 90) return 'Brilliant work!';
  if (pct >= 75) return 'Great work!';
  if (pct >= 50) return 'Good effort. Check the ones to fix below.';
  return 'Keep practising. Go through the corrections below.';
}

export function ResultScreen({ attempt, at, onHome, onReport, onContinue }: Props) {
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
  const { score, total } = scoreOf(attempt, session.from, session.to);
  const pct = Math.round((score / total) * 100);
  const indexes = Array.from({ length: session.to - session.from }, (_, k) => session.from + k);
  const timeMs = indexes.reduce((s, i) => s + attempt.timeMs[i], 0);
  const marked = attempt.questions.map((_, i) => i).filter((i) => attempt.marks[i] !== null);
  const soFar = {
    score: marked.reduce((s, i) => s + (attempt.marks[i] ?? 0), 0),
    total: marked.reduce((s, i) => s + maxMarks(attempt.questions[i]), 0),
  };
  const next = openSession(attempt);
  const maths = SUBJECT_OF[attempt.paper] === 'maths';
  const hasTwoMarkers = maths && indexes.some((i) => maxMarks(attempt.questions[i]) > 1);
  const selfMarked = indexes.some((i) => {
    const q = attempt.questions[i];
    return isItem(q) && q.input.kind === 'self';
  });
  const paperName = PAPER_NAME[attempt.paper];
  const texts = textsOf(attempt);

  const topics = TOPICS.map((t) => {
    const qs = indexes.filter((i) => typeInfo(attempt.questions[i].typeId)?.topic === t.id);
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
      {selfMarked && (
        <p className="banner small">
          Written answers were marked by the pupil against a model answer. A grown-up can read them below and check
          the marks.
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
            return (
              <li key={i} className={`review-item ${right ? 'is-right' : 'is-wrong'}`}>
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
                    <span className={`status ${right ? 'good' : got > 0 ? 'part' : 'bad'}`}>
                      <span className="dot" aria-hidden="true">
                        {right ? '✓' : got > 0 ? '½' : '✕'}
                      </span>
                      {selfQ
                        ? given?.self !== undefined
                          ? `You gave yourself ${got} of ${max}`
                          : 'Not marked'
                        : right
                          ? 'Correct'
                          : isBlank(given)
                            ? 'No answer'
                            : 'Not quite'}
                      {!selfQ && max > 1 && ` · ${got}/${max} marks`}
                    </span>
                    {!right && !selfQ && (
                      <span>
                        Answer: <strong>{formatCorrect(q)}</strong>
                        {!isBlank(given) && <span className="muted"> (you wrote {formatInput(given, q)})</span>}
                      </span>
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
