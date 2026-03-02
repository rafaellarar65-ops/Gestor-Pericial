export const formatCurrency = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatCNJ = (cnj?: string | null) => {
  if (!cnj) return '—';
  const digits = cnj.replace(/\D/g, '');
  if (digits.length !== 20) return cnj;
  return digits.replace(/(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
};
