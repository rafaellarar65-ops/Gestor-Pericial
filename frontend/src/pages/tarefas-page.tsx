import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tarefasPendentes = [
  { id: 'TAR-102', titulo: 'Confirmar documentos para perícia trabalhista', prazo: 'Hoje' },
  { id: 'TAR-118', titulo: 'Aprovar laudo enviado pela Central Técnica', prazo: 'Amanhã' },
  { id: 'TAR-121', titulo: 'Solicitar complementação ao assistente', prazo: 'Em 2 dias' },
];

const TarefasPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tarefas Operacionais</h1>
      <Card className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">Foco em acompanhar e executar pendências da operação diária.</p>
        <ul className="space-y-2">
          {tarefasPendentes.map((tarefa) => (
            <li key={tarefa.id} className="rounded-md border p-3">
              <p className="font-medium">{tarefa.titulo}</p>
              <p className="text-sm text-muted-foreground">
                {tarefa.id} • Prazo: {tarefa.prazo}
              </p>
            </li>
          ))}
        </ul>
        <Button>Marcar selecionadas como concluídas</Button>
      </Card>
    </div>
  );
};

export default TarefasPage;
