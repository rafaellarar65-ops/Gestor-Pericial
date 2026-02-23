export type UserRole = 'ADMIN' | 'ASSISTANT';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginRequest = {
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
  cidade: string;
  dataAgendamento?: string;
  status: PericiaStatus;
};

export type FinancialItem = {
  id: string;
  referencia: string;
  valor: number;
  status: 'A_RECEBER' | 'PARCIAL' | 'PAGO';
};

export type ApiError = {
  message: string | string[];
  statusCode?: number;
};
