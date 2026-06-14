'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ── Button ─────────────────────────────────────────────────────────────── */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
        outline: 'border border-input bg-card hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700',
      },
      size: { default: 'h-9 px-4 py-2', sm: 'h-8 px-3 text-xs', lg: 'h-10 px-6', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

/* ── Input ──────────────────────────────────────────────────────────────── */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

/* ── Select (native) ────────────────────────────────────────────────────── */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';

/* ── Card ───────────────────────────────────────────────────────────────── */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)} {...p} />;
}

/* ── Badge ──────────────────────────────────────────────────────────────── */
export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', className)} {...p} />;
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('relative overflow-hidden rounded-md bg-muted', className)}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
  </div>;
}
