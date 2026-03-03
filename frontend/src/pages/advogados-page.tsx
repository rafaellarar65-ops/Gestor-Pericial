import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, UserPlus, Mail, Phone, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { lawyersService } from '@/services/lawyers-service';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import type { Lawyer } from '@/types/api';

type LawyerForm = {
  nome: string;
  oab: string;
  ufOab: string;
  email: string;
  telefone: string;
  observacoes: string;
};

const EMPTY_FORM: LawyerForm = {
  nome: '',
  oab: '',
  ufOab: '',
  email: '',
  telefone: '',
  observacoes: '',
};

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdvogadosPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<LawyerForm>(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const { data: lawyers = [], isLoading, isError, error } = useQuery<Lawyer[]>({
    queryKey: ['lawyers'],
    queryFn: lawyersService.list,
  });

  const createMutation = useMutation({
    mutationFn: lawyersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawyers'] });
      toast.success('Advogado cadastrado com sucesso!');
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => {
      toast.error('Erro ao cadastrar advogado. Tente novamente.');
    },
  });

  const filtered = lawyers.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.nome.toLowerCase().includes(q) ||
      (l.oab ?? '').toLowerCase().includes(q)
    );
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error('O campo Nome é obrigatório.');
      return;
    }
    createMutation.mutate({
      nome: form.nome.trim(),
      oab: form.oab || undefined,
      ufOab: form.ufOab || undefined,
      email: form.email || undefined,
      telefone: form.telefone || undefined,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-5 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-600">
              <Briefcase size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">
                ADVOGADOS CADASTRADOS
              </h1>
              <p className="text-sm text-gray-400">
                Gerenciamento de advogados parceiros
              </p>
            </div>
            {!isLoading && !isError && (
              <span className="ml-2 rounded-full bg-gray-600 px-3 py-0.5 text-sm font-semibold text-gray-200">
                {lawyers.length}
              </span>
            )}
          </div>
          <Button
            variant="default"
            size="md"
            className="flex items-center gap-2 bg-white text-gray-800 hover:bg-gray-100"
            onClick={() => {
              setForm(EMPTY_FORM);
              setDialogOpen(true);
            }}
          >
            <UserPlus size={16} />
            Novo Advogado
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Search bar */}
        <div className="relative mb-6 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="Buscar por nome ou OAB..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* States */}
        {isLoading && <LoadingState />}
        {isError && (
          <ErrorState
            message={
              error instanceof Error ? error.message : 'Erro ao carregar advogados.'
            }
          />
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            title={
              search
                ? 'Nenhum advogado encontrado para esta busca.'
                : 'Nenhum advogado cadastrado ainda.'
            }
          />
        )}

        {/* Grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lawyer) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} />
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Cadastrar Novo Advogado"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <Input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Nome completo do advogado"
              required
            />
          </div>

          {/* OAB + UF */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Número OAB
              </label>
              <Input
                name="oab"
                value={form.oab}
                onChange={handleChange}
                placeholder="Ex: 123456"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                UF OAB
              </label>
              <Input
                name="ufOab"
                value={form.ufOab}
                onChange={handleChange}
                placeholder="SP"
                maxLength={2}
                className="uppercase"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              E-mail
            </label>
            <Input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="advogado@escritorio.com.br"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Telefone
            </label>
            <Input
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
              rows={3}
              placeholder="Anotações adicionais sobre o advogado..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              size="md"
              disabled={createMutation.isPending}
              className="bg-gray-800 text-white hover:bg-gray-700"
            >
              {createMutation.isPending ? 'Salvando...' : 'Cadastrar Advogado'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  const initials = getInitials(lawyer.nome);
  const oabDisplay =
    lawyer.oab
      ? `OAB/${lawyer.ufOab ?? '??'} ${lawyer.oab}`
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Avatar + name */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
          <span className="text-sm font-bold text-gray-600">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-gray-900">{lawyer.nome}</p>
          {oabDisplay && (
            <p className="text-xs font-medium text-gray-500">{oabDisplay}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {lawyer.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail size={14} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">{lawyer.email}</span>
          </div>
        )}
        {lawyer.telefone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone size={14} className="flex-shrink-0 text-gray-400" />
            <span>{lawyer.telefone}</span>
          </div>
        )}
        {lawyer.observacoes && (
          <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 leading-relaxed">
            {lawyer.observacoes}
          </p>
        )}
      </div>
    </div>
  );
}
