import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type CsvTabState = {
  selectedFile: File | null;
  validationMessages: string[];
  previewRows: string[][];
  isProcessing: boolean;
  progress: number;
};

type TabCsvProps = {
  state: CsvTabState;
  onChange: (nextState: CsvTabState) => void;
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function validateCsvFile(file: File | null): string[] {
  if (!file) return ['Selecione um arquivo CSV para importar.'];

  const messages: string[] = [];
  if (!file.name.toLowerCase().endsWith('.csv')) {
    messages.push('Formato inválido. Use um arquivo .csv.');
  }

  if (file.size > MAX_SIZE_BYTES) {
    messages.push('Arquivo excede o limite de 10 MB.');
  }

  return messages;
}

async function readPreviewRows(file: File | null): Promise<string[][]> {
  if (!file) return [];
  const content = await file.text();
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 5)
    .map((line) => line.split(';').length > 1 ? line.split(';') : line.split(','));
}

export const TabCsv = ({ state, onChange }: TabCsvProps) => {
  const onFileChange = async (file: File | null) => {
    const validationMessages = validateCsvFile(file);
    const previewRows = validationMessages.length === 0 ? await readPreviewRows(file) : [];

    onChange({
      ...state,
      selectedFile: file,
      validationMessages,
      previewRows,
      progress: 0,
      isProcessing: false,
    });
  };

  const onValidate = async () => {
    const validationMessages = validateCsvFile(state.selectedFile);
    const previewRows = validationMessages.length === 0 ? await readPreviewRows(state.selectedFile) : [];

    onChange({
      ...state,
      validationMessages,
      previewRows,
    });
  };

  const onConfirmImport = () => {
    if (!state.selectedFile || state.validationMessages.length > 0) return;

    onChange({ ...state, isProcessing: true, progress: 35 });

    window.setTimeout(() => {
      onChange({ ...state, isProcessing: true, progress: 75 });
    }, 400);

    window.setTimeout(() => {
      onChange({ ...state, isProcessing: false, progress: 100 });
    }, 1000);
  };

  return (
    <Card className="space-y-4 p-4" id="csv">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Upload className="h-4 w-4" />
        Importação em lote por CSV
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="csv-file">
          Arquivo (.csv)
        </label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={(event) => {
            void onFileChange(event.target.files?.[0] ?? null);
          }}
        />
        {state.selectedFile && (
          <p className="text-xs text-muted-foreground">
            Arquivo selecionado: {state.selectedFile.name} ({formatFileSize(state.selectedFile.size)})
          </p>
        )}
      </div>

      {state.validationMessages.length > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Ajustes necessários
          </div>
          <ul className="list-disc pl-5">
            {state.validationMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : (
        state.selectedFile && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Pré-validação concluída para o arquivo CSV.
            </p>
          </div>
        )
      )}

      {state.previewRows.length > 0 && (
        <div className="space-y-2 rounded-md border bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-700">Preview das 5 primeiras linhas</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {state.previewRows.map((row, idx) => (
                  <tr key={`${row.join('-')}-${idx}`} className="border-b last:border-0">
                    {row.map((cell, cellIdx) => (
                      <td key={`${cell}-${cellIdx}`} className="px-2 py-1 text-slate-600">{cell || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state.isProcessing && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Processando importação...</span>
            <span>{state.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${state.progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void onValidate()}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Validar CSV
        </Button>
        <Button variant="outline" onClick={onConfirmImport} disabled={!state.selectedFile || state.validationMessages.length > 0 || state.isProcessing}>
          Confirmar importação
        </Button>
      </div>
    </Card>
  );
};
