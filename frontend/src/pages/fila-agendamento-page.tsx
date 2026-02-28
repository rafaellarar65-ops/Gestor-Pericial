import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check, Clock3, Download, FileArchive, List, MapPin, Plus, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { Tabs } from '@/components/ui/tabs';
import { agendaService } from '@/services/agenda-service';
import { periciaService } from '@/services/pericia-service';
import type { Pericia } from '@/types/api';

type Tab = 'fila' | 'preparacao' | 'historico';

const TAB_OPTIONS: Array<{ value: Tab; label: string }> = [
  { value: 'fila', label: 'Fila por Cidade' },
  { value: 'preparacao', label: 'Lista de Preparação' },
  { value: 'historico', label: 'Histórico de Lotes' },
];

type PrepItem = {
  id: string;
  processoCNJ: string;
  autorNome?: string;
  cidade: string;
};

type LotItem = {
  id: string;
  processoCNJ: string;
  periciaId: string;
  cidade: string;
  autorNome?: string;
  scheduledAt: string;
};

type BatchLot = {
  id: string;
  createdAt: string;
  cityNames: string[];
  date: string;
  startTime: string;
  durationMinutes: number;
  intervalMinutes: number;
  location?: string;
  modalidade?: string;
  source: 'CSV' | 'WORD';
  status: 'PENDENTE' | 'CONFIRMADO';
  items: LotItem[];
};

const PREP_KEY = 'agendamento.preparacao';
const HISTORY_KEY = 'agendamento.historico';
const FINALIZED_KEY = 'agendamento.finalized';

const readStorageArray = <T,>(key: string): T[] => {
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
};

const toCityName = (cidade: Pericia['cidade']) =>
  typeof cidade === 'string' ? cidade : (cidade as { nome?: string })?.nome ?? 'Sem cidade';

const toStatusText = (status: Pericia['status']) =>
  typeof status === 'string'
    ? status
    : (status as { codigo?: string; nome?: string })?.codigo ?? (status as { nome?: string })?.nome ?? '';

const isPendingScheduling = (pericia: Pericia) => {
  const status = toStatusText(pericia.status).toUpperCase();
  if (pericia.dataAgendamento) return false;
  if (status.includes('FINALIZ') || status.includes('LAUDO') || status.includes('ESCLAR') || status.includes('ARQUIV')) return false;
  return true;
};

const generateScheduleRows = (
  items: PrepItem[],
  date: string,
  startTime: string,
  durationMinutes: number,
  intervalMinutes: number,
): LotItem[] => {
  const rows: LotItem[] = [];
  let current = new Date(`${date}T${startTime}:00`);

  items.forEach((item, index) => {
    rows.push({
      id: `${item.id}-${index}`,
      processoCNJ: item.processoCNJ,
      periciaId: item.id,
      cidade: item.cidade,
      autorNome: item.autorNome,
      scheduledAt: current.toISOString(),
    });
    current = new Date(current.getTime() + (durationMinutes + intervalMinutes) * 60000);
  });

  return rows;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildCsv = (lot: BatchLot) => {
  const headers = ['processo_cnj', 'autor', 'cidade', 'data', 'horario', 'local', 'modalidade'];
  const lines = lot.items.map((item) => {
    const dt = new Date(item.scheduledAt);
    return [
      item.processoCNJ,
      item.autorNome ?? '',
      item.cidade,
      dt.toLocaleDateString('pt-BR'),
      dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lot.location ?? '',
      lot.modalidade ?? '',
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(',');
  });

  return `${headers.join(',')}\n${lines.join('\n')}`;
};

const FilaAgendamentoPage = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('fila');
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [intervalMinutes, setIntervalMinutes] = useState(0);
  const [location, setLocation] = useState('');
  const [modalidade, setModalidade] = useState('Presencial');
  const [outputFormat, setOutputFormat] = useState<'CSV' | 'WORD'>('CSV');

  const [prepList, setPrepList] = useState<PrepItem[]>(() => readStorageArray<PrepItem>(PREP_KEY));
  const [history, setHistory] = useState<BatchLot[]>(() => readStorageArray<BatchLot>(HISTORY_KEY));
  const [finalizedPericiaIds, setFinalizedPericiaIds] = useState<Set<string>>(
    () => new Set(readStorageArray<string>(FINALIZED_KEY)),
  );

  useEffect(() => {
    localStorage.setItem(PREP_KEY, JSON.stringify(prepList));
  }, [prepList]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(FINALIZED_KEY, JSON.stringify(Array.from(finalizedPericiaIds)));
  }, [finalizedPericiaIds]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pericias-agendar'],
    queryFn: () => periciaService.list(1, { limit: 300, search: '' }),
  });

  const confirmLotMutation = useMutation({
    mutationFn: async (lot: BatchLot) => {
      await agendaService.scheduleBatch({
        date: lot.date,
        time: lot.startTime,
        periciaIds: lot.items.map((item) => item.periciaId),
      });
      await Promise.all(
        lot.items.map((item) => periciaService.updateDates(item.periciaId, { dataAgendamento: item.scheduledAt })),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pericias-agendar'] });
      void queryClient.invalidateQueries({ queryKey: ['pericias'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const pendingPericias = useMemo(() => {
    const items = (data?.items ?? []) as Pericia[];
    return items.filter((item) => isPendingScheduling(item) && !finalizedPericiaIds.has(item.id));
  }, [data, finalizedPericiaIds]);

  const cityGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byCity = new Map<string, PrepItem[]>();

    pendingPericias.forEach((item) => {
      const city = toCityName(item.cidade);
      const shouldInclude =
        !query ||
        city.toLowerCase().includes(query) ||
        (item.autorNome ?? '').toLowerCase().includes(query) ||
        item.processoCNJ.toLowerCase().includes(query);

      if (shouldInclude) {
        const row: PrepItem = {
          id: item.id,
          processoCNJ: item.processoCNJ,
          autorNome: item.autorNome,
          cidade: city,
        };
        byCity.set(city, [...(byCity.get(city) ?? []), row]);
      }
    });

    return Array.from(byCity.entries())
      .map(([city, items]) => ({ city, items }))
      .sort((a, b) => b.items.length - a.items.length || a.city.localeCompare(b.city));
  }, [pendingPericias, search]);

  const selectedCityItems = useMemo(
    () => cityGroups.filter((group) => selectedCities.has(group.city)).flatMap((group) => group.items),
    [cityGroups, selectedCities],
  );

  const toggleCity = (city: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  };

  const addToPreparation = () => {
    if (selectedCityItems.length === 0) {
      toast.error('Selecione ao menos uma cidade.');
      return;
    }

    setPrepList((prev) => {
      const merged = new Map(prev.map((item) => [item.id, item]));
      selectedCityItems.forEach((item) => merged.set(item.id, item));
      return Array.from(merged.values());
    });

    setSelectedCities(new Set());
    setActiveTab('preparacao');
    toast.success('Perícias adicionadas à Lista de Preparação.');
  };

  const openScheduleModal = () => {
    if ((selectedCityItems.length > 0 ? selectedCityItems : prepList).length === 0) {
      toast.error('Selecione cidades na fila ou adicione itens à Lista de Preparação.');
      return;
    }
    setShowModal(true);
  };

  const exportWordZip = async (lot: BatchLot) => {
    const zip = new JSZip();

    lot.items.forEach((item, index) => {
      const dt = new Date(item.scheduledAt);
      const content = [
        'COMUNICADO DE AGENDAMENTO',
        '',
        `Processo: ${item.processoCNJ}`,
        `Parte: ${item.autorNome ?? '-'}`,
        `Cidade: ${item.cidade}`,
        `Data: ${dt.toLocaleDateString('pt-BR')}`,
        `Horário: ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        `Local: ${lot.location ?? '-'}`,
        `Modalidade: ${lot.modalidade ?? '-'}`,
      ].join('\n');

      zip.file(`agendamento-${String(index + 1).padStart(3, '0')}-${item.processoCNJ}.doc`, content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `lote-${lot.id}-modelos-word.zip`);
  };

  const generateLot = async () => {
    const base = selectedCityItems.length > 0 ? selectedCityItems : prepList;
    if (!date || !time) return toast.error('Defina data e horário inicial.');
    if (base.length === 0) return toast.error('Nenhuma perícia selecionada.');

    const lot: BatchLot = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      cityNames: Array.from(new Set(base.map((item) => item.cidade))),
      date,
      startTime: time,
      durationMinutes,
      intervalMinutes,
      location,
      modalidade,
      source: outputFormat,
      status: 'PENDENTE',
      items: generateScheduleRows(base, date, time, durationMinutes, intervalMinutes),
    };

    if (outputFormat === 'CSV') {
      const csv = buildCsv(lot);
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `lote-${lot.id}.csv`);
    } else {
      await exportWordZip(lot);
    }

    setHistory((prev) => [lot, ...prev]);
    setShowModal(false);
    setActiveTab('historico');
    toast.success('Lote gerado e enviado para Histórico de Lotes.');
  };

  const confirmLot = async (lotId: string) => {
    const lot = history.find((entry) => entry.id === lotId);
    if (!lot || lot.status === 'CONFIRMADO') return;

    try {
      await confirmLotMutation.mutateAsync(lot);
      setHistory((prev) => prev.map((entry) => (entry.id === lotId ? { ...entry, status: 'CONFIRMADO' } : entry)));
      setFinalizedPericiaIds((prev) => new Set([...Array.from(prev), ...lot.items.map((item) => item.periciaId)]));
      setPrepList((prev) => prev.filter((item) => !lot.items.some((lotItem) => lotItem.periciaId === item.id)));
      toast.success('Lote confirmado. Perícias movidas para histórico de agendadas.');
    } catch {
      toast.error('Não foi possível confirmar o lote.');
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar central de agendamento." />;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Central de Agendamento</h1>
            <p className="text-sm text-muted-foreground">Fila por cidade, lista de preparação e histórico de lotes.</p>
          </div>
          <Tabs
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as Tab)}
            tabs={TAB_OPTIONS}
          />
        </div>
      </Card>

      {activeTab === 'fila' && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold">Fila de Espera por Cidade</p>
              <p className="text-sm text-muted-foreground">Selecione cidades para adicionar na lista ou agendar agora.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={addToPreparation}><Plus className="mr-1 h-4 w-4" />Adicionar à Lista</Button>
              <Button onClick={openScheduleModal}><CalendarClock className="mr-1 h-4 w-4" />Agendar Agora</Button>
            </div>
          </div>

          <Input placeholder="Buscar por cidade, parte ou CNJ..." value={search} onChange={(e) => setSearch(e.target.value)} />

          {cityGroups.length === 0 ? (
            <EmptyState title="Nenhuma perícia pendente para agendamento." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {cityGroups.map((group) => {
                const selected = selectedCities.has(group.city);
                return (
                  <button
                    className={`rounded-lg border p-3 text-left transition ${selected ? 'border-primary bg-primary/10' : 'hover:border-primary/50'}`}
                    key={group.city}
                    onClick={() => toggleCity(group.city)}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-semibold">{group.city}</p>
                      <p className="text-2xl font-bold">{group.items.length}</p>
                    </div>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />Cidade</p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'preparacao' && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold">Lista de Preparação</p>
              <p className="text-sm text-muted-foreground">Itens prontos para gerar lote de agendamento.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPrepList([])}><Trash2 className="mr-1 h-4 w-4" />Limpar lista</Button>
              <Button onClick={openScheduleModal}><CalendarClock className="mr-1 h-4 w-4" />Gerar lote</Button>
            </div>
          </div>

          {prepList.length === 0 ? (
            <EmptyState title="Nenhuma perícia na Lista de Preparação." />
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {prepList.map((item) => (
                <Card className="space-y-1 p-3" key={item.id}>
                  <p className="font-mono text-xs text-muted-foreground">{item.processoCNJ}</p>
                  <p className="text-sm font-semibold">{item.autorNome || 'Sem parte autora'}</p>
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{item.cidade}</p>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'historico' && (
        <Card className="space-y-3">
          <div>
            <p className="text-lg font-semibold">Histórico de Lotes</p>
            <p className="text-sm text-muted-foreground">Lotes gerados e pendências de confirmação.</p>
          </div>

          {history.length === 0 ? (
            <EmptyState title="Nenhum lote gerado ainda." />
          ) : (
            <div className="space-y-2">
              {history.map((lot) => (
                <Card className="space-y-3 p-3" key={lot.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">Agendamento {new Date(lot.createdAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">{lot.items.length} itens • {lot.cityNames.join(', ')} • via {lot.source}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lot.status === 'CONFIRMADO' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {lot.status === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDENTE CONFIRMAÇÃO'}
                    </span>
                  </div>

                  <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                    <p className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />Início: {lot.startTime}</p>
                    <p className="inline-flex items-center gap-1"><List className="h-3 w-3" />Intervalo: {lot.intervalMinutes} min</p>
                    <p className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />Local: {lot.location || '—'}</p>
                    <p className="inline-flex items-center gap-1"><FileArchive className="h-3 w-3" />Modalidade: {lot.modalidade || '—'}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadBlob(new Blob([buildCsv(lot)], { type: 'text/csv;charset=utf-8;' }), `lote-${lot.id}.csv`)}>
                      <Download className="mr-1 h-4 w-4" />CSV
                    </Button>
                    {lot.source === 'WORD' && (
                      <Button size="sm" variant="outline" onClick={() => void exportWordZip(lot)}>
                        <Download className="mr-1 h-4 w-4" />Word ZIP
                      </Button>
                    )}
                    {lot.status !== 'CONFIRMADO' && (
                      <Button className="bg-success text-success-foreground hover:bg-success/90" disabled={confirmLotMutation.isPending} onClick={() => void confirmLot(lot.id)} size="sm">
                        <Check className="mr-1 h-4 w-4" />Confirmar Agendamento
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <Card className="w-full max-w-4xl p-0">
            <div className="flex items-center justify-between rounded-t-lg bg-primary px-4 py-3 text-primary-foreground">
              <div>
                <p className="text-xl font-semibold">Novo Agendamento</p>
                <p className="text-xs opacity-90">{(selectedCityItems.length > 0 ? selectedCityItems : prepList).length} perícias selecionadas</p>
              </div>
              <button className="opacity-80 hover:opacity-100" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-[1fr_2fr]">
              <Card className="space-y-2 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Itens selecionados</p>
                <div className="max-h-80 space-y-2 overflow-auto">
                  {(selectedCityItems.length > 0 ? selectedCityItems : prepList).map((item) => (
                    <Card className="bg-muted/30 p-2" key={item.id}>
                      <p className="font-mono text-xs">{item.processoCNJ}</p>
                      <p className="text-xs text-muted-foreground">{item.cidade}</p>
                    </Card>
                  ))}
                </div>
              </Card>

              <Card className="space-y-3 p-3">
                <p className="text-lg font-semibold">Parâmetros do Lote</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-medium">Data</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div><label className="mb-1 block text-xs font-medium">Início</label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
                  <div><label className="mb-1 block text-xs font-medium">Duração (min)</label><Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value || 0))} /></div>
                  <div><label className="mb-1 block text-xs font-medium">Pausa (min)</label><Input type="number" value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value || 0))} /></div>
                  <div><label className="mb-1 block text-xs font-medium">Local</label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Fórum Central" /></div>
                  <div><label className="mb-1 block text-xs font-medium">Modalidade</label><Input value={modalidade} onChange={(e) => setModalidade(e.target.value)} placeholder="Presencial / Tele" /></div>
                </div>

                <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
                  <span>Saída:</span>
                  <Button onClick={() => setOutputFormat('CSV')} size="sm" variant={outputFormat === 'CSV' ? 'default' : 'outline'}>CSV</Button>
                  <Button onClick={() => setOutputFormat('WORD')} size="sm" variant={outputFormat === 'WORD' ? 'default' : 'outline'}>ZIP Word</Button>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => void generateLot()}>Aplicar e Gerar Lote</Button>
                </div>
              </Card>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FilaAgendamentoPage;
