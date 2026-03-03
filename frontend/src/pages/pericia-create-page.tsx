import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Scale, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { configService } from '@/services/config-service';
import { periciaService } from '@/services/pericia-service';
import type { ConfigItem } from '@/types/api';

const cnjMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 20);
  const parts = [
    digits.slice(0, 7),
    digits.slice(7, 9),
    digits.slice(9, 13),
    digits.slice(13, 14),
    digits.slice(14, 16),
    digits.slice(16, 20),
  ];

  let masked = parts[0];
  if (parts[1]) masked += `-${parts[1]}`;
  if (parts[2]) masked += `.${parts[2]}`;
  if (parts[3]) masked += `.${parts[3]}`;
  if (parts[4]) masked += `.${parts[4]}`;
  if (parts[5]) masked += `.${parts[5]}`;
  return masked;
};

const PericiaCreatePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    processoCNJ: '',
    juizNome: '',
    autorNome: '',
    reuNome: '',
    periciadoNome: '',
    cidadeId: '',
    varaId: '',
    tipoPericiaId: '',
    modalidadeId: '',
    statusId: '',
    dataNomeacao: new Date().toISOString().slice(0, 10),
    honorariosPrevistosJG: '0',
    honorariosPrevistosPartes: '0',
    observacoes: '',
  });

  const cidadesQuery = useQuery({ queryKey: ['config', 'cidades'], queryFn: () => configService.list('cidades') });
  const varasQuery = useQuery({ queryKey: ['config', 'varas'], queryFn: () => configService.list('varas') });
  const tiposQuery = useQuery({ queryKey: ['config', 'tipos-pericia'], queryFn: () => configService.list('tipos-pericia') });
  const modalidadesQuery = useQuery({ queryKey: ['config', 'modalidades'], queryFn: () => configService.list('modalidades') });
  const statusQuery = useQuery({ queryKey: ['config', 'status'], queryFn: () => configService.list('status') });

  const createMutation = useMutation({
    mutationFn: () =>
      periciaService.create({
        processoCNJ: form.processoCNJ,
        juizNome: form.juizNome || undefined,
        autorNome: form.autorNome || undefined,
        reuNome: form.reuNome || undefined,
        periciadoNome: form.periciadoNome || undefined,
        cidadeId: form.cidadeId || undefined,
        varaId: form.varaId || undefined,
        tipoPericiaId: form.tipoPericiaId || undefined,
        modalidadeId: form.modalidadeId || undefined,
        statusId: form.statusId || undefined,
        dataNomeacao: form.dataNomeacao || undefined,
        observacoes: form.observacoes || undefined,
        honorariosPrevistosJG: Number(form.honorariosPrevistosJG || '0'),
        honorariosPrevistosPartes: Number(form.honorariosPrevistosPartes || '0'),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['pericias'] });
      navigate(`/pericias/${created.id}`);
    },
  });

  const varasFiltradas = useMemo(() => {
    const cidadeId = form.cidadeId;
    if (!cidadeId) return varasQuery.data ?? [];
    return (varasQuery.data ?? []).filter((item) => item.cidadeId === cidadeId);
  }, [varasQuery.data, form.cidadeId]);

  if (cidadesQuery.isLoading || varasQuery.isLoading || tiposQuery.isLoading || modalidadesQuery.isLoading || statusQuery.isLoading) {
    return <LoadingState />;
  }

  if (cidadesQuery.isError || varasQuery.isError || tiposQuery.isError || modalidadesQuery.isError || statusQuery.isError) {
    return <ErrorState message="Erro ao carregar dados de configuração para nova perícia" />;
  }

  const SelectConfig = ({
    label,
    value,
    onChange,
    items,
    placeholder = 'Selecionar',
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    items: ConfigItem[];
    placeholder?: string;
  }) => (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select className="w-full rounded-md border px-3 py-2" onChange={(e) => onChange(e.target.value)} value={value}>
        <option value="">{placeholder}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nome}
          </option>
        ))}
      </select>
    </label>
  );

  const cnjValido = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(form.processoCNJ);
  const canSubmit = Boolean(form.cidadeId.trim() && cnjValido);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-4xl font-bold text-slate-800">
          <Link className="rounded-full p-1 hover:bg-slate-100" to="/pericias">
            <ArrowLeft size={22} />
          </Link>
          Nova Perícia
        </div>
      </div>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center text-indigo-700">
        <Sparkles className="mx-auto mb-2" size={24} />
        <p className="text-2xl font-semibold">Preenchimento Inteligente</p>
        <p className="text-sm">Cole print do processo (Ctrl+V) ou clique para enviar foto.</p>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-4 inline-flex items-center gap-2 text-2xl font-semibold text-slate-800">
          <Scale size={18} /> Dados do Processo
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Número CNJ *</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              onChange={(e) => setForm((prev) => ({ ...prev, processoCNJ: cnjMask(e.target.value) }))}
              placeholder="0000000-00.0000.0.00.0000"
              value={form.processoCNJ}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Juiz</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setForm((prev) => ({ ...prev, juizNome: e.target.value }))} value={form.juizNome} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Autor *</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setForm((prev) => ({ ...prev, autorNome: e.target.value }))} value={form.autorNome} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Réu *</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setForm((prev) => ({ ...prev, reuNome: e.target.value }))} value={form.reuNome} />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Periciado *</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setForm((prev) => ({ ...prev, periciadoNome: e.target.value }))} value={form.periciadoNome} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-4 text-2xl font-semibold text-slate-800">Detalhes da Nomeação</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectConfig label="Cidade *" items={cidadesQuery.data ?? []} onChange={(value) => setForm((prev) => ({ ...prev, cidadeId: value, varaId: '' }))} value={form.cidadeId} />
          <SelectConfig label="Vara" items={varasFiltradas} onChange={(value) => setForm((prev) => ({ ...prev, varaId: value }))} value={form.varaId} />
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Data Nomeação</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setForm((prev) => ({ ...prev, dataNomeacao: e.target.value }))} type="date" value={form.dataNomeacao} />
          </label>
          <SelectConfig label="Tipo de Perícia" items={tiposQuery.data ?? []} onChange={(value) => setForm((prev) => ({ ...prev, tipoPericiaId: value }))} value={form.tipoPericiaId} />
          <SelectConfig label="Modalidade" items={modalidadesQuery.data ?? []} onChange={(value) => setForm((prev) => ({ ...prev, modalidadeId: value }))} value={form.modalidadeId} />
          <SelectConfig label="Status Inicial" items={statusQuery.data ?? []} onChange={(value) => setForm((prev) => ({ ...prev, statusId: value }))} value={form.statusId} />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-4 text-2xl font-semibold text-slate-800">Previsão Financeira</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Honorários JG (R$)</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setForm((prev) => ({ ...prev, honorariosPrevistosJG: e.target.value }))} type="number" value={form.honorariosPrevistosJG} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Honorários Partes (R$)</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setForm((prev) => ({ ...prev, honorariosPrevistosPartes: e.target.value }))} type="number" value={form.honorariosPrevistosPartes} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Observações Iniciais</span>
          <textarea className="min-h-28 w-full rounded-md border px-3 py-2" onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))} value={form.observacoes} />
        </label>
      </section>

      {!cnjValido && form.processoCNJ.trim() && <p className="text-sm font-medium text-red-600">Informe um CNJ válido no formato 0000000-00.0000.0.00.0000.</p>}
      {!form.cidadeId && <p className="text-sm font-medium text-red-600">Cidade é obrigatória.</p>}

      <div className="flex justify-end gap-2 pb-8">
        <button className="rounded-md border px-4 py-2 text-sm" onClick={() => navigate('/pericias')} type="button">Cancelar</button>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={createMutation.isPending || !canSubmit}
          onClick={() => {
            if (!canSubmit) {
              toast.error('Preencha CNJ válido e cidade antes de salvar.');
              return;
            }
            createMutation.mutate();
          }}
          type="button"
        >
          <Save size={14} /> {createMutation.isPending ? 'Salvando...' : 'Salvar Perícia'}
        </button>
      </div>
    </div>
  );
};

export default PericiaCreatePage;
