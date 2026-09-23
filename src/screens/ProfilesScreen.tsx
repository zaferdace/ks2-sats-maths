import { useState, type FormEvent } from 'react';
import type { StoreData } from '../store/model';

interface Props {
  data: StoreData;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}

export function ProfilesScreen({ data, onSelect, onCreate }: Props) {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (trimmed) onCreate(trimmed.slice(0, 24));
  };

  return (
    <div className="page narrow">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">
          ×÷
        </div>
        <div>
          <h1>KS2 Arithmetic</h1>
          <p className="muted">SATs-style arithmetic papers, 8 questions a day</p>
        </div>
      </header>

      {data.profiles.length > 0 && (
        <section className="card">
          <h2>Who is practising?</h2>
          <div className="profile-list">
            {data.profiles.map((p) => (
              <button key={p.id} type="button" className="btn btn-big profile-btn" onClick={() => onSelect(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>{data.profiles.length ? 'Add someone new' : 'What is your name?'}</h2>
        <form className="row" onSubmit={submit}>
          <input
            type="text"
            className="grow"
            value={name}
            maxLength={24}
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
    </div>
  );
}
