import { useState, type FormEvent } from 'react';
import type { StoreData } from '../store/model';
import { RestoreBackup } from '../ui/RestoreBackup';

interface Props {
  data: StoreData;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  /** Only offered for profiles without papers. */
  onRemove: (id: string) => void;
  /** Merges a backup in and returns the message to show. */
  onRestore: (incoming: StoreData) => string;
}

const NAME_MAX = 24;

export function ProfilesScreen({ data, onSelect, onCreate, onRename, onRemove, onRestore }: Props) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [showRestore, setShowRestore] = useState(false);
  const trimmed = name.trim();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (trimmed) onCreate(trimmed.slice(0, NAME_MAX));
  };
  const papers = (id: string) => data.attempts.filter((a) => a.profileId === id).length;

  return (
    <div className="page narrow">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">
          ×÷
        </div>
        <div>
          <h1>KS2 SATs</h1>
          <p className="muted">Maths and English practice papers, a little every day</p>
        </div>
      </header>

      {data.profiles.length > 0 && (
        <section className="card">
          <div className="row">
            <h2 className="grow">Who is practising?</h2>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(!editing)} aria-pressed={editing}>
              {editing ? 'Done' : 'Edit names'}
            </button>
          </div>
          {editing ? (
            <ul className="profile-edit">
              {data.profiles.map((p) => {
                const value = names[p.id] ?? p.name;
                const count = papers(p.id);
                return (
                  <li key={p.id} className="row">
                    <input
                      type="text"
                      className="grow"
                      value={value}
                      maxLength={NAME_MAX}
                      aria-label={`Name for ${p.name}`}
                      onChange={(e) => setNames({ ...names, [p.id]: e.target.value })}
                      onBlur={() => value.trim() && value.trim() !== p.name && onRename(p.id, value.trim())}
                    />
                    <span className="muted small">{count === 1 ? '1 paper' : `${count} papers`}</span>
                    {count === 0 && (
                      <button type="button" className="btn" onClick={() => onRemove(p.id)}>
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="profile-list">
              {data.profiles.map((p) => (
                <button key={p.id} type="button" className="btn btn-big profile-btn" onClick={() => onSelect(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {editing && <p className="muted small">Only profiles with no papers can be removed, so no results are ever lost.</p>}
        </section>
      )}

      <section className="card">
        <h2>{data.profiles.length ? 'Add someone new' : 'What is your name?'}</h2>
        <form className="row" onSubmit={submit}>
          <input
            type="text"
            className="grow"
            value={name}
            maxLength={NAME_MAX}
            placeholder="Your name"
            autoComplete="off"
            autoCapitalize="words"
            aria-label="Name"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-big" disabled={!trimmed}>
            Start
          </button>
        </form>
        <p className="muted small">No password needed. Everything is saved on this iPad only.</p>
      </section>

      <section className="card">
        {showRestore ? (
          <>
            <h2>Restore a backup</h2>
            <p className="muted">Moving to a new iPad? Restore the backup file saved from Settings on the old one.</p>
            <RestoreBackup onRestore={onRestore} />
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setShowRestore(true)}>
            Restore from a backup…
          </button>
        )}
      </section>
    </div>
  );
}
