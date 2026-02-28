export type SidebarItem = {
  label: string;
  href: string;
  permission?: 'ADMIN' | 'ASSISTANT';
};

export type SidebarSection = {
  section: string;
  items: SidebarItem[];
};

export const sidebarSections: SidebarSection[] = [
  {
    section: 'GERAL',
    items: [
      { label: 'Dashboard', href: '/' },
      { label: 'Perícias do Dia', href: '/pericias-hoje' },
      { label: 'Todas Perícias', href: '/pericias' },
      { label: 'Cidades', href: '/cidades' },
    ],
  },
  {
    section: 'OPERACIONAL',
    items: [
      { label: 'Nomeações', href: '/nomeacoes' },
      { label: 'Tarefas', href: '/tarefas' },
      { label: 'Fila de Agendamento', href: '/fila-agendamento' },
      { label: 'Teleperícias', href: '/telepericias' },
      { label: 'Esclarecimentos', href: '/comunicacao' },
      { label: 'Agenda', href: '/agenda' },
      { label: 'Google Calendar', href: '/integrations/google-calendar' },
    ],
  },
  {
    section: 'CENTRAL TÉCNICA',
    items: [
      { label: 'Elaboração de Laudos', href: '/laudos-pendentes' },
      { label: 'Base de Conhecimento', href: '/base-conhecimento' },
      { label: 'Banco de Manobras', href: '/manobras' },
    ],
  },
  {
    section: 'FINANCEIRO',
    items: [
      { label: 'Central de Cobrança', href: '/cobranca' },
      { label: 'Importações', href: '/importacoes' },
      { label: 'Análise Financeira', href: '/financeiro' },
      { label: 'Analytics Calendar', href: '/analytics-calendar' },
      { label: 'Relatórios Financeiros', href: '/relatorios-financeiros' },
      { label: 'Pagamentos não vinculados', href: '/pagamentos-nao-vinculados' },
    ],
  },
  {
    section: 'SUPORTE E ADMINISTRAÇÃO',
    items: [
      { label: 'Documentação', href: '/documentacao' },
      { label: 'Inbox de Email', href: '/inbox-email' },
      { label: 'Advogados', href: '/advogados' },
      { label: 'Despesas', href: '/despesas' },
    ],
  },
];

// Flat list kept for command palette
export const sidebarConfig: SidebarItem[] = sidebarSections.flatMap((s) => s.items);
