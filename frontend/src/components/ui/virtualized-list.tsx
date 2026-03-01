import { useMemo, useState } from 'react';
import type { ReactNode, UIEvent } from 'react';

type VirtualizedListProps<T> = {
  items: T[];
  itemHeight?: number;
  height?: number;
  renderItem: (item: T) => ReactNode;
};

export const VirtualizedList = <T,>({ items, itemHeight = 56, height = 420, renderItem }: VirtualizedListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
  const visibleCount = Math.ceil(height / itemHeight) + 6;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [endIndex, items, startIndex]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <div className="overflow-y-auto" onScroll={onScroll} style={{ height }}>
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, offset) => {
          const index = startIndex + offset;
          return (
            <div key={index} style={{ position: 'absolute', top: index * itemHeight, left: 0, right: 0, height: itemHeight }}>
              {renderItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
