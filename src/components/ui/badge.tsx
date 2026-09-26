import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

const badge = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold whitespace-nowrap [&_svg]:size-4', {
  variants: {
    tone: {
      neutral: 'bg-page text-ink-2',
      brand: 'bg-brand-soft text-brand',
      english: 'bg-english-soft text-english',
      good: 'bg-good-soft text-good-ink',
      warn: 'bg-warn-soft text-warn-ink',
      bad: 'bg-bad-soft text-bad-ink',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

/** A small rounded label: a score, a state, a count. */
export function Badge({ className, tone, ...props }: ComponentProps<'span'> & VariantProps<typeof badge>) {
  return <span data-slot="badge" className={cn(badge({ tone }), className)} {...props} />;
}
