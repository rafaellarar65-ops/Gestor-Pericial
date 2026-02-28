import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { financialService, type FinancialAiPrintResponse } from '@/services/financial-service';

type FileStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
type CandidateStatus = 'VALID' | 'INVALID';

type SourceType = 'TJ' | 'PARTE_AUTORA' | 'PARTE_RE' | 'SEGURADORA' | 'OUTRO';

type ImageItem = {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
  preview?: string;
};

type Candidate = {
  id: string;
  cnj: string;
  bruto: number;
  desconto: number;
  liquido: number;
  data: string;
  status: CandidateStatus;
  periciaId?: string;
};

const SOURCE_OPTIONS: SourceType[] = ['TJ', 'PARTE_AUTORA', 'PARTE_RE', 'SEGURADORA', 'OUTRO'];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const toInputDate = (value?: string): string => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isValidCNJ = (cnj: string): boolean => /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(cnj.trim());

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function applyRateio(global: FinancialAiPrintResponse['global'], items: FinancialAiPrintResponse['items']) {
  const totalTaxFromPrint =
    parseNumber(global.totalImpostos) ||
    Math.max(0, parseNumber(global.totalBruto) - parseNumber(global.totalLiquido)) ||
    0;

  const discountPerItem = items.length ? totalTaxFromPrint / items.length : 0;

  return items.map((item) => {
    const bruto = parseNumber(item.bruto);
    const desconto = parseNumber(item.desconto) || discountPerItem;
    const data = toInputDate(item.data ?? global.dataPagamento ?? new Date().toISOString());
    const liquido = Math.max(0, bruto - desconto);

    return {
      id: crypto.randomUUID(),
      cnj: item.cnj ?? '',
      bruto,
      desconto,
      liquido,
      data,
      status: isValidCNJ(item.cnj ?? '') ? 'VALID' : 'INVALID',
      periciaId: item.periciaId,
    } as Candidate;
  });
}

export default function TabPrint() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [aiDetectedSource, setAiDetectedSource] = useState<SourceType | ''>('');
  const [selectedSource, setSelectedSource] = useState<SourceType>('TJ');

  const enqueueFiles = useCallback((files: File[]) => {
    if (!files.length) return;

    const newItems: ImageItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'PENDING',
    }));

    setImages((prev) => [...prev, ...newItems]);
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const files = items
        .filter((item) => item.kind === 'file' && ['image/', 'application/pdf'].some((t) => item.type.startsWith(t)))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (files.length > 0) {
        event.preventDefault();
        enqueueFiles(files);
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [enqueueFiles]);

  useEffect(() => {
    images
      .filter((img) => img.status === 'PENDING')
      .forEach(async (image) => {
        setImages((prev) => prev.map((entry) => (entry.id === image.id ? { ...entry, status: 'PROCESSING' } : entry)));

        try {
          const contentBase64 = await fileToBase64(image.file);
          const response = await financialService.importAiPrint({
            source: selectedSource,
            fileName: image.file.name,
            mimeType: image.file.type,
            contentBase64,
          });

          if (response.global.detectedSource) {
            setAiDetectedSource(response.global.detectedSource as SourceType);
          }

          const processed = applyRateio(response.global, response.items);
          setCandidates((prev) => [...prev, ...processed]);

          setImages((prev) => prev.map((entry) => (entry.id === image.id ? { ...entry, status: 'DONE', error: undefined } : entry)));
        } catch (error) {
          setImages((prev) =>
            prev.map((entry) =>
              entry.id === image.id
                ? {
                    ...entry,
                    status: 'ERROR',
                    error: error instanceof Error ? error.message : 'Erro ao processar arquivo',
                  }
                : entry,
            ),
          );
        }
      });
  }, [images, selectedSource]);

  useEffect(() => () => {
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
  }, [images]);

  const stats = useMemo(
    () => ({
      total: images.length,
      done: images.filter((img) => img.status === 'DONE').length,
      error: images.filter((img) => img.status === 'ERROR').length,
      validCandidates: candidates.filter((item) => item.status === 'VALID').length,
    }),
    [images, candidates],
  );

  const handleCandidatesChange = (id: string, field: keyof Candidate, value: string) => {
    setCandidates((prev) =>
      prev.map((candidate) => {
        if (candidate.id !== id) return candidate;

        const next = { ...candidate };
        if (field === 'cnj') {
          next.cnj = value;
          next.status = isValidCNJ(value) ? 'VALID' : 'INVALID';
        }

        if (field === 'data') next.data = value;
        if (field === 'bruto') next.bruto = parseNumber(value);
        if (field === 'desconto') next.desconto = parseNumber(value);
        next.liquido = Math.max(0, next.bruto - next.desconto);

        return next;
      }),
    );
  };

  const removeCandidate = (id: string) => setCandidates((prev) => prev.filter((item) => item.id !== id));

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Upload múltiplo (imagem/PDF)</h3>
            <p className="text-xs text-muted-foreground">Use Ctrl+V para colar imagens/PDF do clipboard.</p>
          </div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value as SourceType)}
            className="rounded-md border bg-white px-3 py-2 text-sm"
          >
            {SOURCE_OPTIONS.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        <Input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(event) => enqueueFiles(Array.from(event.target.files ?? []))}
        />
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <span>Total: {stats.total}</span>
          <span>Concluídos: {stats.done}</span>
          <span>Com erro: {stats.error}</span>
          <span>Candidatos válidos: {stats.validCandidates}</span>
        </div>

        {(aiDetectedSource || selectedSource) && (
          <p className="text-xs text-muted-foreground">
            Fonte selecionada: <strong>{selectedSource}</strong>
            {aiDetectedSource ? (
              <>
                {' '}
                • Fonte detectada pela IA: <strong>{aiDetectedSource}</strong>
              </>
            ) : null}
          </p>
        )}

        <div className="space-y-2">
          {images.map((image) => (
            <div className="flex items-center justify-between rounded-md border p-2 text-sm" key={image.id}>
              <div>
                <p className="font-medium">{image.file.name}</p>
                <p className="text-xs text-muted-foreground">{image.file.type || 'arquivo'}</p>
              </div>
              <div className="flex items-center gap-2">
                {image.status === 'PROCESSING' && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{image.status}</span>
                {image.error ? <span className="text-xs text-red-600">{image.error}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">CNJ</th>
              <th className="px-3 py-2">Bruto</th>
              <th className="px-3 py-2">Desconto</th>
              <th className="px-3 py-2">Líquido (calc.)</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Remover</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr className="border-t" key={candidate.id}>
                <td className="px-3 py-2">
                  <Input type="date" value={candidate.data} onChange={(e) => handleCandidatesChange(candidate.id, 'data', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <Input value={candidate.cnj} onChange={(e) => handleCandidatesChange(candidate.id, 'cnj', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <Input value={String(candidate.bruto)} onChange={(e) => handleCandidatesChange(candidate.id, 'bruto', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <Input value={String(candidate.desconto)} onChange={(e) => handleCandidatesChange(candidate.id, 'desconto', e.target.value)} />
                </td>
                <td className="px-3 py-2 font-medium">{formatCurrency(candidate.liquido)}</td>
                <td className="px-3 py-2">
                  <span className={candidate.status === 'VALID' ? 'text-emerald-700' : 'text-red-700'}>{candidate.status}</span>
                </td>
                <td className="px-3 py-2">
                  <Button variant="ghost" size="sm" onClick={() => removeCandidate(candidate.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
