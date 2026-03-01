import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ApiError } from '@/types/api';
import { useLogin } from '@/hooks/use-auth';

const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const TENANT_ID = import.meta.env.VITE_TENANT_ID ?? DEFAULT_TENANT_ID;

const getErrorMessage = (error: unknown): string => {
  const fallback = 'Não foi possível entrar. Verifique os dados e tente novamente.';
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return fallback;
  }

  const message = (error as ApiError).message;
  if (Array.isArray(message)) {
    return message.join(' • ');
  }

  return message || fallback;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useLogin();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await mutation.mutateAsync({ tenantId: TENANT_ID, email, password });
      navigate('/');
    } catch {
      // Erro exibido na UI via mutation.error
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-lg font-bold text-white">GP</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Gestor Pericial</h1>
          <p className="mt-1 text-sm text-slate-500">Entre com suas credenciais para continuar</p>
        </div>
        <Card>
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">E-mail</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">Senha</label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {mutation.isError ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {getErrorMessage(mutation.error)}
              </p>
            ) : null}
            <Button className="w-full" disabled={mutation.isPending} type="submit">
              {mutation.isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
