import * as fs from 'node:fs';
import * as path from 'node:path';
import * as admin from 'firebase-admin';
import {
  FontePagamento,
  PericiaPaymentStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();
const BOOTSTRAP_TENANT_ID = process.env.BOOTSTRAP_TENANT_ID ?? '11111111-1111-1111-1111-111111111111';
const BOOTSTRAP_TENANT_NAME = process.env.BOOTSTRAP_TENANT_NAME ?? 'Gestor Pericial (Migração Firebase)';
const SYSTEM_ACTOR_ID = process.env.MIGRATION_ACTOR_ID ?? BOOTSTRAP_TENANT_ID;
const BATCH_SIZE = Number(process.env.MIGRATION_BATCH_SIZE ?? 200);

const SUPPORTED_COLLECTIONS = [
  'cidades',
  'tribunais',
  'varas',
  'tiposPericia',
  'modalidades',
  'status',
  'locais',
  'pericias',
  'recebimentos',
  'logStatus',
] as const;

type SupportedCollection = (typeof SUPPORTED_COLLECTIONS)[number];

type FirestoreDoc = FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;

type Context = {
  existingIds: {
    cidade: Set<string>;
    tribunal: Set<string>;
    vara: Set<string>;
    tipoPericia: Set<string>;
    modalidade: Set<string>;
    status: Set<string>;
    local: Set<string>;
    pericia: Set<string>;
  };
};

function logProgress(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function loadServiceAccount(): admin.ServiceAccount {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (jsonRaw) {
    return JSON.parse(jsonRaw) as admin.ServiceAccount;
  }

  if (filePath) {
    const resolvedPath = path.resolve(filePath);
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as admin.ServiceAccount;
  }

  throw new Error('Defina FIREBASE_SERVICE_ACCOUNT_JSON ou FIREBASE_SERVICE_ACCOUNT_PATH com a chave do Firebase Admin SDK.');
}

function initFirebase(): FirebaseFirestore.Firestore {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(loadServiceAccount()),
    });
  }

  return admin.firestore();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }

  return undefined;
}

function toDecimal(value: unknown): Prisma.Decimal | undefined {
  if (value === null || value === undefined || value === '') return undefined;

  try {
    return new Prisma.Decimal(value as Prisma.Decimal.Value);
  } catch {
    return undefined;
  }
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'sim', 'yes'].includes(value.toLowerCase());
  if (typeof value === 'number') return value === 1;
  return fallback;
}

function asJson(value: unknown): Prisma.JsonValue | undefined {
  if (value === undefined) return undefined;

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
  } catch {
    return undefined;
  }
}

function asEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fallback: T,
): T {
  if (typeof value !== 'string') return fallback;
  const normalized = value.toUpperCase() as T;
  return allowedValues.includes(normalized) ? normalized : fallback;
}

function idOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function idIfExists(value: unknown, bucket: Set<string>): string | undefined {
  const id = idOrUndefined(value);
  return id && bucket.has(id) ? id : undefined;
}

function transformCidade(doc: FirestoreDoc): Prisma.CidadeCreateManyInput {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    nome: String(data.nome ?? data.name ?? 'Sem nome'),
    uf: String(data.uf ?? 'MG').slice(0, 2).toUpperCase(),
    ibgeCode: idOrUndefined(data.ibgeCode ?? data.ibge_code),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformTribunal(doc: FirestoreDoc): Prisma.TribunalCreateManyInput {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    nome: String(data.nome ?? data.name ?? 'Tribunal sem nome'),
    sigla: String(data.sigla ?? data.acronym ?? `TR-${doc.id.slice(0, 4)}`).toUpperCase(),
    esfera: idOrUndefined(data.esfera),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformVara(doc: FirestoreDoc, ctx: Context): Prisma.VaraCreateManyInput {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    cidadeId: idIfExists(data.cidadeId ?? data.cidade_id, ctx.existingIds.cidade) ?? [...ctx.existingIds.cidade][0],
    tribunalId: idIfExists(data.tribunalId ?? data.tribunal_id, ctx.existingIds.tribunal),
    nome: String(data.nome ?? data.name ?? 'Vara sem nome'),
    codigo: idOrUndefined(data.codigo ?? data.code),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformTipoPericia(doc: FirestoreDoc): Prisma.TipoPericiaCreateManyInput {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    codigo: String(data.codigo ?? data.code ?? doc.id),
    nome: String(data.nome ?? data.name ?? 'Tipo sem nome'),
    descricao: idOrUndefined(data.descricao),
    ativo: bool(data.ativo, true),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformModalidade(doc: FirestoreDoc): Prisma.ModalidadeCreateManyInput {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    codigo: String(data.codigo ?? data.code ?? doc.id),
    nome: String(data.nome ?? data.name ?? 'Modalidade sem nome'),
    ativo: bool(data.ativo, true),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformStatus(doc: FirestoreDoc): Prisma.StatusCreateManyInput {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    codigo: String(data.codigo ?? data.code ?? doc.id),
    nome: String(data.nome ?? data.name ?? 'Status sem nome'),
    cor: idOrUndefined(data.cor ?? data.color),
    ordem: Number.isFinite(Number(data.ordem)) ? Number(data.ordem) : 0,
    ativo: bool(data.ativo, true),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformLocal(doc: FirestoreDoc, ctx: Context): Prisma.LocalCreateManyInput {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    cidadeId: idIfExists(data.cidadeId ?? data.cidade_id, ctx.existingIds.cidade),
    nome: String(data.nome ?? data.name ?? 'Local sem nome'),
    endereco: idOrUndefined(data.endereco),
    latitude: toDecimal(data.latitude),
    longitude: toDecimal(data.longitude),
    observacoes: idOrUndefined(data.observacoes),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformPericia(doc: FirestoreDoc, ctx: Context): Prisma.PericiaCreateManyInput {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    processoCNJ: String(data.processoCNJ ?? data.processo_cnj ?? doc.id),
    processoCNJDigits: idOrUndefined(data.processoCNJ_digits ?? data.processoCNJDigits),
    cidadeId: idIfExists(data.cidadeId ?? data.cidade_id, ctx.existingIds.cidade),
    varaId: idIfExists(data.varaId ?? data.vara_id, ctx.existingIds.vara),
    tipoPericiaId: idIfExists(data.tipoPericiaId ?? data.tipo_pericia_id, ctx.existingIds.tipoPericia),
    modalidadeId: idIfExists(data.modalidadeId ?? data.modalidade_id, ctx.existingIds.modalidade),
    statusId: idIfExists(data.statusId ?? data.status_id, ctx.existingIds.status),
    localId: idIfExists(data.localId ?? data.local_id, ctx.existingIds.local),
    juizNome: idOrUndefined(data.juizNome ?? data.juiz_nome),
    autorNome: idOrUndefined(data.autorNome ?? data.autor_nome),
    reuNome: idOrUndefined(data.reuNome ?? data.reu_nome),
    periciadoNome: idOrUndefined(data.periciadoNome ?? data.periciado_nome),
    periciadoCpf: idOrUndefined(data.periciadoCpf ?? data.periciado_cpf),
    periciadoNascimento: toDate(data.periciadoNascimento ?? data.periciado_nascimento),
    observacoes: idOrUndefined(data.observacoes),
    extraObservation: idOrUndefined(data.extraObservation),
    esclarecimentos: asJson(data.esclarecimentos),
    checklist: asJson(data.checklist),
    anexosResumo: asJson(data.anexosResumo),
    isUrgent: bool(data.isUrgent),
    urgentCheckedAt: toDate(data.urgentCheckedAt),
    agendada: bool(data.agendada),
    laudoEnviado: bool(data.laudoEnviado),
    finalizada: bool(data.finalizada),
    pagamentoStatus: asEnum(
      data.pagamentoStatus,
      Object.values(PericiaPaymentStatus),
      PericiaPaymentStatus.PENDENTE,
    ),
    honorariosPrevistosJG: toDecimal(data.honorariosPrevistosJG),
    honorariosPrevistosPartes: toDecimal(data.honorariosPrevistosPartes),
    valorRecebidoTotal: toDecimal(data.valorRecebidoTotal),
    dataNomeacao: toDate(data.dataNomeacao),
    dataAgendamento: toDate(data.dataAgendamento),
    horaAgendamento: idOrUndefined(data.horaAgendamento),
    dataRealizacao: toDate(data.dataRealizacao),
    dataEnvioLaudo: toDate(data.dataEnvioLaudo),
    origemImportacao: idOrUndefined(data.origemImportacao),
    dataUltimaMovimentacaoCnj: toDate(data.dataUltimaMovimentacaoCnj),
    telepericiaStatusChangedAt: toDate(data.telepericiaStatusChangedAt),
    whatsappStatus: idOrUndefined(data.whatsappStatus),
    telepericiaConfirmedAt: toDate(data.telepericiaConfirmedAt),
    telepericiaLastAttemptAt: toDate(data.telepericiaLastAttemptAt),
    metadata: asJson(data.metadata),
    deletedAt: toDate(data.deletedAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformRecebimento(doc: FirestoreDoc, ctx: Context): Prisma.RecebimentoCreateManyInput | null {
  const data = doc.data();
  const periciaId = idIfExists(data.periciaId ?? data.pericia_id, ctx.existingIds.pericia);

  if (!periciaId) {
    return null;
  }

  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    periciaId,
    importBatchId: idOrUndefined(data.importBatchId),
    payerId: idOrUndefined(data.payerId),
    fontePagamento: asEnum(
      data.fontePagamento,
      Object.values(FontePagamento),
      FontePagamento.OUTRO,
    ),
    dataRecebimento: toDate(data.dataRecebimento) ?? new Date(),
    valorBruto: toDecimal(data.valorBruto) ?? new Prisma.Decimal(0),
    valorLiquido: toDecimal(data.valorLiquido),
    tarifa: toDecimal(data.tarifa),
    desconto: toDecimal(data.desconto),
    descricao: idOrUndefined(data.descricao),
    metadata: asJson(data.metadata),
    deletedAt: toDate(data.deletedAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

function transformLogStatus(doc: FirestoreDoc, ctx: Context): Prisma.LogStatusCreateManyInput | null {
  const data = doc.data();
  const periciaId = idIfExists(data.periciaId ?? data.pericia_id, ctx.existingIds.pericia);

  if (!periciaId) {
    return null;
  }

  return {
    id: doc.id,
    tenantId: BOOTSTRAP_TENANT_ID,
    periciaId,
    statusAnterior: idOrUndefined(data.statusAnterior),
    statusNovo: String(data.statusNovo ?? 'SEM_STATUS'),
    motivo: idOrUndefined(data.motivo),
    metadata: asJson(data.metadata),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    createdBy: idOrUndefined(data.createdBy) ?? SYSTEM_ACTOR_ID,
    updatedBy: idOrUndefined(data.updatedBy) ?? SYSTEM_ACTOR_ID,
  };
}

async function fetchCollections(db: FirebaseFirestore.Firestore): Promise<Record<SupportedCollection, FirestoreDoc[]>> {
  logProgress('Coletando dados do Firestore...');
  const snapshots = await Promise.all(
    SUPPORTED_COLLECTIONS.map(async (collectionName) => ({
      collectionName,
      snapshot: await db.collection(collectionName).get(),
    })),
  );

  const asRecord = {} as Record<SupportedCollection, FirestoreDoc[]>;
  for (const { collectionName, snapshot } of snapshots) {
    asRecord[collectionName] = snapshot.docs;
    logProgress(`Coleção ${collectionName}: ${snapshot.size} documento(s).`);
  }

  return asRecord;
}

async function createTenantIfNeeded() {
  await prisma.tenant.upsert({
    where: { id: BOOTSTRAP_TENANT_ID },
    update: { name: BOOTSTRAP_TENANT_NAME, updatedBy: SYSTEM_ACTOR_ID },
    create: {
      id: BOOTSTRAP_TENANT_ID,
      name: BOOTSTRAP_TENANT_NAME,
      createdBy: SYSTEM_ACTOR_ID,
      updatedBy: SYSTEM_ACTOR_ID,
    },
  });
}

async function insertInBatches<T>(
  rows: T[],
  insertFn: (batch: T[]) => Promise<Prisma.BatchPayload>,
  label: string,
): Promise<void> {
  if (!rows.length) {
    logProgress(`${label}: sem dados para inserir.`);
    return;
  }

  const chunks = chunkArray(rows, BATCH_SIZE);
  let processed = 0;

  for (const [index, chunk] of chunks.entries()) {
    await insertFn(chunk);
    processed += chunk.length;
    logProgress(`${label}: lote ${index + 1}/${chunks.length} concluído (${processed}/${rows.length}).`);
  }
}

async function migrateData() {
  const db = initFirebase();
  const collections = await fetchCollections(db);

  await createTenantIfNeeded();

  const ctx: Context = {
    existingIds: {
      cidade: new Set(collections.cidades.map((doc) => doc.id)),
      tribunal: new Set(collections.tribunais.map((doc) => doc.id)),
      vara: new Set(collections.varas.map((doc) => doc.id)),
      tipoPericia: new Set(collections.tiposPericia.map((doc) => doc.id)),
      modalidade: new Set(collections.modalidades.map((doc) => doc.id)),
      status: new Set(collections.status.map((doc) => doc.id)),
      local: new Set(collections.locais.map((doc) => doc.id)),
      pericia: new Set(collections.pericias.map((doc) => doc.id)),
    },
  };

  logProgress('Iniciando transação de migração...');
  await prisma.$transaction(async (tx) => {
    const cidades = collections.cidades.map(transformCidade);
    await insertInBatches(cidades, (batch) => tx.cidade.createMany({ data: batch, skipDuplicates: true }), 'Cidades');

    const tribunais = collections.tribunais.map(transformTribunal);
    await insertInBatches(tribunais, (batch) => tx.tribunal.createMany({ data: batch, skipDuplicates: true }), 'Tribunais');

    const varas = collections.varas.map((doc) => transformVara(doc, ctx));
    await insertInBatches(varas, (batch) => tx.vara.createMany({ data: batch, skipDuplicates: true }), 'Varas');

    const tiposPericia = collections.tiposPericia.map(transformTipoPericia);
    await insertInBatches(tiposPericia, (batch) => tx.tipoPericia.createMany({ data: batch, skipDuplicates: true }), 'Tipos de perícia');

    const modalidades = collections.modalidades.map(transformModalidade);
    await insertInBatches(modalidades, (batch) => tx.modalidade.createMany({ data: batch, skipDuplicates: true }), 'Modalidades');

    const statuses = collections.status.map(transformStatus);
    await insertInBatches(statuses, (batch) => tx.status.createMany({ data: batch, skipDuplicates: true }), 'Status');

    const locais = collections.locais.map((doc) => transformLocal(doc, ctx));
    await insertInBatches(locais, (batch) => tx.local.createMany({ data: batch, skipDuplicates: true }), 'Locais');

    const pericias = collections.pericias.map((doc) => transformPericia(doc, ctx));
    await insertInBatches(pericias, (batch) => tx.pericia.createMany({ data: batch, skipDuplicates: true }), 'Perícias');

    const recebimentos = collections.recebimentos
      .map((doc) => transformRecebimento(doc, ctx))
      .filter((item): item is Prisma.RecebimentoCreateManyInput => Boolean(item));
    await insertInBatches(recebimentos, (batch) => tx.recebimento.createMany({ data: batch, skipDuplicates: true }), 'Recebimentos');

    const logs = collections.logStatus
      .map((doc) => transformLogStatus(doc, ctx))
      .filter((item): item is Prisma.LogStatusCreateManyInput => Boolean(item));
    await insertInBatches(logs, (batch) => tx.logStatus.createMany({ data: batch, skipDuplicates: true }), 'Logs de status');
  });

  logProgress('Migração concluída com sucesso.');
  await validateMigration(db);
}

async function validateMigration(db: FirebaseFirestore.Firestore) {
  const firebaseCountsEntries = await Promise.all(
    SUPPORTED_COLLECTIONS.map(async (collectionName) => {
      const snap = await db.collection(collectionName).count().get();
      return [collectionName, snap.data().count] as const;
    }),
  );

  const firebaseCounts = Object.fromEntries(firebaseCountsEntries);

  const postgresCounts = {
    cidades: await prisma.cidade.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    tribunais: await prisma.tribunal.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    varas: await prisma.vara.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    tiposPericia: await prisma.tipoPericia.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    modalidades: await prisma.modalidade.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    status: await prisma.status.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    locais: await prisma.local.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    pericias: await prisma.pericia.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    recebimentos: await prisma.recebimento.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    logStatus: await prisma.logStatus.count({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
  };

  console.table({ firebase: firebaseCounts, postgres: postgresCounts });

  const mismatches = Object.keys(postgresCounts).filter((key) => {
    const typedKey = key as keyof typeof postgresCounts;
    return postgresCounts[typedKey] < (firebaseCounts[typedKey] ?? 0);
  });

  if (mismatches.length) {
    throw new Error(`Validação falhou. Coleções com diferença: ${mismatches.join(', ')}`);
  }

  logProgress('Validação finalizada sem divergências críticas.');
}

export async function rollback() {
  logProgress('Executando rollback da migração (ordem reversa)...');
  await prisma.$transaction([
    prisma.logStatus.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.recebimento.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.pericia.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.local.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.status.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.modalidade.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.tipoPericia.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.vara.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.tribunal.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
    prisma.cidade.deleteMany({ where: { tenantId: BOOTSTRAP_TENANT_ID } }),
  ]);
  logProgress('Rollback concluído.');
}

async function main() {
  if (process.argv.includes('--rollback')) {
    await rollback();
    return;
  }

  await migrateData();
}

main()
  .catch((error) => {
    console.error('❌ Erro na migração Firebase -> PostgreSQL:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
