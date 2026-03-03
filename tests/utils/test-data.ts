export const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const buildTestUser = () => {
  const id = uid('qa');
  return {
    name: `QA User ${id}`,
    email: `${id}@example.test`,
    password: 'Str0ng!Pass123',
  };
};

export const defaultPericia = () => ({
  numeroCNJ: `500${Date.now()}`,
  cidade: 'São Paulo',
  status: 'EM_ANDAMENTO',
  especialidade: 'Ortopedia',
  parteAutora: 'João da Silva',
  parteRe: 'INSS',
});
