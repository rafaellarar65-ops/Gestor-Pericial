import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, List, MapPin, Plus, Trash2 } from 'lucide-react';
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
      <div className="rounded-xl bg-yellow-500 px-6 py-5 text-white shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarClock size={22} />
            <div>
              <p className="text-lg font-bold">FILA DE AGENDAMENTO POR CIDADE</p>
              <p className="text-sm text-white/80">Segmentação entregue pelo backend (sem filtro duplicado no cliente).</p>
            </div>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{data?.total ?? 0} pendentes</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={activeTab === 'fila' ? 'default' : 'outline'} onClick={() => setActiveTab('fila')}><List className="mr-2" size={14} />Fila</Button>
        <Button variant={activeTab === 'preparacao' ? 'default' : 'outline'} onClick={() => setActiveTab('preparacao')}>
          <Plus className="mr-2" size={14} />Preparação ({prepList.length})
        </Button>
      </div>

      {activeTab === 'fila' ? (
        <>
          <Card className="p-4">
            <Input placeholder="Buscar por processo, autor ou cidade" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>

          <div className="space-y-3">
            {cityGroups.length === 0 ? (
              <EmptyState title="Sem perícias na fila" />
            ) : (
              cityGroups.map((group) => (
                <Card className="p-4" key={group.cidade}>
                  <div className="mb-3 flex items-center justify-between">
                    <button className="flex items-center gap-2 text-left" onClick={() => toggleCity(group.cidade)}>
                      <input type="checkbox" checked={selectedCities.has(group.cidade)} readOnly />
                      <MapPin size={14} />
                      <span className="font-semibold">{group.cidade}</span>
                    </button>
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">{group.total}</span>
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
                    <p className="text-sm">{item.autorNome || '—'} · {item.cidade}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removePrepItem(item.id)}>
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
