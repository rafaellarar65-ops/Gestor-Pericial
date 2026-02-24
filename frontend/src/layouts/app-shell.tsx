import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, CalendarClock, ClipboardList, MapPin, Scale, Calendar, Video, MessageSquareWarning, BookOpen, FileEdit, Dumbbell, Wallet, Upload, BarChart3, LogOut } from 'lucide-react';
import { CommandPalette } from '@/components/domain/command-palette';
import { sidebarSections } from '@/config/sidebar-config';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Dashboard: LayoutDashboard,
  'Perícias do Dia': CalendarClock,
  'Todas Perícias': ClipboardList,
  Cidades: MapPin,
  Nomeações: Scale,
  Tarefas: ClipboardList,
  'Fila de Agendamento': Calendar,
  Teleperícias: Video,
  Esclarecimentos: MessageSquareWarning,
  Agenda: Calendar,
  'Elaboração de Laudos': FileEdit,
  'Base de Conhecimento': BookOpen,
  'Banco de Manobras': Dumbbell,
  'Central de Cobrança': Wallet,
  Importações: Upload,
  'Análise Financeira': BarChart3,
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
  const { user, logout } = useAuthStore();
  const { setCommandOpen } = useUiStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
    <div className="flex min-h-screen">
      <CommandPalette />

      {/* ───── Dark Sidebar ───── */}
      <aside className="flex w-[175px] shrink-0 flex-col bg-[#1a1d2e] text-white">
        {/* Logo */}
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500 text-xs font-bold">P</div>
            <span className="text-sm font-bold leading-tight">Perícias Pro</span>
          </div>
          <p className="mt-1 truncate text-[10px] text-white/50">{user?.email ?? ''}</p>
        </div>

        {/* Navigation */}
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
                      const Icon = ICON_MAP[item.label];
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

        {/* Footer */}
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

      {/* ───── Main area ───── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b bg-white px-5 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="rounded p-1 hover:bg-gray-100"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <span className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Hoje:</span>{' '}
              {TODAY}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              className="rounded-full p-1 hover:bg-gray-100"
              onClick={() => setCommandOpen(true)}
              title="Buscar (Ctrl+K)"
            >
              <div className="relative">
                <Bell size={18} className="text-gray-600" />
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  !
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-800">{user?.email ?? ''}</p>
                <p className="text-[10px] font-semibold uppercase text-blue-600">{user?.role ?? 'ADMIN'}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
