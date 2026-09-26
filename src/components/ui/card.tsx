import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/** A white card on the page: a section, so it can be found by its heading. */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      data-slot="card"
      className={cn('flex flex-col gap-4 rounded-[var(--radius-card)] border border-black/5 bg-card p-5 shadow-[var(--shadow-card)]', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('m-0 text-xl leading-tight font-extrabold text-ink', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('m-0 text-base text-muted', className)} {...props} />;
}
