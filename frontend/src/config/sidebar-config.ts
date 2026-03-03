export type SidebarItem = {
  label: string;
  href: string;
  permission?: 'ADMIN' | 'ASSISTANT';
};

export type SidebarSection = {
  section: string;
  items: SidebarItem[];
};

export const appPaths = {
  dashboard: '/',
  nomeacoes: '/nomeacoes',
  tarefas: '/tarefas',
  agendar: '/agendar',
  telepericias: '/telepericias',
  esclarecimentos: '/esclarecimentos',
  agenda: '/agenda',
  agendaGeral: '/agenda-geral',
  periciasHoje: '/pericias-hoje',
  pericias: '/pericias',
  laudos: '/laudos',
  manobras: '/manobras',
  conhecimento: '/conhecimento',
  financeiro: '/financeiro',
  financeiroCobranca: '/financeiro/cobranca',
  relatorios: '/relatorios',
  importacoes: '/importacoes',
  analyticsCalendar: '/analytics-calendar',
  pagamentosNaoVinculados: '/pagamentos-nao-vinculados',
  conciliacao: '/conciliacao',
  despesas: '/despesas',
  comunicacao: '/comunicacao',
  emailInbox: '/email-inbox',
  emailGerador: '/email-gerador',
  advogados: '/advogados',
  cidades: '/cidades',
  configuracoes: '/configuracoes',
  documentacao: '/documentacao',
  googleCalendar: '/integrations/google-calendar',
} as const;

// Contrato de migração (path legado -> path principal atual)
export const legacyPathRedirects = [
  { from: '/fila-agendamento', to: appPaths.agendar },
  { from: '/laudos-pendentes', to: appPaths.laudos },
  { from: '/base-conhecimento', to: appPaths.conhecimento },
  { from: '/cobranca', to: appPaths.financeiroCobranca },
  { from: '/relatorios-financeiros', to: appPaths.relatorios },
  { from: '/inbox-email', to: appPaths.emailInbox },
] as const;

export const sidebarSections: SidebarSection[] = [
  {
    section: 'GERAL',
    items: [
      { label: 'Dashboard', href: appPaths.dashboard },
      { label: 'Perícias do Dia', href: appPaths.periciasHoje },
      { label: 'Todas Perícias', href: appPaths.pericias },
      { label: 'Cidades', href: appPaths.cidades },
    ],
  },
  {
    section: 'OPERACIONAL',
    items: [
      { label: 'Nomeações', href: appPaths.nomeacoes },
      { label: 'Tarefas', href: appPaths.tarefas },
      { label: 'Fila de Agendamento', href: appPaths.agendar },
      { label: 'Teleperícias', href: appPaths.telepericias },
      { label: 'Esclarecimentos', href: appPaths.esclarecimentos },
      { label: 'Agenda', href: appPaths.agenda },
      { label: 'Agenda Geral', href: appPaths.agendaGeral },
      { label: 'Google Calendar', href: appPaths.googleCalendar },
    ],
  },
  {
    section: 'CENTRAL TÉCNICA',
    items: [
      { label: 'Elaboração de Laudos', href: appPaths.laudos },
      { label: 'Base de Conhecimento', href: appPaths.conhecimento },
      { label: 'Banco de Manobras', href: appPaths.manobras },
    ],
  },
  {
    section: 'FINANCEIRO',
    items: [
      { label: 'Central de Cobrança', href: appPaths.financeiroCobranca },
      { label: 'Importações', href: appPaths.importacoes },
      { label: 'Recebimentos', href: appPaths.financeiro },
      { label: 'Análise Financeira', href: appPaths.relatorios },
      { label: 'Analytics Calendar', href: appPaths.analyticsCalendar },
      { label: 'Pagamentos não vinculados', href: appPaths.pagamentosNaoVinculados },
      { label: 'Conciliação', href: appPaths.conciliacao },
      { label: 'Despesas', href: appPaths.despesas },
    ],
  },
  {
    section: 'COMUNICAÇÃO',
    items: [
      { label: 'Central de Comunicação', href: appPaths.comunicacao },
      { label: 'Inbox de Email', href: appPaths.emailInbox },
      { label: 'Advogados', href: appPaths.advogados },
    ],
  },
  {
    section: 'SISTEMA',
    items: [
      { label: 'Configurações', href: appPaths.configuracoes, permission: 'ADMIN' },
      { label: 'Documentação', href: appPaths.documentacao },
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
