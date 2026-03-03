import {
  AgendaEventType,
  AgendaTaskStatus,
  FontePagamento,
  PericiaPaymentStatus,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_NAME = 'Pericias Manager Pro - Dev Tenant';
const ADMIN_EMAIL = 'admin@pericias.dev';
const ASSISTANT_EMAIL = 'assistente@pericias.dev';

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

async function main() {
  const now = new Date();

  const tenant = await prisma.tenant.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: { name: TENANT_NAME, updatedAt: now },
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: TENANT_NAME,
      createdBy: null,
      updatedBy: null,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      tenantId: tenant.id,
      role: UserRole.ADMIN,
      isActive: true,
      updatedBy: tenant.id,
    },
    create: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      passwordHash: '<SECRET_HASH>',
      role: UserRole.ADMIN,
      createdBy: tenant.id,
      updatedBy: tenant.id,
    },
  });

  const assistant = await prisma.user.upsert({
    where: { email: ASSISTANT_EMAIL },
    update: {
      tenantId: tenant.id,
      role: UserRole.ASSISTANT,
      isActive: true,
      updatedBy: admin.id,
    },
    create: {
      tenantId: tenant.id,
      email: ASSISTANT_EMAIL,
      passwordHash: '<SECRET_HASH>',
      role: UserRole.ASSISTANT,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      createdBy: tenant.createdBy ?? admin.id,
      updatedBy: admin.id,
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: {
      fullName: 'Dr. Rafael Menezes',
      specialty: 'Medicina Legal e Perícias',
      updatedBy: admin.id,
    },
    create: {
      tenantId: tenant.id,
      userId: admin.id,
      fullName: 'Dr. Rafael Menezes',
      specialty: 'Medicina Legal e Perícias',
      phone: '+55 31 99999-1000',
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: assistant.id },
    update: {
      fullName: 'Juliana Costa',
      specialty: 'Assistência Pericial',
      updatedBy: admin.id,
    },
    create: {
      tenantId: tenant.id,
      userId: assistant.id,
      fullName: 'Juliana Costa',
      specialty: 'Assistência Pericial',
      phone: '+55 31 99999-2000',
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  const tribunal = await prisma.tribunal.upsert({
    where: { tenantId_sigla: { tenantId: tenant.id, sigla: 'TJMG' } },
    update: { nome: 'Tribunal de Justiça de Minas Gerais', updatedBy: admin.id },
    create: {
      tenantId: tenant.id,
      nome: 'Tribunal de Justiça de Minas Gerais',
      sigla: 'TJMG',
      esfera: 'ESTADUAL',
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  const cidadesData = [
    { nome: 'Belo Horizonte', varas: ['1ª Vara Cível', '2ª Vara Cível', 'Vara da Fazenda Pública'] },
    { nome: 'Contagem', varas: ['1ª Vara Cível', '2ª Vara Cível'] },
    { nome: 'Betim', varas: ['1ª Vara Cível', 'Vara do Juizado Especial'] },
    { nome: 'Ouro Preto', varas: ['1ª Vara Cível', 'Vara Única'] },
    { nome: 'Juiz de Fora', varas: ['1ª Vara Cível', '2ª Vara Cível', '3ª Vara Cível'] },
  ];

  const cidades = [] as Array<{ id: string; nome: string }>;

  for (const c of cidadesData) {
    const cidade = await prisma.cidade.upsert({
      where: { tenantId_nome_uf: { tenantId: tenant.id, nome: c.nome, uf: 'MG' } },
      update: { updatedBy: admin.id },
      create: {
        tenantId: tenant.id,
        nome: c.nome,
        uf: 'MG',
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });

    cidades.push({ id: cidade.id, nome: cidade.nome });

    for (const varaNome of c.varas) {
      const existingVara = await prisma.vara.findFirst({
        where: { tenantId: tenant.id, cidadeId: cidade.id, nome: varaNome },
        select: { id: true },
      });

      if (!existingVara) {
        await prisma.vara.create({
          data: {
            tenantId: tenant.id,
            cidadeId: cidade.id,
            tribunalId: tribunal.id,
            nome: varaNome,
            createdBy: admin.id,
            updatedBy: admin.id,
          },
        });
      }
    }
  }

  const tipos = [
    { codigo: 'previdenciaria', nome: 'Perícia Previdenciária' },
    { codigo: 'acidentaria', nome: 'Perícia Acidentária' },
    { codigo: 'securitaria', nome: 'Perícia Securitária' },
    { codigo: 'erro_medico', nome: 'Perícia por Erro Médico' },
    { codigo: 'interdicao', nome: 'Perícia de Interdição' },
    { codigo: 'dano_fisico', nome: 'Perícia de Dano Físico' },
  ];

  for (const tipo of tipos) {
    await prisma.tipoPericia.upsert({
      where: { tenantId_codigo: { tenantId: tenant.id, codigo: tipo.codigo } },
      update: { nome: tipo.nome, updatedBy: admin.id },
      create: {
        tenantId: tenant.id,
        codigo: tipo.codigo,
        nome: tipo.nome,
        ativo: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  const modalidades = [
    { codigo: 'presencial', nome: 'Presencial' },
    { codigo: 'telepericia', nome: 'Teleperícia' },
    { codigo: 'hibrida', nome: 'Híbrida' },
  ];

  for (const modalidade of modalidades) {
    await prisma.modalidade.upsert({
      where: { tenantId_codigo: { tenantId: tenant.id, codigo: modalidade.codigo } },
      update: { nome: modalidade.nome, updatedBy: admin.id },
      create: {
        tenantId: tenant.id,
        codigo: modalidade.codigo,
        nome: modalidade.nome,
        ativo: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  const statuses = [
    { codigo: 'NOMEADA', nome: 'Nomeada', cor: '#64748B', ordem: 1 },
    { codigo: 'ACEITA', nome: 'Aceita', cor: '#334155', ordem: 2 },
    { codigo: 'AGENDADA', nome: 'Agendada', cor: '#3B82F6', ordem: 3 },
    { codigo: 'REALIZADA', nome: 'Realizada', cor: '#8B5CF6', ordem: 4 },
    { codigo: 'EM_LAUDO', nome: 'Em Laudo', cor: '#A855F7', ordem: 5 },
    { codigo: 'LAUDO_ENVIADO', nome: 'Laudo Enviado', cor: '#22C55E', ordem: 6 },
    { codigo: 'COBRANCA', nome: 'Em Cobrança', cor: '#EAB308', ordem: 7 },
    { codigo: 'PAGO_PARCIAL', nome: 'Pago Parcial', cor: '#F97316', ordem: 8 },
    { codigo: 'PAGO', nome: 'Pago', cor: '#16A34A', ordem: 9 },
  ];

  for (const s of statuses) {
    await prisma.status.upsert({
      where: { tenantId_codigo: { tenantId: tenant.id, codigo: s.codigo } },
      update: { nome: s.nome, cor: s.cor, ordem: s.ordem, updatedBy: admin.id },
      create: {
        tenantId: tenant.id,
        codigo: s.codigo,
        nome: s.nome,
        cor: s.cor,
        ordem: s.ordem,
        ativo: true,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  const varas = await prisma.vara.findMany({ where: { tenantId: tenant.id } });
  const tiposDb = await prisma.tipoPericia.findMany({ where: { tenantId: tenant.id } });
  const modalidadesDb = await prisma.modalidade.findMany({ where: { tenantId: tenant.id } });
  const statusesDb = await prisma.status.findMany({ where: { tenantId: tenant.id }, orderBy: { ordem: 'asc' } });

  const lawyers = [] as { id: string; nome: string }[];
  for (let i = 1; i <= 10; i++) {
    const nome = `Advogado ${i.toString().padStart(2, '0')}`;
    const existing = await prisma.lawyer.findFirst({ where: { tenantId: tenant.id, nome }, select: { id: true, nome: true } });

    if (existing) {
      lawyers.push(existing);
    } else {
      const created = await prisma.lawyer.create({
        data: {
          tenantId: tenant.id,
          nome,
          oab: `MG${10000 + i}`,
          ufOab: 'MG',
          email: `adv${i}@escritorio.dev`,
          telefone: `+55 31 98888-${String(1000 + i).slice(-4)}`,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        select: { id: true, nome: true },
      });
      lawyers.push(created);
    }
  }

  const currentPericias = await prisma.pericia.count({ where: { tenantId: tenant.id } });
  const needed = Math.max(0, 30 - currentPericias);

  for (let i = 0; i < needed; i++) {
    const globalIndex = currentPericias + i + 1;
    const cidade = pick(cidades, globalIndex);
    const varasDaCidade = varas.filter((v) => v.cidadeId === cidade.id);
    if (varasDaCidade.length === 0) {
      throw new Error(`Seed inconsistente: cidade ${cidade.nome} sem varas cadastradas.`);
    }
    const vara = pick(varasDaCidade, globalIndex);
    const tipoPericia = pick(tiposDb, globalIndex);
    const modalidade = pick(modalidadesDb, globalIndex);
    const status = pick(statusesDb, globalIndex);

    const baseDate = new Date(now);
    baseDate.setDate(now.getDate() - (30 - i));

    const pagamentoStatus =
      i % 4 === 0
        ? PericiaPaymentStatus.PENDENTE
        : i % 4 === 1
          ? PericiaPaymentStatus.PARCIAL
          : i % 4 === 2
            ? PericiaPaymentStatus.PAGO
            : PericiaPaymentStatus.ATRASADO;

    const pericia = await prisma.pericia.create({
      data: {
        tenantId: tenant.id,
        processoCNJ: `${String(globalIndex).padStart(7, '0')}-12.2025.8.13.0001`,
        processoCNJDigits: `${String(globalIndex).padStart(7, '0')}1220258130001`,
        cidadeId: cidade.id,
        varaId: vara.id,
        tipoPericiaId: tipoPericia.id,
        modalidadeId: modalidade.id,
        statusId: status.id,
        juizNome: `Juiz ${globalIndex}`,
        autorNome: `Autor ${globalIndex}`,
        reuNome: `Réu ${globalIndex}`,
        periciadoNome: `Periciado ${globalIndex}`,
        periciadoCpf: `000000000${(globalIndex % 10).toString()}`,
        isUrgent: globalIndex % 6 === 0,
        agendada: globalIndex % 5 !== 0,
        laudoEnviado: globalIndex % 4 === 0,
        finalizada: globalIndex % 3 === 0,
        pagamentoStatus,
        dataNomeacao: baseDate,
        dataAgendamento: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 5),
        dataRealizacao: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 10),
        dataEnvioLaudo: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 14),
        horaAgendamento: '14:00',
        honorariosPrevistosJG: new Prisma.Decimal(1200 + i * 35),
        honorariosPrevistosPartes: new Prisma.Decimal(300 + i * 10),
        observacoes: 'Caso seed para desenvolvimento',
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });

    await prisma.lawyerOnPericia.create({
      data: {
        tenantId: tenant.id,
        periciaId: pericia.id,
        lawyerId: pick(lawyers, globalIndex).id,
        roleInCase: globalIndex % 2 === 0 ? 'AUTOR' : 'REU',
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });

    if (i < 15) {
      await prisma.recebimento.create({
        data: {
          tenantId: tenant.id,
          periciaId: pericia.id,
          fontePagamento: i % 2 === 0 ? FontePagamento.TJ : FontePagamento.PARTE_AUTORA,
          dataRecebimento: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 20),
          valorBruto: new Prisma.Decimal(1000 + i * 100),
          valorLiquido: new Prisma.Decimal(930 + i * 95),
          tarifa: new Prisma.Decimal(15),
          desconto: new Prisma.Decimal(5),
          descricao: 'Recebimento seed',
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      });
    }

    if (i < 5) {
      await prisma.despesa.create({
        data: {
          tenantId: tenant.id,
          periciaId: pericia.id,
          categoria: 'DESLOCAMENTO',
          descricao: `Combustível visita ${i + 1}`,
          valor: new Prisma.Decimal(85 + i * 12),
          dataCompetencia: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24 * 9),
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      });
    }
  }

  const pericias = await prisma.pericia.findMany({ where: { tenantId: tenant.id }, take: 5, orderBy: { createdAt: 'asc' } });
  for (const [idx, p] of pericias.entries()) {
    const existingEvent = await prisma.agendaEvent.findFirst({
      where: { tenantId: tenant.id, periciaId: p.id, title: `Evento seed ${idx + 1}` },
      select: { id: true },
    });

    if (!existingEvent) {
      await prisma.agendaEvent.create({
        data: {
          tenantId: tenant.id,
          periciaId: p.id,
          title: `Evento seed ${idx + 1}`,
          description: 'Compromisso pericial',
          type: AgendaEventType.PERICIA,
          startAt: new Date(now.getTime() + (idx + 1) * 1000 * 60 * 60 * 24),
          endAt: new Date(now.getTime() + (idx + 1) * 1000 * 60 * 60 * 24 + 1000 * 60 * 90),
          createdBy: assistant.id,
          updatedBy: assistant.id,
        },
      });

      await prisma.agendaTask.create({
        data: {
          tenantId: tenant.id,
          periciaId: p.id,
          title: `Checklist pré-perícia ${idx + 1}`,
          status: AgendaTaskStatus.TODO,
          dueAt: new Date(now.getTime() + (idx + 1) * 1000 * 60 * 60 * 18),
          createdBy: assistant.id,
          updatedBy: assistant.id,
        },
      });
    }
  }

  const maneuvers = [
    {
      name: 'Lasegue',
      category: 'Neurológico',
      summary: 'Elevação da perna estendida para avaliação radicular lombar.',
      procedure: { posicionamento: 'Decúbito dorsal', passo: ['Elevar membro', 'Observar dor irradiada'] },
    },
    {
      name: 'Phalen',
      category: 'Membro Superior',
      summary: 'Flexão forçada dos punhos para triagem de síndrome do túnel do carpo.',
      procedure: { posicionamento: 'Sentado', passo: ['Flexão máxima dos punhos por 60s'] },
    },
    {
      name: 'Spurling',
      category: 'Coluna Cervical',
      summary: 'Compressão cervical com inclinação lateral para reproduzir dor radicular.',
      procedure: { posicionamento: 'Sentado', passo: ['Extensão cervical', 'Inclinação lateral', 'Compressão axial'] },
    },
  ];

  for (const m of maneuvers) {
    const exists = await prisma.physicalManeuver.findFirst({
      where: { tenantId: tenant.id, name: m.name },
      select: { id: true },
    });

    if (!exists) {
      await prisma.physicalManeuver.create({
        data: {
          tenantId: tenant.id,
          name: m.name,
          category: m.category,
          summary: m.summary,
          procedure: m.procedure,
          evidence: { forca: 'moderada', nivel: 'B' },
          tags: ['ortopedia', 'neurologia'],
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      });
    }
  }

  console.log('✅ Seed concluído com sucesso.');
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
