import { ArchiveRestore, GraduationCap, Pencil, UserPlus, Users } from 'lucide-react';
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

/** Avatar colours, in profile order, so two children never share one. */
const AVATAR = ['#256abf', '#7c3aed', '#16a34a', '#ea580c', '#db2777', '#0891b2'];

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
        <div className="brand-mark shadow-[0_4px_0_var(--color-brand-dark)]" aria-hidden="true">
          <GraduationCap className="size-9" />
        </div>
        <div>
          <h1 className="font-black">KS2 SATs</h1>
          <p className="muted">Maths and English practice papers, a little every day</p>
        </div>
      </header>

      {data.profiles.length > 0 && (
        <section className="card">
          <div className="row">
            <h2 className="grow flex items-center gap-2">
              <Users className="size-6 text-brand" aria-hidden />
              Who is practising?
            </h2>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(!editing)} aria-pressed={editing}>
              {!editing && <Pencil aria-hidden />}
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.profiles.map((p, i) => {
                const count = papers(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.name}
                    className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left shadow-[0_3px_0_var(--color-line)] transition-transform active:translate-y-0.5 active:shadow-none"
                    onClick={() => onSelect(p.id)}
                  >
                    <span
                      className="grid size-13 shrink-0 place-items-center rounded-full text-2xl font-black text-white"
                      style={{ background: AVATAR[i % AVATAR.length] }}
                      aria-hidden="true"
                    >
                      {[...p.name.trim()][0]?.toUpperCase() ?? '?'}
                    </span>
                    <span className="min-w-0" aria-hidden="true">
                      <span className="block truncate text-xl font-extrabold text-ink">{p.name}</span>
                      <span className="block text-sm font-semibold text-muted">
                        {count === 0 ? 'No papers yet' : count === 1 ? '1 paper' : `${count} papers`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {editing && <p className="muted small">Only profiles with no papers can be removed, so no results are ever lost.</p>}
        </section>
      )}

      <section className="card">
        <h2 className="flex items-center gap-2">
          <UserPlus className="size-6 text-brand" aria-hidden />
          {data.profiles.length ? 'Add someone new' : 'What is your name?'}
        </h2>
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
            <h2 className="flex items-center gap-2">
              <ArchiveRestore className="size-6 text-brand" aria-hidden />
              Restore a backup
            </h2>
            <p className="muted">Moving to a new iPad? Restore the backup file saved from Settings on the old one.</p>
            <RestoreBackup onRestore={onRestore} />
          </>
        ) : (
          <button type="button" className="btn btn-ghost self-start" onClick={() => setShowRestore(true)}>
            <ArchiveRestore aria-hidden />
            Restore from a backup…
          </button>
        )}
      </section>
    </div>
  );
}
