import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useUiStore } from '@/stores/ui-store';
import { sidebarConfig } from '@/config/sidebar-config';

type SearchItem = { label: string; href: string };

const flattenItems = (): SearchItem[] =>
  sidebarConfig.flatMap((item) => [
    { label: item.label, href: item.href },
    ...(item.children?.map((child) => ({ label: `${item.label} / ${child.label}`, href: child.href })) ?? []),
  ]);

export const CommandPalette = () => {
  const [query, setQuery] = useState('');
  const { commandOpen, setCommandOpen } = useUiStore();

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
      }
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [commandOpen, setCommandOpen]);

  const results = useMemo(() => {
    const items = flattenItems();
    return items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  }, [query]);

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-4" role="dialog" aria-modal="true" aria-label="Command Palette">
      <div className="mx-auto max-w-2xl rounded-lg border bg-card p-4 shadow-lg">
        <Input aria-label="Busca global" placeholder="Buscar por CNJ, nome ou cidade..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <ul className="mt-3 max-h-80 overflow-auto">
          {results.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link className="block rounded p-2 hover:bg-muted" onClick={() => setCommandOpen(false)} to={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
          {results.length === 0 && <li className="p-2 text-sm text-muted-foreground">Sem resultados.</li>}
        </ul>
      </div>
    </div>
  );
};
