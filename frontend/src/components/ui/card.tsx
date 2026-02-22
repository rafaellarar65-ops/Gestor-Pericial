import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ children, className }: PropsWithChildren<{ className?: string }>) => (
  <section className={cn('rounded-lg border border-border bg-card p-4 shadow-sm', className)}>{children}</section>
);
