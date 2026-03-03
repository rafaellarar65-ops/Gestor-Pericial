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
  key: string;
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
  | 'AVALIAR'
  | 'MAJORAR'
  | 'AGUARDANDO_ACEITE_HONORARIOS'
  | 'AGENDAR_DATA'
  | 'DATA_AGENDADA'
  | 'AUSENTE'
  | 'AUSENCIA_INFORMADA'
  | 'ENVIAR_LAUDO'
  | 'LAUDO_ENVIADO'
  | 'ESCLARECIMENTOS'
  | 'AGUARDANDO_PAG'
  | 'RECEBIDO_PARCIALMENTE'
  | 'FINALIZADA'
  | 'RECUSAR'
  | 'CANCELADA'
  | 'TELEPERICIA'
  | 'FAZER_INDIRETA';

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


export type UnmatchedPaymentOrigin = 'AI_PRINT' | 'MANUAL_CSV' | 'INDIVIDUAL';

export type UnmatchedPayment = {
  id: string;
  amount?: number | string | null;
  transactionDate?: string | null;
  receivedAt?: string | null;
  payerName?: string | null;
  cnj?: string | null;
  description?: string | null;
  source?: string | null;
  origin?: UnmatchedPaymentOrigin | string | null;
  ignored?: boolean;
  matchStatus?: string;
  notes?: string | null;
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

export type MessageTemplateChannel = 'whatsapp_template' | 'whatsapp_freeform' | 'clipboard' | 'wa_me_prefill';

export type MessageTemplate = {
  id: string;
  channel: MessageTemplateChannel;
  name: string;
  body: string;
  placeholdersUsed?: string[];
  variablesMapping?: Record<string, string>;
};

export type TemplatePreview = {
  text: string;
  channel: MessageTemplateChannel;
};

export type InboxItem = {
  id: string;
  message?: string;
  tags?: string[];
  from?: string;
  to?: string;
  channel?: string;
  status?: string;
  body?: string;
  createdAt?: string;
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
  syncStatus?: 'PENDING' | 'SYNCED' | 'WARNING' | 'CONFLICT' | 'ERROR';
};


export type WeeklyWorkloadDay = {
  date: string;
  allocated_minutes: number;
  work_window_minutes: number;
  utilization: number;
  conflicts: number;
};

export type WeeklyWorkload = {
  week_start: string;
  week_end: string;
  days: WeeklyWorkloadDay[];
  allocated_minutes: number;
  work_window_minutes: number;
  utilization: number;
  conflicts: number;
};

export type RevenueForecast = {
  forecast_total: number;
  confidence: string;
  signals: string[];
  assumptions: string[];
  series: Array<{ date: string; amount: number; accumulated: number }>;
};

export type AgendaTask = {
  id: string;
  title: string;
  status: 'TODO' | 'DOING' | 'DONE' | 'CANCELED';
  dueAt?: string;
  priority?: number;
  description?: string;
  periciaId?: string;
  syncStatus?: 'PENDING' | 'SYNCED' | 'WARNING' | 'CONFLICT' | 'ERROR';
};

export type GoogleCalendarIntegration = {
  id: string;
  provider: 'GOOGLE';
  email?: string;
  selectedCalendarId?: string;
  selectedCalendarName?: string;
  syncEvents: boolean;
  syncTasks: boolean;
  mode: 'MIRROR' | 'TWO_WAY';
  active: boolean;
  lastSyncAt?: string;
};

export type SyncAuditLog = {
  id: string;
  syncType: 'EVENT' | 'TASK';
  direction: 'PUSH' | 'PULL';
  localEntity: string;
  localEntityId: string;
  status: 'PENDING' | 'SYNCED' | 'WARNING' | 'CONFLICT' | 'ERROR';
  message?: string;
  createdAt: string;
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
  email?: string;
  role?: UserRole;
  codigo?: string;
  uf?: string;
  ativo?: boolean;
  cor?: string;
  sigla?: string;
  esfera?: string;
  descricao?: string;
  campoAlvo?: string;
  operador?: string;
  valor?: string;
  acao?: string;
  cidadeId?: string;
  tribunalId?: string;
};

export type IntegrationSettings = {
  smtp?: string;
  whatsappApi?: string;
  googleCalendarLink?: string;
};

export type DashboardSystemSettings = {
  nomeacoesGroups: {
    avaliar: string[];
    aceiteHonorarios: string[];
    majorarHonorarios: string[];
    observacaoExtra: string[];
  };
  dashboard: {
    avaliarStatusCodigos: string[];
    avaliarStatusNomeTermos: string[];
    enviarLaudoStatusCodigos: string[];
    enviarLaudoStatusNomeTermos: string[];
  };
  filas: {
    agendamentoBloqueiaTermosStatus: string[];
    laudosUrgenciaTermosStatus: string[];
  };
};



export type TelepericiaQueueItem = {
  id: string;
  processoCNJ: string;
  periciadoNome?: string;
  autorNome?: string;
  dataAgendamento?: string;
  isUrgent: boolean;
  urgentCheckedAt?: string;
  telepericiaStatusChangedAt?: string;
  whatsappStatus?: string;
  telepericiaConfirmedAt?: string;
  telepericiaLastAttemptAt?: string;
  createdAt: string;
  status?: { id: string; nome: string; codigo?: string } | null;
};

export type TelepericiaQueueResponse = {
  items: TelepericiaQueueItem[];
  pagination: { page: number; limit: number; total: number };
};

export type PericiaDetail = {
  id: string;
  processoCNJ: string;
  autorNome?: string;
  reuNome?: string;
  periciadoNome?: string;
  tipoPericia?: { id: string; nome: string } | null;
  modalidade?: { id: string; nome: string } | null;
  cidade?: { id: string; nome: string; uf?: string } | null;
  vara?: { id: string; nome: string } | null;
  status?: { id: string; nome: string; codigo?: string; cor?: string } | null;
  pagamentoStatus?: string;
  dataNomeacao?: string;
  dataAgendamento?: string;
  horaAgendamento?: string;
  dataRealizacao?: string;
  dataEnvioLaudo?: string;
  honorariosPrevistosJG?: number | string;
  honorariosPrevistosPartes?: number | string;
  juizNome?: string;
  observacoes?: string;
  observacaoExtra?: string;
  esclarecimentos?: { dataIntimacao?: string; prazoDias?: number };
  finalizada?: boolean;
};

export type PericiaTimelineItem = {
  type: 'MARCO' | 'STATUS';
  event: string;
  description?: string | null;
  date?: string;
};

export type PericiaTimelineResponse = {
  periciaId: string;
  items: PericiaTimelineItem[];
};

export type CaseDocument = {
  id: string;
  periciaId: string;
  nome: string;
  categoria?: string;
  tipo?: string;
  createdAt?: string;
};

export type CityOverview = {
  cidade: { id: string; nome: string; uf?: string };
  metrics: {
    score: number;
    totalPericias: number;
    aReceberTotal: number;
    atrasoCritico: number;
  };
  buckets: {
    avaliar: { total: number; cnjs: string[] };
    agendar: { total: number; cnjs: string[] };
    laudos: { total: number; cnjs: string[] };
    esclarecimentos: { total: number; cnjs: string[] };
    pagamento: { total: number; cnjs: string[]; recebido: number };
    criticos: { total: number; cnjs: string[] };
    finalizada: { total: number };
  };
};

export type CityOverviewList = { items: CityOverview[] };


export type StageListItem = {
  id: string;
  processoCNJ: string;
  autorNome: string;
  cidade: string;
  status: string;
  dataNomeacao?: string;
};

export type NomeacoesGroup = {
  key: string;
  label: string;
  total: number;
  items: StageListItem[];
};

export type NomeacoesResponse = {
  total: number;
  groups: NomeacoesGroup[];
};

export type FilaAgendamentoCity = {
  cidade: string;
  total: number;
  items: StageListItem[];
};

export type FilaAgendamentoCityResponse = {
  total: number;
  cities: FilaAgendamentoCity[];
};

export type ApiError = {
  message: string | string[];
  statusCode?: number;
};

export const ANALYTICS_CALENDAR_LAYERS = [
  'OPERACIONAL',
  'PRODUCAO',
  'LAUDOS',
  'ESCLARECIMENTOS',
  'FINANCEIRO_PRODUCAO_RECEBIMENTO',
] as const;

export type AnalyticsCalendarLayer = (typeof ANALYTICS_CALENDAR_LAYERS)[number];

export const ANALYTICS_EVENT_TYPE_COLORS: Record<string, string> = {
  NOMEACAO: '#2563eb',
  AGENDAMENTO: '#d97706',
  REALIZACAO: '#0891b2',
  LAUDO_ENVIADO: '#059669',
  RECEBIMENTO: '#16a34a',
};

export type AnalyticsCalendarKpi = {
  key: string;
  label: string;
  value: number;
};

export type AnalyticsCalendarTimelineEvent = {
  type: string;
  cnjId: string;
  city: string;
  timestamp: string;
  value: number | null;
  deadline: string | null;
  status: string | null;
};

export type AnalyticsCalendarHeatmapDay = {
  date: string;
  receivedValue: number;
  productionValue: number;
  totalEvents: number;
  intensity: number;
};

export type AnalyticsCalendarOverviewResponse = {
  layer: AnalyticsCalendarLayer;
  period: {
    from: string;
    to: string;
  };
  kpis: AnalyticsCalendarKpi[];
  timeline: AnalyticsCalendarTimelineEvent[];
  heatmap: AnalyticsCalendarHeatmapDay[];
};
