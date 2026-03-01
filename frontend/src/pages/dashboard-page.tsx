import { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
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
import { DomainPageTemplate } from '@/components/domain/domain-page-template';
import { Card } from '@/components/ui/card';
import { useDashboardQuery } from '@/hooks/use-pericias';
import type { AppShellOutletContext } from '@/layouts/app-shell-context';

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
  { title: 'NOVAS NOMEAÇÕES', subtitle: 'Central de Triagem: Avaliar, Majorar e Observações', badge: 'TRIAGEM INICIAL', href: '/nomeacoes', tone: 'bg-primary text-primary-foreground', kpiKey: 'novas_nomeacoes', Icon: Scale },
  { title: 'AGENDAR DATA', subtitle: 'Pendências de agendamento por cidade', badge: 'FILA DE ESPERA', href: '/fila-agendamento', tone: 'bg-warning text-warning-foreground', kpiKey: 'agendar_data', Icon: CalendarClock },
  { title: 'PRÓXIMAS PERÍCIAS', subtitle: 'Agenda futura (Presencial e Tele)', badge: 'CALENDÁRIO', href: '/pericias-hoje', tone: 'bg-info text-info-foreground', kpiKey: 'proximas_pericias', Icon: Calendar },
  { title: 'ENVIAR LAUDOS', subtitle: 'Redação e envio de laudos', badge: 'PRODUÇÃO', href: '/laudos-pendentes', tone: 'bg-success text-success-foreground', kpiKey: 'enviar_laudos', Icon: FileText },
  { title: 'ESCLARECIMENTOS', subtitle: 'Intimações para complementar laudo', badge: 'PRIORIDADE ALTA', href: '/comunicacao', tone: 'bg-warning text-warning-foreground', kpiKey: 'esclarecimentos', Icon: MessageSquareWarning },
  { title: 'A RECEBER', subtitle: 'Processos entregues aguardando pagamento (Carteira)', badge: 'FINANCEIRO', href: '/cobranca', tone: 'bg-success text-success-foreground', kpiKey: 'a_receber', Icon: DollarSign },
];

const NEW_MODULE_CARDS: ActionCard[] = [
  { title: 'TELEPERÍCIA EM TEMPO REAL', subtitle: 'WebRTC, sala virtual, chat e upload por QR Code', badge: 'NOVA CENTRAL', href: '/telepericias', tone: 'bg-primary text-primary-foreground', Icon: Video },
  { title: 'COMUNICAÇÃO INTEGRADA', subtitle: 'WhatsApp API, e-mail Uolhost e cobranças por vara', badge: 'OMNICHANNEL', href: '/comunicacao', tone: 'bg-info text-info-foreground', Icon: MessageCircle },
];

const normalizeKpiText = (value: string) =>
  value.normalize('NFD').replace(/[^\w\s-]/g, '').toLowerCase().trim().replace(/[\s-]+/g, '_');

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

  return (
    <DomainPageTemplate
      title="Dashboard"
      description="Painel de acompanhamento com notificações, KPIs e atalhos para os principais fluxos."
      isLoading={isLoading}
      isError={isError}
      contentClassName="space-y-4"
    >
      <Card className="space-y-3 bg-foreground text-background">
        <div>
          <p className="text-lg font-semibold">Central de Notificações</p>
          <p className="text-xs text-background/70">Pendências que requerem sua atenção imediata.</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ACTION_CARDS.map((card) => {
          const Icon = card.Icon;
          const value = kpiValueByCard[card.title] ?? '—';
          return (
            <Card className={`relative overflow-hidden p-4 ${card.tone}`} key={card.title}>
              <p className="text-[10px] font-semibold uppercase opacity-90">{card.badge}</p>
              <div className="mt-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-1 text-[11px] opacity-90">{card.subtitle}</p>
                </div>
                <Icon size={18} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xl font-bold">{value}</span>
                <Link className="inline-flex items-center gap-1 text-xs font-semibold" to={card.href}>
                  Abrir <ArrowUpRight size={12} />
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
