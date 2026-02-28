import { useMemo, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { financialService } from '@/services/financial-service';

type ImportBatch = {
  id: string;
  fileName: string;
  importedAt: string;
  status: 'CONCLUIDO' | 'REJEITADO';
  records: number;
  linked: number;
  unmatched: number;
};

type ParsedRow = {
  processoCNJ: string;
  fontePagamento: string;
  dataRecebimento: string;
  valorBruto: number;
  valorLiquido?: number;
  imposto?: number;
  descricao?: string;
};

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

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

function parseNumber(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const normalized = input.replace(/\./g, '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCsvRows(csv: string): ParsedRow[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
  const idx = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));

  const iCnj = idx(['processocnj', 'processo_cnj', 'cnj']);
  const iFonte = idx(['fontepagamento', 'fonte_pagamento', 'fonte']);
  const iData = idx(['datarecebimento', 'data_recebimento', 'data']);
  const iBruto = idx(['valorbruto', 'valor_bruto', 'bruto']);
  const iLiquido = idx(['valorliquido', 'valor_liquido', 'liquido']);
  const iImposto = idx(['imposto', 'taxa']);
  const iDesc = idx(['descricao', 'descrição']);

  return lines.slice(1).map((line) => line.split(';')).map((cols) => ({
    processoCNJ: cols[iCnj]?.trim() ?? '',
    fontePagamento: cols[iFonte]?.trim() || 'TJ',
    dataRecebimento: cols[iData]?.trim() ?? new Date().toISOString(),
    valorBruto: parseNumber(cols[iBruto]) ?? 0,
    valorLiquido: parseNumber(cols[iLiquido]),
    imposto: parseNumber(cols[iImposto]),
    descricao: iDesc >= 0 ? cols[iDesc]?.trim() : undefined,
  })).filter((row) => row.processoCNJ && row.valorBruto > 0);
}

const ImportacoesPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [activeTab, setActiveTab] = useState<'PRINT' | 'CSV'>('CSV');

  const recordsPreview = useMemo(() => {
    if (!selectedFile) return 0;
    return Math.max(1, Math.round(selectedFile.size / 120));
  }, [selectedFile]);

  const mutation = useMutation({
    mutationFn: async ({ source, rows, fileName }: { source: 'AI_PRINT' | 'MANUAL_CSV'; rows: ParsedRow[]; fileName?: string }) =>
      financialService.importBatch(source, { rows, sourceFileName: fileName }),
    onSuccess: (result, vars) => {
      toast.success(`Lote importado: ${result.itemsLinked} vinculados, ${result.itemsUnmatched} sem vínculo.`);
      setBatches((prev) => [{
        id: result.batchId,
        fileName: vars.fileName ?? 'Lote manual',
        importedAt: new Date().toISOString(),
        status: 'CONCLUIDO',
        records: result.count,
        linked: result.itemsLinked,
        unmatched: result.itemsUnmatched,
      }, ...prev]);
      setSelectedFile(null);
      setValidationMessages([]);
    },
    onError: () => toast.error('Falha ao importar lote.'),
  });

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidationMessages(validateImportFile(file));
  };

  const onUpload = async (): Promise<void> => {
    const errors = validateImportFile(selectedFile);
    setValidationMessages(errors);
    if (!selectedFile || errors.length > 0) return;

    const text = await selectedFile.text();
    const rows = parseCsvRows(text);
    if (rows.length === 0) {
      toast.error('Nenhum item válido encontrado no lote.');
      return;
    }

    mutation.mutate({ source: activeTab === 'PRINT' ? 'AI_PRINT' : 'MANUAL_CSV', rows, fileName: selectedFile.name });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importações Financeiras</h1>
        <p className="text-sm text-muted-foreground">Faça upload dos lotes e o backend classifica automaticamente itens vinculados e não vinculados.</p>
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex gap-2 text-sm">
          <Button onClick={() => setActiveTab('PRINT')} type="button" variant={activeTab === 'PRINT' ? 'default' : 'outline'}>PRINT</Button>
          <Button onClick={() => setActiveTab('CSV')} type="button" variant={activeTab === 'CSV' ? 'default' : 'outline'}>CSV</Button>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium">
          <Upload className="h-4 w-4" />
          Novo lote ({activeTab})
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="arquivo-importacao">Arquivo (.csv ou .xlsx)</label>
          <Input id="arquivo-importacao" type="file" accept=".csv,.xlsx" onChange={onFileChange} />
          {selectedFile && <p className="text-xs text-muted-foreground">Arquivo selecionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})</p>}
        </div>

        {validationMessages.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="mb-1 flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Ajustes necessários</div>
            <ul className="list-disc pl-5">{validationMessages.map((message) => <li key={message}>{message}</li>)}</ul>
          </div>
        )}

        {selectedFile && validationMessages.length === 0 && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Pré-validação concluída. Estimativa de {recordsPreview} registros para o lote.</div>}

        <Button onClick={() => void onUpload()}>{mutation.isPending ? 'Importando...' : 'Importar lote'}</Button>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Clock3 className="h-4 w-4" />Histórico de lotes</div>

        {batches.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lote importado até o momento.</p> : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div className="rounded-md border p-3" key={batch.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium"><FileSpreadsheet className="h-4 w-4" />{batch.fileName}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{batch.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{new Date(batch.importedAt).toLocaleString('pt-BR')} • {batch.records} registros • {batch.linked} vinculados • {batch.unmatched} sem vínculo</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ImportacoesPage;
