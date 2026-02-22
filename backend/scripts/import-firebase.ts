/**
 * PASSO 2 — Importar dados do Firebase (JSON) para o PostgreSQL.
 *
 * PRÉ-REQUISITOS:
 *   1. Ter executado firebase-export.ts (pasta firebase-export/ com os JSONs)
 *   2. DATABASE_URL apontando para o banco PostgreSQL do Render
 *
 * USO (rode na sua máquina local):
 *   DATABASE_URL="postgresql://user:pass@host/db" \
 *   npx ts-node scripts/import-firebase.ts
 *
 * O script é IDEMPOTENTE — pode ser executado mais de uma vez sem duplicar dados.
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Constantes ────────────────────────────────────────────────────────────────

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const TENANT_NAME = process.env.TENANT_NAME || 'Gestor Pericial';
const EXPORT_DIR = path.join(process.cwd(), 'firebase-export');

// Mapeamento Firebase ID → UUID PostgreSQL
const idMap = new Map<string, string>();

// ─── Utilitários ───────────────────────────────────────────────────────────────

function newUuid(): string {
  return crypto.randomUUID();
}

/**
 * Retorna sempre o mesmo UUID para um dado ID Firebase.
 * Se for um UUID válido, reutiliza; caso contrário, gera um novo.
 */
function mapId(firebaseId: string | undefined | null): string | null {
  if (!firebaseId) return null;
  if (!idMap.has(firebaseId)) {
    // Verifica se já é um UUID válido
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firebaseId,
    );
    idMap.set(firebaseId, isUuid ? firebaseId : newUuid());
  }
  return idMap.get(firebaseId)!;
}

function requireId(firebaseId: string): string {
  return mapId(firebaseId) as string;
}

/** Converte Timestamp do Firebase ou string ISO em Date. Retorna null se inválido. */
function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'object' && val !== null && '_seconds' in val) {
    return new Date((val as { _seconds: number })._seconds * 1000);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (val instanceof Date) return val;
  return null;
}

function toDecimal(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function readJson(collection: string): Record<string, unknown>[] {
  const file = path.join(EXPORT_DIR, `${collection}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`  ⚠️  ${collection}.json não encontrado — pulando`);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as unknown;
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
}

function pick<T>(doc: Record<string, unknown>, ...keys: string[]): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (doc[key] !== undefined) result[key] = doc[key];
  }
  return result as Partial<T>;
}

// ─── Funções de importação por coleção ─────────────────────────────────────────

const prisma = new PrismaClient();
let imported = 0;
let skipped = 0;

async function ensureTenant() {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: { name: TENANT_NAME },
    create: { id: TENANT_ID, name: TENANT_NAME, createdBy: null, updatedBy: null },
  });
  console.log(`  ✔  Tenant garantido: ${TENANT_ID}`);
}

// ── Cidades ───────────────────────────────────────────────────────────────────
async function importCidades() {
  const docs = readJson('cidades');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    try {
      await prisma.cidade.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          nome: String(doc['nome'] ?? doc['name'] ?? 'Sem nome'),
          uf: String(doc['uf'] ?? doc['estado'] ?? 'SP').slice(0, 2).toUpperCase(),
          ibgeCode: doc['ibgeCode'] as string ?? doc['codigoIbge'] as string ?? null,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  cidades: ${docs.length} docs`);
}

// ── Modalidades ───────────────────────────────────────────────────────────────
async function importModalidades() {
  const docs = readJson('modalidades');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    try {
      await prisma.modalidade.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          codigo: String(doc['codigo'] ?? doc['code'] ?? fbId.slice(0, 20)),
          nome: String(doc['nome'] ?? doc['name'] ?? 'Sem nome'),
          ativo: Boolean(doc['ativo'] ?? doc['active'] ?? true),
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  modalidades: ${docs.length} docs`);
}

// ── Pericias ──────────────────────────────────────────────────────────────────
async function importPericias() {
  const docs = readJson('pericias');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);

    const processoCNJ =
      String(doc['processoCNJ'] ?? doc['processo'] ?? doc['numeroCNJ'] ?? doc['numero'] ?? fbId);

    const cidadeFbId = doc['cidadeId'] as string ?? doc['cidade_id'] as string ?? null;
    const modalidadeFbId = doc['modalidadeId'] as string ?? doc['modalidade_id'] as string ?? null;

    try {
      await prisma.pericia.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          processoCNJ,
          processoCNJDigits: doc['processoCNJDigits'] as string ?? null,
          cidadeId: cidadeFbId ? mapId(cidadeFbId) : null,
          modalidadeId: modalidadeFbId ? mapId(modalidadeFbId) : null,
          juizNome: doc['juizNome'] as string ?? doc['juiz'] as string ?? null,
          autorNome: doc['autorNome'] as string ?? doc['autor'] as string ?? null,
          reuNome: doc['reuNome'] as string ?? doc['reu'] as string ?? null,
          periciadoNome:
            doc['periciadoNome'] as string ??
            doc['periciado'] as string ??
            doc['paciente'] as string ??
            null,
          periciadoCpf: doc['periciadoCpf'] as string ?? doc['cpf'] as string ?? null,
          periciadoNascimento: toDate(doc['periciadoNascimento'] ?? doc['nascimento']),
          observacoes: doc['observacoes'] as string ?? doc['obs'] as string ?? null,
          isUrgent: Boolean(doc['isUrgent'] ?? doc['urgente'] ?? false),
          agendada: Boolean(doc['agendada'] ?? false),
          laudoEnviado: Boolean(doc['laudoEnviado'] ?? false),
          finalizada: Boolean(doc['finalizada'] ?? false),
          pagamentoStatus: 'PENDENTE',
          honorariosPrevistosJG: toDecimal(doc['honorariosPrevistosJG'] ?? doc['honorarios']),
          valorRecebidoTotal: toDecimal(doc['valorRecebidoTotal'] ?? doc['valorRecebido']),
          dataNomeacao: toDate(doc['dataNomeacao'] ?? doc['data_nomeacao']),
          dataAgendamento: toDate(doc['dataAgendamento'] ?? doc['data_agendamento']),
          horaAgendamento: doc['horaAgendamento'] as string ?? doc['hora'] as string ?? null,
          dataRealizacao: toDate(doc['dataRealizacao'] ?? doc['data_realizacao']),
          dataEnvioLaudo: toDate(doc['dataEnvioLaudo'] ?? doc['data_laudo']),
          metadata: (doc['metadata'] ?? null) as object | null,
          createdAt: toDate(doc['createdAt'] ?? doc['criadoEm']) ?? undefined,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch (err) {
      console.warn(
        `    ⚠️  pericia ${fbId} (${processoCNJ}): ${(err as Error).message.slice(0, 80)}`,
      );
      skipped++;
    }
  }
  console.log(`  ✔  pericias: ${docs.length} docs`);
}

// ── Agenda Events ─────────────────────────────────────────────────────────────
const EVENT_TYPE_MAP: Record<string, string> = {
  PERICIA: 'PERICIA',
  pericia: 'PERICIA',
  PRAZO: 'PRAZO',
  prazo: 'PRAZO',
  LAUDO: 'LAUDO',
  laudo: 'LAUDO',
  DESLOCAMENTO: 'DESLOCAMENTO',
  deslocamento: 'DESLOCAMENTO',
  BLOCO_TRABALHO: 'BLOCO_TRABALHO',
  bloco: 'BLOCO_TRABALHO',
};

async function importAgendaEvents() {
  const docs = readJson('agenda_events');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    const periciaFbId = doc['periciaId'] as string ?? doc['pericia_id'] as string ?? null;
    const startAt = toDate(doc['startAt'] ?? doc['inicio'] ?? doc['start']);
    if (!startAt) { skipped++; continue; }

    try {
      await prisma.agendaEvent.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          periciaId: periciaFbId ? mapId(periciaFbId) : null,
          title: String(doc['title'] ?? doc['titulo'] ?? 'Evento'),
          description: doc['description'] as string ?? doc['descricao'] as string ?? null,
          type: (EVENT_TYPE_MAP[String(doc['type'] ?? doc['tipo'] ?? '')] ?? 'OUTRO') as 'PERICIA' | 'PRAZO' | 'LAUDO' | 'DESLOCAMENTO' | 'BLOCO_TRABALHO' | 'OUTRO',
          startAt,
          endAt: toDate(doc['endAt'] ?? doc['fim'] ?? doc['end']),
          allDay: Boolean(doc['allDay'] ?? doc['diaInteiro'] ?? false),
          location: doc['location'] as string ?? doc['local'] as string ?? null,
          metadata: (doc['metadata'] ?? null) as object | null,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  agenda_events: ${docs.length} docs`);
}

// ── Agenda Tasks ──────────────────────────────────────────────────────────────
const TASK_STATUS_MAP: Record<string, string> = {
  TODO: 'TODO', todo: 'TODO', pendente: 'TODO', PENDENTE: 'TODO',
  DOING: 'DOING', doing: 'DOING', em_andamento: 'DOING',
  DONE: 'DONE', done: 'DONE', concluida: 'DONE', CONCLUIDA: 'DONE',
  CANCELED: 'CANCELED', canceled: 'CANCELED', cancelada: 'CANCELED',
};

async function importAgendaTasks() {
  const docs = readJson('agenda_tasks');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    const periciaFbId = doc['periciaId'] as string ?? doc['pericia_id'] as string ?? null;

    try {
      await prisma.agendaTask.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          periciaId: periciaFbId ? mapId(periciaFbId) : null,
          title: String(doc['title'] ?? doc['titulo'] ?? 'Tarefa'),
          description: doc['description'] as string ?? doc['descricao'] as string ?? null,
          dueAt: toDate(doc['dueAt'] ?? doc['prazo'] ?? doc['vencimento']),
          status: (TASK_STATUS_MAP[String(doc['status'] ?? '')] ?? 'TODO') as 'TODO' | 'DOING' | 'DONE' | 'CANCELED',
          priority: Number(doc['priority'] ?? doc['prioridade'] ?? 3),
          completedAt: toDate(doc['completedAt'] ?? doc['concluidoEm']),
          metadata: (doc['metadata'] ?? null) as object | null,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  agenda_tasks: ${docs.length} docs`);
}

// ── Case Documents ────────────────────────────────────────────────────────────
async function importCaseDocuments() {
  const docs = readJson('case_documents');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    const periciaFbId = doc['periciaId'] as string ?? doc['pericia_id'] as string ?? null;
    if (!periciaFbId) { skipped++; continue; }

    try {
      await prisma.caseDocument.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          periciaId: requireId(periciaFbId),
          nome: String(doc['nome'] ?? doc['name'] ?? doc['fileName'] ?? 'Documento'),
          tipo: doc['tipo'] as string ?? doc['type'] as string ?? null,
          categoria: doc['categoria'] as string ?? doc['category'] as string ?? null,
          storagePath: doc['storagePath'] as string ?? doc['path'] as string ?? doc['url'] as string ?? null,
          mimeType: doc['mimeType'] as string ?? doc['contentType'] as string ?? null,
          fileSize: doc['fileSize'] as number ?? doc['size'] as number ?? null,
          metadata: (doc['metadata'] ?? null) as object | null,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  case_documents: ${docs.length} docs`);
}

// ── Pre Laudos ────────────────────────────────────────────────────────────────
async function importPreLaudos() {
  const docs = readJson('pre_laudos');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    const periciaFbId = doc['periciaId'] as string ?? doc['pericia_id'] as string ?? null;
    if (!periciaFbId) { skipped++; continue; }

    try {
      await prisma.preLaudo.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          periciaId: requireId(periciaFbId),
          sections: (doc['sections'] ?? doc['secoes'] ?? null) as object | null,
          aiAnalysis: (doc['aiAnalysis'] ?? doc['analiseIa'] ?? null) as object | null,
          laudoV2: (doc['laudoV2'] ?? null) as object | null,
          templateName: doc['templateName'] as string ?? doc['template'] as string ?? null,
          version: Number(doc['version'] ?? doc['versao'] ?? 1),
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  pre_laudos: ${docs.length} docs`);
}

// ── Recebimentos ──────────────────────────────────────────────────────────────
const FONTE_MAP: Record<string, string> = {
  TJ: 'TJ', tj: 'TJ',
  PARTE_AUTORA: 'PARTE_AUTORA', parte_autora: 'PARTE_AUTORA', autor: 'PARTE_AUTORA',
  PARTE_RE: 'PARTE_RE', parte_re: 'PARTE_RE', reu: 'PARTE_RE',
  SEGURADORA: 'SEGURADORA', seguradora: 'SEGURADORA',
  OUTRO: 'OUTRO', outro: 'OUTRO',
};

async function importRecebimentos() {
  const docs = readJson('recebimentos');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    const periciaFbId = doc['periciaId'] as string ?? doc['pericia_id'] as string ?? null;
    const dataRecebimento = toDate(doc['dataRecebimento'] ?? doc['data'] ?? doc['date']);
    const valorBruto = toDecimal(doc['valorBruto'] ?? doc['valor'] ?? doc['value'] ?? doc['amount']);
    if (!periciaFbId || !dataRecebimento || valorBruto === null) { skipped++; continue; }

    try {
      await prisma.recebimento.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          periciaId: requireId(periciaFbId),
          fontePagamento: (FONTE_MAP[String(doc['fontePagamento'] ?? doc['fonte'] ?? '')] ?? 'TJ') as 'TJ' | 'PARTE_AUTORA' | 'PARTE_RE' | 'SEGURADORA' | 'OUTRO',
          dataRecebimento,
          valorBruto,
          valorLiquido: toDecimal(doc['valorLiquido'] ?? doc['liquido']),
          tarifa: toDecimal(doc['tarifa'] ?? doc['taxa']),
          desconto: toDecimal(doc['desconto']),
          descricao: doc['descricao'] as string ?? doc['description'] as string ?? null,
          metadata: (doc['metadata'] ?? null) as object | null,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  recebimentos: ${docs.length} docs`);
}

// ── Import Batches ────────────────────────────────────────────────────────────
async function importImportBatches() {
  const docs = readJson('import_batches');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    try {
      await prisma.importBatch.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          referenceMonth: doc['referenceMonth'] as number ?? doc['mes'] as number ?? null,
          referenceYear: doc['referenceYear'] as number ?? doc['ano'] as number ?? null,
          sourceFileName: doc['sourceFileName'] as string ?? doc['arquivo'] as string ?? null,
          totalRecords: Number(doc['totalRecords'] ?? doc['total'] ?? 0),
          matchedRecords: Number(doc['matchedRecords'] ?? doc['matched'] ?? 0),
          unmatchedRecords: Number(doc['unmatchedRecords'] ?? doc['unmatched'] ?? 0),
          status: doc['status'] as string ?? null,
          metadata: (doc['metadata'] ?? null) as object | null,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  import_batches: ${docs.length} docs`);
}

// ── Activity Logs ─────────────────────────────────────────────────────────────
async function importActivityLogs() {
  const docs = readJson('activity_logs');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    try {
      await prisma.activityLog.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          entityType: String(doc['entityType'] ?? doc['entity'] ?? doc['entidade'] ?? 'unknown'),
          entityId: String(doc['entityId'] ?? doc['entity_id'] ?? doc['entidadeId'] ?? fbId),
          action: String(doc['action'] ?? doc['acao'] ?? 'IMPORT'),
          payloadJson: (doc['payload'] ?? doc['data'] ?? null) as object | null,
          ipAddress: doc['ipAddress'] as string ?? doc['ip'] as string ?? null,
          userAgent: doc['userAgent'] as string ?? null,
          createdAt: toDate(doc['createdAt'] ?? doc['criadoEm']) ?? undefined,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  activity_logs: ${docs.length} docs`);
}

// ── Daily Usage ───────────────────────────────────────────────────────────────
async function importDailyUsage() {
  const docs = readJson('daily_usage');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    const usageDate = toDate(doc['usageDate'] ?? doc['date'] ?? doc['data']);
    if (!usageDate) { skipped++; continue; }

    try {
      await prisma.dailyUsage.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          usageDate,
          metricKey: String(doc['metricKey'] ?? doc['metric'] ?? doc['chave'] ?? 'imported'),
          metricValue: Number(doc['metricValue'] ?? doc['value'] ?? doc['valor'] ?? 0),
          context: (doc['context'] ?? null) as object | null,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  daily_usage: ${docs.length} docs`);
}

// ── CNJ Sync Queue ────────────────────────────────────────────────────────────
const CNJ_STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDING', pending: 'PENDING', pendente: 'PENDING',
  SUCCESS: 'SUCCESS', success: 'SUCCESS', sucesso: 'SUCCESS',
  ERROR: 'ERROR', error: 'ERROR', erro: 'ERROR',
  RETRY: 'RETRY', retry: 'RETRY',
};

async function importCnjSyncQueue() {
  const docs = readJson('cnj_sync_queue');
  for (const doc of docs) {
    const fbId = doc['_id'] as string;
    const pgId = requireId(fbId);
    const periciaFbId = doc['periciaId'] as string ?? doc['pericia_id'] as string ?? null;

    try {
      await prisma.cnjSync.upsert({
        where: { id: pgId },
        update: {},
        create: {
          id: pgId,
          tenantId: TENANT_ID,
          periciaId: periciaFbId ? mapId(periciaFbId) : null,
          status: (CNJ_STATUS_MAP[String(doc['status'] ?? '')] ?? 'PENDING') as 'PENDING' | 'SUCCESS' | 'ERROR' | 'RETRY',
          lastSyncAt: toDate(doc['lastSyncAt'] ?? doc['ultimaSync']),
          nextSyncAt: toDate(doc['nextSyncAt'] ?? doc['proximaSync']),
          retries: Number(doc['retries'] ?? doc['tentativas'] ?? 0),
          message: doc['message'] as string ?? doc['mensagem'] as string ?? null,
          payload: (doc['payload'] ?? null) as object | null,
          createdBy: TENANT_ID,
          updatedBy: TENANT_ID,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }
  console.log(`  ✔  cnj_sync_queue: ${docs.length} docs`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Pasta não encontrada: ${EXPORT_DIR}`);
    console.error('   Execute primeiro: npx ts-node scripts/firebase-export.ts');
    process.exit(1);
  }

  console.log('\n🚀 Iniciando importação Firebase → PostgreSQL\n');

  // Ordem importa: tabelas-pai antes das tabelas-filho
  await ensureTenant();
  console.log('\n📋 Importando catálogos...');
  await importCidades();
  await importModalidades();

  console.log('\n📁 Importando pericias...');
  await importPericias();

  console.log('\n📅 Importando agenda...');
  await importAgendaEvents();
  await importAgendaTasks();

  console.log('\n📄 Importando documentos e laudos...');
  await importCaseDocuments();
  await importPreLaudos();

  console.log('\n💰 Importando financeiro...');
  await importImportBatches();
  await importRecebimentos();

  console.log('\n📊 Importando logs e métricas...');
  await importActivityLogs();
  await importDailyUsage();
  await importCnjSyncQueue();

  console.log(`\n✅ Importação concluída!`);
  console.log(`   Registros importados: ${imported}`);
  console.log(`   Registros pulados:    ${skipped}`);
  console.log(`   Tenant ID:            ${TENANT_ID}\n`);
}

main()
  .catch((e) => {
    console.error('\n❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
