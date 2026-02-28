import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type PericiaItem = Record<string, unknown>;

type StatusGroup = {
  label: string;
  tone: string;
  statuses: string[];
};

const STATUS_GROUPS: StatusGroup[] = [
  { label: 'A AVALIAR (NOVAS)', tone: 'bg-primary text-primary-foreground', statuses: ['AVALIAR'] },
  {
    label: 'AGUARDANDO ACEITE HONORÁRIOS',
    tone: 'bg-warning text-warning-foreground',
    statuses: ['AGUARDANDO_ACEITE', 'ACEITE_HONORARIOS'],
  },
  {
    label: 'A MAJORAR HONORÁRIOS',
    tone: 'bg-warning text-warning-foreground',
    statuses: ['A_MAJORAR', 'MAJORAR_HONORARIOS'],
  },
  {
    label: 'COM OBSERVAÇÃO EXTRA',
    tone: 'bg-info text-info-foreground',
    statuses: ['OBSERVACAO_EXTRA', 'COM_OBSERVACAO'],
  },
];

function getStatusCode(item: PericiaItem): string {
  const rawStatus = item.status;

  if (typeof rawStatus === 'string' || typeof rawStatus === 'number') return String(rawStatus).toUpperCase();

  if (rawStatus && typeof rawStatus === 'object') {
    const statusObject = rawStatus as Record<string, unknown>;
    const statusCode = statusObject.codigo;
    const statusName = statusObject.nome;
    if (typeof statusCode === 'string' || typeof statusCode === 'number') return String(statusCode).toUpperCase();
    if (typeof statusName === 'string' || typeof statusName === 'number') return String(statusName).toUpperCase();
  }

  return '';
}

const matchGroup = (item: PericiaItem, group: StatusGroup) => group.statuses.some((status) => getStatusCode(item).includes(status));

const NomeacoesPage = () => {
  const { data = [], isLoading } = useDomainData('nomeacoes', '/nomeacoes');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A AVALIAR (NOVAS)']));

  const groupedData = useMemo(
    () => STATUS_GROUPS.map((group) => ({ ...group, items: data.filter((item) => matchGroup(item, group)) })),
    [data],
  );

  const toggle = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3 bg-primary p-4 text-primary-foreground">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
          <Scale size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Central de Nomeações</h1>
          <p className="text-sm text-primary-foreground/85">Triagem inicial, aceites, majorações e pendências com observações.</p>
        </div>
      </Card>

      <section className="space-y-3">
        {groupedData.map((group) => {
          const isOpen = openGroups.has(group.label);
          return (
            <Card className="overflow-hidden p-0" key={group.label}>
              <button className={`flex w-full items-center justify-between px-4 py-3 ${group.tone}`} onClick={() => toggle(group.label)}>
                <div className="flex items-center gap-2">
                  <Scale size={16} />
                  <p className="text-sm font-semibold tracking-wide">{group.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-black/15 px-1 text-xs font-bold">{group.items.length}</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {isOpen && (
                <div className="p-3">
                  {group.items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">Nenhum processo nesta categoria.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {group.items.map((item, index) => (
                        <Card className="space-y-2 bg-muted/30 p-3" key={`${group.label}-${index}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-mono text-xs text-muted-foreground">{String(item.processoCNJ ?? item.id ?? `#${index + 1}`)}</p>
                            {item.id && (
                              <Link className="text-muted-foreground hover:text-primary" to={`/pericias/${item.id}`}>
                                <ExternalLink size={14} />
                              </Link>
                            )}
                          </div>
                          <p className="text-sm font-semibold">{String(item.autorNome ?? item.nome ?? '—')}</p>
                          {item.reuNome && <p className="text-xs text-muted-foreground">vs {String(item.reuNome)}</p>}
                          {item.cidade && (
                            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin size={12} /> {String(item.cidade)}
                            </p>
                          )}
                          <p className="text-xs font-medium text-primary">Status: {getStatusCode(item) || '—'}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </section>
    </div>
  );
};

export default NomeacoesPage;
