import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type AgendaSheetEvent = {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  location: string;
  status: string;
  description?: string;
};

type EventDetailSheetProps = {
  event: AgendaSheetEvent | null;
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: Partial<AgendaSheetEvent>) => void;
};

const toInputDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const fromInputDateTime = (value: string) => (value ? new Date(value).toISOString() : '');

export const EventDetailSheet = ({ event, open, onClose, onSave, saving }: EventDetailSheetProps) => {
  const [form, setForm] = useState<AgendaSheetEvent | null>(event);

  useEffect(() => {
    setForm(event);
  }, [event]);

  if (!open || !form) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Detalhes do evento</h2>
        <Button onClick={onClose} size="sm" variant="outline">
          Fechar
        </Button>
      </div>
      <div className="space-y-3 p-4">
        <Input onChange={(e) => setForm({ ...form, title: e.target.value })} value={form.title} />
        <Input onChange={(e) => setForm({ ...form, type: e.target.value })} value={form.type} />
        <Input onChange={(e) => setForm({ ...form, location: e.target.value })} value={form.location} />
        <Input
          onChange={(e) => setForm({ ...form, startAt: fromInputDateTime(e.target.value) })}
          type="datetime-local"
          value={toInputDateTime(form.startAt)}
        />
        <Input
          onChange={(e) => setForm({ ...form, endAt: fromInputDateTime(e.target.value) })}
          type="datetime-local"
          value={toInputDateTime(form.endAt)}
        />
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          value={form.status}
        >
          <option value="agendado">Agendado</option>
          <option value="realizado">Realizado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Descrição"
          value={form.description ?? ''}
        />
        <Button className="w-full" disabled={saving} onClick={() => onSave(form)}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </aside>
  );
};
