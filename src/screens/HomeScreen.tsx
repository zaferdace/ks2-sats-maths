import { useState } from 'react';
import { isBlank } from '../answer/answer';
import { DAYS } from '../gen/blueprint';
import { PAPER_NAME } from '../gen/catalog';
import type { PaperKind } from '../gen/types';
import {
  activeAttempt,
  openSession,
  perDay,
  scoreOf,
  type Attempt,
  type Mode,
  type Profile,
  type StoreData,
} from '../store/model';
import { collectRecords, collectSessions, streakDays, tally } from '../stats/stats';
import { formatDateTime } from '../ui/time';

interface Props {
  data: StoreData;
  profile: Profile;
  onStart: (paper: PaperKind, mode: Mode) => void;
  onContinue: (attemptId: string) => void;
  onOpenResult: (attemptId: string, at: number) => void;
  onReport: () => void;
  onSettings: () => void;
  onSwitchProfile: () => void;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const PAPERS: { paper: PaperKind; title: string; about: string; perDay: number }[] = [
  { paper: 'arithmetic', title: 'Paper 1: Arithmetic', about: '40 questions, 1 mark each', perDay: 8 },
  { paper: 'reasoning', title: 'Papers 2 & 3: Reasoning', about: '25 questions, 35 marks, about 40 minutes', perDay: 5 },
];

function Progress({ attempt, onContinue }: { attempt: Attempt; onContinue: () => void }) {
  const session = openSession(attempt);
  if (!session) return null;
  const size = perDay(attempt);
  const questions = session.to - session.from;
  const answered = Array.from({ length: questions }, (_, k) => session.from + k).filter((i) => !isBlank(attempt.answers[i])).length;
  const label = session.day
    ? answered
      ? `Continue Day ${session.day} (${answered}/${questions} answered)`
      : `Start Day ${session.day}`
    : `Continue (${answered}/${questions} answered)`;
  return (
    <div className="progress">
      <div className="muted small">In progress · paper {attempt.paperCode}</div>
      {attempt.mode === 'daily' && (
        <ol className="days">
          {Array.from({ length: DAYS }, (_, k) => {
            const from = k * size;
            const done = attempt.marks[from] !== null;
            const current = session.day === k + 1;
            const s = scoreOf(attempt, from, Math.min(from + size, attempt.questions.length));
            return (
              <li key={k} className={`day ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                <span className="day-name">Day {k + 1}</span>
                <span className="day-score">{done ? `${s.score}/${s.total}` : current ? 'Next' : ''}</span>
              </li>
            );
          })}
        </ol>
      )}
      <button type="button" className="btn btn-primary btn-big" onClick={onContinue}>
        {label}
      </button>
    </div>
  );
}

export function HomeScreen(props: Props) {
  const { data, profile, onStart, onContinue, onOpenResult } = props;
  const [confirm, setConfirm] = useState<{ paper: PaperKind; mode: Mode } | null>(null);
  const attempts = data.attempts.filter((a) => a.profileId === profile.id);
  const sessions = collectSessions(attempts);
  const [now] = useState(() => Date.now());
  const lastWeek = tally(collectRecords(attempts).filter((r) => r.at > now - WEEK_MS));
  const streak = streakDays(sessions, now);

  const start = (paper: PaperKind, mode: Mode) =>
    activeAttempt(data, profile.id, paper) ? setConfirm({ paper, mode }) : onStart(paper, mode);

  return (
    <div className="page">
      <header className="topbar">
        <h1>Hi, {profile.name}</h1>
        <button type="button" className="btn btn-ghost" onClick={props.onSwitchProfile}>
          Switch
        </button>
        <button type="button" className="btn" onClick={props.onSettings}>
          Settings
        </button>
      </header>

      <div className="tiles">
        <div className="tile">
          <div className="label">Practice streak</div>
          <div className="value">
            {streak} {streak === 1 ? 'day' : 'days'}
          </div>
        </div>
        <div className="tile">
          <div className="label">Questions this week</div>
          <div className="value">{lastWeek.total}</div>
        </div>
        <div className="tile">
          <div className="label">Correct this week</div>
          <div className="value">{lastWeek.total ? `${Math.round((lastWeek.correct / lastWeek.total) * 100)}%` : '—'}</div>
        </div>
      </div>

      <div className="papers">
        {PAPERS.map((p) => {
          const active = activeAttempt(data, profile.id, p.paper);
          return (
            <section key={p.paper} className={`card paper-card ${p.paper}`}>
              <h2>{p.title}</h2>
              <p className="muted">{p.about}</p>
              {active && <Progress attempt={active} onContinue={() => onContinue(active.id)} />}
              <div className="choices">
                <button type="button" className="choice" onClick={() => start(p.paper, 'daily')}>
                  <strong>New daily paper</strong>
                  <span className="muted">{p.perDay} questions a day for 5 days</span>
                </button>
                <button type="button" className="choice" onClick={() => start(p.paper, 'full')}>
                  <strong>New full paper</strong>
                  <span className="muted">The whole paper in one go</span>
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <section className="card">
        <div className="row">
          <h2 className="grow">Recent results</h2>
          <button type="button" className="btn btn-primary" onClick={props.onReport}>
            Report and heat maps
          </button>
        </div>
        {sessions.length === 0 ? (
          <p className="muted">No results yet. Finish a day or a paper to see scores here.</p>
        ) : (
          <table>
            <tbody>
              {sessions
                .slice(-6)
                .reverse()
                .map((s) => (
                  <tr key={`${s.attemptId}-${s.at}`} className="clickable" onClick={() => onOpenResult(s.attemptId, s.at)}>
                    <td>{formatDateTime(s.at)}</td>
                    <td>
                      {PAPER_NAME[s.paper]} · {s.day ? `Day ${s.day}` : 'Full paper'}
                    </td>
                    <td className="num">
                      {s.score} / {s.total}
                    </td>
                    <td className="num">{Math.round((s.score / s.total) * 100)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      {confirm && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="new-title">
          <div className="modal">
            <h2 id="new-title">Start a new {PAPER_NAME[confirm.paper].toLowerCase()} paper?</h2>
            <p>The {PAPER_NAME[confirm.paper].toLowerCase()} paper in progress will be put aside. Its marked days stay in the report.</p>
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={() => {
                  onStart(confirm.paper, confirm.mode);
                  setConfirm(null);
                }}
              >
                Start new paper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
