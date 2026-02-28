import { useMemo, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { financialService } from '@/services/financial-service';
import type { RecebimentoListItem } from '@/types/api';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const TAB_RECEBIMENTOS = 'Recebimentos Individuais';
const TAB_LOTES = 'Histórico de Lotes';

function formatCurrency(value: number | string | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  return d.toLocaleDateString('pt-BR');
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function validateImportFile(file: File | null): string[] {
  if (!file) return ['Selecione um arquivo para importar.'];

  const messages: string[] = [];
  const fileNameLower = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_EXTENSIONS.some((extension) => fileNameLower.endsWith(extension));

  if (!hasValidExtension) messages.push('Formato inválido. Use apenas arquivos .csv ou .xlsx.');
  if (file.size > MAX_SIZE_BYTES) messages.push('Arquivo excede o limite de 10 MB.');

  return messages;
}

function estimateRecords(file: File): number {
  if (file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv')) return Math.max(1, Math.round(file.size / 120));
  return Math.max(1, Math.round(file.size / 380));
}

export default function ImportacoesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(TAB_RECEBIMENTOS);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<RecebimentoListItem | null>(null);
  const [editForm, setEditForm] = useState({ dataRecebimento: '', origem: 'TJ', valorLiquido: '', descricao: '' });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  const recebimentosQuery = useQuery({
    queryKey: ['importacoes', 'recebimentos', search],
    queryFn: () => financialService.listRecebimentos(search),
  });

  const batchesQuery = useQuery({
    queryKey: ['importacoes', 'batches'],
    queryFn: financialService.listImportBatches,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: financialService.bulkDeleteRecebimentos,
    onSuccess: (res) => {
      toast.success(`${res.deleted} recebimento(s) excluído(s).`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'recebimentos'] });
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'batches'] });
    },
    onError: () => toast.error('Falha ao excluir recebimentos.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { dataRecebimento: string; origem: string; valorLiquido?: number; descricao?: string } }) =>
      financialService.updateRecebimento(id, payload),
    onSuccess: () => {
      toast.success('Recebimento atualizado com sucesso.');
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'recebimentos'] });
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'batches'] });
    },
    onError: () => toast.error('Não foi possível atualizar o recebimento.'),
  });

  const revertBatchMutation = useMutation({
    mutationFn: financialService.revertImportBatch,
    onSuccess: (res) => {
      if (res.reverted) toast.success(`Lote revertido. ${res.deletedRecebimentos ?? 0} recebimentos removidos.`);
      else toast.error('Lote não pode ser revertido no status atual.');
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'recebimentos'] });
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'batches'] });
    },
    onError: () => toast.error('Erro ao reverter lote.'),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: financialService.deleteImportBatch,
    onSuccess: () => {
      toast.success('Lote e recebimentos excluídos.');
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'recebimentos'] });
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'batches'] });
    },
    onError: () => toast.error('Erro ao excluir lote.'),
  });

  const resetFactoryMutation = useMutation({
    mutationFn: financialService.clearAllFinancialData,
    onSuccess: (res) => {
      toast.success(`Reset concluído: ${res.deletedRecebimentos} recebimentos e ${res.deletedImportBatches} lotes.`);
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'recebimentos'] });
      queryClient.invalidateQueries({ queryKey: ['importacoes', 'batches'] });
    },
    onError: () => toast.error('Erro ao executar Reset Factory.'),
  });

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidationMessages(validateImportFile(file));
  };

  const onUpload = (): void => {
    const errors = validateImportFile(selectedFile);
    setValidationMessages(errors);
    if (!selectedFile || errors.length > 0) return;
    toast.info(`Pré-validação concluída para ${selectedFile.name} (${estimateRecords(selectedFile)} registros estimados).`);
  };

  const recebimentos = recebimentosQuery.data ?? [];

  const allSelected = useMemo(
    () => recebimentos.length > 0 && recebimentos.every((item) => selectedIds.includes(item.id)),
    [recebimentos, selectedIds],
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(recebimentos.map((item) => item.id));
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const onBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const ok = window.confirm(`Confirma exclusão de ${selectedIds.length} recebimento(s)? Esta ação não poderá ser desfeita.`);
    if (ok) bulkDeleteMutation.mutate(selectedIds);
  };

  const openEditModal = (item: RecebimentoListItem) => {
    setEditTarget(item);
    setEditForm({
      dataRecebimento: item.dataRecebimento?.slice(0, 10) ?? '',
      origem: item.fontePagamento,
      valorLiquido: item.valorLiquido ? String(item.valorLiquido) : '',
      descricao: item.descricao ?? '',
    });
  };

  const onSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateMutation.mutate({
      id: editTarget.id,
      payload: {
        dataRecebimento: editForm.dataRecebimento,
        origem: editForm.origem,
        valorLiquido: editForm.valorLiquido ? parseFloat(editForm.valorLiquido) : undefined,
        descricao: editForm.descricao || undefined,
      },
    });
  };

  const onDeleteBatchStrong = (batchId: string) => {
    const typed = window.prompt('Confirmação forte: digite EXCLUIR LOTE para remover lote e recebimentos.');
    if (typed === 'EXCLUIR LOTE') deleteBatchMutation.mutate(batchId);
    else if (typed !== null) toast.error('Confirmação inválida. Lote não excluído.');
  };

  const onResetFactory = () => {
    const typed = window.prompt('Digite RESET FACTORY para apagar TODOS os dados financeiros do tenant.');
    if (typed === 'RESET FACTORY') resetFactoryMutation.mutate();
    else if (typed !== null) toast.error('Confirmação inválida. Operação cancelada.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Importações Financeiras</h1>
          <p className="text-sm text-muted-foreground">Gerencie recebimentos individuais, lotes importados e ações administrativas.</p>
        </div>
        <Button variant="outline" onClick={onResetFactory}>
          Reset Factory
        </Button>
      </div>

      <Tabs tabs={[TAB_RECEBIMENTOS, TAB_LOTES]} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === TAB_RECEBIMENTOS && (
        <>
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Upload className="h-4 w-4" />
              Novo lote de importação
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="arquivo-importacao">Arquivo (.csv ou .xlsx)</label>
              <Input id="arquivo-importacao" type="file" accept=".csv,.xlsx" onChange={onFileChange} />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">Arquivo selecionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})</p>
              )}
            </div>

            {validationMessages.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="mb-1 flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Ajustes necessários</div>
                <ul className="list-disc pl-5">{validationMessages.map((message) => <li key={message}>{message}</li>)}</ul>
              </div>
            )}

            <Button onClick={onUpload}>Validar arquivo</Button>
          </Card>

          <Card className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative max-w-lg flex-1">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar por CNJ normalizado, descrição e autor"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="destructive" disabled={selectedIds.length === 0} onClick={onBulkDelete}>
                <Trash2 className="mr-1 h-4 w-4" /> Excluir selecionados ({selectedIds.length})
              </Button>
            </div>

            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="p-2 text-left">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                    <th className="p-2 text-left">Data (desc)</th>
                    <th className="p-2 text-left">CNJ</th>
                    <th className="p-2 text-left">Autor</th>
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-left">Origem</th>
                    <th className="p-2 text-left">Valor líquido</th>
                    <th className="p-2 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recebimentos.map((item) => (
                    <tr className="border-t" key={item.id}>
                      <td className="p-2">
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} />
                      </td>
                      <td className="p-2">{formatDate(item.dataRecebimento)}</td>
                      <td className="p-2">{item.pericia?.processoCNJ ?? '—'}</td>
                      <td className="p-2">{item.pericia?.autorNome ?? '—'}</td>
                      <td className="p-2">{item.descricao ?? '—'}</td>
                      <td className="p-2">{item.fontePagamento}</td>
                      <td className="p-2">{formatCurrency(item.valorLiquido ?? item.valorBruto)}</td>
                      <td className="p-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(item)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {recebimentos.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-3 text-center text-muted-foreground">Nenhum recebimento encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === TAB_LOTES && (
        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4" /> Histórico de lotes
          </div>

          {(batchesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lote importado até o momento.</p>
          ) : (
            <div className="space-y-3">
              {batchesQuery.data?.map((batch) => (
                <div className="rounded-md border p-3" key={batch.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <FileSpreadsheet className="h-4 w-4" /> {batch.sourceFileName || `Lote ${batch.id.slice(0, 8)}`}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {batch.status ?? '—'}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {new Date(batch.importedAt).toLocaleString('pt-BR')} • Total: {batch.totalRecords} • Vinculados: {batch.matchedRecords} • Não vinculados: {batch.unmatchedRecords}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={batch.status !== 'PROCESSED'}
                      onClick={() => revertBatchMutation.mutate(batch.id)}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reverter
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDeleteBatchStrong(batch.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir lote e recebimentos
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Dialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title="Editar recebimento">
        <form onSubmit={onSaveEdit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Data de recebimento</label>
            <Input type="date" value={editForm.dataRecebimento} onChange={(e) => setEditForm((prev) => ({ ...prev, dataRecebimento: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-sm">Origem</label>
            <select
              value={editForm.origem}
              onChange={(e) => setEditForm((prev) => ({ ...prev, origem: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="TJ">TJ</option>
              <option value="PARTE_AUTORA">PARTE_AUTORA</option>
              <option value="PARTE_RE">PARTE_RE</option>
              <option value="SEGURADORA">SEGURADORA</option>
              <option value="OUTRO">OUTRO</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Valor líquido</label>
            <Input type="number" step="0.01" value={editForm.valorLiquido} onChange={(e) => setEditForm((prev) => ({ ...prev, valorLiquido: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Descrição</label>
            <Input value={editForm.descricao} onChange={(e) => setEditForm((prev) => ({ ...prev, descricao: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
