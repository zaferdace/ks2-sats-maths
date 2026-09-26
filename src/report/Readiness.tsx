import { GraduationCap } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card, CardDescription, CardTitle } from '../components/ui/card';
import { cn } from '../lib/utils';
import type { Attempt } from '../store/model';
import { readiness, RECENT_PAPERS } from '../stats/readiness';

/** Estimated real-test marks from recent full papers, against the 2025 expected standard. */
export function Readiness({ attempts, compact }: { attempts: Attempt[]; compact?: boolean }) {
  const rows = readiness(attempts);
  return (
    <Card className="readiness">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <GraduationCap className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle>SATs estimate</CardTitle>
          <CardDescription className="mt-1 text-sm">
            {compact
              ? `From your last ${RECENT_PAPERS} full papers of each kind. The line marks the expected standard.`
              : `From the last ${RECENT_PAPERS} full papers of each kind, scaled to the real tests. The line is the mark that reached the expected standard in 2025; it moves a little each year. Written answers are marked more strictly in the real test.`}
          </CardDescription>
        </div>
      </div>
      <ul className="m-0 grid list-none gap-4 p-0">
        {rows.map((r) => {
          const pct = r.raw === null ? 0 : Math.min(r.raw / r.max, 1) * 100;
          const line = (r.expected / r.max) * 100;
          const met = r.raw !== null && r.raw >= r.expected;
          return (
            <li key={r.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <strong className="text-base font-extrabold text-ink">{r.label}</strong>
                {r.raw === null ? (
                  <span className="text-sm text-muted">Do {r.missing.join(' and ')} to see this</span>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink-2">
                    about {r.raw} of {r.max}
                    <Badge tone={met ? 'good' : 'warn'}>{met ? 'Above' : 'Below'} the expected standard ({r.expected})</Badge>
                  </span>
                )}
              </div>
              <div className="relative h-3.5 rounded-full bg-line" aria-hidden="true">
                {r.raw !== null && (
                  <div className={cn('h-full rounded-full transition-[width] duration-700', met ? 'bg-good' : 'bg-warn')} style={{ width: `${pct}%` }} />
                )}
                <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink" style={{ left: `${line}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
