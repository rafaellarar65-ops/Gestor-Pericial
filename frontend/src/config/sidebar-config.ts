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
      { label: 'Fila de Agendamento', href: '/agendar' },
      { label: 'Teleperícias', href: '/telepericias' },
      { label: 'Esclarecimentos', href: '/esclarecimentos' },
      { label: 'Agenda', href: '/agenda' },
      { label: 'Agenda Geral', href: '/agenda-geral' },
      { label: 'Google Calendar', href: '/integrations/google-calendar' },
    ],
  },
  {
    section: 'CENTRAL TÉCNICA',
    items: [
      { label: 'Elaboração de Laudos', href: '/laudos' },
      { label: 'Base de Conhecimento', href: '/conhecimento' },
      { label: 'Banco de Manobras', href: '/manobras' },
    ],
  },
  {
    section: 'FINANCEIRO',
    items: [
      { label: 'Central de Cobrança', href: '/financeiro/cobranca' },
      { label: 'Importações', href: '/importacoes' },
      { label: 'Recebimentos', href: '/financeiro' },
      { label: 'Análise Financeira', href: '/relatorios' },
      { label: 'Analytics Calendar', href: '/analytics-calendar' },
      { label: 'Pagamentos não vinculados', href: '/pagamentos-nao-vinculados' },
      { label: 'Conciliação', href: '/conciliacao' },
      { label: 'Despesas', href: '/despesas' },
    ],
  },
  {
    section: 'COMUNICAÇÃO',
    items: [
      { label: 'Central de Comunicação', href: '/comunicacao' },
      { label: 'Inbox de Email', href: '/email-inbox' },
      { label: 'Advogados', href: '/advogados' },
    ],
  },
  {
    section: 'SISTEMA',
    items: [
      { label: 'Configurações', href: '/configuracoes', permission: 'ADMIN' },
      { label: 'Documentação', href: '/documentacao' },
    ],
  },
];

// Flat list kept for command palette
export const sidebarConfig: SidebarItem[] = sidebarSections.flatMap((s) => s.items);
