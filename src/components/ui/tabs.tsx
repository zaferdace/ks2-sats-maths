import { Tabs as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export function Tabs({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<typeof Primitive.List>) {
  return (
    <Primitive.List
      data-slot="tabs-list"
      className={cn('inline-flex flex-wrap gap-1 self-start rounded-full border border-line bg-card p-1 shadow-[var(--shadow-card)]', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border-0 bg-transparent px-4 font-bold text-ink-2 transition-colors data-[state=active]:bg-brand data-[state=active]:text-white data-[state=active]:shadow-[0_2px_0_var(--color-brand-dark)] [&_svg]:size-4.5 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content data-slot="tabs-content" className={cn('flex flex-col gap-4 outline-none', className)} {...props} />;
}
