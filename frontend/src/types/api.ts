export type UserRole = 'ADMIN' | 'ASSISTANT';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginRequest = {
  tenantId: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  user: { id: string; email: string; role: UserRole; tenantId: string; fullName?: string };
  tokens: AuthTokens;
};

export type ApiListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type DashboardKpi = {
  label: string;
  value: string;
  trend?: string;
};

export type DashboardResponse = {
  kpis: DashboardKpi[];
  chart: Array<{ name: string; value: number }>;
  critical: Pericia[];
};

export type PericiaStatus =
  | 'NOVA_NOMEACAO'
  | 'AGENDADA'
  | 'EM_ANDAMENTO'
  | 'LAUDO_ENVIADO'
  | 'FINALIZADA';

export type Pericia = {
  id: string;
  processoCNJ: string;
  autorNome: string;
  reuNome?: string;
  cidade: string;
  dataAgendamento?: string;
  status: PericiaStatus;
  pagamentoStatus?: string;
  isUrgent?: boolean;
  honorariosPrevistosJG?: number | string;
};

export type FinancialItem = {
  id: string;
  referencia: string;
  valor: number;
  status: 'A_RECEBER' | 'PARCIAL' | 'PAGO';
};

export type Recebimento = {
  id: string;
  periciaId?: string;
  fontePagamento: string;
  dataRecebimento: string;
  valorBruto: number | string;
  valorLiquido?: number | string;
  descricao?: string;
  createdAt?: string;
};

export type Despesa = {
  id: string;
  categoria: string;
  descricao: string;
  valor: number | string;
  dataCompetencia: string;
  periciaId?: string;
  createdAt?: string;
};

export type FinancialAnalytics = {
  totals: {
    recebido: number;
    despesas: number;
    resultado: number;
  };
  agingBuckets: {
    atrasados: number;
  };
  financialScore: number;
};

export type Lawyer = {
  id: string;
  nome: string;
  oab?: string;
  ufOab?: string;
  email?: string;
  telefone?: string;
  observacoes?: string;
};

export type EmailTemplate = {
  id: string;
  key: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  variables?: string[];
  active?: boolean;
};

export type AgendaEvent = {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt?: string;
  description?: string;
  location?: string;
  periciaId?: string;
};

export type AgendaTask = {
  id: string;
  title: string;
  status: 'TODO' | 'DOING' | 'DONE' | 'CANCELED';
  dueAt?: string;
  priority?: number;
  description?: string;
  periciaId?: string;
};

export type PhysicalManeuver = {
  id: string;
  name: string;
  category?: string;
  summary?: string;
  procedure?: string;
  evidence?: string;
  tags?: string[];
  active?: boolean;
};

export type KnowledgeItem = {
  id: string;
  title: string;
  category?: string;
  content?: string;
  source?: string;
  tags?: string[];
  active?: boolean;
};

export type TeleSlot = {
  id: string;
  startAt: string;
  endAt: string;
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
  meetingUrl?: string;
  platform?: string;
  periciaId?: string;
};

export type ConfigItem = {
  id: string;
  nome: string;
  codigo?: string;
  uf?: string;
  ativo?: boolean;
  cor?: string;
  sigla?: string;
  esfera?: string;
  cidadeId?: string;
  tribunalId?: string;
};

export type ApiError = {
  message: string | string[];
  statusCode?: number;
};
