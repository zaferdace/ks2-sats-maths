import { ArchiveRestore, Copy, Download, Info, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { StoreData } from '../store/model';
import { backupFileName, restoreBackup } from '../store/persist';
import { restoredMessage, saveBackupFile } from '../ui/backup';
import { RestoreBackup } from '../ui/RestoreBackup';
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
  const [copyBox, setCopyBox] = useState('');
  const json = () => JSON.stringify(data);

  const saveBackup = async () => {
    const result = await saveBackupFile(json());
    if (result === 'shared') setNote({ kind: 'ok', text: 'Backup shared. Save it to Files or send it to yourself.' });
    if (result === 'downloaded') setNote({ kind: 'ok', text: `Backup saved as ${backupFileName()}.` });
  };

  const copyBackup = async () => {
    try {
      await navigator.clipboard.writeText(json());
      setNote({ kind: 'ok', text: 'Backup copied. Paste it into Notes or a message to keep it safe.' });
    } catch {
      setCopyBox(json());
      setNote({ kind: 'error', text: 'Copying is blocked here. The backup is in the box below: select it and copy.' });
    }
  };

  const papers = data.attempts.length;
  const marked = data.attempts.reduce((s, a) => s + a.marks.filter((m) => m !== null).length, 0);
  const unreadable = data.unreadable?.length ?? 0;

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
        <h2 className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-brand" aria-hidden />
          Backup
        </h2>
        <p className="muted">
          Results live only on this iPad ({plural(papers, 'paper')}, {plural(marked, 'marked question')}). Save a backup now and then
          so nothing is lost if Safari data is cleared.
        </p>
        {unreadable > 0 && (
          <p className="muted small">
            {plural(unreadable, 'item')} saved by a newer version of the app will be read after the next update. They are kept in
            backups.
          </p>
        )}
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={saveBackup}>
            <Download aria-hidden />
            Save backup file
          </button>
          <button type="button" className="btn" onClick={copyBackup}>
            <Copy aria-hidden />
            Copy backup text
          </button>
        </div>
        {copyBox && <textarea rows={4} readOnly value={copyBox} aria-label="Backup text to copy" onFocus={(e) => e.target.select()} />}
      </section>

      <section className="card">
        <h2 className="flex items-center gap-2">
          <ArchiveRestore className="size-6 text-brand" aria-hidden />
          Restore
        </h2>
        <p className="muted">Restoring merges a backup into what is here; nothing is deleted.</p>
        <RestoreBackup
          onRestore={(incoming) => {
            update((d) => restoreBackup(d, incoming));
            return restoredMessage(incoming);
          }}
        />
      </section>

      <section className="card">
        <h2 className="flex items-center gap-2">
          <Info className="size-6 text-brand" aria-hidden />
          About
        </h2>
        <p className="muted">
          Maths questions are generated on this device in the style of the KS2 SATs papers; English questions
          come from a bank of original questions, texts and spelling words stored in the app. Nothing is sent
          anywhere. Answers are marked the way the real mark schemes mark them: in Paper 1, 3/4, 6/8 and 0.75 all
          score, while money needs two decimal places and a question that asks for a fraction needs a fraction.
          Spelling words are read aloud by the iPad's own voice.
        </p>
      </section>
    </div>
  );
}
