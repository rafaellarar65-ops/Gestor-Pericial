import { Link } from 'react-router-dom';
import { ArrowUpRight, Scale, CalendarClock, Calendar, FileText, MessageSquareWarning, DollarSign, Video, MessageCircle } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { useDashboardQuery } from '@/hooks/use-pericias';

type ActionCard = {
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ACTION_CARDS: ActionCard[] = [
  {
    title: 'NOVAS NOMEAÇÕES',
    subtitle: 'Central de Triagem: Avaliar, Majorar e Observações',
    badge: 'TRIAGEM INICIAL',
    href: '/nomeacoes',
    color: 'bg-blue-600',
    Icon: Scale,
  },
  {
    title: 'AGENDAR DATA',
    subtitle: 'Pendências de agendamento por cidade',
    badge: 'FILA DE ESPERA',
    href: '/agendar',
    color: 'bg-yellow-500',
    Icon: CalendarClock,
  },
  {
    title: 'PRÓXIMAS PERÍCIAS',
    subtitle: 'Agenda futura (Presencial e Tele)',
    badge: 'CALENDÁRIO',
    href: '/pericias-hoje',
    color: 'bg-pink-600',
    Icon: Calendar,
  },
  {
    title: 'ENVIAR LAUDOS',
    subtitle: 'Redação e envio de laudos',
    badge: 'PRODUÇÃO',
    href: '/laudos-pendentes',
    color: 'bg-teal-600',
    Icon: FileText,
  },
  {
    title: 'ESCLARECIMENTOS',
    subtitle: 'Intimações para complementar laudo',
    badge: 'PRIORIDADE ALTA',
    href: '/comunicacao',
    color: 'bg-orange-500',
    Icon: MessageSquareWarning,
  },
  {
    title: 'A RECEBER',
    subtitle: 'Processos entregues aguardando pagamento (Carteira)',
    badge: 'FINANCEIRO',
    href: '/cobranca',
    color: 'bg-green-600',
    Icon: DollarSign,
  },
];


const NEW_MODULE_CARDS: ActionCard[] = [
  {
    title: 'TELEPERÍCIA EM TEMPO REAL',
    subtitle: 'WebRTC, sala virtual, chat e upload por QR Code',
    badge: 'NOVA CENTRAL',
    href: '/telepericias',
    color: 'bg-indigo-600',
    Icon: Video,
  },
  {
    title: 'COMUNICAÇÃO INTEGRADA',
    subtitle: 'WhatsApp API, e-mail Uolhost e cobranças por vara',
    badge: 'OMNICHANNEL',
    href: '/comunicacao',
    color: 'bg-cyan-700',
    Icon: MessageCircle,
  },
];

const DashboardPage = () => {
  const { data, isLoading } = useDashboardQuery();

  return (
    <div className="space-y-5">
      {/* Central de Notificações */}
      <div className="rounded-xl bg-[#1a1d2e] p-5 text-white shadow">
        <p className="mb-1 text-base font-semibold">Central de Notificações</p>
        <p className="text-xs text-white/50">Pendências que requerem sua atenção imediata.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Ausências */}
          <div className="rounded-lg bg-white/5 p-4">
            <p className="mb-3 text-sm font-medium">
              Ausências Pendentes{data?.critical?.length ? ` (${data.critical.length})` : ''}
            </p>
            {data?.critical && data.critical.length > 0 ? (
              <ul className="space-y-2">
                {data.critical.slice(0, 4).map((p) => (
                  <li className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-xs" key={p.id}>
                    <div>
                      <p className="font-mono text-white/60">{p.processoCNJ}</p>
                      <p className="font-medium">{p.autorNome}</p>
                    </div>
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] text-green-300">
                      Ausência Informada
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-white/40">Nenhuma ausência pendente.</p>
            )}
          </div>

          {/* A Cobrar */}
          <div className="flex flex-col justify-between rounded-lg bg-white/5 p-4">
            <div>
              <p className="text-sm font-medium">A Cobrar</p>
              <p className="mt-1 text-xs text-white/50">Prazo de pagamento excedido.</p>
            </div>
            <Link
              className="mt-4 flex items-center justify-between rounded-lg border border-white/20 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
              to="/cobranca"
            >
              Gerar Cobranças
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ACTION_CARDS.map((card, index) => {
              const Icon = card.Icon;
              const value = data?.kpis?.[index]?.value ?? '—';
              return (
                <div
                  className={`relative overflow-hidden rounded-xl ${card.color} p-5 text-white shadow-md`}
                  key={card.title}
                >
                  <Icon className="absolute right-3 top-3 opacity-10" size={72} />
                  <div className="relative z-10">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon size={18} />
                      <p className="text-sm font-bold tracking-wide">{card.title}</p>
                    </div>
                    <p className="mb-3 text-xs text-white/70">{card.subtitle}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-4xl font-bold">{value}</p>
                      <span className="rounded bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {card.badge}
                      </span>
                    </div>
                    <Link
                      className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white"
                      to={card.href}
                    >
                      ACESSAR CENTRAL <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Novas funcionalidades integradas</h2>
                <p className="text-xs text-slate-500">Acesso rápido aos módulos de Teleperícia e Comunicação.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {NEW_MODULE_CARDS.map((card) => {
                const Icon = card.Icon;
                return (
                  <div className={`rounded-lg ${card.color} p-4 text-white`} key={card.title}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon size={18} />
                      <p className="text-sm font-semibold">{card.title}</p>
                    </div>
                    <p className="text-xs text-white/80">{card.subtitle}</p>
                    <Link className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" to={card.href}>
                      Acessar módulo <ArrowUpRight size={12} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
