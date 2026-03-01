import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/state';
import { financialService } from '@/services/financial-service';
import type { UnmatchedPayment, UnmatchedPaymentOrigin } from '@/types/api';

const ORIGIN_OPTIONS: UnmatchedPaymentOrigin[] = ['AI_PRINT', 'MANUAL_CSV', 'INDIVIDUAL'];

const formatCurrency = (value?: string | number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0));

const normalize = (value?: string | null) => (value ?? '').toLowerCase();
const isValidCNJ = (cnj?: string | null) => Boolean(cnj && /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(cnj.trim()));

type EditForm = {
  amount: string;
  receivedAt: string;
  payerName: string;
  cnj: string;
  description: string;
  source: string;
  origin: UnmatchedPaymentOrigin;
  notes: string;
};

const PagamentosNaoVinculadosPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['financial-unmatched-payments'],
    queryFn: () => financialService.listUnmatchedPayments(),
  });

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [onlyValidCnj, setOnlyValidCnj] = useState(false);
  const [withoutCnj, setWithoutCnj] = useState(false);

  const [editing, setEditing] = useState<UnmatchedPayment | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    amount: '',
    receivedAt: '',
    payerName: '',
    cnj: '',
    description: '',
    source: '',
    origin: 'INDIVIDUAL',
    notes: '',
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['financial-unmatched-payments'] });
  };

  const linkMutation = useMutation({
    mutationFn: ({ id, periciaId }: { id: string; periciaId: string }) =>
      financialService.linkUnmatchedPayment(id, { periciaId, note: 'Vinculado pela tela de não vinculados' }),
    onSuccess: async () => {
      toast.success('Pagamento vinculado com sucesso.');
      await refresh();
    },
    onError: () => toast.error('Não foi possível vincular o pagamento.'),
  });

  const discardMutation = useMutation({
    mutationFn: (id: string) => financialService.discardUnmatchedPayment(id, 'Marcado como ignorado pela tela'),
    onSuccess: async () => {
      toast.success('Pagamento marcado como ignorado (DISCARDED).');
      await refresh();
    },
    onError: () => toast.error('Não foi possível marcar como ignorado.'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => financialService.deleteUnmatchedPayment(id, reason),
    onSuccess: async () => {
      toast.success('Pagamento excluído com auditoria.');
      await refresh();
    },
    onError: () => toast.error('Não foi possível excluir o pagamento.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof financialService.updateUnmatchedPayment>[1] }) =>
      financialService.updateUnmatchedPayment(id, payload),
    onSuccess: async () => {
      toast.success('Pagamento atualizado com sucesso.');
      setEditing(null);
      await refresh();
    },
    onError: () => toast.error('Não foi possível atualizar o pagamento.'),
  });

  const sourceOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((item) => item.source).filter((v): v is string => Boolean(v)))),
    [data],
  );

  const filtered = useMemo(() => {
    const term = normalize(search);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return (data ?? [])
      .filter((item) => {
        const receivedAt = item.receivedAt ?? item.transactionDate ?? item.createdAt;
        const date = receivedAt ? new Date(receivedAt) : null;

        if (from && date && date < from) return false;
        if (to && date && date > to) return false;

        if (sourceFilter && item.source !== sourceFilter) return false;
        if (originFilter && item.origin !== originFilter) return false;

        const cnjValid = isValidCNJ(item.cnj);
        if (onlyValidCnj && !cnjValid) return false;
        if (withoutCnj && item.cnj?.trim()) return false;

        if (!term) return true;

        const haystack = [item.cnj, item.description, item.source, item.amount?.toString(), item.payerName].map(normalize).join(' ');
        return haystack.includes(term);
      })
      .sort((a, b) => new Date(b.receivedAt ?? b.transactionDate ?? b.createdAt ?? 0).getTime() - new Date(a.receivedAt ?? a.transactionDate ?? a.createdAt ?? 0).getTime());
  }, [data, fromDate, onlyValidCnj, originFilter, search, sourceFilter, toDate, withoutCnj]);

  const openEdit = (item: UnmatchedPayment) => {
    setEditing(item);
    setEditForm({
      amount: item.amount?.toString() ?? '',
      receivedAt: (item.receivedAt ?? item.transactionDate ?? '').toString().slice(0, 10),
      payerName: item.payerName ?? '',
      cnj: item.cnj ?? '',
      description: item.description ?? '',
      source: item.source ?? '',
      origin: (item.origin as UnmatchedPaymentOrigin) ?? 'INDIVIDUAL',
      notes: item.notes ?? '',
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagamentos não vinculados</h1>
        <p className="text-sm text-muted-foreground">Monitore e trate registros de UnmatchedPayment.</p>
      </div>

      <Card className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Buscar por CNJ, valor, descrição ou fonte" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">Todas as fontes</option>
            {sourceOptions.map((source) => (
              <option value={source} key={source}>{source}</option>
            ))}
          </select>
          <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={originFilter} onChange={(e) => setOriginFilter(e.target.value)}>
            <option value="">Todas as origens</option>
            {ORIGIN_OPTIONS.map((origin) => (
              <option key={origin} value={origin}>{origin}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyValidCnj} onChange={(e) => setOnlyValidCnj(e.target.checked)} />
            Somente CNJ válido
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withoutCnj} onChange={(e) => setWithoutCnj(e.target.checked)} />
            Sem CNJ
          </label>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-sm text-muted-foreground">{filtered.length} registros</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-2 py-2">Recebido em</th>
                <th className="px-2 py-2">Valor</th>
                <th className="px-2 py-2">CNJ</th>
                <th className="px-2 py-2">Descrição</th>
                <th className="px-2 py-2">Fonte</th>
                <th className="px-2 py-2">Origem</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const receivedDate = item.receivedAt ?? item.transactionDate ?? item.createdAt;
                return (
                <tr key={item.id} className="border-b align-top">
                  <td className="px-2 py-2">{receivedDate ? new Date(receivedDate).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-2 py-2 font-medium">{formatCurrency(item.amount)}</td>
                  <td className="px-2 py-2">{item.cnj ?? '-'}</td>
                  <td className="px-2 py-2">{item.description ?? '-'}</td>
                  <td className="px-2 py-2">{item.source ?? '-'}</td>
                  <td className="px-2 py-2">{item.origin ?? 'INDIVIDUAL'}</td>
                  <td className="px-2 py-2">{item.ignored ? 'DISCARDED' : item.matchStatus}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const periciaId = window.prompt('Informe o ID da perícia para vincular:');
                          if (!periciaId) return;
                          linkMutation.mutate({ id: item.id, periciaId });
                        }}
                      >
                        Vincular
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Editar</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!window.confirm('Confirma exclusão com auditoria?')) return;
                          const reason = window.prompt('Motivo da exclusão (auditoria):') ?? '';
                          deleteMutation.mutate({ id: item.id, reason });
                        }}
                      >
                        Excluir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => discardMutation.mutate(item.id)}>Ignorar</Button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Editar pagamento não vinculado">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editing) return;
            updateMutation.mutate({
              id: editing.id,
              payload: {
                amount: Number(editForm.amount || 0),
                receivedAt: editForm.receivedAt,
                payerName: editForm.payerName,
                cnj: editForm.cnj,
                description: editForm.description,
                source: editForm.source,
                origin: editForm.origin,
                notes: editForm.notes,
              },
            });
          }}
        >
          <Input type="number" step="0.01" placeholder="Valor" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} />
          <Input type="date" value={editForm.receivedAt} onChange={(e) => setEditForm((p) => ({ ...p, receivedAt: e.target.value }))} />
          <Input placeholder="Pagador" value={editForm.payerName} onChange={(e) => setEditForm((p) => ({ ...p, payerName: e.target.value }))} />
          <Input placeholder="CNJ" value={editForm.cnj} onChange={(e) => setEditForm((p) => ({ ...p, cnj: e.target.value }))} />
          <Input placeholder="Descrição" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
          <Input placeholder="Fonte" value={editForm.source} onChange={(e) => setEditForm((p) => ({ ...p, source: e.target.value }))} />
          <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={editForm.origin} onChange={(e) => setEditForm((p) => ({ ...p, origin: e.target.value as UnmatchedPaymentOrigin }))}>
            {ORIGIN_OPTIONS.map((origin) => (
              <option key={origin} value={origin}>{origin}</option>
            ))}
          </select>
          <Input placeholder="Notas" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default PagamentosNaoVinculadosPage;
