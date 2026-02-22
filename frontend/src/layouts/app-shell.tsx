import { Link, Outlet } from 'react-router-dom';
import { sidebarConfig } from '@/config/sidebar-config';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui-store';

export const AppShell = () => {
  const { sidebarCollapsed, toggleSidebar, toggleTheme } = useUiStore();

  return (
    <div className="grid min-h-screen grid-cols-[auto_1fr]">
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
        <header className="flex items-center justify-between border-b p-3">
          <p className="text-sm text-muted-foreground">Perícias Manager Pro</p>
          <Button onClick={toggleTheme} size="sm" variant="secondary">
            Alternar tema
          </Button>
        </header>
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
