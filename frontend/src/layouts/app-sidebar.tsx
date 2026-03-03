import { useMemo, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { sidebarSections, type SidebarItem } from '@/config/sidebar-config';

const BADGE_ENDPOINTS: Partial<Record<SidebarItem['href'], string>> = {
  '/nomeacoes': '/nomeacoes/count',
  '/tarefas': '/tarefas/count',
  '/agendar': '/agendar/count',
  '/esclarecimentos': '/esclarecimentos/count',
  '/laudos': '/laudos/count',
  '/comunicacao': '/comunicacao/count',
  '/email-inbox': '/email-inbox/count',
};

type SidebarProps = {
  collapsed: boolean;
  userEmail?: string;
  userRole?: 'ADMIN' | 'ASSISTANT';
  onToggleCollapsed: () => void;
  onLogout: () => void;
  iconMap: Record<string, ComponentType<{ size?: number; className?: string }>>;
  onNavigate?: () => void;
};

export const AppSidebar = ({
  collapsed,
  userEmail,
  userRole,
  onToggleCollapsed,
  onLogout,
  iconMap,
  onNavigate,
}: SidebarProps) => {
  const location = useLocation();
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});

  const badgeEntries = useMemo(() => Object.entries(BADGE_ENDPOINTS), []);

  const badgeQuery = useQuery({
    queryKey: ['sidebar-badges'],
    queryFn: async () => {
      const requests = badgeEntries.map(async ([href, endpoint]) => {
        const { data } = await apiClient.get<{ count?: number; total?: number }>(endpoint as string);
        return [href, data.count ?? data.total ?? 0] as const;
      });
      const results = await Promise.all(requests);
      return Object.fromEntries(results) as Record<string, number>;
    },
    refetchInterval: 300_000,
  });

  const sidebarWidth = collapsed ? 'w-[80px]' : 'w-[280px]';

  return (
    <aside className={`flex h-full shrink-0 flex-col bg-[#1a1d2e] text-white ${sidebarWidth}`}>
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-500 text-xs font-bold">P</div>
            {!collapsed ? <span className="text-sm font-bold leading-tight">Perícias Pro</span> : null}
          </div>
          <button className="rounded p-1 hover:bg-white/10" onClick={onToggleCollapsed} title="Expandir/recolher sidebar">
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} className="-rotate-90" />}
          </button>
        </div>
        {!collapsed ? <p className="mt-1 truncate text-[10px] text-white/50">{userEmail ?? ''}</p> : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {sidebarSections.map((sec) => {
          const isOpen = sectionsCollapsed[sec.section] !== true;
          return (
            <div className="mb-1" key={sec.section}>
              {!collapsed ? (
                <button
                  className="flex w-full items-center justify-between px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60"
                  onClick={() => setSectionsCollapsed((prev) => ({ ...prev, [sec.section]: !prev[sec.section] }))}
                >
                  {sec.section}
                  {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
              ) : null}

              {(isOpen || collapsed) && (
                <ul className="mt-0.5">
                  {sec.items
                    .filter((item) => !item.permission || item.permission === userRole)
                    .map((item) => {
                      const isActive = location.pathname === item.href;
                      const Icon = iconMap[item.href];
                      const badgeValue = badgeQuery.data?.[item.href] ?? 0;
                      return (
                        <li key={item.href + item.label}>
                          <Link
                            className={`mx-2 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                              isActive ? 'bg-blue-600 font-medium text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                            onClick={onNavigate}
                            to={item.href}
                            title={collapsed ? item.label : undefined}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {Icon ? <Icon className="shrink-0" size={13} /> : null}
                              {!collapsed ? <span className="truncate leading-tight">{item.label}</span> : null}
                            </div>
                            {!collapsed && badgeValue > 0 ? (
                              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">{badgeValue}</span>
                            ) : null}
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
        {!collapsed ? (
          <>
            <p className="text-[10px] text-white/40">Versão 3.8 (Email)</p>
            <p className="text-[10px] text-green-400">● Conexão Segura</p>
          </>
        ) : null}
        <button
          className="mt-2 flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70"
          onClick={onLogout}
          title="Sair"
        >
          <LogOut size={11} /> {!collapsed ? 'Sair' : null}
        </button>
      </div>
    </aside>
  );
};
