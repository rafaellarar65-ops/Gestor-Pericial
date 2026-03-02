import { useEffect, useState, type ComponentType } from 'react';
import { Outlet, useMatches, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarClock, ClipboardList, MapPin, Scale, Calendar, Video, MessageSquareWarning, BookOpen, FileEdit, Dumbbell, Wallet, Upload, BarChart3, CalendarDays, CalendarRange, FileText, HandCoins, Inbox, Briefcase, Receipt, AlertTriangle, Settings } from 'lucide-react';
import { CommandPalette } from '@/components/domain/command-palette';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import type { AppShellHeaderConfig } from '@/layouts/app-shell-context';
import { AppSidebar } from '@/layouts/app-sidebar';
import { AppHeader } from '@/layouts/app-header';

type MatchHandle = {
  crumb?: string;
};

const ICON_MAP: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  '/': LayoutDashboard,
  '/pericias-hoje': CalendarClock,
  '/pericias': ClipboardList,
  '/cidades': MapPin,
  '/nomeacoes': Scale,
  '/tarefas': ClipboardList,
  '/agendar': Calendar,
  '/telepericias': Video,
  '/esclarecimentos': AlertTriangle,
  '/comunicacao': MessageSquareWarning,
  '/agenda': Calendar,
  '/agenda-geral': CalendarDays,
  '/integrations/google-calendar': CalendarDays,
  '/laudos': FileEdit,
  '/conhecimento': BookOpen,
  '/manobras': Dumbbell,
  '/financeiro/cobranca': Wallet,
  '/importacoes': Upload,
  '/financeiro': BarChart3,
  '/analytics-calendar': CalendarRange,
  '/relatorios': FileText,
  '/pagamentos-nao-vinculados': HandCoins,
  '/configuracoes': Settings,
  '/documentacao': FileText,
  '/email-inbox': Inbox,
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
  const navigate = useNavigate();
  const matches = useMatches();
  const { user, logout } = useAuthStore();
  const { setCommandOpen } = useUiStore();
  const [headerConfig, setHeaderConfig] = useState<AppShellHeaderConfig>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const breadcrumbs = matches
    .map((match) => ({ pathname: match.pathname, crumb: (match.handle as MatchHandle | undefined)?.crumb }))
    .filter((item): item is { pathname: string; crumb: string } => Boolean(item.crumb));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />

      <div className="hidden h-screen md:block">
        <AppSidebar
          collapsed={sidebarCollapsed}
          iconMap={ICON_MAP}
          onLogout={handleLogout}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
          userEmail={user?.email}
          userRole={user?.role}
        />
      </div>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative h-full w-[280px]">
            <AppSidebar
              collapsed={false}
              iconMap={ICON_MAP}
              onLogout={handleLogout}
              onNavigate={() => setMobileSidebarOpen(false)}
              onToggleCollapsed={() => undefined}
              userEmail={user?.email}
              userRole={user?.role}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          breadcrumbs={breadcrumbs}
          headerConfig={headerConfig}
          initials={initials}
          onLogout={handleLogout}
          onNavigateBack={() => navigate(-1)}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          todayLabel={TODAY}
          userEmail={user?.email}
          userRole={user?.role}
        />

        <div className="flex min-h-0 flex-1">
          <main className="flex-1 overflow-y-auto bg-background px-6 py-5">
            <Outlet context={{ setHeaderConfig, clearHeaderConfig: () => setHeaderConfig({}) }} />
          </main>
          {headerConfig.contextualAside ? (
            <aside className="hidden w-[320px] shrink-0 border-l bg-card p-4 xl:block">{headerConfig.contextualAside}</aside>
          ) : null}
        </div>
      </div>
    </div>
  );
};
