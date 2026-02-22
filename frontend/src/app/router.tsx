import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/app/protected-route';
import { AppShell } from '@/layouts/app-shell';
import { LoadingState } from '@/components/ui/state';

const LoginPage = lazy(() => import('@/pages/login-page').then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/dashboard-page').then((module) => ({ default: module.DashboardPage })));
const PericiasPage = lazy(() => import('@/pages/pericias-page').then((module) => ({ default: module.PericiasPage })));
const PericiaDetailPage = lazy(() =>
  import('@/pages/pericia-detail-page').then((module) => ({ default: module.PericiaDetailPage })),
);
const FinanceiroPage = lazy(() => import('@/pages/financeiro-page').then((module) => ({ default: module.FinanceiroPage })));
const AgendarLotePage = lazy(() => import('@/pages/agendar-lote-page').then((module) => ({ default: module.AgendarLotePage })));
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((module) => ({ default: module.NotFoundPage })));

const fallback = (
  <Suspense fallback={<LoadingState />}>
    <LoadingState />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={fallback}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: (
              <Suspense fallback={fallback}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: '/pericias',
            element: (
              <Suspense fallback={fallback}>
                <PericiasPage />
              </Suspense>
            ),
          },
          {
            path: '/pericias/:id',
            element: (
              <Suspense fallback={fallback}>
                <PericiaDetailPage />
              </Suspense>
            ),
          },
          {
            path: '/financeiro',
            element: (
              <Suspense fallback={fallback}>
                <FinanceiroPage />
              </Suspense>
            ),
          },
          {
            path: '/agendar',
            element: (
              <Suspense fallback={fallback}>
                <AgendarLotePage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={fallback}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
