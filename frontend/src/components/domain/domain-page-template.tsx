import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';

type DomainPageTemplateProps<T> = {
  title: string;
  description: string;
  isLoading: boolean;
  isError: boolean;
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
};

export const DomainPageTemplate = <T,>({
  title,
  description,
  isLoading,
  isError,
  items,
  renderItem,
}: DomainPageTemplateProps<T>) => {
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={`Erro ao carregar ${title.toLowerCase()}`} />;
  if (items.length === 0) return <EmptyState title={`Sem dados para ${title.toLowerCase()}`} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Card className="space-y-2">{items.map((item, index) => renderItem(item, index))}</Card>
    </div>
  );
};
