import { useState } from 'react';
import { Brain, CheckSquare, Eye, EyeOff, Loader2, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useLogin } from '@/hooks/use-auth';
import { toast } from 'sonner';

const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const TENANT_ID = import.meta.env.VITE_TENANT_ID ?? DEFAULT_TENANT_ID;

const schema = z.object({
  email: z.string().email('Informe um email válido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const result = schema.safeParse(form);
    if (result.success) {
      setErrors({});
      return true;
    }

    const nextErrors: { email?: string; password?: string } = {};
    result.error.issues.forEach((issue) => {
      if (issue.path[0] === 'email') nextErrors.email = issue.message;
      if (issue.path[0] === 'password') nextErrors.password = issue.message;
    });
    setErrors(nextErrors);
    return false;
  };

  const serverMessage = () => {
    if (!loginMutation.isError) return null;
    const error = loginMutation.error as { statusCode?: number; message?: string };
    if (error.statusCode === 401) return 'Email ou senha incorretos';
    if ((error.statusCode ?? 0) >= 500) return 'Erro no servidor. Tente novamente.';
    return error.message ?? 'Erro ao autenticar.';
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      await loginMutation.mutateAsync({ tenantId: TENANT_ID, email: form.email, password: form.password });

      if (!rememberMe) {
        sessionStorage.setItem('auth-token', localStorage.getItem('auth-token') ?? '');
      }

      navigate('/');
    } catch {
      // erro exibido pelo banner
    }
  };

  const submitForgot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = z.string().email().safeParse(forgotEmail);
    if (!result.success) {
      toast.error('Informe um email válido.');
      return;
    }

    setForgotLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Link enviado para seu email');
      setForgotOpen(false);
      setForgotEmail('');
    } catch {
      toast.error('Não foi possível enviar o link no momento.');
    } finally {
      setForgotLoading(false);
    }
  };

  const bulletClass = 'flex items-center gap-2 text-sm text-white/90';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col md:justify-center lg:grid lg:grid-cols-2">
        <section className="hidden bg-gradient-to-br from-primary to-primary/70 p-8 text-white lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 text-2xl font-bold">PM</div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Perícias Manager Pro</h1>
              <p className="mt-2 text-sm text-white/80">Sistema de Gerenciamento de Perícias Médicas Judiciais</p>
            </div>
            <ul className="space-y-3">
              <li className={bulletClass}><CheckSquare size={16} aria-label="Gestão completa" /> Gestão completa de processos</li>
              <li className={bulletClass}><TrendingUp size={16} aria-label="Financeiro integrado" /> Financeiro integrado</li>
              <li className={bulletClass}><Brain size={16} aria-label="Laudos com IA" /> Laudos com IA</li>
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md p-6">
            <div className="mb-6 text-center lg:text-left">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary lg:mx-0">PM</div>
              <h2 className="text-xl font-semibold">Entrar na sua conta</h2>
              <p className="text-sm text-muted-foreground">Acesse o sistema</p>
            </div>

            <form className="space-y-4" onSubmit={(event) => void submit(event)}>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="email">Email</label>
                <Input autoFocus id="email" onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="seu@email.com" required type="email" value={form.email} />
                {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="password">Senha</label>
                <div className="relative">
                  <Input id="password" onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required type={showPassword ? 'text' : 'password'} value={form.password} />
                  <button aria-label="Mostrar ou esconder senha" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setShowPassword((value) => !value)} type="button">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password ? <p className="mt-1 text-xs text-destructive">{errors.password}</p> : null}
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2"><input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" />Lembrar de mim</label>
                <button className="text-primary hover:underline" onClick={() => setForgotOpen(true)} type="button">Esqueceu a senha?</button>
              </div>

              {serverMessage() ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">{serverMessage()}</div> : null}

              <Button className="w-full gap-2" disabled={loginMutation.isPending} type="submit">
                {loginMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
                {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="text-center text-xs text-muted-foreground"><Link to="/documentacao">Precisa de ajuda?</Link></div>
            </form>
          </Card>
        </section>
      </div>

      <Dialog onClose={() => setForgotOpen(false)} open={forgotOpen} title="Recuperar senha">
        <form className="space-y-3" onSubmit={(event) => void submitForgot(event)}>
          <label className="block text-sm font-medium" htmlFor="forgot-email">Email</label>
          <Input id="forgot-email" onChange={(event) => setForgotEmail(event.target.value)} placeholder="seu@email.com" type="email" value={forgotEmail} />
          <Button className="w-full" disabled={forgotLoading} type="submit">{forgotLoading ? 'Enviando...' : 'Enviar link'}</Button>
        </form>
      </Dialog>
    </div>
  );
};

export default LoginPage;
