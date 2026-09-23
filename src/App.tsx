import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildGpsPaper, buildGpsPractice } from './english/gps/paper';
import { englishHistory } from './english/history';
import { buildReading } from './english/reading';
import { buildSpellingTest } from './english/spelling';
import { generatePaper } from './gen/paper';
import { buildMathsPractice } from './gen/practice';
import { generateReasoningPaper } from './gen/reasoning/paper';
import { isItem, SUBJECT_OF, type AnyQuestion } from './gen/types';
import { newPaperCode } from './gen/rng';
import { HomeScreen } from './screens/HomeScreen';
import { ProfilesScreen } from './screens/ProfilesScreen';
import { ReportScreen } from './screens/ReportScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TestScreen } from './screens/TestScreen';
import {
  addAttempt,
  addProfile,
  createAttempt,
  findAttempt,
  openSession,
  replaceAttempt,
  selectProfile,
  type Attempt,
  type StartRequest,
  type StoreData,
} from './store/model';
import { dictate } from './ui/speech';
import { useStore, type Update } from './useStore';

// Screens live in memory: no URL routing, so the home-screen app never loses its place.
type Screen =
  | { name: 'profiles' }
  | { name: 'home' }
  | { name: 'test'; attemptId: string }
  | { name: 'result'; attemptId: string; at: number }
  | { name: 'report' }
  | { name: 'settings' };

export default function App() {
  const { data, update, saveFailed } = useStore();
  // Results load from IndexedDB in a moment; until then the page stays empty.
  return data ? <Main data={data} update={update} saveFailed={saveFailed} /> : <div className="app" aria-busy="true" />;
}

function Main({ data, update, saveFailed }: { data: StoreData; update: Update; saveFailed: boolean }) {
  const profile = data.profiles.find((p) => p.id === data.currentProfileId);
  const [screen, setScreen] = useState<Screen>(() => ({ name: profile ? 'home' : 'profiles' }) as Screen);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const editAttempt = useCallback(
    (id: string) => (fn: (a: Attempt) => Attempt) =>
      update((d) => {
        const a = findAttempt(d, id);
        return a ? replaceAttempt(d, fn(a)) : d;
      }),
    [update],
  );

  // One stable editor per open test, so the test screen's timers are not reset on every render.
  const testId = screen.name === 'test' ? screen.attemptId : null;
  const editTest = useMemo(() => (testId ? editAttempt(testId) : null), [editAttempt, testId]);

  const goHome = useCallback(() => setScreen({ name: 'home' }), []);

  // Opens a test. A spelling test reads its word straight away: this runs inside the tap that
  // opened it, and iPadOS only lets a page speak in response to a tap.
  const openTest = (attempt: Attempt) => {
    const q = attempt.questions[Math.min(attempt.current, attempt.questions.length - 1)];
    const speak = q && isItem(q) ? q.body.find((b) => b.b === 'speak') : undefined;
    if (speak?.b === 'speak' && openSession(attempt)) dictate(speak.word, speak.sentence);
    setScreen({ name: 'test', attemptId: attempt.id });
  };

  const startPaper = ({ paper, mode, level = 'mixed', size, types, groups, topic }: StartRequest) => {
    if (!profile) return;
    const code = newPaperCode();
    // English papers avoid what this pupil has already seen and bring back mistakes.
    const history = () => englishHistory(data.attempts.filter((a) => a.profileId === profile.id));
    let questions: AnyQuestion[];
    switch (paper) {
      case 'arithmetic':
        questions = types ? buildMathsPractice(code, 'arithmetic', types) : generatePaper(code);
        break;
      case 'reasoning':
        questions = types ? buildMathsPractice(code, 'reasoning', types) : generateReasoningPaper(code);
        break;
      case 'gps':
        questions = types ? buildGpsPractice(code, types, level, history()) : buildGpsPaper(code, level, history());
        break;
      case 'spelling':
        questions = buildSpellingTest(code, level, history(), size, groups);
        break;
      case 'reading':
        questions = buildReading(code, level, history(), size === 3 ? 3 : 1);
        break;
    }
    if (!questions.length) return;
    const english = SUBJECT_OF[paper] === 'english';
    const created = createAttempt(profile.id, mode, code, questions, Date.now(), undefined, paper, english ? level : undefined);
    const attempt = topic ? { ...created, topic } : created;
    update((d) => addAttempt(d, attempt));
    openTest(attempt);
  };

  let body;
  if (!profile || screen.name === 'profiles') {
    body = (
      <ProfilesScreen
        data={data}
        onSelect={(id) => {
          update((d) => selectProfile(d, id));
          setScreen({ name: 'home' });
        }}
        onCreate={(name) => {
          update((d) => addProfile(d, name, Date.now()));
          setScreen({ name: 'home' });
        }}
      />
    );
  } else if (screen.name === 'test') {
    const attempt = findAttempt(data, screen.attemptId);
    body =
      attempt && editTest ? (
      <TestScreen
        key={attempt.id}
        attempt={attempt}
        edit={editTest}
        onFinished={(at) => setScreen({ name: 'result', attemptId: attempt.id, at })}
        onExit={goHome}
      />
    ) : null;
  } else if (screen.name === 'result') {
    const attempt = findAttempt(data, screen.attemptId);
    body = attempt ? (
      <ResultScreen
        attempt={attempt}
        at={screen.at}
        onHome={goHome}
        onReport={() => setScreen({ name: 'report' })}
        onContinue={() => openTest(attempt)}
      />
    ) : null;
  } else if (screen.name === 'report') {
    body = <ReportScreen data={data} profile={profile} onBack={goHome} />;
  } else if (screen.name === 'settings') {
    body = <SettingsScreen data={data} update={update} onBack={goHome} />;
  } else {
    body = (
      <HomeScreen
        data={data}
        profile={profile}
        onStart={startPaper}
        onContinue={(attemptId) => {
          const attempt = findAttempt(data, attemptId);
          if (attempt) openTest(attempt);
        }}
        onOpenResult={(attemptId, at) => setScreen({ name: 'result', attemptId, at })}
        onReport={() => setScreen({ name: 'report' })}
        onSettings={() => setScreen({ name: 'settings' })}
        onSwitchProfile={() => {
          update((d) => selectProfile(d, null));
          setScreen({ name: 'profiles' });
        }}
      />
    );
  }

  return (
    <div className="app">
      {saveFailed && (
        <div className="banner page">
          This iPad refused to save the latest answers (storage may be full). Open Settings and save a backup.
        </div>
      )}
      {body ?? (
        <div className="page">
          <p>That paper could not be found.</p>
          <button type="button" className="btn" onClick={goHome}>
            Home
          </button>
        </div>
      )}
    </div>
  );
}
