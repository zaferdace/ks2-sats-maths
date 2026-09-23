import { useState, type ChangeEvent } from 'react';
import type { StoreData } from '../store/model';
import { backupFileName, mergeStores, parseStore } from '../store/persist';
import type { Update } from '../useStore';

interface Props {
  data: StoreData;
  update: Update;
  onBack: () => void;
}

type Note = { kind: 'ok' | 'error'; text: string } | null;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function SettingsScreen({ data, update, onBack }: Props) {
  const [note, setNote] = useState<Note>(null);
  const [pasted, setPasted] = useState('');
  const json = () => JSON.stringify(data);

  const saveBackup = async () => {
    const file = new File([json()], backupFileName(), { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'KS2 SATs backup' });
        setNote({ kind: 'ok', text: 'Backup shared. Save it to Files or send it to yourself.' });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setNote({ kind: 'ok', text: `Backup saved as ${file.name}.` });
  };

  const copyBackup = async () => {
    try {
      await navigator.clipboard.writeText(json());
      setNote({ kind: 'ok', text: 'Backup copied. Paste it into Notes or a message to keep it safe.' });
    } catch {
      setPasted(json());
      setNote({ kind: 'error', text: 'Copying is blocked here. The backup is in the box below: select it and copy.' });
    }
  };

  const restore = (text: string) => {
    let incoming: StoreData | null = null;
    try {
      incoming = parseStore(JSON.parse(text));
    } catch {
      incoming = null;
    }
    if (!incoming) {
      setNote({ kind: 'error', text: 'That does not look like a KS2 SATs backup.' });
      return;
    }
    const restored = incoming;
    update((d) => mergeStores(d, restored));
    setNote({
      kind: 'ok',
      text: `Restored ${plural(restored.attempts.length, 'paper')} and ${plural(restored.profiles.length, 'profile')} (merged with what was here).`,
    });
    setPasted('');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) restore(await file.text());
  };

  const papers = data.attempts.length;
  const marked = data.attempts.reduce((s, a) => s + a.marks.filter((m) => m !== null).length, 0);

  return (
    <div className="page narrow">
      <header className="topbar">
        <h1>Settings</h1>
        <button type="button" className="btn" onClick={onBack}>
          Done
        </button>
      </header>

      {note && <div className={note.kind === 'ok' ? 'banner ok' : 'banner'}>{note.text}</div>}

      <section className="card">
        <h2>Backup</h2>
        <p className="muted">
          Results live only on this iPad ({plural(papers, 'paper')}, {plural(marked, 'marked question')}). Save a backup now and then
          so nothing is lost if Safari data is cleared.
        </p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={saveBackup}>
            Save backup file
          </button>
          <button type="button" className="btn" onClick={copyBackup}>
            Copy backup text
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Restore</h2>
        <p className="muted">Restoring merges a backup into what is here; nothing is deleted.</p>
        <div className="row">
          <label className="btn file-btn">
            Choose backup file
            <input type="file" accept="application/json,.json" onChange={onFile} hidden />
          </label>
        </div>
        <textarea
          rows={4}
          value={pasted}
          placeholder="…or paste backup text here"
          aria-label="Backup text"
          onChange={(e) => setPasted(e.target.value)}
        />
        <div className="row">
          <button type="button" className="btn" disabled={!pasted.trim()} onClick={() => restore(pasted)}>
            Restore pasted text
          </button>
        </div>
      </section>

      <section className="card">
        <h2>About</h2>
        <p className="muted">
          Maths questions are generated on this device in the style of the KS2 SATs papers; English questions
          come from a bank of original questions, texts and spelling words stored in the app. Nothing is sent
          anywhere. Equivalent maths answers are accepted (3/4, 6/8 and 0.75 all score). Spelling words are read
          aloud by the iPad's own voice.
        </p>
      </section>
    </div>
  );
}
