import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBatchSchedule } from '@/hooks/use-agenda';

const AgendarLotePage = () => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);
  const mutation = useBatchSchedule();
  const selectedPericiaIds = ['p1', 'p2'];

  const submit = async (): Promise<void> => {
    setFeedbackMessage(null);
    setFeedbackType(null);

    try {
      await mutation.mutateAsync({
        date,
        time,
        periciaIds: selectedPericiaIds,
      });

      const successMessage = 'Agendamento em lote confirmado com sucesso.';
      setFeedbackMessage(successMessage);
      setFeedbackType('success');
      toast.success(successMessage);
    } catch {
      const errorMessage = 'Não foi possível confirmar o lote. Tente novamente.';
      setFeedbackMessage(errorMessage);
      setFeedbackType('error');
      toast.error(errorMessage);
    }
  };

  const isSubmitDisabled = !date || !time || selectedPericiaIds.length === 0 || mutation.isPending;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Agendar em Lote</h1>
      <Card className="space-y-3">
        <p>StepWizard: seleção → data/hora → revisão → confirmação</p>
        <Input aria-label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input aria-label="Hora" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <Button disabled={isSubmitDisabled} onClick={() => void submit()}>
          {mutation.isPending ? 'Aplicando...' : 'Confirmar lote'}
        </Button>
        {feedbackMessage ? (
          <p className={feedbackType === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-600'} role="status">
            {feedbackMessage}
          </p>
        ) : null}
      </Card>
    </div>
  );
};

export default AgendarLotePage;
