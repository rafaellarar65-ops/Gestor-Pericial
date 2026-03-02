import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { cn } from '@/lib/utils';
import { periciaService } from '@/services/pericia-service';
import type { TelepericiaQueueItem, TelepericiaQueueResponse } from '@/types/api';

type ActiveTab = 'fila' | 'slots' | 'qr_upload';
type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED';

type SlotViewModel = {
  id: string;
  dayLabel: string;
  date: string;
  start: string;
  end: string;
  status: SlotStatus;
  periciaId?: string;
};

const toDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
};

const resolvePhone = (item: TelepericiaQueueItem) => {
  const digits = (item.processoCNJ || '').replace(/\D/g, '');
  return digits.slice(-11) || '5500000000000';
};

const buildTemplateMessage = (item: TelepericiaQueueItem) =>
  `Olá ${item.periciadoNome ?? 'paciente'}, confirmando sua teleperícia do processo ${item.processoCNJ}.`;

const whatsappStatusClass: Record<string, string> = {
  CONFIRMADO: 'bg-emerald-100 text-emerald-700',
  ENVIADA: 'bg-blue-100 text-blue-700',
  FALHA: 'bg-rose-100 text-rose-700',
  PENDENTE: 'bg-slate-100 text-slate-700',
};

const WhatsAppBadge = ({ status }: { status?: string }) => {
  const safeStatus = status ?? 'PENDENTE';
  return (
    <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-semibold', whatsappStatusClass[safeStatus] ?? whatsappStatusClass.PENDENTE)}>
      {safeStatus}
    </span>
  );
};

const buildWeeklySlots = (queueItems: TelepericiaQueueItem[]): SlotViewModel[] => {
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const slots: SlotViewModel[] = [];
  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

  for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + dayIndex);

    for (let hour = 8; hour < 18; hour += 1) {
      for (const minute of [0, 30]) {
        const start = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const endDate = new Date(currentDay);
        endDate.setHours(hour, minute + 30, 0, 0);
        const end = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        const queueItem = queueItems[(dayIndex * 20 + hour + minute) % Math.max(queueItems.length, 1)];
        const slotIndex = dayIndex * 20 + (hour - 8) * 2 + (minute === 30 ? 1 : 0);
        const status: SlotStatus = slotIndex % 7 === 0 ? 'BLOCKED' : slotIndex % 3 === 0 ? 'BOOKED' : 'AVAILABLE';

        slots.push({
          id: `${currentDay.toISOString().slice(0, 10)}-${start}`,
          date: currentDay.toISOString().slice(0, 10),
          dayLabel: dayNames[dayIndex],
          start,
          end,
          status,
          periciaId: status === 'BOOKED' ? queueItem?.id : undefined,
        });
      }
    }
  }

  // TODO: integrar com endpoint real de slots/agenda de teleperícia quando disponível no backend.
  return slots;
};

const FilaTab = ({
  rows,
  attemptMutation,
  urgentMutation,
}: {
  rows: TelepericiaQueueItem[];
  attemptMutation: { isPending: boolean; mutate: (vars: { id: string; status?: string }) => void };
  urgentMutation: { isPending: boolean; mutate: (vars: { id: string; isUrgent: boolean }) => void };
}) => {
  if (rows.length === 0) {
    return <EmptyState title="Sem perícias em modalidade teleperícia na fila." />;
  }

  return (
    <Card className="overflow-auto border p-0 shadow-sm">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">CNJ / Periciado</th>
            <th className="px-4 py-3">WhatsApp</th>
            <th className="px-4 py-3">Última tentativa</th>
            <th className="px-4 py-3">Confirmação</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const phone = resolvePhone(item);
            const message = buildTemplateMessage(item);
            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            return (
              <tr className="border-t" key={item.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-blue-700">{item.processoCNJ}</div>
                  <div className="text-xs text-muted-foreground">{item.periciadoNome ?? item.autorNome ?? 'Sem nome'}</div>
                </td>
                <td className="px-4 py-3"><WhatsAppBadge status={item.whatsappStatus} /></td>
                <td className="px-4 py-3">{toDateTime(item.telepericiaLastAttemptAt)}</td>
                <td className="px-4 py-3">{toDateTime(item.telepericiaConfirmedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => window.open(waLink, '_blank', 'noopener,noreferrer')} size="sm" variant="outline">
                      WhatsApp
                    </Button>
                    <Button
                      disabled={attemptMutation.isPending}
                      onClick={() => attemptMutation.mutate({ id: item.id, status: 'CONFIRMADO' })}
                      size="sm"
                      variant="outline"
                    >
                      Confirmar
                    </Button>
                    <Button
                      disabled={urgentMutation.isPending}
                      onClick={() => urgentMutation.mutate({ id: item.id, isUrgent: !item.isUrgent })}
                      size="sm"
                      variant={item.isUrgent ? 'default' : 'secondary'}
                    >
                      {item.isUrgent ? 'Urgente ✓' : 'Urgente'}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const SlotsTab = ({ rows }: { rows: TelepericiaQueueItem[] }) => {
  const [selectedSlot, setSelectedSlot] = useState<SlotViewModel | null>(null);
  const [selectedPericiaId, setSelectedPericiaId] = useState<string>('');
  const slots = useMemo(() => buildWeeklySlots(rows), [rows]);
  const groupedByDay = useMemo(
    () =>
      ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((day) => ({
        day,
        items: slots.filter((slot) => slot.dayLabel === day),
      })),
    [slots],
  );

  return (
    <div className="space-y-4">
      <Card className="overflow-auto border p-4 shadow-sm">
        <div className="grid min-w-[980px] grid-cols-5 gap-3">
          {groupedByDay.map((column) => (
            <div key={column.day}>
              <h3 className="mb-2 font-semibold text-slate-700">{column.day}</h3>
              <div className="space-y-1.5">
                {column.items.map((slot) => (
                  <button
                    className={cn(
                      'flex w-full items-center justify-between rounded-md border px-2 py-1 text-xs',
                      slot.status === 'AVAILABLE' && 'border-emerald-300 bg-emerald-50 text-emerald-800',
                      slot.status === 'BOOKED' && 'border-rose-300 bg-rose-50 text-rose-800',
                      slot.status === 'BLOCKED' && 'border-slate-300 bg-slate-100 text-slate-500',
                    )}
                    disabled={slot.status !== 'AVAILABLE'}
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setSelectedPericiaId('');
                    }}
                    type="button"
                  >
                    <span>{slot.start}</span>
                    <span>{slot.status === 'AVAILABLE' ? 'Disponível' : slot.status === 'BOOKED' ? 'Ocupado' : 'Bloqueado'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog onClose={() => setSelectedSlot(null)} open={Boolean(selectedSlot)} title="Vincular perícia ao slot">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Slot selecionado: <strong>{selectedSlot?.dayLabel} {selectedSlot?.start} - {selectedSlot?.end}</strong>
          </p>

          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            onChange={(event) => setSelectedPericiaId(event.target.value)}
            value={selectedPericiaId}
          >
            <option value="">Selecione uma perícia da fila...</option>
            {rows.map((item) => (
              <option key={item.id} value={item.id}>{item.processoCNJ} — {item.periciadoNome ?? item.autorNome ?? 'Sem nome'}</option>
            ))}
          </select>

          <Button
            className="w-full"
            disabled={!selectedPericiaId}
            onClick={() => {
              toast.success('Vínculo salvo localmente (mock).');
              setSelectedSlot(null);
            }}
          >
            Vincular perícia ao slot
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

const QrUploadTab = ({ rows }: { rows: TelepericiaQueueItem[] }) => {
  const confirmedRows = rows.filter((item) => Boolean(item.telepericiaConfirmedAt));

  if (confirmedRows.length === 0) {
    return <EmptyState title="Não há perícias confirmadas para geração de QR." />;
  }

  return (
    <div className="space-y-4">
      <Card className="border p-4 shadow-sm">
        <h3 className="mb-2 text-base font-semibold">Instruções para o periciado</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Acesse o link recebido no WhatsApp ou QR informado pelo assistente.</li>
          <li>Faça login com os dados orientados e confira seu nome/processo.</li>
          <li>Clique em “Enviar documentos” e anexe fotos nítidas dos arquivos solicitados.</li>
          <li>Confirme o envio e aguarde o retorno da equipe pericial.</li>
        </ol>
      </Card>

      <Card className="overflow-auto border p-0 shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">CNJ / Periciado</th>
              <th className="px-4 py-3">Confirmado em</th>
              <th className="px-4 py-3">URL de upload</th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {confirmedRows.map((item) => {
              const uploadUrl = `/mobile-upload/${item.id}`;
              return (
                <tr className="border-t" key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-blue-700">{item.processoCNJ}</div>
                    <div className="text-xs text-muted-foreground">{item.periciadoNome ?? item.autorNome ?? 'Sem nome'}</div>
                  </td>
                  <td className="px-4 py-3">{toDateTime(item.telepericiaConfirmedAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{uploadUrl}</td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => {
                        void navigator.clipboard.writeText(uploadUrl);
                        toast.success('URL do QR copiada para compartilhamento.');
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Gerar QR
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const Page = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('fila');
  const { data, isLoading, isError } = useQuery<TelepericiaQueueResponse>({
    queryKey: ['telepericia', 'queue'],
    queryFn: () => periciaService.telepericiaQueue(),
  });

  const urgentMutation = useMutation({
    mutationFn: ({ id, isUrgent }: { id: string; isUrgent: boolean }) => periciaService.updateUrgent(id, isUrgent),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telepericia', 'queue'] });
      toast.success('Prioridade atualizada.');
    },
    onError: () => toast.error('Falha ao atualizar prioridade.'),
  });

  const attemptMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status?: string }) => periciaService.registerTelepericiaAttempt(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telepericia', 'queue'] });
      toast.success('Tentativa registrada.');
    },
    onError: () => toast.error('Falha ao registrar tentativa.'),
  });

  const rows = useMemo(() => data?.items ?? [], [data]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar fila operacional de teleperícia." />;

  return (
    <div className="space-y-4">
      <header className="rounded-xl border bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MonitorPlay className="mt-1 text-violet-600" size={22} />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Central de Teleperícias</h1>
              <p className="text-sm text-slate-500">Gestão de agenda, contatos e links de videochamada.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1 text-sm">
            <button className={cn('rounded-md px-3 py-1.5', activeTab === 'fila' ? 'bg-white font-semibold text-violet-700' : 'text-slate-600')} onClick={() => setActiveTab('fila')} type="button">Fila</button>
            <button className={cn('rounded-md px-3 py-1.5', activeTab === 'slots' ? 'bg-white font-semibold text-violet-700' : 'text-slate-600')} onClick={() => setActiveTab('slots')} type="button">Slots</button>
            <button className={cn('rounded-md px-3 py-1.5', activeTab === 'qr_upload' ? 'bg-white font-semibold text-violet-700' : 'text-slate-600')} onClick={() => setActiveTab('qr_upload')} type="button">QR Upload</button>
          </div>
        </div>
      </header>

      {activeTab === 'fila' && <FilaTab attemptMutation={attemptMutation} rows={rows} urgentMutation={urgentMutation} />}
      {activeTab === 'slots' && <SlotsTab rows={rows} />}
      {activeTab === 'qr_upload' && <QrUploadTab rows={rows} />}
    </div>
  );
};

export default Page;
