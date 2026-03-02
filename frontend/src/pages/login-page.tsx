import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useLogin } from '@/hooks/use-auth';

const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const TENANT_ID = import.meta.env.VITE_TENANT_ID ?? DEFAULT_TENANT_ID;

const loginSchema = z.object({
  email: z
    .string()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Informe um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.'),
  rememberMe: z.boolean(),
});

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Informe um e-mail válido.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const getLoginErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) {
      return 'Email ou senha incorretos';
    }

    if ((error.response?.status ?? 0) >= 500) {
      return 'Erro no servidor. Tente novamente.';
    }
  }

  return 'Não foi possível entrar. Verifique os dados e tente novamente.';
};

const LoginPage = () => {
  const navigate = useNavigate();
  const mutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSendingForgotPassword, setIsSendingForgotPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await mutation.mutateAsync({ tenantId: TENANT_ID, email: values.email, password: values.password });
      navigate('/');
    } catch {
      // Erro exibido na UI
    }
  };

  const onForgotPasswordSubmit = async (values: ForgotPasswordValues) => {
    setIsSendingForgotPassword(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: values.email });
      toast.success('Enviamos as instruções de recuperação para o seu e-mail.');
      setIsForgotPasswordOpen(false);
      forgotPasswordForm.reset();
    } catch {
      toast.error('Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setIsSendingForgotPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:grid md:grid-cols-2">
      <section className="hidden bg-blue-700 p-10 text-white md:flex md:flex-col md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <span className="text-lg font-bold">GP</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestor Pericial</h1>
            <p className="text-sm text-blue-100">Plataforma para gestão pericial eficiente.</p>
          </div>
        </div>
        <p className="max-w-sm text-blue-100">
          Centralize tarefas, acompanhe prazos e mantenha o controle de toda a operação em um único lugar.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 md:px-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center sm:hidden">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-sm font-bold text-white">GP</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Entrar</h2>
          </div>

          <div className="mb-6 hidden text-center sm:block md:hidden">
            <h2 className="text-2xl font-bold text-slate-900">Entrar no Gestor Pericial</h2>
            <p className="mt-1 text-sm text-slate-600">Acesse sua conta para continuar.</p>
          </div>

          <Card>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">E-mail</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seuemail@exemplo.com"
                  {...register('email')}
                />
                {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">Senha</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600" htmlFor="rememberMe">
                  <input id="rememberMe" type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register('rememberMe')} />
                  Lembrar de mim
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => setIsForgotPasswordOpen(true)}
                >
                  Esqueceu a senha?
                </button>
              </div>

              {mutation.isError ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {getLoginErrorMessage(mutation.error)}
                </p>
              ) : null}

              <Button className="w-full" disabled={mutation.isPending} type="submit">
                {mutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Card>
        </div>
      </section>

      <Dialog
        open={isForgotPasswordOpen}
        onClose={() => {
          setIsForgotPasswordOpen(false);
          forgotPasswordForm.reset();
        }}
        title="Recuperar senha"
      >
        <form className="space-y-4" onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="forgot-email">
              E-mail
            </label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              {...forgotPasswordForm.register('email')}
            />
            {forgotPasswordForm.formState.errors.email ? (
              <p className="mt-1 text-sm text-red-600">{forgotPasswordForm.formState.errors.email.message}</p>
            ) : null}
          </div>
          <Button className="w-full" disabled={isSendingForgotPassword} type="submit">
            {isSendingForgotPassword ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Enviando...
              </span>
            ) : (
              'Enviar recuperação'
            )}
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

export default LoginPage;
