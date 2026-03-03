import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, LinkIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/formatters';
import { financialService } from '@/services/financial-service';
import type { CsvImportSource, FinancialImportResult } from '@/types/api';

type TabId = 'Import CSV' | 'Histórico' | 'Não vinculados';
const tabs: TabId[] = ['Import CSV', 'Histórico', 'Não vinculados'];

const ImportacoesPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('Import CSV');
  const [sourceType, setSourceType] = useState<CsvImportSource>('TJ');
  const [sourceLabel, setSourceLabel] = useState('');
  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [linkPericiaId, setLinkPericiaId] = useState<Record<string, string>>({});
  const [lastImport, setLastImport] = useState<FinancialImportResult | null>(null);

  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['financial', 'import-batches'],
    queryFn: financialService.listImportBatches,
  });

  const unmatchedQuery = useQuery({
    queryKey: ['financial', 'unmatched-v2'],
    queryFn: financialService.listUnmatchedPaymentsV2,
  });

  const importMutation = useMutation({
    mutationFn: financialService.importCsv,
    onSuccess: (result) => {
      setLastImport(result);
      toast.success('Importação concluída com sucesso.');
      void queryClient.invalidateQueries({ queryKey: ['financial', 'import-batches'] });
      void queryClient.invalidateQueries({ queryKey: ['financial', 'unmatched-v2'] });
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ paymentId, periciaId }: { paymentId: string; periciaId: string }) =>
      financialService.linkUnmatchedPaymentV2(paymentId, { periciaId }),
    onSuccess: () => {
      toast.success('Pagamento vinculado com sucesso.');
      void queryClient.invalidateQueries({ queryKey: ['financial', 'unmatched-v2'] });
      void queryClient.invalidateQueries({ queryKey: ['financial', 'import-batches'] });
    },
  });

  const onFileSelected = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const content = await file.text();
    setCsvContent(content);
    const separator = sourceType === 'AJG' ? ';' : ',';
    const rows = content
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .slice(0, 6)
      .map((line) => line.split(separator).map((cell) => cell.trim()));
    setPreviewRows(rows);
  };

  const canImport = csvContent.trim().length > 0 && !importMutation.isPending;

  const currentUnmatched = useMemo(() => unmatchedQuery.data ?? [], [unmatchedQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importações Financeiras</h1>
        <p className="text-sm text-muted-foreground">Importe CSVs, acompanhe lotes e vincule pagamentos não localizados.</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as TabId)} />

      {activeTab === 'Import CSV' && (
        <Card className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fonte</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as CsvImportSource)}
              >
                <option value="TJ">TJ</option>
                <option value="AJG">AJG</option>
                <option value="PARTES">Partes</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Rótulo da fonte (opcional)</label>
              <Input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} placeholder="Ex: TJMG Fevereiro" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Arquivo CSV</label>
            <Input type="file" accept=".csv" onChange={(event) => void onFileSelected(event.target.files?.[0] ?? null)} />
            {fileName && <p className="text-xs text-muted-foreground">Arquivo: {fileName}</p>}
          </div>

          {previewRows.length > 0 && (
            <div className="space-y-2 rounded-md border bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">Preview</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={`${idx}-${row.join('|')}`} className="border-b last:border-0">
                        {row.map((cell, cIdx) => (
                          <td key={`${idx}-${cIdx}`} className="px-2 py-1">{cell || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button
            disabled={!canImport}
            onClick={() =>
              importMutation.mutate({
                csvContent,
                sourceType,
                ...(sourceLabel.trim() ? { sourceLabel: sourceLabel.trim() } : {}),
              })
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            Confirmar importação
          </Button>

          {lastImport && (
            <div className="rounded-md border bg-emerald-50 p-3 text-sm">
              <p>
                Lote {lastImport.batchId}: {lastImport.summary.matched} vinculados e {lastImport.summary.unmatched} não vinculados.
              </p>
              <p>Bruto: {formatCurrency(lastImport.summary.totals.valorBruto)} • Líquido: {formatCurrency(lastImport.summary.totals.valorLiquido)}</p>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Histórico' && (
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Histórico de imports</h2>
            <Button
              variant="outline"
              onClick={() => {
                const batches = historyQuery.data ?? [];
                const lines = ['id,importedAt,total,matched,unmatched,status'];
                batches.forEach((item) => lines.push(`${item.id},${item.importedAt},${item.totalRecords},${item.matchedRecords},${item.unmatchedRecords},${item.status ?? ''}`));
                const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'historico-importacoes.csv';
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar relatório
            </Button>
          </div>

          {(historyQuery.data ?? []).map((batch) => (
            <div key={batch.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{new Date(batch.importedAt).toLocaleString('pt-BR')}</p>
              <p className="text-muted-foreground">Total: {batch.totalRecords} • Match: {batch.matchedRecords} • Sem match: {batch.unmatchedRecords}</p>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'Não vinculados' && (
        <Card className="space-y-4 p-4">
          {currentUnmatched.map((payment) => (
            <div key={payment.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{payment.cnj ?? 'CNJ não informado'}</p>
              <p className="text-muted-foreground">{payment.description ?? 'Sem descrição'} • {formatCurrency(Number(payment.amount ?? 0))}</p>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Perícia ID"
                  value={linkPericiaId[payment.id] ?? ''}
                  onChange={(event) =>
                    setLinkPericiaId((prev) => ({
                      ...prev,
                      [payment.id]: event.target.value,
                    }))
                  }
                />
                <Button
                  variant="outline"
                  disabled={linkMutation.isPending || !(linkPericiaId[payment.id] ?? '').trim()}
                  onClick={() =>
                    linkMutation.mutate({
                      paymentId: payment.id,
                      periciaId: (linkPericiaId[payment.id] ?? '').trim(),
                    })
                  }
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Vincular
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default ImportacoesPage;
