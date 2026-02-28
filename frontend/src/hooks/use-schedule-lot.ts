import { useMemo } from 'react';

export type PrepItem = {
  id: string;
  processoCNJ: string;
  autorNome?: string;
  cidade: string;
};

export type LotItem = {
  id: string;
  processoCNJ: string;
  periciaId: string;
  cidade: string;
  autorNome?: string;
  scheduledAt: string;
};

export type BatchLot = {
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

export type ScheduleParams = {
  date: string;
  startTime: string;
  durationMinutes: number;
  intervalMinutes: number;
  location: string;
  modalidade: string;
  source: 'CSV' | 'WORD';
};

const generateScheduleRows = (items: PrepItem[], params: ScheduleParams) => {
  const rows: LotItem[] = [];
  let current = new Date(`${params.date}T${params.startTime}:00`);

  items.forEach((item, index) => {
    rows.push({
      id: `${item.id}-${index}`,
      processoCNJ: item.processoCNJ,
      periciaId: item.id,
      cidade: item.cidade,
      autorNome: item.autorNome,
      scheduledAt: current.toISOString(),
    });
    current = new Date(current.getTime() + (params.durationMinutes + params.intervalMinutes) * 60000);
  });

  return rows;
};

export const useScheduleLot = (items: PrepItem[], params: ScheduleParams, confirmedPericiaIds: Set<string>) => {
  const draftLot = useMemo<BatchLot | null>(() => {
    if (!params.date || !params.startTime || items.length === 0) return null;

    return {
      id: `draft-${Date.now()}`,
      createdAt: new Date().toISOString(),
      cityNames: Array.from(new Set(items.map((item) => item.cidade))),
      date: params.date,
      startTime: params.startTime,
      durationMinutes: params.durationMinutes,
      intervalMinutes: params.intervalMinutes,
      location: params.location,
      modalidade: params.modalidade,
      source: params.source,
      status: 'PENDENTE',
      items: generateScheduleRows(items, params),
    };
  }, [items, params]);

  const conflicts = useMemo(() => {
    if (!draftLot) return [];
    return draftLot.items.filter((item) => confirmedPericiaIds.has(item.periciaId));
  }, [draftLot, confirmedPericiaIds]);

  const isValid = Boolean(draftLot && conflicts.length === 0);

  return { draftLot, conflicts, isValid };
};
