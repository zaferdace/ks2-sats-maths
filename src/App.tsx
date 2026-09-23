import { useCallback, useEffect, useMemo, useState } from 'react';
import { generatePaper } from './gen/paper';
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
  replaceAttempt,
  selectProfile,
  type Attempt,
  type Mode,
} from './store/model';
import { useStore } from './useStore';

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

  const startPaper = (mode: Mode) => {
    if (!profile) return;
    const code = newPaperCode();
    const attempt = createAttempt(profile.id, mode, code, generatePaper(code), Date.now());
    update((d) => addAttempt(d, attempt));
    setScreen({ name: 'test', attemptId: attempt.id });
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
        onContinue={() => setScreen({ name: 'test', attemptId: attempt.id })}
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
        onContinue={(attemptId) => setScreen({ name: 'test', attemptId })}
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
