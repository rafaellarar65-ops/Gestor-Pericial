import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check, Clock3, Download, FileArchive, List, MapPin, Plus, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { agendaService } from '@/services/agenda-service';
import { periciaService } from '@/services/pericia-service';
import type { Pericia } from '@/types/api';

type Tab = 'fila' | 'preparacao' | 'historico';

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

const toCityName = (cidade: Pericia['cidade']) =>
  typeof cidade === 'string' ? cidade : (cidade as { nome?: string })?.nome ?? 'Sem cidade';

const toStatusText = (status: Pericia['status']) =>
  typeof status === 'string' ? status : (status as { codigo?: string; nome?: string })?.codigo ?? (status as { nome?: string })?.nome ?? '';

const isPendingScheduling = (p: Pericia) => {
  const s = toStatusText(p.status).toUpperCase();
  if (p.dataAgendamento) return false;
  if (s.includes('FINALIZ') || s.includes('LAUDO') || s.includes('ESCLAR') || s.includes('ARQUIV')) return false;
  return true;
};

const generateScheduleRows = (
  items: PrepItem[],
  date: string,
  startTime: string,
  durationMinutes: number,
  intervalMinutes: number,
) => {
  const rows: LotItem[] = [];
  let current = new Date(`${date}T${startTime}:00`);

  items.forEach((item, index) => {
    const iso = current.toISOString();
    rows.push({
      id: `${item.id}-${index}`,
      processoCNJ: item.processoCNJ,
      periciaId: item.id,
      cidade: item.cidade,
      autorNome: item.autorNome,
      scheduledAt: iso,
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
    const date = dt.toLocaleDateString('pt-BR');
    const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return [
      item.processoCNJ,
      item.autorNome ?? '',
      item.cidade,
      date,
      time,
      lot.location ?? '',
      lot.modalidade ?? '',
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
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

  const [prepList, setPrepList] = useState<PrepItem[]>([]);
  const [history, setHistory] = useState<BatchLot[]>([]);
  const [finalizedPericiaIds, setFinalizedPericiaIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prepRaw = localStorage.getItem(PREP_KEY);
    const histRaw = localStorage.getItem(HISTORY_KEY);
    const finalizedRaw = localStorage.getItem(FINALIZED_KEY);

    if (prepRaw) setPrepList(JSON.parse(prepRaw) as PrepItem[]);
    if (histRaw) setHistory(JSON.parse(histRaw) as BatchLot[]);
    if (finalizedRaw) setFinalizedPericiaIds(new Set(JSON.parse(finalizedRaw) as string[]));
  }, []);

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
        lot.items.map((item) =>
          periciaService.updateDates(item.periciaId, {
            dataAgendamento: item.scheduledAt,
          }),
        ),
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
    return items.filter((p) => isPendingScheduling(p) && !finalizedPericiaIds.has(p.id));
  }, [data, finalizedPericiaIds]);

  const cityGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byCity = new Map<string, PrepItem[]>();

    pendingPericias.forEach((p) => {
      const city = toCityName(p.cidade);
      const row: PrepItem = {
        id: p.id,
        processoCNJ: p.processoCNJ,
        autorNome: p.autorNome,
        cidade: city,
      };
      if (!q || city.toLowerCase().includes(q) || (p.autorNome ?? '').toLowerCase().includes(q) || p.processoCNJ.toLowerCase().includes(q)) {
        byCity.set(city, [...(byCity.get(city) ?? []), row]);
      }
    });

    return Array.from(byCity.entries())
      .map(([city, items]) => ({ city, items }))
      .sort((a, b) => b.items.length - a.items.length || a.city.localeCompare(b.city));
  }, [pendingPericias, search]);

  const selectedCityItems = useMemo(() => {
    const citySet = selectedCities;
    return cityGroups.filter((group) => citySet.has(group.city)).flatMap((group) => group.items);
  }, [cityGroups, selectedCities]);

  const toggleCity = (city: string) => {
    setSelectedCities((prev) => {
    if (!search.trim()) return pending;
    const q = search.toLowerCase();
    return pending.filter(
      (p) => p.processoCNJ.toLowerCase().includes(q) || (p.autorNome ?? '').toLowerCase().includes(q) || (typeof p.cidade === 'string' ? p.cidade : (p.cidade as { nome?: string })?.nome ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const periciasPorCidade = useMemo<Record<string, Pericia[]>>(() => {
    return pericias.reduce<Record<string, Pericia[]>>((acc, pericia) => {
      const cidade =
        (typeof pericia.cidade === 'string'
          ? pericia.cidade
          : (pericia.cidade as { nome?: string })?.nome ?? '') || 'Cidade não informada';

      if (!acc[cidade]) acc[cidade] = [];
      acc[cidade].push(pericia);
      return acc;
    }, {});
  }, [pericias]);

  const cidades = useMemo(() => Object.keys(periciasPorCidade), [periciasPorCidade]);

  const allSelected = pericias.length > 0 && pericias.every((p) => selected.has(p.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pericias.map((p) => p.id)));
    }
  }

  function toggleGroup(cidade: string) {
    const group = periciasPorCidade[cidade] ?? [];
    const groupIds = group.map((p) => p.id);
    const groupSelected = groupIds.length > 0 && groupIds.every((id) => selected.has(id));

    setSelected((prev) => {
      const next = new Set(prev);

      if (groupSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
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
    const base = selectedCityItems.length > 0 ? selectedCityItems : prepList;
    if (base.length === 0) {
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

    if (!date || !time) {
      toast.error('Defina data e horário inicial.');
      return;
    }

    if (base.length === 0) {
      toast.error('Nenhuma perícia selecionada.');
      return;
    }

    const items = generateScheduleRows(base, date, time, durationMinutes, intervalMinutes);
    const lot: BatchLot = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      cityNames: Array.from(new Set(base.map((i) => i.cidade))),
      date,
      startTime: time,
      durationMinutes,
      intervalMinutes,
      location,
      modalidade,
      source: outputFormat,
      status: 'PENDENTE',
      items,
    };

    if (outputFormat === 'CSV') {
      const csv = buildCsv(lot);
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `lote-${lot.id}.csv`);
    } else {
      await exportWordZip(lot);
    }

    setHistory((prev) => [lot, ...prev]);
    setActiveTab('historico');
    setShowModal(false);
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
      <header className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Central de Agendamento (Presencial)</h1>
            <p className="text-sm text-muted-foreground">Fila por cidade, lista de preparação e histórico de lotes.</p>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
            <button className={`rounded-md px-3 py-1.5 ${activeTab === 'fila' ? 'bg-white font-semibold text-blue-700 shadow' : 'text-slate-600'}`} onClick={() => setActiveTab('fila')}>
              Fila por Cidade
            </button>
            <button className={`rounded-md px-3 py-1.5 ${activeTab === 'preparacao' ? 'bg-white font-semibold text-blue-700 shadow' : 'text-slate-600'}`} onClick={() => setActiveTab('preparacao')}>
              Lista de Preparação {prepList.length > 0 && <span className="ml-1 rounded-full bg-blue-100 px-1.5 text-xs">{prepList.length}</span>}
            </button>
            <button className={`rounded-md px-3 py-1.5 ${activeTab === 'historico' ? 'bg-white font-semibold text-blue-700 shadow' : 'text-slate-600'}`} onClick={() => setActiveTab('historico')}>
              Histórico de Lotes
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'fila' && (
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xl font-semibold">Fila de Espera (Por Cidade)</p>
              <p className="text-sm text-muted-foreground">Selecione cidades para adicionar na lista ou agendar agora.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={addToPreparation}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar à Lista
              </Button>
              <Button onClick={openScheduleModal}>
                <CalendarClock className="mr-1 h-4 w-4" /> Agendar Agora
              </Button>
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
                    key={group.city}
                    className={`rounded-lg border p-4 text-left transition ${selected ? 'border-blue-500 bg-blue-50' : 'hover:border-slate-300'}`}
                    onClick={() => toggleCity(group.city)}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-semibold">{group.city}</p>
                      <p className="text-3xl font-bold text-slate-700">{group.items.length}</p>
                    </div>
                    <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> Cidade
                    </p>
                    {selected && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                        <Check className="h-3 w-3" /> Selecionada
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'preparacao' && (
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xl font-semibold">Lista de Preparação</p>
              <p className="text-sm text-muted-foreground">Perícias adicionadas para montagem de lotes.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPrepList([])} disabled={prepList.length === 0}>
                <Trash2 className="mr-1 h-4 w-4" /> Limpar Lista
              </Button>
              <Button onClick={openScheduleModal} disabled={prepList.length === 0}>
                <Download className="mr-1 h-4 w-4" /> Gerar Agendamento
              </Button>
            </div>
          </div>

          {prepList.length === 0 ? (
            <EmptyState title="A lista de preparação está vazia." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-2 py-2 text-left">Processo</th>
                    <th className="px-2 py-2 text-left">Parte</th>
                    <th className="px-2 py-2 text-left">Cidade</th>
                    <th className="px-2 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {prepList.map((item) => (
                    <tr className="border-b" key={item.id}>
                      <td className="px-2 py-2 font-mono text-xs">{item.processoCNJ}</td>
                      <td className="px-2 py-2">{item.autorNome ?? '—'}</td>
                      <td className="px-2 py-2">{item.cidade}</td>
                      <td className="px-2 py-2 text-right">
                        <button className="text-red-500 hover:text-red-700" onClick={() => setPrepList((prev) => prev.filter((p) => p.id !== item.id))}>
                          <Trash2 className="inline h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button
            disabled={mutation.isPending || selected.size === 0 || !date || !time}
            onClick={onSchedule}
            className="self-end"
          >
            {mutation.isPending ? 'Agendando...' : `Agendar ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </Button>
        </div>
      </Card>

      {/* Search */}
      <Input
        placeholder="Buscar por CNJ, autor ou cidade…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {pericias.length === 0 ? (
        <EmptyState title="Nenhuma perícia aguardando agendamento." />
      ) : (
        <Card>
          <div className="border-b bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            <button onClick={toggleAll} type="button" className="inline-flex items-center gap-2">
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              Selecionar todas as perícias exibidas
            </button>
          </div>

          <div className="divide-y">
            {cidades.map((cidade) => {
              const group = periciasPorCidade[cidade] ?? [];
              const groupIds = group.map((p) => p.id);
              const groupSelected = groupIds.length > 0 && groupIds.every((id) => selected.has(id));

              return (
                <section key={cidade} className="p-4">
                  <header className="mb-3 flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-800">{cidade}</h2>
                      <p className="text-xs text-muted-foreground">{group.length} perícia(s) pendente(s)</p>
                    </div>
                    <button
                      onClick={() => toggleGroup(cidade)}
                      type="button"
                      className="inline-flex items-center gap-2 text-xs font-medium text-slate-700"
                    >
                      {groupSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                      {groupSelected ? 'Desselecionar grupo' : 'Selecionar grupo'}
                    </button>
                  </header>

                  <div className="space-y-2">
                    {group.map((p) => {
                      const isChecked = selected.has(p.id);
                      const statusLabel = typeof p.status === 'string' ? p.status : (p.status as { nome?: string })?.nome ?? '—';

                      return (
                        <article
                          key={p.id}
                          className={`cursor-pointer rounded-md border px-3 py-2 transition-colors ${isChecked ? 'border-blue-200 bg-blue-50' : 'hover:bg-slate-50'}`}
                          onClick={() => toggleOne(p.id)}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-2">
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-400" />
                              )}
                              <span className="font-mono text-xs">{p.processoCNJ}</span>
                            </div>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {statusLabel}
                            </span>
                          </div>
                          <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                            <p>
                              <span className="font-medium text-slate-700">Autor:</span> {p.autorNome ?? '—'}
                            </p>
                            <p>
                              <span className="font-medium text-slate-700">Agendamento atual:</span>{' '}
                              {p.dataAgendamento ? new Date(p.dataAgendamento).toLocaleDateString('pt-BR') : '—'}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === 'historico' && (
        <Card className="space-y-3 p-4">
          <h2 className="text-xl font-semibold">Histórico de Lotes</h2>
          {history.length === 0 ? (
            <EmptyState title="Nenhum lote gerado até o momento." />
          ) : (
            history.map((lot) => (
              <div className="rounded-lg border p-3" key={lot.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">Agendamento {new Date(lot.createdAt).toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-slate-500">{lot.items.length} itens • {lot.cityNames.join(', ')} • via {lot.source}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lot.status === 'CONFIRMADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {lot.status === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDENTE CONFIRMAÇÃO'}
                  </span>
                </div>

                <div className="grid gap-1 text-xs text-slate-600 md:grid-cols-2">
                  <p className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Início: {lot.startTime}</p>
                  <p className="inline-flex items-center gap-1"><List className="h-3 w-3" /> Intervalo: {lot.intervalMinutes} min</p>
                  <p className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Local: {lot.location || '—'}</p>
                  <p className="inline-flex items-center gap-1"><FileArchive className="h-3 w-3" /> Modalidade: {lot.modalidade || '—'}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {lot.status !== 'CONFIRMADO' && (
                    <Button
                      disabled={confirmLotMutation.isPending}
                      onClick={() => void confirmLot(lot.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirmar Agendamento
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-blue-600 px-5 py-4 text-white">
              <div>
                <p className="text-2xl font-semibold">Novo Agendamento</p>
                <p className="text-xs text-white/80">{(selectedCityItems.length > 0 ? selectedCityItems : prepList).length} perícias selecionadas</p>
              </div>
              <button className="text-white/80 hover:text-white" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-[1fr_2fr]">
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Itens selecionados</p>
                <div className="max-h-80 space-y-2 overflow-auto">
                  {(selectedCityItems.length > 0 ? selectedCityItems : prepList).map((item) => (
                    <div className="rounded border bg-slate-50 p-2" key={item.id}>
                      <p className="font-mono text-xs">{item.processoCNJ}</p>
                      <p className="text-xs text-slate-600">{item.cidade}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-lg font-semibold">Parâmetros do Lote</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Data</label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Início</label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Duração de cada exame (min)</label>
                    <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value || 0))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Pausa entre exames (min)</label>
                    <Input type="number" value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value || 0))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Local</label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Fórum Central" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Modalidade</label>
                    <Input value={modalidade} onChange={(e) => setModalidade(e.target.value)} placeholder="Presencial / Tele" />
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
                  <span>Saída:</span>
                  <button className={`rounded px-2 py-1 ${outputFormat === 'CSV' ? 'bg-blue-600 text-white' : 'bg-white'}`} onClick={() => setOutputFormat('CSV')}>
                    CSV (modelo antigo)
                  </button>
                  <button className={`rounded px-2 py-1 ${outputFormat === 'WORD' ? 'bg-blue-600 text-white' : 'bg-white'}`} onClick={() => setOutputFormat('WORD')}>
                    ZIP Word (novo)
                  </button>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => void generateLot()}>Aplicar e Gerar Lote</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilaAgendamentoPage;
