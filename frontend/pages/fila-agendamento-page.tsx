import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ListFilter, MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { periciaService } from '@/services/pericia-service';
import type { StageListItem } from '@/types/api';

type Tab = 'fila' | 'preparacao';

const PREP_KEY = 'agendamento.preparacao';

const FilaAgendamentoPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('fila');
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [prepList, setPrepList] = useState<StageListItem[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fila-agendamento-cidades'],
    queryFn: () => periciaService.filaAgendamentoPorCidade(),
  });

  useEffect(() => {
    const prepRaw = localStorage.getItem(PREP_KEY);
    if (prepRaw) setPrepList(JSON.parse(prepRaw) as StageListItem[]);
  }, []);

  useEffect(() => {
    localStorage.setItem(PREP_KEY, JSON.stringify(prepList));
  }, [prepList]);

  const cityGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const groups = data?.cities ?? [];
    if (!q) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.processoCNJ.toLowerCase().includes(q) ||
            item.autorNome.toLowerCase().includes(q) ||
            group.cidade.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0)
      .map((group) => ({ ...group, total: group.items.length }));
  }, [data, search]);

  const selectedCityItems = useMemo(
    () => cityGroups.filter((group) => selectedCities.has(group.cidade)).flatMap((group) => group.items),
    [cityGroups, selectedCities],
  );

  const toggleCity = (city: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      next.has(city) ? next.delete(city) : next.add(city);
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
    toast.success('Perícias adicionadas à lista de preparação.');
  };

  const removePrepItem = (id: string) => {
    setPrepList((prev) => prev.filter((item) => item.id !== id));
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Falha ao carregar a fila por cidade" />;

  return (
    <div className="space-y-4">
      <header className="rounded-xl border bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-1 text-blue-600" size={22} />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Central de Agendamento (Presencial)</h1>
              <p className="text-sm text-slate-500">Fila de espera por cidade e lista de preparação de lotes.</p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            <button className="rounded-md bg-white px-3 py-1.5 font-semibold text-blue-700" type="button">
              Fila por Cidade
            </button>
            <button className="rounded-md px-3 py-1.5 text-slate-600" type="button">
              Lista de Preparação
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Button onClick={() => setActiveTab('fila')} variant={activeTab === 'fila' ? 'default' : 'outline'}>
          <ListFilter className="mr-2" size={14} />
          Fila
        </Button>
        <Button onClick={() => setActiveTab('preparacao')} variant={activeTab === 'preparacao' ? 'default' : 'outline'}>
          <Plus className="mr-2" size={14} />
          Preparação ({prepList.length})
        </Button>
      </div>

      {activeTab === 'fila' ? (
        <>
          <Card className="p-4">
            <Input
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por processo, autor ou cidade"
              value={search}
            />
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            {cityGroups.length === 0 ? (
              <div className="lg:col-span-2">
                <EmptyState title="Sem perícias na fila" />
              </div>
            ) : (
              cityGroups.map((group) => (
                <Card className="p-4" key={group.cidade}>
                  <div className="mb-3 flex items-center justify-between">
                    <button className="flex items-center gap-2 text-left" onClick={() => toggleCity(group.cidade)} type="button">
                      <input checked={selectedCities.has(group.cidade)} readOnly type="checkbox" />
                      <MapPin size={14} />
                      <span className="font-semibold">{group.cidade}</span>
                    </button>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">{group.total}</span>
                  </div>
                  <ul className="space-y-2">
                    {group.items.slice(0, 6).map((item) => (
                      <li className="rounded border px-3 py-2 text-sm" key={item.id}>
                        <p className="font-mono text-xs text-gray-500">{item.processoCNJ}</p>
                        <p>{item.autorNome || '—'}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={addToPreparation}>Adicionar cidades selecionadas</Button>
          </div>
        </>
      ) : (
        <Card className="p-4">
          {prepList.length === 0 ? (
            <EmptyState title="Lista de preparação vazia" />
          ) : (
            <ul className="space-y-2">
              {prepList.map((item) => (
                <li className="flex items-center justify-between rounded border px-3 py-2" key={item.id}>
                  <div>
                    <p className="font-mono text-xs text-gray-500">{item.processoCNJ}</p>
                    <p className="text-sm">
                      {item.autorNome || '—'} · {item.cidade}
                    </p>
                  </div>
                  <Button onClick={() => removePrepItem(item.id)} size="sm" variant="ghost">
                    <Trash2 size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default FilaAgendamentoPage;
