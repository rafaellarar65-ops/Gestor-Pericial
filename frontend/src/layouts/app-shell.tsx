import { useState } from 'react';
import { Link, Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, CalendarClock, ClipboardList, MapPin, Scale, Calendar, Video, MessageSquareWarning, BookOpen, FileEdit, Dumbbell, Wallet, Upload, BarChart3, LogOut, CalendarDays, CalendarRange, FileText, HandCoins, Inbox, Briefcase, Receipt, AlertTriangle } from 'lucide-react';
import { CommandPalette } from '@/components/domain/command-palette';
import { sidebarSections, type SidebarItem } from '@/config/sidebar-config';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import type { AppShellHeaderConfig } from '@/layouts/app-shell-context';

type MatchHandle = {
  crumb?: string;
};

const ICON_MAP: Record<SidebarItem['href'], React.ComponentType<{ size?: number; className?: string }>> = {
  '/': LayoutDashboard,
  '/pericias-hoje': CalendarClock,
  '/pericias': ClipboardList,
  '/cidades': MapPin,
  '/nomeacoes': Scale,
  '/tarefas': ClipboardList,
  '/fila-agendamento': Calendar,
  '/telepericias': Video,
  '/esclarecimentos': AlertTriangle,
  '/comunicacao': MessageSquareWarning,
  '/agenda': Calendar,
  '/integrations/google-calendar': CalendarDays,
  '/laudos-pendentes': FileEdit,
  '/base-conhecimento': BookOpen,
  '/manobras': Dumbbell,
  '/cobranca': Wallet,
  '/importacoes': Upload,
  '/financeiro': BarChart3,
  '/analytics-calendar': CalendarRange,
  '/relatorios-financeiros': FileText,
  '/pagamentos-nao-vinculados': HandCoins,
  '/documentacao': FileText,
  '/inbox-email': Inbox,
  '/advogados': Briefcase,
  '/despesas': Receipt,
};

const TODAY = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
}).format(new Date());

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const matches = useMatches();
  const { user, logout } = useAuthStore();
  const { setCommandOpen } = useUiStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [headerConfig, setHeaderConfig] = useState<AppShellHeaderConfig>({});

  const breadcrumbs = matches
    .map((match) => ({ pathname: match.pathname, crumb: (match.handle as MatchHandle | undefined)?.crumb }))
    .filter((item): item is { pathname: string; crumb: string } => Boolean(item.crumb));

  const toggleSection = (section: string) =>
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />

      <aside className="flex w-[210px] shrink-0 flex-col bg-[#1a1d2e] text-white">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500 text-xs font-bold">P</div>
            <span className="text-sm font-bold leading-tight">Perícias Pro</span>
          </div>
          <p className="mt-1 truncate text-[10px] text-white/50">{user?.email ?? ''}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {sidebarSections.map((sec) => {
            const isOpen = collapsed[sec.section] !== true;
            return (
              <div className="mb-1" key={sec.section}>
                <button
                  className="flex w-full items-center justify-between px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60"
                  onClick={() => toggleSection(sec.section)}
                >
                  {sec.section}
                  {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>

                {isOpen && (
                  <ul className="mt-0.5">
                    {sec.items.map((item) => {
                      const isActive = location.pathname === item.href;
                      const Icon = ICON_MAP[item.href];
                      return (
                        <li key={item.href + item.label}>
                          <Link
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs transition-colors ${
                              isActive
                                ? 'bg-blue-600 font-medium text-white'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                            to={item.href}
                          >
                            {Icon && <Icon className="shrink-0" size={13} />}
                            <span className="leading-tight">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-[10px] text-white/40">Versão 3.8 (Email)</p>
          <p className="text-[10px] text-green-400">● Conexão Segura</p>
          <button
            className="mt-2 flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70"
            onClick={handleLogout}
          >
            <LogOut size={11} /> Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b bg-card px-6 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button className="rounded p-1 hover:bg-muted" onClick={() => navigate(-1)}>
                  <ChevronLeft size={16} className="text-muted-foreground" />
                </button>
                <span>
                  <span className="font-medium text-foreground">Hoje:</span> {TODAY}
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
              {headerConfig.primaryActions ? <div className="flex items-center gap-2">{headerConfig.primaryActions}</div> : null}
              <button
                className="rounded-full p-1 hover:bg-muted"
                onClick={() => setCommandOpen(true)}
                title="Buscar (Ctrl+K)"
              >
                <div className="relative">
                  <Bell size={18} className="text-muted-foreground" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                    !
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">{user?.email ?? ''}</p>
                  <p className="text-[10px] font-semibold uppercase text-primary">{user?.role ?? 'ADMIN'}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="flex-1 overflow-y-auto bg-background px-6 py-5">
            <Outlet context={{ setHeaderConfig, clearHeaderConfig: () => setHeaderConfig({}) }} />
          </main>
          {headerConfig.contextualAside ? (
            <aside className="hidden w-[320px] shrink-0 border-l bg-card p-4 xl:block">
              {headerConfig.contextualAside}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
};
