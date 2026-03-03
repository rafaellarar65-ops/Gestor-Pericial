import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, Download, Mic, MicOff, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { apiClient } from '@/lib/api-client';

type LaudoSectionKey =
  | 'IDENTIFICACAO'
  | 'ALEGACOES'
  | 'HISTORIA_MEDICA'
  | 'HISTORIA_OCUPACIONAL'
  | 'HMA'
  | 'QUESITOS'
  | 'EXAME_FISICO';

type LaudoSection = {
  preLaudo: string;
  transcricaoIA: string;
  anotacoes: string;
};

type LaudoSectionsMap = Record<LaudoSectionKey, LaudoSection>;

type PreLaudo = {
  id: string;
  periciaId?: string;
  processoCNJ?: string;
  autorNome?: string;
  examStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
  sections?: Partial<Record<LaudoSectionKey, Partial<LaudoSection>>>;
};

const EXAM_CONFIG = {
  NOT_STARTED: { label: 'Não iniciado', color: 'bg-slate-100 text-slate-600', Icon: Clock },
  IN_PROGRESS: { label: 'Em elaboração', color: 'bg-blue-100 text-blue-700', Icon: AlertCircle },
  DONE: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
} as const;

const SECTION_ORDER: { key: LaudoSectionKey; label: string }[] = [
  { key: 'IDENTIFICACAO', label: 'Identificação' },
  { key: 'ALEGACOES', label: 'Alegações' },
  { key: 'HISTORIA_MEDICA', label: 'História médica' },
  { key: 'HISTORIA_OCUPACIONAL', label: 'História ocupacional' },
  { key: 'HMA', label: 'HMA' },
  { key: 'QUESITOS', label: 'Quesitos' },
  { key: 'EXAME_FISICO', label: 'Exame físico' },
];

const EMPTY_SECTIONS: LaudoSectionsMap = {
  IDENTIFICACAO: { preLaudo: '', transcricaoIA: '', anotacoes: '' },
  ALEGACOES: { preLaudo: '', transcricaoIA: '', anotacoes: '' },
  HISTORIA_MEDICA: { preLaudo: '', transcricaoIA: '', anotacoes: '' },
  HISTORIA_OCUPACIONAL: { preLaudo: '', transcricaoIA: '', anotacoes: '' },
  HMA: { preLaudo: '', transcricaoIA: '', anotacoes: '' },
  QUESITOS: { preLaudo: '', transcricaoIA: '', anotacoes: '' },
  EXAME_FISICO: { preLaudo: '', transcricaoIA: '', anotacoes: '' },
};

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Falha ao ler áudio.'));
        return;
      }
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const Page = () => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sections, setSections] = useState<LaudoSectionsMap>(EMPTY_SECTIONS);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const queryClient = useQueryClient();

  const { data = [], isLoading, isError } = useQuery<PreLaudo[]>({
    queryKey: ['pre-laudos'],
    queryFn: async () => {
      const { data } = await apiClient.get<PreLaudo[] | { items?: PreLaudo[] }>('/laudo/pre-laudos');
      return Array.isArray(data) ? data : (data.items ?? []);
    },
  });

  const selected = useMemo(() => data.find((item) => item.id === selectedId) ?? null, [data, selectedId]);

  useEffect(() => {
    if (!selected && data.length > 0) {
      setSelectedId(data[0].id);
    }
  }, [data, selected]);

  useEffect(() => {
    if (!selected) return;
    const next = { ...EMPTY_SECTIONS };
    for (const { key } of SECTION_ORDER) {
      const current = selected.sections?.[key];
      next[key] = {
        preLaudo: typeof current?.preLaudo === 'string' ? current.preLaudo : '',
        transcricaoIA: typeof current?.transcricaoIA === 'string' ? current.transcricaoIA : '',
        anotacoes: typeof current?.anotacoes === 'string' ? current.anotacoes : '',
      };
    }
    setSections(next);
  }, [selected]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { preLaudoId: string; sections: LaudoSectionsMap }) =>
      apiClient.post('/laudo/sections', payload),
  });

  const transcribeMutation = useMutation({
    mutationFn: async (payload: { preLaudoId: string; audioBase64: string }) => {
      const { data } = await apiClient.post<{ sections: LaudoSectionsMap }>(
        `/laudo/${payload.preLaudoId}/transcribe`,
        { audioBase64: payload.audioBase64 },
      );
      return data;
    },
    onSuccess: (response) => {
      setSections(response.sections);
      void queryClient.invalidateQueries({ queryKey: ['pre-laudos'] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (preLaudoId: string) => {
      const { data } = await apiClient.post<Blob>(`/laudo/${preLaudoId}/export-docx`, undefined, {
        responseType: 'blob',
      });
      return data;
    },
  });

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setInterval(() => {
      void saveMutation.mutateAsync({ preLaudoId: selectedId, sections });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [sections, selectedId, saveMutation]);

  const filtered = data.filter((item) => {
    const normalized = search.toLowerCase();
    return (
      !normalized ||
      [item.processoCNJ, item.autorNome, item.periciaId].some((value) =>
        (value ?? '').toLowerCase().includes(normalized),
      )
    );
  });

  const handleStartRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 10 * 1024 * 1024) {
          setRecordingError('Áudio acima de 10MB. Grave novamente com menor duração.');
          return;
        }
        if (!selectedId) return;
        const audioBase64 = await toBase64(blob);
        await transcribeMutation.mutateAsync({ preLaudoId: selectedId, audioBase64 });
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setRecordingError('Não foi possível iniciar a gravação. Verifique permissões de microfone.');
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const handleSectionUpdate = (key: LaudoSectionKey, field: keyof LaudoSection, value: string) => {
    setSections((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleExportDocx = async () => {
    if (!selectedId) return;
    const blob = await exportMutation.mutateAsync(selectedId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laudo-v2-${selectedId}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar pré-laudos." />;

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
      <Card className="space-y-3 p-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhum pré-laudo encontrado." />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const status = item.examStatus ?? 'NOT_STARTED';
              const cfg = EXAM_CONFIG[status];
              const Icon = cfg.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded border p-3 text-left ${selectedId === item.id ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <p className="truncate text-sm font-semibold">{item.processoCNJ ?? item.id}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.autorNome ?? item.periciaId}</p>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Laudo V2</h1>
            <p className="text-sm text-muted-foreground">Gravação, transcrição e edição por seção.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isRecording ? (
              <Button variant="destructive" onClick={handleStopRecording}>
                <MicOff className="mr-2 h-4 w-4" /> Parar gravação
              </Button>
            ) : (
              <Button onClick={handleStartRecording} disabled={!selectedId || transcribeMutation.isPending}>
                <Mic className="mr-2 h-4 w-4" /> Gravar áudio
              </Button>
            )}
            <Button variant="outline" onClick={() => selectedId && saveMutation.mutate({ preLaudoId: selectedId, sections })} disabled={!selectedId || saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Salvar agora
            </Button>
            <Button onClick={handleExportDocx} disabled={!selectedId || exportMutation.isPending}>
              <Download className="mr-2 h-4 w-4" /> Exportar DOCX
            </Button>
          </div>
        </header>

        {recordingError && <ErrorState message={recordingError} />}

        {SECTION_ORDER.map(({ key, label }) => (
          <Card key={key} className="space-y-2 p-4">
            <h2 className="font-semibold">{label}</h2>
            <div className="grid gap-2 md:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">Pré-laudo</span>
                <textarea
                  className="min-h-28 w-full rounded-md border p-2"
                  value={sections[key].preLaudo}
                  onChange={(e) => handleSectionUpdate(key, 'preLaudo', e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">Transcrição IA</span>
                <textarea
                  className="min-h-28 w-full rounded-md border p-2"
                  value={sections[key].transcricaoIA}
                  onChange={(e) => handleSectionUpdate(key, 'transcricaoIA', e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-muted-foreground">Anotações</span>
                <textarea
                  className="min-h-28 w-full rounded-md border p-2"
                  value={sections[key].anotacoes}
                  onChange={(e) => handleSectionUpdate(key, 'anotacoes', e.target.value)}
                />
              </label>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Page;
