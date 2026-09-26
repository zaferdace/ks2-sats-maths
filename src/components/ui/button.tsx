import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl border-0 font-bold whitespace-nowrap select-none transition-[transform,box-shadow,background-color] duration-100 active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-5',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white shadow-[0_3px_0_var(--color-brand-dark)]',
        secondary: 'border border-line bg-card text-ink shadow-[0_3px_0_var(--color-line)]',
        soft: 'bg-brand-soft text-brand',
        ghost: 'text-brand active:bg-brand-soft',
      },
      size: {
        sm: 'min-h-10 px-3 text-sm',
        md: 'min-h-12 px-4 text-base',
        lg: 'min-h-14 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof button> & { asChild?: boolean };

/** A button in the app's style: primary (blue), secondary (white), soft or ghost. */
export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  );
}
