import { Link, Outlet } from 'react-router-dom';
import { Breadcrumbs } from '@/components/domain/breadcrumbs';
import { CommandPalette } from '@/components/domain/command-palette';
import { Button } from '@/components/ui/button';
import { sidebarConfig } from '@/config/sidebar-config';
import { useUiStore } from '@/stores/ui-store';

export const AppShell = () => {
  const { sidebarCollapsed, toggleSidebar, toggleTheme, setCommandOpen } = useUiStore();

  return (
    <div className="grid min-h-screen grid-cols-[auto_1fr]">
      <CommandPalette />
      <aside className="border-r bg-card p-3">
        <Button onClick={toggleSidebar} size="sm" variant="outline">
          {sidebarCollapsed ? 'Expandir' : 'Recolher'}
        </Button>
        {!sidebarCollapsed && (
          <nav className="mt-4 space-y-1">
            {sidebarConfig.map((item) => (
              <div key={item.href}>
                <Link className="block rounded px-2 py-1 hover:bg-muted" to={item.href}>
                  {item.label}
                </Link>
                {item.children?.map((child) => (
                  <Link className="ml-3 block rounded px-2 py-1 text-sm hover:bg-muted" key={child.href} to={child.href}>
                    {child.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        )}
      </aside>
      <main>
        <header className="space-y-2 border-b p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Perícias Manager Pro</p>
            <div className="flex gap-2">
              <Button onClick={() => setCommandOpen(true)} size="sm" variant="outline">
                Buscar (Ctrl+K)
              </Button>
              <Button onClick={toggleTheme} size="sm" variant="secondary">
                Alternar tema
              </Button>
            </div>
          </div>
          <Breadcrumbs />
        </header>
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
