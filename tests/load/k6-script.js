import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
  scenarios: {
    crud_pericias_50_users: {
      executor: 'constant-vus',
      vus: 50,
      duration: '3m',
      exec: 'crudPericias',
    },
    listagem_100_rps: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 20,
      maxVUs: 80,
      exec: 'listagemFiltros',
    },
    import_csv_500_linhas: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 10,
      exec: 'importCsv',
      startTime: '30s',
    },
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.K6_AUTH_TOKEN || '';
const params = {
  headers: {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  },
};

export function crudPericias() {
  const payload = JSON.stringify({
    numeroCNJ: `500${Date.now()}${Math.floor(Math.random() * 1000)}`,
    cidade: 'São Paulo',
    status: 'EM_ANDAMENTO',
  });

  const create = http.post(`${BASE_URL}/api/pericias`, payload, params);
  check(create, { 'create 201/200': (r) => [200, 201].includes(r.status) });

  const id = create.json('id');
  if (id) {
    const update = http.patch(`${BASE_URL}/api/pericias/${id}`, JSON.stringify({ status: 'CONCLUIDA' }), params);
    check(update, { 'update 200': (r) => r.status === 200 });

    const remove = http.del(`${BASE_URL}/api/pericias/${id}`, null, params);
    check(remove, { 'delete 200/204': (r) => [200, 204].includes(r.status) });
  }

  sleep(1);
}

export function listagemFiltros() {
  const response = http.get(`${BASE_URL}/api/pericias?cidade=S%C3%A3o%20Paulo&status=EM_ANDAMENTO&page=1`, params);
  check(response, { 'list 200': (r) => r.status === 200 });
}

export function importCsv() {
  const csv = 'cnj,cidade,status\n5000000001,São Paulo,EM_ANDAMENTO\n'.repeat(500);
  const response = http.post(
    `${BASE_URL}/api/pericias/import`,
    { file: http.file(csv, 'pericias.csv', 'text/csv') },
    { headers: { ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}) } },
  );
  check(response, { 'import 200/202': (r) => [200, 202].includes(r.status) });
}
