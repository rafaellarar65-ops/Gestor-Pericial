import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRouteError } from 'react-router-dom';

const extractMessage = (error: unknown) => {
  if (!error) return 'Erro inesperado ao carregar a aplicação.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Erro inesperado ao carregar a aplicação.';
};

const ErrorContent = ({ message }: { message: string }) => (
  <div className="mx-auto mt-20 max-w-xl rounded-xl border bg-white p-6 text-center shadow-sm">
    <AlertTriangle className="mx-auto mb-3 text-amber-500" size={28} />
    <h1 className="text-xl font-semibold text-slate-800">Ops! não foi possível renderizar esta tela.</h1>
    <p className="mt-2 text-sm text-slate-600">{message}</p>
    <button
      className="mx-auto mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
      onClick={() => window.location.reload()}
      type="button"
    >
      <RefreshCw size={14} /> Recarregar página
    </button>
  </div>
);

export const AppRouteError = () => {
  const error = useRouteError();
  return <ErrorContent message={extractMessage(error)} />;
};

export const AppRenderError = ({ error }: { error: unknown }) => (
  <ErrorContent message={extractMessage(error)} />
);
