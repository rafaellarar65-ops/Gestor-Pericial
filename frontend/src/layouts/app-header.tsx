import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Menu, Search } from 'lucide-react';
import { NotificationBell } from '@/components/domain/notification-bell';
import type { AppShellHeaderConfig } from '@/layouts/app-shell-context';

type Breadcrumb = { pathname: string; crumb: string };

type AppHeaderProps = {
  todayLabel: string;
  breadcrumbs: Breadcrumb[];
  userEmail?: string;
  userRole?: string;
  initials: string;
  headerConfig: AppShellHeaderConfig;
  onNavigateBack: () => void;
  onOpenMobileSidebar: () => void;
  onOpenCommand: () => void;
  onLogout: () => void;
};

export const AppHeader = ({
  todayLabel,
  breadcrumbs,
  userEmail,
  userRole,
  initials,
  headerConfig,
  onNavigateBack,
  onOpenMobileSidebar,
  onOpenCommand,
  onLogout,
}: AppHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        onOpenCommand();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [onOpenCommand]);

  const profileMenu = useMemo(
    () => [
      { label: 'Perfil', action: () => setMenuOpen(false) },
      { label: 'Configurações', action: () => setMenuOpen(false) },
      { label: 'Sair', action: onLogout },
    ],
    [onLogout],
  );

  return (
    <header className="border-b bg-card px-4 py-3 shadow-sm md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button className="rounded p-1 hover:bg-muted md:hidden" onClick={onOpenMobileSidebar}>
              <Menu size={18} className="text-muted-foreground" />
            </button>
            <button className="rounded p-1 hover:bg-muted" onClick={onNavigateBack}>
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
            <span>
              <span className="font-medium text-foreground">Hoje:</span> {todayLabel}
            </span>
          </div>
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((crumb, index) => (
                <li className="inline-flex items-center gap-2" key={crumb.pathname}>
                  {index === breadcrumbs.length - 1 ? (
                    <span aria-current="page" className="font-medium text-foreground">{crumb.crumb}</span>
                  ) : (
                    <>
                      <Link className="hover:text-foreground hover:underline" to={crumb.pathname}>{crumb.crumb}</Link>
                      <span>/</span>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2 top-2.5 text-muted-foreground" size={14} />
            <input
              className="h-9 w-56 rounded-md border bg-background px-8 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2"
              onFocus={onOpenCommand}
              placeholder="Buscar CNJ..."
              readOnly
              ref={searchInputRef}
              title="Atalho Ctrl+K"
            />
            <span className="absolute right-2 top-2 rounded border px-1 text-[10px] text-muted-foreground">Ctrl+K</span>
          </div>

          {headerConfig.primaryActions ? <div className="flex items-center gap-2">{headerConfig.primaryActions}</div> : null}
          <NotificationBell onClick={onOpenCommand} />

          <div className="relative">
            <button className="flex items-center gap-2" onClick={() => setMenuOpen((prev) => !prev)}>
              <div className="text-right">
                <p className="text-xs font-medium text-foreground">{userEmail ?? ''}</p>
                <p className="text-[10px] font-semibold uppercase text-primary">{userRole ?? 'ADMIN'}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-44 rounded-md border bg-popover p-1 shadow-lg">
                {profileMenu.map((item) => (
                  <button
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    key={item.label}
                    onClick={item.action}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
