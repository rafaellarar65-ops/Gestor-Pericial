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
      { label: 'Teleperícias', href: '/telepericias' },
      { label: 'Agendar em Lote', href: '/agendar' },
    ],
  },
  {
    label: 'Perícias',
    href: '/pericias',
    children: [
      { label: 'Laudos Pendentes', href: '/laudos-pendentes' },
      { label: 'Laudo V2', href: '/laudo-v2' },
      { label: 'Base de Conhecimento', href: '/base-conhecimento' },
      { label: 'Manobras', href: '/manobras' },
    ],
  },
  {
    label: 'Financeiro',
    href: '/financeiro',
    children: [
      { label: 'Cobrança', href: '/cobranca' },
      { label: 'Relatórios Financeiros', href: '/relatorios-financeiros' },
      { label: 'Despesas', href: '/despesas' },
    ],
  },
  {
    label: 'Cadastros',
    href: '/cidades',
    children: [{ label: 'Advogados', href: '/advogados' }],
  },
  {
    label: 'Comunicação',
    href: '/comunicacao',
    children: [{ label: 'Inbox de Email', href: '/inbox-email' }],
  },
  { label: 'Configurações', href: '/configuracoes', permission: 'ADMIN' },
  { label: 'Documentação', href: '/documentacao' },
];
