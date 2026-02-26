import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/app/protected-route';
import { AppRouteError } from '@/components/ui/app-error';
import { LoadingState } from '@/components/ui/state';
import { AppShell } from '@/layouts/app-shell';


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
  periciasHoje: lazyWithRetry(() => import('@/pages/pericias-hoje-page')),
  telepericias: lazyWithRetry(() => import('@/pages/telepericias-page')),
  tarefas: lazyWithRetry(() => import('@/pages/tarefas-page')),
  filaAgendamento: lazyWithRetry(() => import('@/pages/fila-agendamento-page')),
  pericias: lazyWithRetry(() => import('@/pages/pericias-page')),
  periciaDetail: lazyWithRetry(() => import('@/pages/pericia-detail-page')),
  periciaCreate: lazyWithRetry(() => import('@/pages/pericia-create-page')),
  laudosPendentes: lazyWithRetry(() => import('@/pages/laudos-pendentes-page')),
  laudoV2: lazyWithRetry(() => import('@/pages/laudo-v2-page')),
  laudoInteligente: lazyWithRetry(() => import('@/pages/laudo-inteligente-page')),
  manobras: lazyWithRetry(() => import('@/pages/manobras-page')),
  baseConhecimento: lazyWithRetry(() => import('@/pages/base-conhecimento-page')),
  financeiro: lazyWithRetry(() => import('@/pages/financeiro-page')),
  cobranca: lazyWithRetry(() => import('@/pages/cobranca-page')),
  relatorios: lazyWithRetry(() => import('@/pages/relatorios-financeiros-page')),
  importacoes: lazyWithRetry(() => import('@/pages/importacoes-page')),
  despesas: lazyWithRetry(() => import('@/pages/despesas-page')),
  cidades: lazyWithRetry(() => import('@/pages/cidades-page')),
  cidadeDetail: lazyWithRetry(() => import('@/pages/cidade-detail-page')),
  advogados: lazyWithRetry(() => import('@/pages/advogados-page')),
  comunicacao: lazyWithRetry(() => import('@/pages/comunicacao-page')),
  inbox: lazyWithRetry(() => import('@/pages/inbox-email-page')),
  configuracoes: lazyWithRetry(() => import('@/pages/configuracoes-page')),
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
          { path: '/', handle: { crumb: 'Dashboard' }, element: withSuspense(pages.dashboard) },
          { path: '/nomeacoes', handle: { crumb: 'Nomeações' }, element: withSuspense(pages.nomeacoes) },
          { path: '/agenda', handle: { crumb: 'Agenda' }, element: withSuspense(pages.agenda) },
          { path: '/pericias-hoje', handle: { crumb: 'Perícias do Dia' }, element: withSuspense(pages.periciasHoje) },
          { path: '/telepericias', handle: { crumb: 'Teleperícias' }, element: withSuspense(pages.telepericias) },
          { path: '/tarefas', handle: { crumb: 'Tarefas Operacionais' }, element: withSuspense(pages.tarefas) },
          { path: '/fila-agendamento', handle: { crumb: 'Fila de Agendamento' }, element: withSuspense(pages.filaAgendamento) },
          { path: '/pericias', handle: { crumb: 'Perícias' }, element: withSuspense(pages.pericias) },
          { path: '/pericias/nova', handle: { crumb: 'Nova Perícia' }, element: withSuspense(pages.periciaCreate) },
          { path: '/pericias/:id', handle: { crumb: 'Detalhe da Perícia' }, element: withSuspense(pages.periciaDetail) },
          { path: '/laudos-pendentes', handle: { crumb: 'Laudos Pendentes' }, element: withSuspense(pages.laudosPendentes) },
          { path: '/laudo-v2', handle: { crumb: 'Laudo V2' }, element: withSuspense(pages.laudoV2) },
          { path: '/laudo-inteligente/:id', handle: { crumb: 'Laudo Inteligente' }, element: withSuspense(pages.laudoInteligente) },
          { path: '/manobras', handle: { crumb: 'Manobras' }, element: withSuspense(pages.manobras) },
          { path: '/base-conhecimento', handle: { crumb: 'Base de Conhecimento' }, element: withSuspense(pages.baseConhecimento) },
          { path: '/financeiro', handle: { crumb: 'Financeiro' }, element: withSuspense(pages.financeiro) },
          { path: '/cobranca', handle: { crumb: 'Cobrança' }, element: withSuspense(pages.cobranca) },
          { path: '/importacoes', handle: { crumb: 'Importações' }, element: withSuspense(pages.importacoes) },
          { path: '/relatorios-financeiros', handle: { crumb: 'Relatórios Financeiros' }, element: withSuspense(pages.relatorios) },
          { path: '/despesas', handle: { crumb: 'Despesas' }, element: withSuspense(pages.despesas) },
          { path: '/cidades', handle: { crumb: 'Cidades' }, element: withSuspense(pages.cidades) },
          { path: '/cidades/:id', handle: { crumb: 'Detalhe da Cidade' }, element: withSuspense(pages.cidadeDetail) },
          { path: '/advogados', handle: { crumb: 'Advogados' }, element: withSuspense(pages.advogados) },
          { path: '/comunicacao', handle: { crumb: 'Comunicação' }, element: withSuspense(pages.comunicacao) },
          { path: '/inbox-email', handle: { crumb: 'Inbox de Email' }, element: withSuspense(pages.inbox) },
          { path: '/configuracoes', handle: { crumb: 'Configurações' }, element: withSuspense(pages.configuracoes) },
          { path: '/documentacao', handle: { crumb: 'Documentação' }, element: withSuspense(pages.documentacao) },
        ],
      },
    ],
  },
  { path: '*', handle: { crumb: '404' }, element: withSuspense(pages.notFound), errorElement: <AppRouteError /> },
]);
