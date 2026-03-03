import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  MapPin,
  Clock,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, addDays, format, isValid } from 'date-fns';
import { DomainPageTemplate } from '@/components/domain/domain-page-template';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { usePericiasQuery } from '@/hooks/use-pericias';
import { apiClient } from '@/lib/api-client';
import type { Pericia } from '@/types/api';

type EsclarecimentoSource = Pericia & {
  status?: string | { nome?: string; codigo?: string };
  cidade?: string | { nome?: string };
  honorariosPrevistosPartes?: number | string;
  esclarecimentos?: { dataIntimacao?: string; prazoDias?: number };
};
import { toast } from 'sonner';

type SortKey = 'PRAZO_RESTANTE' | 'DATA_INTIMACAO' | 'CIDADE' | 'VALOR';
type SortDir = 'ASC' | 'DESC';

type EsclarecimentoItem = EsclarecimentoSource & {
  intimacaoDate: Date | null;
  prazoDias: number;
  deadline: Date | null;
  diasRestantes: number | null;
};

const normalizeText = (value: string | undefined | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const cityLabel = (cidade: unknown) => {
  if (typeof cidade === 'string') return cidade;
  if (cidade && typeof cidade === 'object') {
    const value = cidade as { nome?: string };
    return value.nome ?? 'Não informado';
  }
  return 'Não informado';
};

const statusLabel = (status: unknown) => {
  if (typeof status === 'string') return status;
  if (status && typeof status === 'object') {
    const value = status as { nome?: string; codigo?: string };
    return value.nome ?? value.codigo ?? '';
  }
  return '';
};

const valorTotal = (item: EsclarecimentoSource) => Number(item.honorariosPrevistosJG ?? 0) + Number(item.honorariosPrevistosPartes ?? 0);

const getBadgeClasses = (diasRestantes: number | null) => {
  if (diasRestantes === null) return 'bg-muted text-muted-foreground';
  if (diasRestantes < 0) return 'bg-red-600 text-white font-bold';
  if (diasRestantes <= 5) return 'bg-red-100 text-red-800';
  if (diasRestantes <= 15) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

const formatDateLabel = (value: Date | null) => (value ? format(value, 'dd/MM/yyyy') : 'Não configurado');

export const EsclarecimentosPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>('PRAZO_RESTANTE');
  const [sortDir, setSortDir] = useState<SortDir>('ASC');

  const periciasQuery = usePericiasQuery(1, { limit: 200 });

  const markRespondedMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/pericias/${id}`, { statusId: 'ENVIAR_LAUDO' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pericias'] });
      toast.success('Perícia marcada como respondida.');
    },
    onError: () => {
      toast.error('Não foi possível atualizar o status da perícia.');
    },
  });

  const items = useMemo<EsclarecimentoItem[]>(() => {
    const baseItems = (periciasQuery.data?.items ?? []) as EsclarecimentoSource[];
    const today = new Date();

    const filtered = baseItems.filter((item) => normalizeText(statusLabel(item.status)).includes('esclarec'));

    const enriched = filtered.map((item) => {
      const intimacaoDate = parseDate(item.esclarecimentos?.dataIntimacao);
      const prazoDias = Number(item.esclarecimentos?.prazoDias ?? 0);
      const deadline = intimacaoDate ? addDays(intimacaoDate, prazoDias) : null;
      const diasRestantes = deadline ? differenceInDays(deadline, today) : null;
      return {
        ...item,
        intimacaoDate,
        prazoDias,
        deadline,
        diasRestantes,
      };
    });

    return [...enriched].sort((a, b) => {
      const direction = sortDir === 'ASC' ? 1 : -1;
      if (sortKey === 'PRAZO_RESTANTE') {
        const aValue = a.diasRestantes ?? Number.POSITIVE_INFINITY;
        const bValue = b.diasRestantes ?? Number.POSITIVE_INFINITY;
        return (aValue - bValue) * direction;
      }
      if (sortKey === 'DATA_INTIMACAO') {
        const aValue = a.intimacaoDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const bValue = b.intimacaoDate?.getTime() ?? Number.POSITIVE_INFINITY;
        return (aValue - bValue) * direction;
      }
      if (sortKey === 'CIDADE') {
        return cityLabel(a.cidade).localeCompare(cityLabel(b.cidade), 'pt-BR') * direction;
      }
      return (valorTotal(a) - valorTotal(b)) * direction;
    });
  }, [periciasQuery.data?.items, sortDir, sortKey]);

  const sortButton = (key: SortKey, label: string) => {
    const isActive = sortKey === key;
    return (
      <Button
        key={key}
        variant={isActive ? 'default' : 'outline'}
        size="sm"
        onClick={() => {
          if (isActive) {
            setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
            return;
          }
          setSortKey(key);
          setSortDir('ASC');
        }}
      >
        <ArrowUpDown className="mr-1" size={14} />
        {label}
        {isActive ? (sortDir === 'ASC' ? <ChevronUp className="ml-1" size={14} /> : <ChevronDown className="ml-1" size={14} />) : null}
      </Button>
    );
  };

  return (
    <DomainPageTemplate
      title="Esclarecimentos"
      description="Intimações para complementar laudo — priorize por prazo restante"
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-2 rounded-md bg-orange-100 px-2 py-1 text-orange-700">
            <AlertTriangle size={16} />
            <span className="text-xs font-medium">Atenção a prazos</span>
          </div>
          {sortButton('PRAZO_RESTANTE', 'Prazo restante')}
          {sortButton('DATA_INTIMACAO', 'Data intimação')}
          {sortButton('CIDADE', 'Cidade')}
          {sortButton('VALOR', 'Valor')}
        </div>
      }
    >
      {periciasQuery.isLoading ? <LoadingState /> : null}
      {periciasQuery.isError ? <ErrorState message="Erro ao carregar esclarecimentos" /> : null}
      {!periciasQuery.isLoading && !periciasQuery.isError && items.length === 0 ? (
        <EmptyState title="Nenhuma perícia em esclarecimentos encontrada" />
      ) : null}

      {!periciasQuery.isLoading && !periciasQuery.isError && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Card className="space-y-3" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link className="font-semibold text-primary hover:underline" to={`/pericias/${item.id}`}>
                    CNJ: {item.processoCNJ}
                  </Link>
                  <p className="text-sm text-muted-foreground">Autor: {item.autorNome ?? 'Não informado'} • Réu: {item.reuNome ?? 'Não informado'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${getBadgeClasses(item.diasRestantes)}`}>
                  {item.diasRestantes === null ? 'Prazo não definido' : item.diasRestantes < 0 ? `Expirado há ${Math.abs(item.diasRestantes)} dia(s)` : `${item.diasRestantes} dia(s) restantes`}
                </span>
              </div>

              <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={14} />
                  <span>{cityLabel(item.cidade)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={14} />
                  <span>Intimação: {formatDateLabel(item.intimacaoDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock size={14} />
                  <span>Prazo: {item.prazoDias} dia(s)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={14} />
                  <span>Deadline: {formatDateLabel(item.deadline)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/pericias/${item.id}`)}>
                  <ExternalLink className="mr-1" size={14} />
                  Ver Detalhes
                </Button>
                <Button
                  size="sm"
                  onClick={() => markRespondedMutation.mutate(item.id)}
                  disabled={markRespondedMutation.isPending}
                >
                  <CheckCircle className="mr-1" size={14} />
                  Marcar como Respondido
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </DomainPageTemplate>
  );
};

export default EsclarecimentosPage;
