import { useState, type ChangeEvent } from 'react';
import type { StoreData } from '../store/model';
import { parseStore } from '../store/persist';

interface Props {
  /** Merges the backup in and returns the message to show. */
  onRestore: (incoming: StoreData) => string;
}

type Note = { kind: 'ok' | 'error'; text: string } | null;

/** Restore from a backup file or pasted backup text. Restoring merges; nothing is deleted. */
export function RestoreBackup({ onRestore }: Props) {
  const [note, setNote] = useState<Note>(null);
  const [pasted, setPasted] = useState('');

  const restore = (text: string) => {
    let incoming: StoreData | null = null;
    try {
      incoming = parseStore(JSON.parse(text));
    } catch {
      incoming = null;
    }
    if (!incoming || (incoming.profiles.length === 0 && incoming.attempts.length === 0)) {
      setNote({ kind: 'error', text: 'That does not look like a KS2 SATs backup.' });
      return;
    }
    setNote({ kind: 'ok', text: onRestore(incoming) });
    setPasted('');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) restore(await file.text());
  };

  return (
    <>
      {note && <div className={note.kind === 'ok' ? 'banner ok' : 'banner'}>{note.text}</div>}
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
    </>
  );
}
