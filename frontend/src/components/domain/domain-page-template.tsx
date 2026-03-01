import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { layoutTokens } from '@/design-tokens/layout-tokens';

type DomainPageTemplateProps<T = never> = {
  title: string;
  description?: string;
  headerActions?: ReactNode;
  filters?: ReactNode;
  aside?: ReactNode;
  contentClassName?: string;
  isLoading?: boolean;
  isError?: boolean;
  emptyTitle?: string;
  items?: T[];
  renderItem?: (item: T, index: number) => ReactNode;
  children?: ReactNode;
};

export const DomainPageTemplate = <T,>({
  title,
  description,
  headerActions,
  filters,
  aside,
  contentClassName = layoutTokens.sectionSpacing,
  isLoading = false,
  isError = false,
  emptyTitle,
  items,
  renderItem,
  children,
}: DomainPageTemplateProps<T>) => {
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={`Erro ao carregar ${title.toLowerCase()}`} />;

  if (items && renderItem && items.length === 0) {
    return <EmptyState title={emptyTitle ?? `Sem dados para ${title.toLowerCase()}`} />;
  }

  const hasCollection = items && renderItem;

  return (
    <div className="space-y-4">
      <header className={`${layoutTokens.cardHierarchy.primary} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {headerActions ? <div className="flex flex-wrap items-center gap-2">{headerActions}</div> : null}
        </div>
        {filters ? <div className="mt-4 border-t pt-4">{filters}</div> : null}
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className={contentClassName}>
          {hasCollection ? <Card className="space-y-2">{items.map((item, index) => renderItem(item, index))}</Card> : children}
        </div>
        {aside ? <aside className="space-y-4">{aside}</aside> : null}
      </div>
    </div>
  );
};
