export type SidebarItem = {
  label: string;
  href: string;
  permission?: 'ADMIN' | 'ASSISTANT';
  children?: SidebarItem[];
};

export const sidebarConfig: SidebarItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Nomeações', href: '/nomeacoes' },
  {
    label: 'Agenda',
    href: '/agenda',
    children: [
      { label: 'Perícias do Dia', href: '/pericias-hoje' },
      { label: 'Agendar em Lote', href: '/agendar' },
      { label: 'Teleperícias', href: '/telepericias' },
    ],
  },
  {
    label: 'Perícias',
    href: '/pericias',
    children: [
      { label: 'Lista de Perícias', href: '/pericias' },
      { label: 'Nova Perícia', href: '/pericias/nova' },
      { label: 'Laudos Pendentes', href: '/laudos-pendentes' },
      { label: 'Base de Conhecimento', href: '/base-conhecimento' },
      { label: 'Manobras', href: '/manobras' },
    ],
  },
  {
    label: 'Financeiro',
    href: '/financeiro',
    children: [
      { label: 'Cobrança', href: '/cobranca' },
      { label: 'Relatórios', href: '/relatorios-financeiros' },
      { label: 'Despesas', href: '/despesas' },
    ],
  },
  {
    label: 'Cadastros',
    href: '/cidades',
    children: [
      { label: 'Cidades', href: '/cidades' },
      { label: 'Advogados', href: '/advogados' },
    ],
  },
  {
    label: 'Comunicação',
    href: '/comunicacao',
    children: [{ label: 'Inbox de Email', href: '/inbox-email' }],
  },
  { label: 'Configurações', href: '/configuracoes', permission: 'ADMIN' },
  { label: 'Documentação', href: '/documentacao' },
];
