import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBatchSchedule } from '@/hooks/use-agenda';

const AgendarLotePage = () => {
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
      <h1 className="text-2xl font-semibold">Agendar em Lote</h1>
      <Card className="space-y-3">
        <p>StepWizard: seleção → data/hora → revisão → confirmação</p>
        <Input aria-label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input aria-label="Hora" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <Button onClick={() => void submit()}>{mutation.isPending ? 'Aplicando...' : 'Confirmar lote'}</Button>
      </Card>
    </div>
  );
};

export default AgendarLotePage;
