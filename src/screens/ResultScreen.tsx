import { formatInput, isBlank } from '../answer/answer';
import { formatAnswer } from '../gen/format';
import { findType } from '../gen/registry';
import { TOPICS } from '../gen/types';
import { openSession, scoreOf, sessionAt, type Attempt } from '../store/model';
import { AnswerBoxes } from '../ui/AnswerBoxes';
import { MathText } from '../ui/MathText';
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
  const markedSoFar = attempt.marks.filter((m) => m !== null).length;
  const paper = scoreOf(attempt);
  const next = openSession(attempt);

  const topics = TOPICS.map((t) => {
    const qs = indexes.filter((i) => findType(attempt.questions[i].typeId)?.topic === t.id);
    return { label: t.label, total: qs.length, correct: qs.filter((i) => attempt.marks[i] === 1).length };
  }).filter((t) => t.total > 0);

  return (
    <div className="page">
      <header className="topbar">
        <h1>{session.day ? `Day ${session.day} marked` : 'Paper marked'}</h1>
        <button type="button" className="btn" onClick={onHome}>
          Home
        </button>
      </header>

      <section className="card result-hero">
        <div>
          <div className="hero">
            {score} / {total}
          </div>
          <div className="result-pct">{pct}%</div>
        </div>
        <div className="grow">
          <p className="praise">{praise(pct)}</p>
          <p className="muted small">
            Paper {attempt.paperCode} · {formatDateTime(at)}
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
          <div className="value">{formatSeconds(timeMs / total)}</div>
        </div>
        {attempt.mode === 'daily' && (
          <div className="tile">
            <div className="label">{attempt.completedAt ? 'Paper total' : 'Paper so far'}</div>
            <div className="value">
              {paper.score} / {markedSoFar}
            </div>
          </div>
        )}
      </div>

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
        <ol className="review">
          {indexes.map((i) => {
            const q = attempt.questions[i];
            const right = attempt.marks[i] === 1;
            const given = attempt.answers[i];
            return (
              <li key={i} className={`review-item ${right ? 'is-right' : 'is-wrong'}`}>
                <span className="q-number small-num">{i + 1}</span>
                <div className="review-main">
                  <div className="review-math">
                    <MathText
                      parts={q.parts}
                      box={<AnswerBoxes kind={q.kind} value={given} mark={right ? 'right' : 'wrong'} />}
                    />
                  </div>
                  <div className="review-meta">
                    <span className={`status ${right ? 'good' : 'bad'}`}>
                      <span className="dot" aria-hidden="true">
                        {right ? '✓' : '✕'}
                      </span>
                      {right ? 'Correct' : isBlank(given) ? 'No answer' : 'Not quite'}
                    </span>
                    {!right && (
                      <span>
                        Answer: <strong>{formatAnswer(q)}</strong>
                        {!isBlank(given) && <span className="muted"> (you wrote {formatInput(given)})</span>}
                      </span>
                    )}
                    <span className="muted small">
                      {findType(q.typeId)?.label} · {formatSeconds(attempt.timeMs[i])}
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
