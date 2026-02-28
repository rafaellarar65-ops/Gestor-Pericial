import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Calendar,
  CalendarClock,
  DollarSign,
  FileText,
  MessageCircle,
  MessageSquareWarning,
  Scale,
  Video,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/state';
import { useDashboardQuery } from '@/hooks/use-pericias';

type ActionCard = {
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  tone: string;
  kpiKey?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ACTION_CARDS: ActionCard[] = [
  {
    title: 'NOVAS NOMEAÇÕES',
    subtitle: 'Central de Triagem: Avaliar, Majorar e Observações',
    badge: 'TRIAGEM INICIAL',
    href: '/nomeacoes',
    tone: 'bg-blue-600 text-white',
    kpiKey: 'novas_nomeacoes',
    Icon: Scale,
  },
  {
    title: 'AGENDAR DATA',
    subtitle: 'Pendências de agendamento por cidade',
    badge: 'FILA DE ESPERA',
    href: '/fila-agendamento',
    tone: 'bg-yellow-500 text-white',
    kpiKey: 'agendar_data',
    Icon: CalendarClock,
  },
  {
    title: 'PRÓXIMAS PERÍCIAS',
    subtitle: 'Agenda futura (Presencial e Tele)',
    badge: 'CALENDÁRIO',
    href: '/pericias-hoje',
    tone: 'bg-pink-600 text-white',
    kpiKey: 'proximas_pericias',
    Icon: Calendar,
  },
  {
    title: 'ENVIAR LAUDOS',
    subtitle: 'Redação e envio de laudos',
    badge: 'PRODUÇÃO',
    href: '/laudos-pendentes',
    tone: 'bg-teal-600 text-white',
    kpiKey: 'enviar_laudos',
    Icon: FileText,
  },
  {
    title: 'ESCLARECIMENTOS',
    subtitle: 'Intimações para complementar laudo',
    badge: 'PRIORIDADE ALTA',
    href: '/comunicacao',
    tone: 'bg-orange-500 text-white',
    kpiKey: 'esclarecimentos',
    Icon: MessageSquareWarning,
  },
  {
    title: 'A RECEBER',
    subtitle: 'Processos entregues aguardando pagamento (Carteira)',
    badge: 'FINANCEIRO',
    href: '/cobranca',
    tone: 'bg-green-600 text-white',
    kpiKey: 'a_receber',
    Icon: DollarSign,
  },
];

const NEW_MODULE_CARDS: ActionCard[] = [
  {
    title: 'TELEPERÍCIA EM TEMPO REAL',
    subtitle: 'WebRTC, sala virtual, chat e upload por QR Code',
    badge: 'NOVA CENTRAL',
    href: '/telepericias',
    tone: 'bg-primary text-primary-foreground',
    Icon: Video,
  },
  {
    title: 'COMUNICAÇÃO INTEGRADA',
    subtitle: 'WhatsApp API, e-mail Uolhost e cobranças por vara',
    badge: 'OMNICHANNEL',
    href: '/comunicacao',
    tone: 'bg-info text-info-foreground',
    Icon: MessageCircle,
  },
];

const normalizeKpiText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

const DashboardPage = () => {
  const { data, isLoading } = useDashboardQuery();

  const kpiValueByCard = ACTION_CARDS.reduce<Record<string, string>>((acc, card) => {
    const normalizedCardTitle = normalizeKpiText(card.title);
    const kpi = data?.kpis?.find((item) => {
      const normalizedLabel = normalizeKpiText(item.label);
      return (card.kpiKey && item.key === card.kpiKey) || normalizedLabel === normalizedCardTitle;
    });

    acc[card.title] = kpi?.value ?? '—';
    return acc;
  }, {});

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      <Card className="space-y-3 bg-foreground text-background">
        <div>
          <p className="text-lg font-semibold">Central de Notificações</p>
          <p className="text-xs text-background/70">Pendências que requerem sua atenção imediata.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="space-y-2 border-background/15 bg-background/10 p-3 text-background">
            <p className="text-sm font-medium">Ausências Pendentes{data?.critical?.length ? ` (${data.critical.length})` : ''}</p>
            {data?.critical && data.critical.length > 0 ? (
              <ul className="space-y-2">
                {data.critical.slice(0, 4).map((p) => (
                  <li className="flex items-center justify-between rounded-md bg-background/10 px-3 py-2 text-xs" key={p.id}>
                    <div>
                      <p className="font-mono text-background/70">{p.processoCNJ}</p>
                      <p className="font-medium">{p.autorNome}</p>
                    </div>
                    <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] text-success-foreground">Ausência Informada</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-background/70">Nenhuma ausência pendente.</p>
            )}
          </Card>

          <Card className="flex flex-col justify-between border-background/15 bg-background/10 p-3 text-background">
            <div>
              <p className="text-sm font-medium">A Cobrar</p>
              <p className="text-xs text-background/70">Prazo de pagamento excedido.</p>
            </div>
            <Link
              className="mt-3 inline-flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              to="/cobranca"
              data-testid="dashboard-cobranca-link"
            >
              Gerar Cobranças
              <ArrowUpRight size={16} />
            </Link>
          </Card>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ACTION_CARDS.map((card) => {
              const Icon = card.Icon;
              const value = kpiValueByCard[card.title] ?? '—';
              return (
                <Card className={`relative overflow-hidden p-4 ${card.tone}`} key={card.title} data-testid={`dashboard-card-${card.kpiKey}`}>
                  <Icon className="absolute right-2 top-2 opacity-20" size={56} />
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon size={18} />
                      <p className="text-sm font-semibold tracking-wide">{card.title}</p>
                    </div>
                    <p className="text-xs opacity-90">{card.subtitle}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold" data-testid={`dashboard-kpi-${card.kpiKey}`}>
                        {value}
                      </p>
                      <span className="rounded bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase">{card.badge}</span>
                    </div>
                    <Link className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide opacity-90 hover:opacity-100" to={card.href}>
                      Acessar central <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Novas funcionalidades integradas</h2>
              <p className="text-sm text-muted-foreground">Acesso rápido aos módulos de Teleperícia e Comunicação.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {NEW_MODULE_CARDS.map((card) => {
                const Icon = card.Icon;
                return (
                  <Card className={`space-y-2 p-4 ${card.tone}`} key={card.title}>
                    <div className="flex items-center gap-2">
                      <Icon size={18} />
                      <p className="text-sm font-semibold">{card.title}</p>
                    </div>
                    <p className="text-xs opacity-90">{card.subtitle}</p>
                    <Link className="inline-flex items-center gap-1 text-xs font-semibold" to={card.href}>
                      Acessar módulo <ArrowUpRight size={12} />
                    </Link>
                  </Card>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
