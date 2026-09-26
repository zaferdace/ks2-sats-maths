import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

/** A small tile with an icon, a label and a big value: "Streak · 3 days". */
export function Stat({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: string; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-black/5 bg-card p-4 shadow-[var(--shadow-card)]">
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', tone)}>
        <Icon className="size-5.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-muted">{label}</div>
        <div className="text-2xl leading-tight font-black text-ink">{value}</div>
      </div>
    </div>
  );
}
