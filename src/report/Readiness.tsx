import type { Attempt } from '../store/model';
import { readiness, RECENT_PAPERS } from '../stats/readiness';

/** Estimated real-test marks from recent full papers, against the 2025 expected standard. */
export function Readiness({ attempts, compact }: { attempts: Attempt[]; compact?: boolean }) {
  const rows = readiness(attempts);
  return (
    <section className="card readiness">
      <h2>SATs estimate</h2>
      {!compact && (
        <p className="muted small">
          From the last {RECENT_PAPERS} full papers of each kind, scaled to the real tests. The line is the mark that reached the
          expected standard in 2025; it moves a little each year. Written answers are marked more strictly in the real test.
        </p>
      )}
      <ul className="readiness-rows">
        {rows.map((r) => {
          const pct = r.raw === null ? 0 : Math.min(r.raw / r.max, 1) * 100;
          const line = (r.expected / r.max) * 100;
          const met = r.raw !== null && r.raw >= r.expected;
          return (
            <li key={r.id}>
              <div className="readiness-head">
                <strong>{r.label}</strong>
                <span className={r.raw === null ? 'muted' : met ? 'good-text' : 'critical-text'}>
                  {r.raw === null
                    ? `Do ${r.missing.join(' and ')} to see this`
                    : `about ${r.raw} of ${r.max} · ${met ? 'above' : 'below'} the expected standard (${r.expected})`}
                </span>
              </div>
              <div className="readiness-track" aria-hidden="true">
                {r.raw !== null && <div className={`readiness-bar ${met ? 'met' : ''}`} style={{ width: `${pct}%` }} />}
                <div className="readiness-line" style={{ left: `${line}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
