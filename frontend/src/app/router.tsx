import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/app/protected-route';
import { LoadingState } from '@/components/ui/state';
import { AppShell } from '@/layouts/app-shell';

const pages = {
  login: lazy(() => import('@/pages/login-page')),
  dashboard: lazy(() => import('@/pages/dashboard-page')),
  nomeacoes: lazy(() => import('@/pages/nomeacoes-page')),
  agenda: lazy(() => import('@/pages/agenda-page')),
  periciasHoje: lazy(() => import('@/pages/pericias-hoje-page')),
  telepericias: lazy(() => import('@/pages/telepericias-page')),
  agendar: lazy(() => import('@/pages/agendar-lote-page')),
  pericias: lazy(() => import('@/pages/pericias-page')),
  periciaDetail: lazy(() => import('@/pages/pericia-detail-page')),
  periciaCreate: lazy(() => import('@/pages/pericia-create-page')),
  laudosPendentes: lazy(() => import('@/pages/laudos-pendentes-page')),
  laudoV2: lazy(() => import('@/pages/laudo-v2-page')),
  manobras: lazy(() => import('@/pages/manobras-page')),
  baseConhecimento: lazy(() => import('@/pages/base-conhecimento-page')),
  financeiro: lazy(() => import('@/pages/financeiro-page')),
  cobranca: lazy(() => import('@/pages/cobranca-page')),
  relatorios: lazy(() => import('@/pages/relatorios-financeiros-page')),
  despesas: lazy(() => import('@/pages/despesas-page')),
  cidades: lazy(() => import('@/pages/cidades-page')),
  cidadeDetail: lazy(() => import('@/pages/cidade-detail-page')),
  advogados: lazy(() => import('@/pages/advogados-page')),
  comunicacao: lazy(() => import('@/pages/comunicacao-page')),
  inbox: lazy(() => import('@/pages/inbox-email-page')),
  configuracoes: lazy(() => import('@/pages/configuracoes-page')),
  documentacao: lazy(() => import('@/pages/documentacao-page')),
  notFound: lazy(() => import('@/pages/not-found-page')),
} as const;

const withSuspense = (Element: LazyExoticComponent<ComponentType>) => (
  <Suspense fallback={<LoadingState />}>
    <Element />
  </Suspense>
);

export const router = createBrowserRouter([
  { path: '/login', handle: { crumb: 'Login' }, element: withSuspense(pages.login) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', handle: { crumb: 'Dashboard' }, element: withSuspense(pages.dashboard) },
          { path: '/nomeacoes', handle: { crumb: 'Nomeações' }, element: withSuspense(pages.nomeacoes) },
          { path: '/agenda', handle: { crumb: 'Agenda' }, element: withSuspense(pages.agenda) },
          { path: '/pericias-hoje', handle: { crumb: 'Perícias do Dia' }, element: withSuspense(pages.periciasHoje) },
          { path: '/telepericias', handle: { crumb: 'Teleperícias' }, element: withSuspense(pages.telepericias) },
          { path: '/agendar', handle: { crumb: 'Agendar em Lote' }, element: withSuspense(pages.agendar) },
          { path: '/pericias', handle: { crumb: 'Perícias' }, element: withSuspense(pages.pericias) },
          { path: '/pericias/nova', handle: { crumb: 'Nova Perícia' }, element: withSuspense(pages.periciaCreate) },
          { path: '/pericias/:id', handle: { crumb: 'Detalhe da Perícia' }, element: withSuspense(pages.periciaDetail) },
          { path: '/laudos-pendentes', handle: { crumb: 'Laudos Pendentes' }, element: withSuspense(pages.laudosPendentes) },
          { path: '/laudo-v2', handle: { crumb: 'Laudo V2' }, element: withSuspense(pages.laudoV2) },
          { path: '/manobras', handle: { crumb: 'Manobras' }, element: withSuspense(pages.manobras) },
          { path: '/base-conhecimento', handle: { crumb: 'Base de Conhecimento' }, element: withSuspense(pages.baseConhecimento) },
          { path: '/financeiro', handle: { crumb: 'Financeiro' }, element: withSuspense(pages.financeiro) },
          { path: '/cobranca', handle: { crumb: 'Cobrança' }, element: withSuspense(pages.cobranca) },
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
  { path: '*', handle: { crumb: '404' }, element: withSuspense(pages.notFound) },
]);
