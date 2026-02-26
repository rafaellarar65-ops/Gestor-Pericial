import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBatchSchedule } from '@/hooks/use-agenda';

const FilaAgendamentoPage = () => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const mutation = useBatchSchedule();

  const submit = async (): Promise<void> => {
    await mutation.mutateAsync({
      date,
      time,
      periciaIds: ['p1', 'p2'],
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Fila de Agendamento</h1>
      <Card className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Gerencie perícias aguardando janela de agenda e aplique data/hora em lote.
        </p>
        <Input aria-label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input aria-label="Hora" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <Button onClick={() => void submit()}>{mutation.isPending ? 'Aplicando...' : 'Agendar itens da fila'}</Button>
      </Card>
    </div>
  );
};

export default FilaAgendamentoPage;
