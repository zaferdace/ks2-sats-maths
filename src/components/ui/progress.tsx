import { Progress as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/** A horizontal bar filled to `value` percent. */
export function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: ComponentProps<typeof Primitive.Root> & { indicatorClassName?: string }) {
  const pct = Math.max(0, Math.min(value ?? 0, 100));
  return (
    <Primitive.Root data-slot="progress" value={pct} className={cn('relative h-3 w-full overflow-hidden rounded-full bg-line', className)} {...props}>
      <Primitive.Indicator
        className={cn('h-full w-full rounded-full bg-brand transition-transform duration-500', indicatorClassName)}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </Primitive.Root>
  );
}
