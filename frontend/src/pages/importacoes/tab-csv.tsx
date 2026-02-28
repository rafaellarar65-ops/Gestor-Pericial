import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type CsvTabState = {
  selectedFile: File | null;
  validationMessages: string[];
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

export const TabCsv = ({ state, onChange }: TabCsvProps) => {
  const onFileChange = (file: File | null) => {
    onChange({
      selectedFile: file,
      validationMessages: validateCsvFile(file),
    });
  };

  const onValidate = () => {
    onChange({
      ...state,
      validationMessages: validateCsvFile(state.selectedFile),
    });
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
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
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

      <Button onClick={onValidate}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Validar CSV
      </Button>
    </Card>
  );
};
