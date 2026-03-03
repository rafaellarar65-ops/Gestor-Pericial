import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardProps = HTMLAttributes<HTMLElement>;

export const Card = ({ children, className, ...props }: CardProps) => (
  <section className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)} {...props}>{children}</section>
);
