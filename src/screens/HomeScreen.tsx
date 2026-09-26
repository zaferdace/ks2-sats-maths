import { useMemo, useState } from 'react';
import { isBlank } from '../answer/answer';
import { GPS_ITEMS, READING_TEXTS, SPELLING_WORDS } from '../english/bank';
import { ENGLISH_TYPES } from '../english/catalog';
import { englishHistory } from '../english/history';
import { SPELLING_GROUPS } from '../english/types';
import { DAYS } from '../gen/blueprint';
import { ALL_TYPES, LEVEL_NAME, PAPER_NAME } from '../gen/catalog';
import { SUBJECT_OF, TOPICS, type LevelChoice, type PaperKind, type Subject } from '../gen/types';
import {
  activeAttempt,
  activePractice,
  findAttempt,
  openSession,
  perDay,
  replacedBy,
  scoreOf,
  type Attempt,
  type Profile,
  type StartRequest,
  type StoreData,
} from '../store/model';
import { byType, collectRecords, collectSessions, streakDays, tally, weakest } from '../stats/stats';
import { sessionTitle } from '../ui/labels';
import {
  englishLevel,
  gpsPractice,
  LEVEL_KEY,
  loadPref,
  mathsPractice,
  practiceFor,
  savePref,
  spellingPractice,
  SUBJECT_KEY,
} from './practiceRequests';
import { formatDateTime } from '../ui/time';

interface Props {
  data: StoreData;
  profile: Profile;
  onStart: (request: StartRequest) => void;
  onContinue: (attemptId: string) => void;
  onOpenResult: (attemptId: string, at: number) => void;
  onReport: () => void;
  onSettings: () => void;
  onSwitchProfile: () => void;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface Option {
  title: string;
  about: string;
  request: Omit<StartRequest, 'level'>;
}

interface PaperCard {
  paper: PaperKind;
  title: string;
  about: string;
  options: Option[];
}

const MATHS: PaperCard[] = [
  {
    paper: 'arithmetic',
    title: 'Paper 1: Arithmetic',
    about: '40 questions, 44 marks: long multiplication and division are worth 2',
    options: [
      { title: 'New daily paper', about: '8 questions a day for 5 days', request: { paper: 'arithmetic', mode: 'daily' } },
      { title: 'New full paper', about: 'The whole paper in one go', request: { paper: 'arithmetic', mode: 'full' } },
    ],
  },
  {
    paper: 'reasoning',
    title: 'Papers 2 & 3: Reasoning',
    about: '25 questions, 35 marks, about 40 minutes',
    options: [
      { title: 'New daily paper', about: '5 questions a day for 5 days', request: { paper: 'reasoning', mode: 'daily' } },
      { title: 'New full paper', about: 'The whole paper in one go', request: { paper: 'reasoning', mode: 'full' } },
    ],
  },
];

const ENGLISH: PaperCard[] = [
  {
    paper: 'gps',
    title: 'Grammar, punctuation & vocabulary',
    about: 'Paper 1: 50 questions, 45 minutes',
    options: [
      { title: 'New daily paper', about: '10 questions a day for 5 days', request: { paper: 'gps', mode: 'daily' } },
      { title: 'New full paper', about: 'All 50 questions in one go', request: { paper: 'gps', mode: 'full' } },
    ],
  },
  {
    paper: 'spelling',
    title: 'Spelling',
    about: 'Paper 2: the iPad reads each word and a sentence. Turn the sound on.',
    options: [
      { title: 'Quick test', about: '10 words', request: { paper: 'spelling', mode: 'full', size: 10 } },
      { title: 'Full spelling test', about: '20 words, like the real test', request: { paper: 'spelling', mode: 'full', size: 20 } },
    ],
  },
  {
    paper: 'reading',
    title: 'Reading',
    about: 'Read a text, then answer questions about it. The text stays on screen.',
    options: [
      { title: 'One text', about: 'A story, poem or information text', request: { paper: 'reading', mode: 'full', size: 1 } },
      { title: 'Full reading paper', about: '3 texts, about 60 minutes', request: { paper: 'reading', mode: 'full', size: 3 } },
    ],
  },
];

const LEVELS: LevelChoice[] = [1, 2, 3, 'mixed'];

interface PracticeTopic {
  label: string;
  request: Omit<StartRequest, 'level'>;
}

type PracticeGroup = { heading: string; topics: PracticeTopic[] };

/** Maths question types of one paper, one group per topic, each with an "(all)" choice. */
const mathsGroups = (paper: 'arithmetic' | 'reasoning', name: string): PracticeGroup[] =>
  TOPICS.filter((t) => ALL_TYPES.some((e) => e.paper === paper && e.topic === t.id)).map((t) => {
    const types = ALL_TYPES.filter((e) => e.paper === paper && e.topic === t.id);
    return {
      heading: `${name} · ${t.label}`,
      topics: [
        ...(types.length > 1 ? [{ label: `${t.label} (all)`, request: mathsPractice(paper, types.map((e) => e.id), t.label) }] : []),
        ...types.map((e) => ({ label: e.label, request: mathsPractice(paper, [e.id], e.label) })),
      ],
    };
  });

/** Everything that can be practised on its own, grouped for the chooser. */
const PRACTICE: Record<Subject, PracticeGroup[]> = {
  maths: [...mathsGroups('arithmetic', 'Arithmetic'), ...mathsGroups('reasoning', 'Reasoning')],
  english: [
    ...TOPICS.filter((t) => ENGLISH_TYPES.some((e) => e.paper === 'gps' && e.topic === t.id)).map((t) => {
      const types = ENGLISH_TYPES.filter((e) => e.paper === 'gps' && e.topic === t.id);
      return {
        heading: t.label,
        topics: [
          { label: `${t.label} (all)`, request: gpsPractice(types.map((e) => e.id), t.label) },
          ...types.map((e) => ({ label: e.label, request: gpsPractice([e.id], e.label) })),
        ],
      };
    }),
    {
      heading: 'Spelling rules and word lists',
      topics: Object.entries(SPELLING_GROUPS).map(([group, label]) => ({ label, request: spellingPractice(group, label) })),
    },
  ],
};

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
      <div className="muted small">
        In progress · {sessionTitle(attempt, null) === 'Full paper' ? `paper ${attempt.paperCode}` : sessionTitle(attempt, null)}
        {attempt.level !== undefined && ` · ${LEVEL_NAME[attempt.level]}`}
      </div>
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
  const [confirm, setConfirm] = useState<StartRequest | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [subject, setSubject] = useState<Subject>(() => loadPref<Subject>(SUBJECT_KEY, 'maths', ['maths', 'english']));
  const [level, setLevel] = useState<LevelChoice>(englishLevel);
  const attempts = useMemo(() => data.attempts.filter((a) => a.profileId === profile.id), [data.attempts, profile.id]);
  const sessions = collectSessions(attempts);
  const [now] = useState(() => Date.now());
  const lastWeek = tally(collectRecords(attempts).filter((r) => r.at > now - WEEK_MS));
  const streak = streakDays(sessions, now);
  const history = useMemo(() => englishHistory(attempts), [attempts]);

  const seen = (ids: string[]) => ids.filter((id) => history.has(id)).length;
  const textsRead = new Set([...history.keys()].filter((id) => id.includes('#')).map((id) => id.split('#')[0])).size;
  const bank: Partial<Record<PaperKind, { have: number; note: string }>> = {
    gps: {
      have: GPS_ITEMS.length,
      note: `${seen(GPS_ITEMS.map((i) => i.id))} of ${GPS_ITEMS.length} ready-made questions seen, plus new sentence questions every time`,
    },
    spelling: {
      have: SPELLING_WORDS.length,
      note: `${seen(SPELLING_WORDS.map((w) => w.word))} of ${SPELLING_WORDS.length} words practised`,
    },
    reading: { have: READING_TEXTS.length, note: `${textsRead} of ${READING_TEXTS.length} texts read` },
  };

  const busy = (request: StartRequest) => replacedBy(data, profile.id, request.paper, request.mode);
  const start = (request: StartRequest) => (busy(request) ? setConfirm(request) : onStart(request));
  const practise = (request: Omit<StartRequest, 'level'>) => {
    setChoosing(false);
    start(subject === 'english' ? { ...request, level } : request);
  };

  // Weakest question types of this subject (at least 3 answers, under 85%) that can be practised.
  const subjectRecords = collectRecords(attempts).filter((r) => SUBJECT_OF[r.paper] === subject);
  const subjectTypes = ALL_TYPES.filter((t) => SUBJECT_OF[t.paper] === subject);
  const suggestions = weakest(byType(subjectRecords, subjectTypes))
    .filter((row) => row.tally.correct / row.tally.total < 0.85)
    .flatMap((row) => {
      const request = practiceFor(row.typeId, row.label);
      return request ? [{ row, request }] : [];
    })
    .slice(0, 4);
  const practice = activePractice(data, profile.id, subject);

  const chooseSubject = (s: Subject) => {
    setSubject(s);
    savePref(SUBJECT_KEY, s);
  };
  const chooseLevel = (l: LevelChoice) => {
    setLevel(l);
    savePref(LEVEL_KEY, String(l));
  };

  const cards = subject === 'maths' ? MATHS : ENGLISH;

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

      <div className="segmented subject-switch" role="radiogroup" aria-label="Subject">
        {(['maths', 'english'] as const).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={subject === s} className={subject === s ? 'on' : ''} onClick={() => chooseSubject(s)}>
            {s === 'maths' ? 'Maths' : 'English'}
          </button>
        ))}
      </div>

      {subject === 'english' && (
        <section className="card level-card">
          <div className="row">
            <h2 className="grow">Level</h2>
            <div className="segmented" role="radiogroup" aria-label="Level">
              {LEVELS.map((l) => (
                <button key={l} type="button" role="radio" aria-checked={level === l} className={level === l ? 'on' : ''} onClick={() => chooseLevel(l)}>
                  {LEVEL_NAME[l]}
                </button>
              ))}
            </div>
          </div>
          <p className="muted small">
            {level === 'mixed'
              ? 'Mixed starts easy and gets harder, like the real SATs papers.'
              : level === 1
                ? 'Easy: Year 3 and 4 words and grammar. A good warm-up.'
                : level === 2
                  ? 'Medium: Year 5 and 6 work at the expected standard.'
                  : 'Hard: the trickiest questions, at the higher standard.'}
          </p>
        </section>
      )}

      <div className="papers">
        {cards.map((p) => {
          const active = activeAttempt(data, profile.id, p.paper);
          const content = bank[p.paper];
          const empty = content !== undefined && content.have === 0;
          return (
            <section key={p.paper} className={`card paper-card ${p.paper}`}>
              <h2>{p.title}</h2>
              <p className="muted">{p.about}</p>
              {active && <Progress attempt={active} onContinue={() => onContinue(active.id)} />}
              {empty ? (
                <p className="banner small">Questions for this paper are on their way.</p>
              ) : (
                <div className="choices">
                  {p.options.map((o) => (
                    <button
                      key={o.title}
                      type="button"
                      className="choice"
                      onClick={() => start({ ...o.request, ...(subject === 'english' && { level }) })}
                    >
                      <strong>{o.title}</strong>
                      <span className="muted">{o.about}</span>
                    </button>
                  ))}
                </div>
              )}
              {content && !empty && <p className="muted small bank-note">{content.note}</p>}
            </section>
          );
        })}
      </div>

      <section className="card paper-card practice-card">
        <h2>Practise a topic</h2>
        <p className="muted">
          {subject === 'english'
            ? 'Ten questions on one thing, at the level chosen above.'
            : 'Ten questions on one thing, from easy to hard.'}
        </p>
        {practice && <Progress attempt={practice} onContinue={() => onContinue(practice.id)} />}
        {suggestions.length > 0 && (
          <div className="suggestions">
            <div className="muted small">Suggested from your results</div>
            <div className="chips">
              {suggestions.map(({ row, request }) => (
                <button key={row.typeId} type="button" className="chip-btn" onClick={() => practise(request)}>
                  {row.label}
                  <span className="muted small"> {Math.round((row.tally.correct / row.tally.total) * 100)}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="choices">
          <button type="button" className="choice" onClick={() => setChoosing(true)}>
            <strong>Choose a topic</strong>
            <span className="muted">
              {subject === 'english'
                ? 'Grammar, punctuation, vocabulary or a spelling rule'
                : 'Any arithmetic or reasoning question type'}
            </span>
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
                .slice(-8)
                .reverse()
                .map((s) => {
                  const attempt = findAttempt(data, s.attemptId);
                  return (
                    <tr key={`${s.attemptId}-${s.at}`} className="clickable" onClick={() => onOpenResult(s.attemptId, s.at)}>
                      <td>{formatDateTime(s.at)}</td>
                      <td>
                        {PAPER_NAME[s.paper]} · {attempt ? sessionTitle(attempt, s.day) : s.day ? `Day ${s.day}` : 'Full paper'}
                      </td>
                      <td className="num">
                        {s.score} / {s.total}
                      </td>
                      <td className="num">{Math.round((s.score / s.total) * 100)}%</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </section>

      {choosing && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="choose-title" onClick={() => setChoosing(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <h2 id="choose-title" className="grow">
                Practise a topic{subject === 'english' ? ` · ${LEVEL_NAME[level]}` : ''}
              </h2>
              <button type="button" className="btn" onClick={() => setChoosing(false)}>
                Close
              </button>
            </div>
            <div className="topic-lists">
              {PRACTICE[subject].map((group) => (
                <section key={group.heading}>
                  <h3>{group.heading}</h3>
                  <div className="chips">
                    {group.topics.map((t) => (
                      <button key={t.label} type="button" className="chip-btn" onClick={() => practise(t.request)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="new-title">
          <div className="modal">
            <h2 id="new-title">
              {confirm.mode === 'practice' ? 'Start a new practice?' : `Start a new ${PAPER_NAME[confirm.paper].toLowerCase()} paper?`}
            </h2>
            <p>
              {confirm.mode === 'practice'
                ? 'The practice in progress will be put aside.'
                : `The ${PAPER_NAME[confirm.paper].toLowerCase()} paper in progress will be put aside. Its marked days stay in the report.`}
            </p>
            <div className="row">
              <button type="button" className="btn grow" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={() => {
                  onStart(confirm);
                  setConfirm(null);
                }}
              >
                {confirm.mode === 'practice' ? 'Start practice' : 'Start new paper'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
