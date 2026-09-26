import { cn } from '../../lib/utils';

/** A row of choices where one is on (a radio group): filters such as "Last 7 days". */
export function Segmented<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex flex-wrap gap-1 rounded-full border border-line bg-card p-1', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-11 rounded-full border-0 px-4 text-[15px] font-bold transition-colors',
              on ? 'bg-brand-soft text-brand shadow-[inset_0_0_0_2px_var(--color-brand)]' : 'bg-transparent text-ink-2',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
