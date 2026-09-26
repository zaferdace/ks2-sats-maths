import { useMemo, useState } from 'react';
import { matchesFilter, PAPER_NAME, typesOf, type MathsPaper, type PaperFilter } from '../gen/catalog';
import type { PaperKind, Subject } from '../gen/types';
import { LEVELS, levelOf, pctText } from '../report/levels';
import { Legend, PositionHeat, SkillMap, WeeklyHeat } from '../report/Heatmaps';
import { ScoreHistory } from '../report/ScoreHistory';
import { findAttempt, replacedBy, type Profile, type StartRequest, type StoreData } from '../store/model';
import {
  byTopic,
  byType,
  collectRecords,
  collectSessions,
  inPaper,
  positionGrid,
  summarize,
  weakest,
  weeklyGrid,
} from '../stats/stats';
import { sessionTitle } from '../ui/labels';
import { formatSeconds } from '../ui/time';
import { englishLevel, practiceFor } from './practiceRequests';

interface Props {
  data: StoreData;
  profile: Profile;
  onBack: () => void;
  /** Starts a topic practice for a weak question type. */
  onPractise: (request: StartRequest) => void;
}

/** Types at this accuracy or above are secure and not suggested for practice. */
const SECURE = 0.85;

const RANGES = [
  { id: 'all', label: 'All time', days: null },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '7', label: 'Last 7 days', days: 7 },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

const SUBJECTS: { id: 'all' | Subject; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'maths', label: 'Maths' },
  { id: 'english', label: 'English' },
];

const PAPERS_OF: Record<Subject, PaperKind[]> = {
  maths: ['arithmetic', 'reasoning'],
  english: ['gps', 'spelling', 'reading'],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function ReportScreen({ data, profile, onBack, onPractise }: Props) {
  const [range, setRange] = useState<RangeId>('all');
  const [confirm, setConfirm] = useState<StartRequest | null>(null);
  const [subject, setSubject] = useState<'all' | Subject>('all');
  const [paperChoice, setPaperChoice] = useState<PaperKind | null>(null);
  const [now] = useState(() => Date.now());
  const filter: PaperFilter = paperChoice ?? subject;

  const view = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days ?? null;
    const since = days === null ? -Infinity : now - days * DAY_MS;
    const attempts = data.attempts.filter((a) => a.profileId === profile.id && inPaper(filter)(a));
    const records = collectRecords(attempts).filter((r) => r.at >= since);
    const allSessions = collectSessions(attempts);
    const sessions = allSessions.filter((s) => s.at >= since);
    const inRange = attempts.filter((a) => a.completedAt !== null && a.completedAt >= since);
    const typeList = typesOf(filter);
    const types = byType(records, typeList);
    const papers = (['arithmetic', 'reasoning'] as MathsPaper[]).filter((k) => matchesFilter(filter, k));
    return {
      records,
      sessions,
      summary: summarize(inRange, records, sessions, now, allSessions),
      topics: byTopic(records, typeList),
      types,
      weak: weakest(types)
        .filter((row) => row.tally.correct / row.tally.total < SECURE)
        .slice(0, 5),
      weekly: weeklyGrid(records, now, typeList),
      positions: papers
        .map((k) => ({ paper: k, grid: positionGrid(records, k) }))
        .filter((g) => g.grid.some((row) => row.some((c) => c.total > 0))),
    };
  }, [data.attempts, profile.id, range, filter, now]);

  const { summary } = view;

  const practise = (request: StartRequest) =>
    replacedBy(data, profile.id, request.paper, request.mode) ? setConfirm(request) : onPractise(request);

  return (
    <div className="page">
      <header className="topbar">
        <h1>Report · {profile.name}</h1>
        <button type="button" className="btn" onClick={onBack}>
          Home
        </button>
      </header>

      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="Subject">
          {SUBJECTS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={subject === f.id}
              className={subject === f.id ? 'on' : ''}
              onClick={() => {
                setSubject(f.id);
                setPaperChoice(null);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {subject !== 'all' && (
          <div className="segmented" role="radiogroup" aria-label="Paper">
            <button type="button" role="radio" aria-checked={paperChoice === null} className={paperChoice === null ? 'on' : ''} onClick={() => setPaperChoice(null)}>
              All {subject === 'english' ? 'English' : 'maths'}
            </button>
            {PAPERS_OF[subject].map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={paperChoice === k}
                className={paperChoice === k ? 'on' : ''}
                onClick={() => setPaperChoice(k)}
              >
                {PAPER_NAME[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="segmented" role="radiogroup" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={range === r.id}
            className={range === r.id ? 'on' : ''}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {view.records.length === 0 ? (
        <section className="card">
          <p className="muted">No marked questions in this time range yet. Finish a day or a full paper first.</p>
        </section>
      ) : (
        <>
          <section className="card summary">
            <div className="summary-hero">
              <div className="label muted">Questions correct</div>
              <div className="hero">{summary.accuracy === null ? '–' : `${Math.round(summary.accuracy * 100)}%`}</div>
              <div className="muted">
                {summary.correct} of {summary.questions} questions
              </div>
            </div>
            <div className="tiles grow">
              <div className="tile">
                <div className="label">Sessions</div>
                <div className="value">{summary.sessions}</div>
              </div>
              <div className="tile">
                <div className="label">Papers completed</div>
                <div className="value">{summary.papersCompleted}</div>
              </div>
              <div className="tile">
                <div className="label">Average time per question</div>
                <div className="value">{summary.avgTimeMs === null ? '–' : formatSeconds(summary.avgTimeMs)}</div>
              </div>
              <div className="tile">
                <div className="label">Practice streak</div>
                <div className="value">
                  {summary.streakDays} {summary.streakDays === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Score per session</h2>
            <ScoreHistory
              sessions={view.sessions}
              titleOf={(s) => {
                const attempt = findAttempt(data, s.attemptId);
                return attempt ? sessionTitle(attempt, s.day) : s.day ? `Day ${s.day}` : 'Full paper';
              }}
            />
          </section>

          <section className="card">
            <h2>Accuracy by topic</h2>
            <div className="topic-bars">
              {view.topics.map((t) => {
                const acc = t.tally.total ? t.tally.correct / t.tally.total : 0;
                return (
                  <div key={t.topic} className="topic-row">
                    <div className="topic-name">{t.label}</div>
                    <div className="topic-track">
                      {t.tally.total > 0 && <div className="topic-bar" style={{ width: `${Math.max(acc * 100, 1)}%` }} />}
                      <span className="topic-value">
                        {t.tally.total ? `${pctText(t.tally)} · ${t.tally.correct}/${t.tally.total}` : 'Not tried yet'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h2>Skill heat map</h2>
            <p className="muted small">Every question type, coloured by how often it was right.</p>
            <Legend />
            <SkillMap rows={view.types} />
          </section>

          <section className="card">
            <h2>Practise these next</h2>
            {view.weak.length === 0 ? (
              <p className="muted">
                {view.types.some((r) => r.tally.total >= 3)
                  ? 'Every question type with enough answers is secure (85% or more). Well done!'
                  : 'Not enough answers yet: each type needs at least 3.'}
              </p>
            ) : (
              <ol className="weak-list">
                {view.weak.map((r) => {
                  const level = LEVELS[levelOf(r.tally)];
                  const request = practiceFor(r.typeId, r.label);
                  return (
                    <li key={r.typeId}>
                      <span className="legend-swatch" style={{ background: level.color, color: level.ink }} aria-hidden="true">
                        {level.icon}
                      </span>
                      <span className="grow">{r.label}</span>
                      <span className="num">
                        {r.tally.correct}/{r.tally.total} · {pctText(r.tally)}
                      </span>
                      {request ? (
                        <button type="button" className="btn" onClick={() => practise({ ...request, level: englishLevel() })}>
                          Practise
                        </button>
                      ) : (
                        <span className="muted small">Practise with a reading text</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="card">
            <h2>Progress by week</h2>
            <p className="muted small">Each row is a question type; each column a week (Monday to Sunday).</p>
            <WeeklyHeat grid={view.weekly} />
          </section>

          {view.positions.map(({ paper: k, grid }) => (
            <section key={k} className="card">
              <h2>Accuracy by question number: {PAPER_NAME[k]}</h2>
              <p className="muted small">Later questions are harder. A row that turns red towards the end shows where it gets tough.</p>
              <PositionHeat grid={grid} />
            </section>
          ))}

          <section className="card">
            <h2>All question types</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Question type</th>
                    <th className="num">Answered</th>
                    <th className="num">Correct</th>
                    <th className="num">Average time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...view.types]
                    .sort((a, b) => {
                      const pa = a.tally.total ? a.tally.correct / a.tally.total : 2;
                      const pb = b.tally.total ? b.tally.correct / b.tally.total : 2;
                      return pa - pb;
                    })
                    .map((r) => (
                      <tr key={r.typeId}>
                        <td>{r.label}</td>
                        <td className="num">{r.tally.total}</td>
                        <td className="num">{pctText(r.tally)}</td>
                        <td className="num">{r.tally.total ? formatSeconds(r.tally.timeMs / r.tally.total) : '–'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {confirm && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="practise-title">
          <div className="modal">
            <h2 id="practise-title">Start a new practice?</h2>
            <p>The practice in progress will be put aside. Its answers are kept.</p>
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setConfirm(null)}>
                Keep it
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={() => {
                  const request = confirm;
                  setConfirm(null);
                  onPractise(request);
                }}
              >
                Start the new one
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
