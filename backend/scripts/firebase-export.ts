/**
 * PASSO 1 — Exportar dados do Firebase Firestore para arquivos JSON locais.
 *
 * PRÉ-REQUISITOS:
 *   1. Baixar a chave de serviço do Firebase:
 *      Firebase Console → Configurações do Projeto → Contas de serviço
 *      → Gerar nova chave privada → salvar como "serviceAccountKey.json"
 *      na pasta raiz do backend
 *
 * USO:
 *   FIREBASE_PROJECT_ID=gestor-pericial-4be50 \
 *   npx ts-node scripts/firebase-export.ts
 *
 *   Os JSONs serão salvos em: backend/firebase-export/
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const COLLECTIONS = [
  'cidades',
  'modalidades',
  'pericias',
  'agenda_events',
  'agenda_tasks',
  'case_documents',
  'pre_laudos',
  'recebimentos',
  'import_batches',
  'activity_logs',
  'daily_usage',
  'cnj_sync_queue',
  'config',
  'logs',
];

const OUTPUT_DIR = path.join(process.cwd(), 'firebase-export');

function serializeFirestore(data: admin.firestore.DocumentData): unknown {
  if (data === null || data === undefined) return data;
  if (data instanceof admin.firestore.Timestamp) {
    return { _seconds: data.seconds, _nanoseconds: data.nanoseconds };
  }
  if (Array.isArray(data)) {
    return data.map(serializeFirestore);
  }
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = serializeFirestore(v as admin.firestore.DocumentData);
    }
    return out;
  }
  return data;
}

async function exportCollection(
  db: admin.firestore.Firestore,
  name: string,
): Promise<void> {
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) {
    console.log(`  ⚠️  ${name}: coleção vazia`);
    return;
  }

  const docs = snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...(serializeFirestore(doc.data()) as object),
  }));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${name}.json`),
    JSON.stringify(docs, null, 2),
    'utf-8',
  );
  console.log(`  ✔  ${name}: ${docs.length} documentos`);
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('❌ Defina a variável FIREBASE_PROJECT_ID');
    process.exit(1);
  }

  const keyPath = path.join(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    console.error(`❌ Arquivo não encontrado: ${keyPath}`);
    console.error(
      '   Baixe em: Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada',
    );
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId,
  });

  const db = admin.firestore();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\n📦 Exportando projeto: ${projectId}`);
  console.log(`📁 Destino: ${OUTPUT_DIR}\n`);

  for (const col of COLLECTIONS) {
    try {
      await exportCollection(db, col);
    } catch (err) {
      console.warn(`  ⚠️  ${col}: erro — ${(err as Error).message}`);
    }
  }

  console.log('\n✅ Exportação concluída! Agora execute o import-firebase.ts\n');
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});
