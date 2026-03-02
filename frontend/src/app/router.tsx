import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/app/protected-route';
import { AppRouteError } from '@/components/ui/app-error';
import { LoadingState } from '@/components/ui/state';
import { AppShell } from '@/layouts/app-shell';
import { appPaths, legacyPathRedirects } from '@/config/sidebar-config';


const lazyWithRetry = (importer: () => Promise<{ default: ComponentType }>) =>
  lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const shouldRetry =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed');

      if (shouldRetry && typeof window !== 'undefined') {
        const key = 'gp-lazy-retry';
        const hasRetried = window.sessionStorage.getItem(key) === '1';
        if (!hasRetried) {
          window.sessionStorage.setItem(key, '1');
          window.location.reload();
          return new Promise(() => undefined);
        }
      }

      throw error;
    }
  });

const pages = {
  login: lazyWithRetry(() => import('@/pages/login-page')),
  dashboard: lazyWithRetry(() => import('@/pages/dashboard-page')),
  nomeacoes: lazyWithRetry(() => import('@/pages/nomeacoes-page')),
  agenda: lazyWithRetry(() => import('@/pages/agenda-page')),
  agendaGeral: lazyWithRetry(() => import('@/pages/agenda-geral-page')),
  periciasHoje: lazyWithRetry(() => import('@/pages/pericias-hoje-page')),
  telepericias: lazyWithRetry(() => import('@/pages/telepericias-page')),
  tarefas: lazyWithRetry(() => import('@/pages/tarefas-page')),
  filaAgendamento: lazyWithRetry(() => import('@/pages/fila-agendamento-page')),
  pericias: lazyWithRetry(() => import('@/pages/pericias-page')),
  periciaDetail: lazyWithRetry(() => import('@/pages/pericia-detail-page')),
  periciaCreate: lazyWithRetry(() => import('@/pages/pericia-create-page')),
  periciaEdit: lazyWithRetry(() => import('@/pages/pericia-edit-page')),
  laudosPendentes: lazyWithRetry(() => import('@/pages/laudos-pendentes-page')),
  laudoV2: lazyWithRetry(() => import('@/pages/laudo-v2-page')),
  laudoInteligente: lazyWithRetry(() => import('@/pages/laudo-inteligente-page')),
  manobras: lazyWithRetry(() => import('@/pages/manobras-page')),
  baseConhecimento: lazyWithRetry(() => import('@/pages/base-conhecimento-page')),
  financeiro: lazyWithRetry(() => import('@/pages/financeiro-page')),
  analyticsCalendar: lazyWithRetry(() => import('@/pages/analytics-calendar-page')),
  cobranca: lazyWithRetry(() => import('@/pages/cobranca-page')),
  relatorios: lazyWithRetry(() => import('@/pages/relatorios-financeiros-page')),
  importacoes: lazyWithRetry(() => import('@/pages/importacoes-page')),
  pagamentosNaoVinculados: lazyWithRetry(() => import('@/pages/pagamentos-nao-vinculados-page')),
  despesas: lazyWithRetry(() => import('@/pages/despesas-page')),
  conciliacao: lazyWithRetry(() => import('@/pages/conciliacao-page')),
  cidades: lazyWithRetry(() => import('@/pages/cidades-page')),
  cidadeDetail: lazyWithRetry(() => import('@/pages/cidade-detail-page')),
  advogados: lazyWithRetry(() => import('@/pages/advogados-page')),
  comunicacao: lazyWithRetry(() => import('@/pages/comunicacao-page')),
  emailGerador: lazyWithRetry(() => import('@/pages/email-gerador-page')),
  esclarecimentos: lazyWithRetry(() => import('@/pages/esclarecimentos-page')),
  inbox: lazyWithRetry(() => import('@/pages/inbox-email-page')),
  configuracoes: lazyWithRetry(() => import('@/pages/configuracoes-page')),
  googleCalendarIntegrations: lazyWithRetry(() => import('@/pages/integrations-google-calendar-page')),
  documentacao: lazyWithRetry(() => import('@/pages/documentacao-page')),
  notFound: lazyWithRetry(() => import('@/pages/not-found-page')),
} as const;

const withSuspense = (Element: LazyExoticComponent<ComponentType>) => (
  <Suspense fallback={<LoadingState />}>
    <Element />
  </Suspense>
);

export const router = createBrowserRouter([
  { path: '/login', handle: { crumb: 'Login' }, element: withSuspense(pages.login), errorElement: <AppRouteError /> },
  {
    element: <ProtectedRoute />,
    errorElement: <AppRouteError />,
    children: [
      {
        element: <AppShell />,
        errorElement: <AppRouteError />,
        children: [
          { path: appPaths.dashboard, handle: { crumb: 'Dashboard' }, element: withSuspense(pages.dashboard) },
          { path: appPaths.nomeacoes, handle: { crumb: 'Nomeações' }, element: withSuspense(pages.nomeacoes) },
          { path: appPaths.agenda, handle: { crumb: 'Agenda' }, element: withSuspense(pages.agenda) },
          { path: appPaths.agendaGeral, handle: { crumb: 'Agenda Geral' }, element: withSuspense(pages.agendaGeral) },
          { path: appPaths.periciasHoje, handle: { crumb: 'Perícias do Dia' }, element: withSuspense(pages.periciasHoje) },
          { path: appPaths.telepericias, handle: { crumb: 'Teleperícias' }, element: withSuspense(pages.telepericias) },
          { path: appPaths.esclarecimentos, handle: { crumb: 'Esclarecimentos' }, element: withSuspense(pages.esclarecimentos) },
          { path: appPaths.tarefas, handle: { crumb: 'Tarefas Operacionais' }, element: withSuspense(pages.tarefas) },
          { path: appPaths.agendar, handle: { crumb: 'Agendar em Lote' }, element: withSuspense(pages.filaAgendamento) },
          { path: appPaths.pericias, handle: { crumb: 'Perícias' }, element: withSuspense(pages.pericias) },
          { path: '/pericias/nova', handle: { crumb: 'Nova Perícia' }, element: withSuspense(pages.periciaCreate) },
          { path: '/pericias/:id/editar', handle: { crumb: 'Editar Perícia' }, element: withSuspense(pages.periciaEdit) },
          { path: '/pericias/:id', handle: { crumb: 'Detalhe da Perícia' }, element: withSuspense(pages.periciaDetail) },
          { path: appPaths.laudos, handle: { crumb: 'Laudos Pendentes' }, element: withSuspense(pages.laudosPendentes) },
          { path: '/laudo-v2', handle: { crumb: 'Laudo V2' }, element: withSuspense(pages.laudoV2) },
          { path: '/laudo-inteligente/:id', handle: { crumb: 'Laudo Inteligente' }, element: withSuspense(pages.laudoInteligente) },
          { path: appPaths.manobras, handle: { crumb: 'Manobras' }, element: withSuspense(pages.manobras) },
          { path: appPaths.conhecimento, handle: { crumb: 'Base de Conhecimento' }, element: withSuspense(pages.baseConhecimento) },
          { path: appPaths.financeiro, handle: { crumb: 'Financeiro' }, element: withSuspense(pages.financeiro) },
          { path: appPaths.analyticsCalendar, handle: { crumb: 'Analytics Calendar' }, element: withSuspense(pages.analyticsCalendar) },
          { path: appPaths.financeiroCobranca, handle: { crumb: 'Cobrança' }, element: withSuspense(pages.cobranca) },
          { path: appPaths.importacoes, handle: { crumb: 'Importações' }, element: withSuspense(pages.importacoes) },
          { path: appPaths.relatorios, handle: { crumb: 'Relatórios Financeiros' }, element: withSuspense(pages.relatorios) },
          { path: appPaths.pagamentosNaoVinculados, handle: { crumb: 'Pagamentos não vinculados' }, element: withSuspense(pages.pagamentosNaoVinculados) },
          { path: appPaths.despesas, handle: { crumb: 'Despesas' }, element: withSuspense(pages.despesas) },
          { path: appPaths.conciliacao, handle: { crumb: 'Conciliação' }, element: withSuspense(pages.conciliacao) },
          { path: appPaths.cidades, handle: { crumb: 'Cidades' }, element: withSuspense(pages.cidades) },
          { path: '/cidades/:id', handle: { crumb: 'Detalhe da Cidade' }, element: withSuspense(pages.cidadeDetail) },
          { path: appPaths.advogados, handle: { crumb: 'Advogados' }, element: withSuspense(pages.advogados) },
          { path: appPaths.comunicacao, handle: { crumb: 'Comunicação' }, element: withSuspense(pages.comunicacao) },
          { path: appPaths.emailGerador, handle: { crumb: 'Email Gerador' }, element: withSuspense(pages.emailGerador) },
          { path: appPaths.emailInbox, handle: { crumb: 'Inbox de Email' }, element: withSuspense(pages.inbox) },
          ...legacyPathRedirects.map(({ from, to }) => ({
            path: from,
            handle: { crumb: 'Redirecionando' },
            element: <Navigate replace to={to} />,
          })),
          { path: appPaths.configuracoes, handle: { crumb: 'Configurações' }, element: withSuspense(pages.configuracoes) },
          { path: appPaths.googleCalendar, handle: { crumb: 'Google Calendar' }, element: withSuspense(pages.googleCalendarIntegrations) },
          { path: appPaths.documentacao, handle: { crumb: 'Documentação' }, element: withSuspense(pages.documentacao) },
        ],
      },
    ],
  },
  { path: '*', handle: { crumb: '404' }, element: withSuspense(pages.notFound), errorElement: <AppRouteError /> },
]);
