import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/state';
import { periciaService } from '@/services/pericia-service';
import { configService } from '@/services/config-service';
import type { ConfigItem } from '@/types/api';
import { toast } from 'sonner';

type EmailPendingItem = {
  id: string;
  processoCNJ: string;
  autorNome: string;
  valorPendente: number;
  dataEnvio?: string;
  daysPending: number;
  varaId?: string;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const EmailGeradorPage = () => {
  const [selectedCidadeId, setSelectedCidadeId] = useState('');
  const [selectedVaraId, setSelectedVaraId] = useState('');
  const [minDays, setMinDays] = useState(30);
  const [shouldGenerate, setShouldGenerate] = useState(false);

  const { data: cidades = [] } = useQuery<ConfigItem[]>({
    queryKey: ['config', 'cidades'],
    queryFn: () => configService.list('cidades'),
  });

  const { data: allVaras = [] } = useQuery<ConfigItem[]>({
    queryKey: ['config', 'varas'],
    queryFn: () => configService.list('varas'),
  });

  const varas = useMemo(() => {
    if (!selectedCidadeId) return [];
    return allVaras.filter((item) => !item.cidadeId || item.cidadeId === selectedCidadeId);
  }, [allVaras, selectedCidadeId]);

  const pendingQuery = useQuery({
    queryKey: ['email-gerador', 'pendentes', selectedCidadeId, selectedVaraId, minDays],
    queryFn: async (): Promise<EmailPendingItem[]> => {
      const response = await periciaService.list(1, {
        limit: 300,
        cidadeId: selectedCidadeId || undefined,
      });

      const now = Date.now();
      return response.items
        .map((item) => {
          const raw = item as Record<string, unknown>;
          const dataBase = (raw.dataEnvioLaudo as string | undefined) ?? item.dataAgendamento;
          const baseDate = dataBase ? new Date(dataBase).getTime() : now;
          const daysPending = Math.max(0, Math.floor((now - baseDate) / (1000 * 60 * 60 * 24)));

          return {
            id: item.id,
            processoCNJ: item.processoCNJ,
            autorNome: item.autorNome ?? 'Sem autor',
            valorPendente: toNumber(raw.honorariosPrevistosJG),
            dataEnvio: dataBase,
            daysPending,
            varaId: typeof raw.varaId === 'string' ? raw.varaId : undefined,
            pagamentoStatus: item.pagamentoStatus,
          };
        })
        .filter((item) => item.pagamentoStatus !== 'PAGO')
        .filter((item) => (selectedVaraId ? item.varaId === selectedVaraId : true))
        .filter((item) => item.daysPending >= minDays)
        .map(({ pagamentoStatus: _pagamentoStatus, ...item }) => item);
    },
    enabled: shouldGenerate && Boolean(selectedCidadeId && selectedVaraId),
  });

  const selectedCidadeName = cidades.find((item) => item.id === selectedCidadeId)?.nome ?? '—';
  const selectedVaraName = allVaras.find((item) => item.id === selectedVaraId)?.nome ?? '—';

  const totalPendente = useMemo(
    () => (pendingQuery.data ?? []).reduce((sum, item) => sum + item.valorPendente, 0),
    [pendingQuery.data],
  );

  const emailBody = useMemo(() => {
    if (!shouldGenerate) return '';

    const lines = (pendingQuery.data ?? []).length
      ? (pendingQuery.data ?? [])
          .map(
            (item, index) =>
              `${index + 1}. CNJ: ${item.processoCNJ} | Autor: ${item.autorNome} | Valor: ${formatCurrency(item.valorPendente)} | Data Envio: ${formatDate(item.dataEnvio)}`,
          )
          .join('\n')
      : 'Nenhuma perícia pendente encontrada para os filtros selecionados.';

    return [
      'Prezados,',
      '',
      `Segue levantamento de cobrança semi-automática.`,
      `Cidade: ${selectedCidadeName}`,
      `Vara: ${selectedVaraName}`,
      `Dias mínimos pendentes: ${minDays}`,
      '',
      lines,
      '',
      `Total pendente: ${formatCurrency(totalPendente)}`,
      '',
      'Atenciosamente,',
      'Equipe Pericial',
    ].join('\n');
  }, [minDays, pendingQuery.data, selectedCidadeName, selectedVaraName, shouldGenerate, totalPendente]);

  const handleGenerate = () => {
    if (!selectedCidadeId || !selectedVaraId) {
      toast.error('Selecione cidade e vara para gerar o e-mail.');
      return;
    }
    setShouldGenerate(true);
    void pendingQuery.refetch();
  };

  const handleCopy = async () => {
    if (!emailBody) return;
    try {
      await navigator.clipboard.writeText(emailBody);
      toast.success('Conteúdo copiado para a área de transferência.');
    } catch {
      toast.error('Não foi possível copiar o conteúdo.');
    }
  };

  const mailtoHref = `mailto:?subject=${encodeURIComponent(`Cobrança Semi-Automática - ${selectedVaraName}`)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">EMAIL GENERATOR: Cobrança Semi-Automática</h1>
          <p className="text-sm text-slate-500">Selecione os filtros, gere o template e envie por e-mail com um clique.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Cidade</span>
            <select
              className="w-full rounded-md border bg-white px-3 py-2"
              onChange={(event) => {
                setSelectedCidadeId(event.target.value);
                setSelectedVaraId('');
                setShouldGenerate(false);
              }}
              value={selectedCidadeId}
            >
              <option value="">Selecione</option>
              {cidades.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Vara</span>
            <select
              className="w-full rounded-md border bg-white px-3 py-2"
              onChange={(event) => {
                setSelectedVaraId(event.target.value);
                setShouldGenerate(false);
              }}
              value={selectedVaraId}
            >
              <option value="">Selecione</option>
              {varas.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Dias mínimos</span>
            <Input
              min={0}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setMinDays(Number.isNaN(parsed) ? 0 : parsed);
                setShouldGenerate(false);
              }}
              type="number"
              value={minDays}
            />
          </label>

          <div className="flex items-end">
            <Button className="w-full" onClick={handleGenerate} type="button">Gerar Email</Button>
          </div>
        </div>
      </Card>

      {shouldGenerate && (
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Template gerado</h2>
            <div className="flex gap-2">
              <Button onClick={handleCopy} type="button" variant="outline"><Copy size={14} /> Copiar</Button>
              <a href={mailtoHref}>
                <Button type="button"><Mail size={14} /> Abrir Email</Button>
              </a>
            </div>
          </div>

          {pendingQuery.data && pendingQuery.data.length > 0 ? (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2">CNJ</th>
                    <th className="px-3 py-2">Autor</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Data Envio</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQuery.data.map((item) => (
                    <tr className="border-t" key={item.id}>
                      <td className="px-3 py-2">{item.processoCNJ}</td>
                      <td className="px-3 py-2">{item.autorNome}</td>
                      <td className="px-3 py-2">{formatCurrency(item.valorPendente)}</td>
                      <td className="px-3 py-2">{formatDate(item.dataEnvio)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-slate-50">
                    <td className="px-3 py-2 font-semibold" colSpan={2}>Total pendente</td>
                    <td className="px-3 py-2 font-bold" colSpan={2}>{formatCurrency(totalPendente)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhuma perícia pendente encontrada" />
          )}

          <textarea
            className="min-h-[280px] w-full rounded-md border p-3 text-sm"
            readOnly
            value={emailBody}
          />
        </Card>
      )}
    </div>
  );
};

export default EmailGeradorPage;
