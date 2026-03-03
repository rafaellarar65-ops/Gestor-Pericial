import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DomainPageTemplate } from '@/components/domain/domain-page-template';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { usePericiaDetailQuery } from '@/hooks/use-pericias';
import { apiClient } from '@/lib/api-client';
import { configService } from '@/services/config-service';
import type { PericiaDetail } from '@/types/api';

const toDateInput = (value?: string) => {
  if (!value) return '';
  if (value.length >= 10) return value.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const toTimeInput = (value?: string) => {
  if (!value) return '';
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toTimeString().slice(0, 5);
};

const labelClass = 'text-xs font-semibold uppercase text-muted-foreground mb-1 block';
const inputClass = 'w-full rounded-md border px-3 py-2 text-sm';

interface PericiaEditFormValues {
  processoCNJ: string;
  tipoPericiaId: string;
  modalidadeId: string;
  autorNome: string;
  reuNome: string;
  periciadoNome: string;
  juizNome: string;
  cidadeId: string;
  varaId: string;
  statusId: string;
  dataNomeacao: string;
  dataAgendamento: string;
  horaAgendamento: string;
  dataRealizacao: string;
  dataEnvioLaudo: string;
  honorariosPrevistosJG: number | string;
  honorariosPrevistosPartes: number | string;
  pagamentoStatus: string;
  observacoes: string;
  observacaoExtra: string;
}

const EMPTY_FORM_VALUES: PericiaEditFormValues = {
  processoCNJ: '',
  tipoPericiaId: '',
  modalidadeId: '',
  autorNome: '',
  reuNome: '',
  periciadoNome: '',
  juizNome: '',
  cidadeId: '',
  varaId: '',
  statusId: '',
  dataNomeacao: '',
  dataAgendamento: '',
  horaAgendamento: '',
  dataRealizacao: '',
  dataEnvioLaudo: '',
  honorariosPrevistosJG: '',
  honorariosPrevistosPartes: '',
  pagamentoStatus: '',
  observacoes: '',
  observacaoExtra: '',
};

const normalizePericiaToFormValues = (detail: PericiaDetail): PericiaEditFormValues => ({
  processoCNJ: detail.processoCNJ ?? '',
  tipoPericiaId: detail.tipoPericia?.id ?? '',
  modalidadeId: detail.modalidade?.id ?? '',
  autorNome: detail.autorNome ?? '',
  reuNome: detail.reuNome ?? '',
  periciadoNome: detail.periciadoNome ?? '',
  juizNome: detail.juizNome ?? '',
  cidadeId: detail.cidade?.id ?? '',
  varaId: detail.vara?.id ?? '',
  statusId: detail.status?.id ?? '',
  dataNomeacao: toDateInput(detail.dataNomeacao),
  dataAgendamento: toDateInput(detail.dataAgendamento),
  horaAgendamento: toTimeInput(detail.horaAgendamento),
  dataRealizacao: toDateInput(detail.dataRealizacao),
  dataEnvioLaudo: toDateInput(detail.dataEnvioLaudo),
  honorariosPrevistosJG: detail.honorariosPrevistosJG ?? '',
  honorariosPrevistosPartes: detail.honorariosPrevistosPartes ?? '',
  pagamentoStatus: detail.pagamentoStatus ?? '',
  observacoes: detail.observacoes ?? '',
  observacaoExtra: detail.observacaoExtra ?? '',
});

const PericiaEditPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PericiaEditFormValues>(EMPTY_FORM_VALUES);
  const [isSaving, setIsSaving] = useState(false);

  const detailQuery = usePericiaDetailQuery(id);
  const cidadesQuery = useQuery({ queryKey: ['config', 'cidades'], queryFn: () => configService.list('cidades') });
  const varasQuery = useQuery({ queryKey: ['config', 'varas'], queryFn: () => configService.list('varas') });
  const statusQuery = useQuery({ queryKey: ['config', 'status'], queryFn: () => configService.list('status') });
  const tiposQuery = useQuery({ queryKey: ['config', 'tipos-pericia'], queryFn: () => configService.list('tipos-pericia') });
  const modalidadesQuery = useQuery({ queryKey: ['config', 'modalidades'], queryFn: () => configService.list('modalidades') });

  useEffect(() => {
    if (!detailQuery.data) return;
    setForm(normalizePericiaToFormValues(detailQuery.data));
  }, [detailQuery.data]);

  const setFormField = <K extends keyof PericiaEditFormValues>(field: K, value: PericiaEditFormValues[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const varasFiltradas = useMemo(() => {
    const cidadeId = form.cidadeId;
    const varas = varasQuery.data ?? [];
    if (!cidadeId) return varas;
    return varas.filter((item) => item.cidadeId === cidadeId);
  }, [form.cidadeId, varasQuery.data]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      await apiClient.patch(`/pericias/${id}`, form);
      await queryClient.invalidateQueries({ queryKey: ['pericia-detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['pericias'] });
      toast.success('Perícia atualizada com sucesso.');
      navigate(`/pericias/${id}`);
    } catch {
      toast.error('Erro ao atualizar perícia.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!id) return <EmptyState title="Perícia não encontrada" />;

  return (
    <DomainPageTemplate
      title="Editar Perícia"
      isLoading={
        detailQuery.isLoading ||
        cidadesQuery.isLoading ||
        varasQuery.isLoading ||
        statusQuery.isLoading ||
        tiposQuery.isLoading ||
        modalidadesQuery.isLoading
      }
      isError={
        detailQuery.isError ||
        cidadesQuery.isError ||
        varasQuery.isError ||
        statusQuery.isError ||
        tiposQuery.isError ||
        modalidadesQuery.isError
      }
      headerActions={(
        <>
          <button className="rounded-md border px-4 py-2 text-sm" onClick={() => navigate(`/pericias/${id}`)} type="button">
            Cancelar
          </button>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </>
      )}
    >
      {!detailQuery.data ? (
        <EmptyState title="Perícia não encontrada" />
      ) : (
        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="mb-3 font-semibold">Processo</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <label>
                <span className={labelClass}>Processo CNJ</span>
                <input className={inputClass} onChange={(e) => setFormField('processoCNJ', e.target.value)} type="text" value={form.processoCNJ} />
              </label>
              <label>
                <span className={labelClass}>Tipo de Perícia</span>
                <select className={inputClass} onChange={(e) => setFormField('tipoPericiaId', e.target.value)} value={form.tipoPericiaId}>
                  <option value="">Selecionar</option>
                  {(tiposQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>Modalidade</span>
                <select className={inputClass} onChange={(e) => setFormField('modalidadeId', e.target.value)} value={form.modalidadeId}>
                  <option value="">Selecionar</option>
                  {(modalidadesQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="mb-3 font-semibold">Partes</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className={labelClass}>Autor</span><input className={inputClass} onChange={(e) => setFormField('autorNome', e.target.value)} type="text" value={form.autorNome} /></label>
              <label><span className={labelClass}>Réu</span><input className={inputClass} onChange={(e) => setFormField('reuNome', e.target.value)} type="text" value={form.reuNome} /></label>
              <label><span className={labelClass}>Periciado</span><input className={inputClass} onChange={(e) => setFormField('periciadoNome', e.target.value)} type="text" value={form.periciadoNome} /></label>
              <label><span className={labelClass}>Juiz</span><input className={inputClass} onChange={(e) => setFormField('juizNome', e.target.value)} type="text" value={form.juizNome} /></label>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="mb-3 font-semibold">Localização</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className={labelClass}>Cidade</span>
                <select
                  className={inputClass}
                  onChange={(e) => setForm((prev) => ({ ...prev, cidadeId: e.target.value, varaId: '' }))}
                  value={form.cidadeId}
                >
                  <option value="">Selecionar</option>
                  {(cidadesQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>Vara</span>
                <select className={inputClass} onChange={(e) => setFormField('varaId', e.target.value)} value={form.varaId}>
                  <option value="">Selecionar</option>
                  {varasFiltradas.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="mb-3 font-semibold">Status e Datas</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <label>
                <span className={labelClass}>Status</span>
                <select className={inputClass} onChange={(e) => setFormField('statusId', e.target.value)} value={form.statusId}>
                  <option value="">Selecionar</option>
                  {(statusQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
              </label>
              <label><span className={labelClass}>Data Nomeação</span><input className={inputClass} onChange={(e) => setFormField('dataNomeacao', e.target.value)} type="date" value={form.dataNomeacao} /></label>
              <label><span className={labelClass}>Data Agendamento</span><input className={inputClass} onChange={(e) => setFormField('dataAgendamento', e.target.value)} type="date" value={form.dataAgendamento} /></label>
              <label><span className={labelClass}>Hora Agendamento</span><input className={inputClass} onChange={(e) => setFormField('horaAgendamento', e.target.value)} type="time" value={form.horaAgendamento} /></label>
              <label><span className={labelClass}>Data Realização</span><input className={inputClass} onChange={(e) => setFormField('dataRealizacao', e.target.value)} type="date" value={form.dataRealizacao} /></label>
              <label><span className={labelClass}>Data Envio Laudo</span><input className={inputClass} onChange={(e) => setFormField('dataEnvioLaudo', e.target.value)} type="date" value={form.dataEnvioLaudo} /></label>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="mb-3 font-semibold">Financeiro</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <label>
                <span className={labelClass}>Honorários previstos JG</span>
                <input className={inputClass} onChange={(e) => setFormField('honorariosPrevistosJG', e.target.value)} step="0.01" type="number" value={form.honorariosPrevistosJG} />
              </label>
              <label>
                <span className={labelClass}>Honorários previstos partes</span>
                <input className={inputClass} onChange={(e) => setFormField('honorariosPrevistosPartes', e.target.value)} step="0.01" type="number" value={form.honorariosPrevistosPartes} />
              </label>
              <label>
                <span className={labelClass}>Pagamento status</span>
                <select className={inputClass} onChange={(e) => setFormField('pagamentoStatus', e.target.value)} value={form.pagamentoStatus}>
                  <option value="">Selecionar</option>
                  <option value="SIM">SIM</option>
                  <option value="NÃO">NÃO</option>
                  <option value="PARCIAL">PARCIAL</option>
                </select>
              </label>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="mb-3 font-semibold">Observações</h2>
            <div className="grid gap-3">
              <label>
                <span className={labelClass}>Observações</span>
                <textarea className={inputClass} onChange={(e) => setFormField('observacoes', e.target.value)} rows={4} value={form.observacoes} />
              </label>
              <label>
                <span className={labelClass}>Observação Extra</span>
                <textarea className={inputClass} onChange={(e) => setFormField('observacaoExtra', e.target.value)} rows={3} value={form.observacaoExtra} />
              </label>
            </div>
          </Card>
        </div>
      )}
    </DomainPageTemplate>
  );
};

export default PericiaEditPage;
