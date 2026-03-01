import { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  Calendar,
  CalendarClock,
  DollarSign,
  FileText,
  MessageCircle,
  MessageSquareWarning,
  Scale,
  Video,
} from 'lucide-react';
import { DomainPageTemplate } from '@/components/domain/domain-page-template';
import { Card } from '@/components/ui/card';
import { useDashboardQuery } from '@/hooks/use-pericias';
import type { AppShellOutletContext } from '@/layouts/app-shell-context';
import type { Pericia } from '@/types/api';

type ActionCard = {
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  tone: string;
  actionTone?: string;
  kpiKey?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

type SummaryBlockProps = {
  title: string;
  count: number;
  href: string;
  description: string;
};

const ACTION_CARDS: ActionCard[] = [
  {
    title: 'NOVAS NOMEAÇÕES',
    subtitle: 'Central de Triagem: Avaliar, Majorar e Observações',
    badge: 'TRIAGEM INICIAL',
    href: '/nomeacoes',
    tone: 'bg-indigo-500 text-white',
    actionTone: 'bg-indigo-600/90 hover:bg-indigo-700/90',
    kpiKey: 'novas_nomeacoes',
    Icon: Scale,
  },
  {
    title: 'AGENDAR DATA',
    subtitle: 'Pendências de agendamento por cidade',
    badge: 'FILA DE ESPERA',
    href: '/fila-agendamento',
    tone: 'bg-yellow-400 text-yellow-900',
    actionTone: 'bg-yellow-500/90 hover:bg-yellow-600/90 text-yellow-950',
    kpiKey: 'agendar_data',
    Icon: CalendarClock,
  },
  {
    title: 'PRÓXIMAS PERÍCIAS',
    subtitle: 'Agenda futura (Presencial e Tele)',
    badge: 'CALENDÁRIO',
    href: '/pericias-hoje',
    tone: 'bg-rose-500 text-white',
    actionTone: 'bg-rose-600/90 hover:bg-rose-700/90',
    kpiKey: 'proximas_pericias',
    Icon: Calendar,
  },
  {
    title: 'ENVIAR LAUDOS',
    subtitle: 'Redação e envio de laudos',
    badge: 'PRODUÇÃO',
    href: '/laudos-pendentes',
    tone: 'bg-teal-600 text-white',
    actionTone: 'bg-teal-700/90 hover:bg-teal-800/90',
    kpiKey: 'enviar_laudos',
    Icon: FileText,
  },
  {
    title: 'ESCLARECIMENTOS',
    subtitle: 'Intimações para complementar laudo',
    badge: 'PRIORIDADE ALTA',
    href: '/comunicacao',
    tone: 'bg-orange-500 text-white',
    actionTone: 'bg-orange-600/90 hover:bg-orange-700/90',
    kpiKey: 'esclarecimentos',
    Icon: MessageSquareWarning,
  },
  {
    title: 'A RECEBER',
    subtitle: 'Processos entregues aguardando pagamento (Carteira)',
    badge: 'FINANCEIRO',
    href: '/cobranca',
    tone: 'bg-green-600 text-white',
    actionTone: 'bg-green-700/90 hover:bg-green-800/90',
    kpiKey: 'a_receber',
    Icon: DollarSign,
  },
];

const NEW_MODULE_CARDS: ActionCard[] = [
  { title: 'TELEPERÍCIA EM TEMPO REAL', subtitle: 'WebRTC, sala virtual, chat e upload por QR Code', badge: 'NOVA CENTRAL', href: '/telepericias', tone: 'bg-primary text-primary-foreground', Icon: Video },
  { title: 'COMUNICAÇÃO INTEGRADA', subtitle: 'WhatsApp API, e-mail Uolhost e cobranças por vara', badge: 'OMNICHANNEL', href: '/comunicacao', tone: 'bg-info text-info-foreground', Icon: MessageCircle },
];

const normalizeKpiText = (value: string) =>
  value.normalize('NFD').replace(/[^\w\s-]/g, '').toLowerCase().trim().replace(/[\s-]+/g, '_');

const parseNumberValue = (value?: string) => {
  if (!value) return null;
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);

const getPericiaStatusName = (pericia: Pericia) => {
  const rawStatus = pericia.status;

  if (typeof rawStatus === 'string') {
    return rawStatus;
  }

  return '';
};

const isFinalStatus = (statusName: string) => {
  const normalized = normalizeKpiText(statusName);
  return normalized.includes('finaliz') || normalized.includes('cancel');
};

const isOlderThanDays = (dateValue: string | undefined, days: number) => {
  if (!dateValue) return false;
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const diffDays = (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > days;
};

const SummaryBlock = ({ title, count, href, description }: SummaryBlockProps) => (
  <div className="rounded-lg border border-white/15 bg-white/5 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{title}</p>
    <div className="mt-2 flex items-end justify-between gap-4">
      <div>
        <p className="text-3xl font-extrabold leading-none">{count}</p>
        <p className="mt-1 text-xs text-white/70">{description}</p>
      </div>
      <Link className="inline-flex items-center gap-1 rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/30" to={href}>
        Tratar <ArrowUpRight size={12} />
      </Link>
    </div>
  </div>
);

const DashboardPage = () => {
  const { setHeaderConfig, clearHeaderConfig } = useOutletContext<AppShellOutletContext>();
  const { data, isLoading, isError } = useDashboardQuery();

  useEffect(() => {
    setHeaderConfig({
      primaryActions: (
        <Link className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" to="/pericias">
          Ir para Perícias <ArrowUpRight size={14} />
        </Link>
      ),
      contextualAside: (
        <Card className="space-y-2">
          <p className="text-sm font-semibold">Resumo operacional</p>
          <p className="text-xs text-muted-foreground">Confira pendências críticas e avance para os fluxos principais.</p>
        </Card>
      ),
    });

    return clearHeaderConfig;
  }, [setHeaderConfig, clearHeaderConfig]);

  const kpiValueByCard = ACTION_CARDS.reduce<Record<string, string>>((acc, card) => {
    const normalizedCardTitle = normalizeKpiText(card.title);
    const kpi = data?.kpis?.find((item) => {
      const normalizedLabel = normalizeKpiText(item.label);
      return (card.kpiKey && item.key === card.kpiKey) || normalizedLabel === normalizedCardTitle;
    });

    acc[card.title] = kpi?.value ?? '—';
    return acc;
  }, {});

  const getKpiByMatcher = (matchers: string[]) =>
    data?.kpis?.find((item) => {
      const normalizedKey = normalizeKpiText(item.key);
      const normalizedLabel = normalizeKpiText(item.label);
      return matchers.some((matcher) => normalizedKey.includes(matcher) || normalizedLabel.includes(matcher));
    });

  const totalAtivos = data?.kpis?.reduce((total, item) => {
    const normalized = `${normalizeKpiText(item.key)} ${normalizeKpiText(item.label)}`;
    if (normalized.includes('ativo') || normalized.includes('andamento')) {
      const parsed = parseNumberValue(item.value);
      return total + (parsed ?? 0);
    }
    return total;
  }, 0);

  const ausenciasNaoTratadas =
    data?.critical?.filter((pericia) => {
      const statusName = getPericiaStatusName(pericia);
      const normalizedStatus = normalizeKpiText(statusName);
      const hasAusencia = normalizedStatus.includes('ausent') || normalizedStatus.includes('ausencia');
      return hasAusencia && !isFinalStatus(statusName);
    }).length ?? 0;

  const cobrancasPendentes =
    data?.critical?.filter((pericia) => {
      const pagamentoStatus = normalizeKpiText(pericia.pagamentoStatus ?? '');
      const aguardandoPagamento =
        pagamentoStatus.includes('pendente') || pagamentoStatus.includes('aguardando') || pagamentoStatus.includes('a_receber');
      const statusName = normalizeKpiText(getPericiaStatusName(pericia));
      const laudoEnviado = statusName.includes('laudo_enviado') || statusName.includes('aguardando_pag');
      const sentAt = (pericia as Pericia & { dataEnvioLaudo?: string }).dataEnvioLaudo;

      return aguardandoPagamento && laudoEnviado && isOlderThanDays(sentAt, 60);
    }).length ?? 0;

  const aReceberMonetarioKpi = getKpiByMatcher(['a_receber_valor', 'valor_a_receber', 'a_receber_r$', 'receber_valor']);
  const aReceberMonetario = parseNumberValue(aReceberMonetarioKpi?.value ?? aReceberMonetarioKpi?.trend);
  const totalAtivosLabel = totalAtivos && totalAtivos > 0 ? totalAtivos.toString() : '—';
  const hasNotifications = ausenciasNaoTratadas > 0 || cobrancasPendentes > 0;

  return (
    <DomainPageTemplate
      title="Dashboard"
      description="Painel de acompanhamento com notificações, KPIs e atalhos para os principais fluxos."
      isLoading={isLoading}
      isError={isError}
      contentClassName="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
          <p className="text-sm text-slate-500">Selecione uma central operacional para iniciar os trabalhos.</p>
        </div>
        <div className="hidden text-right md:block">
          <p className="text-xs font-bold uppercase text-slate-400">Processos Ativos</p>
          <p className="text-2xl font-bold text-slate-800">{totalAtivosLabel}</p>
        </div>
      </div>

      <Card className="space-y-4 rounded-xl bg-slate-900 p-5 text-white">
        <div className="flex items-center gap-2">
          <Bell size={18} />
          <p className="text-lg font-semibold">Central de Notificações</p>
        </div>
        {hasNotifications ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SummaryBlock
              title="Ausências não tratadas"
              count={ausenciasNaoTratadas}
              href="/pericias?status=AUSENTE"
              description="Perícias com ausência registrada aguardando tratamento."
            />
            <SummaryBlock
              title="Cobranças pendentes"
              count={cobrancasPendentes}
              href="/cobranca"
              description="Casos com pagamento pendente há mais de 60 dias."
            />
          </div>
        ) : (
          <p className="text-sm font-medium text-white/80">Tudo em dia ✓</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ACTION_CARDS.map((card) => {
          const Icon = card.Icon;
          const value = kpiValueByCard[card.title] ?? '—';
          const bottomBadge = card.kpiKey === 'a_receber' && aReceberMonetario ? formatCurrency(aReceberMonetario) : card.badge;

          return (
            <Card className={`relative flex min-h-56 flex-col overflow-hidden p-5 transition-transform hover:-translate-y-1 ${card.tone}`} key={card.title}>
              <Icon className="pointer-events-none absolute -right-3 -top-3 opacity-10" size={120} />

              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-3 w-fit rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                  <Icon size={28} />
                </div>

                <p className="text-xl font-bold uppercase tracking-wide">{card.title}</p>
                <p className="mt-1 text-sm font-medium opacity-90">{card.subtitle}</p>

                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <span className="text-5xl font-extrabold tracking-tighter leading-none">{value}</span>
                  <span className="rounded bg-white/20 px-2 py-1 text-xs font-bold uppercase backdrop-blur-sm">{bottomBadge}</span>
                </div>

                <Link className={`mt-4 inline-flex w-fit items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${card.actionTone}`} to={card.href}>
                  Acessar Central <ArrowUpRight size={14} />
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
    </DomainPageTemplate>
  );
};

export default DashboardPage;
