import { useMemo, useState, type ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Clock3, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import TabPrint from '@/pages/importacoes/tab-print';

type ImportBatch = {
  id: string;
  fileName: string;
  importedAt: string;
  status: 'CONCLUIDO' | 'REJEITADO';
  records: number;
  warnings: string[];
};

type ActiveTab = 'planilha' | 'print';

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

  if (!hasValidExtension) {
    messages.push('Formato inválido. Use apenas arquivos .csv ou .xlsx.');
  }

  if (file.size > MAX_SIZE_BYTES) {
    messages.push('Arquivo excede o limite de 10 MB.');
  }

  return messages;
}

function estimateRecords(file: File): number {
  if (file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv')) {
    return Math.max(1, Math.round(file.size / 120));
  }

  return Math.max(1, Math.round(file.size / 380));
}

const ImportacoesPage = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('planilha');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);

  const recordsPreview = useMemo(() => {
    if (!selectedFile) return 0;
    return estimateRecords(selectedFile);
  }, [selectedFile]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidationMessages(validateImportFile(file));
  };

  const onUpload = (): void => {
    const errors = validateImportFile(selectedFile);
    setValidationMessages(errors);

    if (!selectedFile || errors.length > 0) {
      return;
    }

    const importedBatch: ImportBatch = {
      id: crypto.randomUUID(),
      fileName: selectedFile.name,
      importedAt: new Date().toISOString(),
      status: 'CONCLUIDO',
      records: estimateRecords(selectedFile),
      warnings: selectedFile.size > 5 * 1024 * 1024 ? ['Arquivo grande. Validar conferência manual.'] : [],
    };

    setBatches((prev) => [importedBatch, ...prev]);
    setSelectedFile(null);
    setValidationMessages([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importações Financeiras</h1>
        <p className="text-sm text-muted-foreground">
          Faça upload dos arquivos de recebimentos e acompanhe o histórico de lotes processados.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === 'planilha' ? 'default' : 'outline'}
          onClick={() => setActiveTab('planilha')}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Importar planilha
        </Button>
        <Button variant={activeTab === 'print' ? 'default' : 'outline'} onClick={() => setActiveTab('print')}>
          <Image className="mr-2 h-4 w-4" />
          Importar por print (IA)
        </Button>
      </div>

      {activeTab === 'print' ? (
        <TabPrint />
      ) : (
        <>
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Upload className="h-4 w-4" />
              Novo lote de importação
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="arquivo-importacao">
                Arquivo (.csv ou .xlsx)
              </label>
              <Input
                id="arquivo-importacao"
                type="file"
                accept=".csv,.xlsx"
                onChange={onFileChange}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            {validationMessages.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Ajustes necessários
                </div>
                <ul className="list-disc pl-5">
                  {validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedFile && validationMessages.length === 0 && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Pré-validação concluída. Estimativa de {recordsPreview} registros para o lote.
              </div>
            )}

            <Button onClick={onUpload}>Importar lote</Button>
          </Card>

          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4" />
              Histórico de lotes
            </div>

            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum lote importado até o momento.</p>
            ) : (
              <div className="space-y-3">
                {batches.map((batch) => (
                  <div className="rounded-md border p-3" key={batch.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <FileSpreadsheet className="h-4 w-4" />
                        {batch.fileName}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {batch.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {new Date(batch.importedAt).toLocaleString('pt-BR')} • {batch.records} registros
                    </p>
                    {batch.warnings.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
                        {batch.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default ImportacoesPage;
