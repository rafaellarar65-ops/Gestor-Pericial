export const formatCurrency = (centavos: number | string | null | undefined): string => {
  const value = Number(centavos ?? 0) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCNJ = (cnj: string | null | undefined): string => {
  const raw = (cnj ?? '').replace(/\D/g, '');
  if (raw.length !== 20) return cnj ?? '';

  return raw.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
};
