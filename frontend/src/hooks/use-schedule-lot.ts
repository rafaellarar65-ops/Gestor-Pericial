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

export type LotValidationReason =
  | 'ALREADY_CONFIRMED'
  | 'PAST_DATE'
  | 'INVALID_DATETIME'
  | 'INTRA_BATCH_COLLISION';

export type LotConflict = {
  item: LotItem;
  reason: LotValidationReason;
  detail: string;
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
  const lotSeed = useMemo(
    () => `${params.date}|${params.startTime}|${params.durationMinutes}|${params.intervalMinutes}|${items.map((item) => item.id).join(',')}`,
    [items, params.date, params.durationMinutes, params.intervalMinutes, params.startTime],
  );

  const draftLot = useMemo<BatchLot | null>(() => {
    if (!params.date || !params.startTime || items.length === 0) return null;

    return {
      id: `draft-${lotSeed}`,
      createdAt: new Date(`${params.date}T${params.startTime}:00`).toISOString(),
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
  }, [
    items,
    lotSeed,
    params.date,
    params.durationMinutes,
    params.intervalMinutes,
    params.location,
    params.modalidade,
    params.source,
    params.startTime,
  ]);

  const conflicts = useMemo<LotConflict[]>(() => {
    if (!draftLot) return [];

    const issues: LotConflict[] = [];
    const now = Date.now();
    const byCityTime = new Map<string, LotItem[]>();

    draftLot.items.forEach((item) => {
      const startAtMs = new Date(item.scheduledAt).getTime();

      if (!Number.isFinite(startAtMs)) {
        issues.push({
          item,
          reason: 'INVALID_DATETIME',
          detail: 'Horário inválido para este item. Revise data/hora inicial e parâmetros do lote.',
        });
      } else if (startAtMs <= now) {
        issues.push({
          item,
          reason: 'PAST_DATE',
          detail: 'Horário no passado. Agende em uma data/horário futuro.',
        });
      }

      if (confirmedPericiaIds.has(item.periciaId)) {
        issues.push({
          item,
          reason: 'ALREADY_CONFIRMED',
          detail: 'Perícia já consta em lote confirmado.',
        });
      }

      const citySlotKey = `${item.cidade}|${item.scheduledAt}`;
      const citySlot = byCityTime.get(citySlotKey) ?? [];
      citySlot.push(item);
      byCityTime.set(citySlotKey, citySlot);
    });

    byCityTime.forEach((citySlotItems) => {
      if (citySlotItems.length < 2) return;
      citySlotItems.forEach((item) => {
        issues.push({
          item,
          reason: 'INTRA_BATCH_COLLISION',
          detail: 'Conflito intra-lote: mesma cidade e mesmo horário para mais de um item.',
        });
      });
    });

    return issues;
  }, [draftLot, confirmedPericiaIds]);

  const hasValidTiming = params.durationMinutes > 0 && params.intervalMinutes >= 0;
  const isValid = Boolean(draftLot && conflicts.length === 0 && hasValidTiming);

  return { draftLot, conflicts, isValid };
};
