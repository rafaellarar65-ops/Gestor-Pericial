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
    <div className="mx-auto mt-20 max-w-md">
      <Card>
        <h1 className="mb-4 text-xl font-semibold">Entrar</h1>
        <form className="space-y-3" onSubmit={submit}>
          <Input aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input
            aria-label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mutation.isError ? <p className="text-sm text-red-600">{getErrorMessage(mutation.error)}</p> : null}
          <Button disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
