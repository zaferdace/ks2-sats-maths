import { useState } from 'react';
import { isBlank } from '../answer/answer';
import { DAYS, QUESTIONS_PER_DAY } from '../gen/blueprint';
import { activeAttempt, openSession, scoreOf, type Mode, type Profile, type StoreData } from '../store/model';
import { collectRecords, collectSessions, streakDays, tally } from '../stats/stats';
import { formatDateTime } from '../ui/time';

interface Props {
  data: StoreData;
  profile: Profile;
  onStart: (mode: Mode) => void;
  onContinue: (attemptId: string) => void;
  onOpenResult: (attemptId: string, at: number) => void;
  onReport: () => void;
  onSettings: () => void;
  onSwitchProfile: () => void;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function HomeScreen(props: Props) {
  const { data, profile, onStart, onContinue, onOpenResult } = props;
  const [confirmMode, setConfirmMode] = useState<Mode | null>(null);
  const attempts = data.attempts.filter((a) => a.profileId === profile.id);
  const active = activeAttempt(data, profile.id);
  const session = active ? openSession(active) : null;
  const sessions = collectSessions(attempts);
  const [now] = useState(() => Date.now());
  const lastWeek = tally(collectRecords(attempts).filter((r) => r.at > now - WEEK_MS));
  const streak = streakDays(sessions, now);

  const start = (mode: Mode) => (active ? setConfirmMode(mode) : onStart(mode));

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

      {active && session && (
        <section className="card continue-card">
          <h2>
            {active.mode === 'daily' ? 'Your paper' : 'Full paper in progress'}
            <span className="muted small"> · Paper {active.paperCode}</span>
          </h2>
          {active.mode === 'daily' && (
            <ol className="days">
              {Array.from({ length: DAYS }, (_, k) => {
                const from = k * QUESTIONS_PER_DAY;
                const done = active.marks[from] !== null;
                const current = session.day === k + 1;
                const s = scoreOf(active, from, from + QUESTIONS_PER_DAY);
                return (
                  <li key={k} className={`day ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                    <span className="day-name">Day {k + 1}</span>
                    <span className="day-score">{done ? `${s.score}/${s.total}` : current ? 'Next' : ''}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {(() => {
            const answered = Array.from({ length: session.to - session.from }, (_, k) => session.from + k).filter(
              (i) => !isBlank(active.answers[i]),
            ).length;
            const label = session.day
              ? answered
                ? `Continue Day ${session.day} (${answered}/${session.to - session.from} answered)`
                : `Start Day ${session.day}`
              : `Continue (${answered}/${session.to - session.from} answered)`;
            return (
              <button type="button" className="btn btn-primary btn-big" onClick={() => onContinue(active.id)}>
                {label}
              </button>
            );
          })()}
        </section>
      )}

      <section className="card">
        <h2>New paper</h2>
        <div className="choices">
          <button type="button" className="choice" onClick={() => start('daily')}>
            <strong>Daily paper</strong>
            <span className="muted">40 questions, 8 a day for 5 days</span>
          </button>
          <button type="button" className="choice" onClick={() => start('full')}>
            <strong>Full paper</strong>
            <span className="muted">All 40 questions in one go</span>
          </button>
        </div>
      </section>

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
                    <td>{s.day ? `Day ${s.day}` : 'Full paper'}</td>
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

      {confirmMode && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="new-title">
          <div className="modal">
            <h2 id="new-title">Start a new paper?</h2>
            <p>The paper in progress will be put aside. Its marked days stay in the report.</p>
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setConfirmMode(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={() => {
                  onStart(confirmMode);
                  setConfirmMode(null);
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
