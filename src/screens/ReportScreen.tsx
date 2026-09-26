import { CalendarDays, ChartColumn, FileCheck2, Flame, Grid3x3, House, Layers, LayoutDashboard, PartyPopper, RotateCcw, Target, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardDescription, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Segmented } from '../components/ui/segmented';
import { Stat } from '../components/ui/stat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../lib/utils';
import { matchesFilter, PAPER_NAME, typesOf, type MathsPaper, type PaperFilter } from '../gen/catalog';
import type { PaperKind, Subject } from '../gen/types';
import { LEVELS, levelOf, pctText, type Level } from '../report/levels';
import { Legend, PositionHeat, SkillMap, WeeklyHeat } from '../report/Heatmaps';
import { Readiness } from '../report/Readiness';
import { ScoreHistory } from '../report/ScoreHistory';
import { ScoreRing } from '../report/ScoreRing';
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
  /** Opens a session's results. */
  onOpenResult: (attemptId: string, at: number) => void;
}

/** Types at this accuracy or above are secure and not suggested for practice. */
const SECURE = 0.85;

const RANGES = [
  { value: 'all', label: 'All time', days: null },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '7', label: 'Last 7 days', days: 7 },
] as const;

type RangeId = (typeof RANGES)[number]['value'];

const SUBJECTS: { value: 'all' | Subject; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'maths', label: 'Maths' },
  { value: 'english', label: 'English' },
];

const PAPERS_OF: Record<Subject, PaperKind[]> = {
  maths: ['arithmetic', 'reasoning'],
  english: ['gps', 'spelling', 'reading'],
};

const DAY_MS = 24 * 60 * 60 * 1000;

type TabId = 'overview' | 'topics' | 'time';

const TAB = 'min-h-12 justify-center text-base';

/** Bar colour for each accuracy band. */
const BAR: Record<Level, string> = {
  good: 'bg-good',
  warning: 'bg-warn',
  serious: 'bg-orange-500',
  critical: 'bg-bad',
  none: 'bg-line',
};

export function ReportScreen({ data, profile, onBack, onPractise, onOpenResult }: Props) {
  const [range, setRange] = useState<RangeId>('all');
  const [confirm, setConfirm] = useState<StartRequest | null>(null);
  const [subject, setSubject] = useState<'all' | Subject>('all');
  const [paperChoice, setPaperChoice] = useState<PaperKind | null>(null);
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<TabId>('overview');
  const filter: PaperFilter = paperChoice ?? subject;

  const view = useMemo(() => {
    const days = RANGES.find((r) => r.value === range)?.days ?? null;
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
  const accuracy = summary.accuracy === null ? null : Math.round(summary.accuracy * 100);
  const untried = view.types.filter((r) => r.tally.total === 0).length;

  const practise = (request: StartRequest) =>
    replacedBy(data, profile.id, request.paper, request.mode) ? setConfirm(request) : onPractise(request);

  return (
    <div className="page gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 min-w-0 flex-1 text-3xl font-black text-ink">Report · {profile.name}</h1>
        <Button onClick={onBack}>
          <House aria-hidden />
          Home
        </Button>
      </header>

      <Readiness attempts={data.attempts.filter((a) => a.profileId === profile.id)} />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Subject"
          options={SUBJECTS}
          value={subject}
          onChange={(v) => {
            setSubject(v);
            setPaperChoice(null);
          }}
        />
        {subject !== 'all' && (
          <Segmented
            label="Paper"
            options={[
              { value: null, label: `All ${subject === 'english' ? 'English' : 'maths'}` },
              ...PAPERS_OF[subject].map((k) => ({ value: k, label: PAPER_NAME[k] })),
            ]}
            value={paperChoice}
            onChange={setPaperChoice}
          />
        )}
        <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
      </div>

      {view.records.length === 0 ? (
        <Card className="flex-row items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <ChartColumn className="size-6" aria-hidden />
          </span>
          <p className="m-0 text-base font-semibold text-ink-2">No marked questions in this time range yet. Finish a day or a full paper first.</p>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
          <TabsList aria-label="Report sections" className="grid w-full grid-cols-3 self-stretch">
            <TabsTrigger value="overview" className={TAB}>
              <LayoutDashboard aria-hidden />
              Overview
            </TabsTrigger>
            <TabsTrigger value="topics" className={TAB}>
              <Grid3x3 aria-hidden />
              Topics and skills
            </TabsTrigger>
            <TabsTrigger value="time" className={TAB}>
              <CalendarDays aria-hidden />
              Over time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <Card className="flex-row items-center gap-5 md:col-span-2 lg:col-span-1 lg:row-span-2">
                <ScoreRing pct={accuracy ?? 0} size={116} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-muted">Questions correct</div>
                  <div className="text-4xl leading-tight font-black text-ink tabular-nums">
                    {summary.correct} <span className="text-2xl text-muted">of {summary.questions}</span>
                  </div>
                </div>
              </Card>
              <Stat icon={Layers} tone="bg-brand-soft text-brand" label="Sessions" value={summary.sessions} />
              <Stat icon={FileCheck2} tone="bg-good-soft text-good-ink" label="Papers completed" value={summary.papersCompleted} />
              <Stat
                icon={Timer}
                tone="bg-english-soft text-english"
                label="Average per question"
                value={summary.avgTimeMs === null ? '–' : formatSeconds(summary.avgTimeMs)}
              />
              <Stat
                icon={Flame}
                tone="bg-warn-soft text-warn-ink"
                label="Practice streak"
                value={`${summary.streakDays} ${summary.streakDays === 1 ? 'day' : 'days'}`}
              />
            </div>

            <Card>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warn-soft text-warn-ink">
                  <Target className="size-5.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle>Practise these next</CardTitle>
                  <CardDescription className="mt-1 text-sm">The question types with the lowest scores, below 85%.</CardDescription>
                </div>
              </div>
              {view.weak.length === 0 ? (
                <p className="m-0 flex items-center gap-2 font-semibold text-ink-2">
                  {view.types.some((r) => r.tally.total >= 3) ? (
                    <>
                      <PartyPopper className="size-5 text-good" aria-hidden />
                      Every question type with enough answers is secure (85% or more). Well done!
                    </>
                  ) : (
                    'Not enough answers yet: each type needs at least 3.'
                  )}
                </p>
              ) : (
                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                  {view.weak.map((r) => {
                    const level = LEVELS[levelOf(r.tally)];
                    const request = practiceFor(r.typeId, r.label);
                    return (
                      <li key={r.typeId} className="flex flex-wrap items-center gap-3 rounded-2xl p-3" style={{ background: level.wash }}>
                        <span className="legend-swatch" style={{ background: level.color, color: level.ink }} aria-hidden="true">
                          {level.icon}
                        </span>
                        <span className="min-w-0 flex-1 font-bold text-ink">{r.label}</span>
                        <span className="text-sm font-bold text-ink-2 tabular-nums">
                          {r.tally.correct}/{r.tally.total} · {pctText(r.tally)}
                        </span>
                        {request ? (
                          <Button size="sm" onClick={() => practise({ ...request, level: englishLevel() })}>
                            <RotateCcw aria-hidden />
                            Practise
                          </Button>
                        ) : (
                          <span className="text-sm text-muted">Practise with a reading text</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>

            <Card>
              <CardTitle>Score per session</CardTitle>
              <ScoreHistory
                sessions={view.sessions}
                onOpen={(s) => onOpenResult(s.attemptId, s.at)}
                titleOf={(s) => {
                  const attempt = findAttempt(data, s.attemptId);
                  return attempt ? sessionTitle(attempt, s.day) : s.day ? `Day ${s.day}` : 'Full paper';
                }}
              />
            </Card>
          </TabsContent>

          <TabsContent value="topics">
            <Card>
              <CardTitle>Accuracy by topic</CardTitle>
              <ul className="m-0 grid list-none gap-x-8 gap-y-3 p-0 lg:grid-cols-2">
                {view.topics.map((t) => {
                  const acc = t.tally.total ? t.tally.correct / t.tally.total : 0;
                  const level = levelOf(t.tally);
                  return (
                    <li key={t.topic} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
                      <span className={cn('font-bold', t.tally.total ? 'text-ink' : 'text-muted')}>{t.label}</span>
                      <span className="text-sm font-bold text-ink-2 tabular-nums">
                        {t.tally.total ? `${pctText(t.tally)} · ${t.tally.correct}/${t.tally.total}` : 'Not tried yet'}
                      </span>
                      <Progress
                        className="col-span-2 h-2.5"
                        value={acc * 100}
                        indicatorClassName={BAR[level]}
                        aria-label={`${t.label}: ${t.tally.total ? `${t.tally.correct} of ${t.tally.total}` : 'not tried yet'}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card>
              <CardTitle>Skill heat map</CardTitle>
              <CardDescription className="-mt-2 text-sm">Every question type, coloured by how often it was right.</CardDescription>
              <Legend />
              <SkillMap rows={view.types} />
            </Card>

            <Card>
              <CardTitle>Every question type tried</CardTitle>
              {untried > 0 && (
                <CardDescription className="-mt-2 text-sm">
                  From the lowest score up. {untried} more {untried === 1 ? 'type has' : 'types have'} not been tried yet (grey on the heat map).
                </CardDescription>
              )}
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
                    {view.types
                      .filter((r) => r.tally.total > 0)
                      .sort((a, b) => a.tally.correct / a.tally.total - b.tally.correct / b.tally.total)
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
            </Card>
          </TabsContent>

          <TabsContent value="time">
            <Card>
              <CardTitle>Progress by week</CardTitle>
              <CardDescription className="-mt-2 text-sm">Each row is a question type; each column a week (Monday to Sunday).</CardDescription>
              <WeeklyHeat grid={view.weekly} />
            </Card>

            {view.positions.map(({ paper: k, grid }) => (
              <Card key={k}>
                <CardTitle>Accuracy by question number: {PAPER_NAME[k]}</CardTitle>
                <CardDescription className="-mt-2 text-sm">
                  Later questions are harder. A row that turns red towards the end shows where it gets tough.
                </CardDescription>
                <PositionHeat grid={grid} />
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {confirm && (
        <div className="backdrop" role="dialog" aria-modal="true" aria-labelledby="practise-title">
          <div className="modal">
            <h2 id="practise-title">Start a new practice?</h2>
            <p>The practice in progress will be put aside. Its answers are kept.</p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => setConfirm(null)}>
                Keep it
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  const request = confirm;
                  setConfirm(null);
                  onPractise(request);
                }}
              >
                Start the new one
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
