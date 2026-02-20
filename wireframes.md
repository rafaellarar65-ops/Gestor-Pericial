# Entrega 4 — Wireframes Descritivos de Todas as Páginas

## Índice
1. [Login](#login)
2. [Dashboard](#dashboard)
3. [Nomeações](#nomeações)
4. [Agenda](#agenda)
5. [Perícias do Dia](#perícias-do-dia)
6. [Agendar em Lote](#agendar-em-lote)
7. [Esclarecimentos](#esclarecimentos)
8. [Agenda Geral / Próximas](#agenda-geral--próximas)
9. [Teleperícias](#teleperícias)
10. [Lista de Perícias](#lista-de-perícias)
11. [Nova Perícia](#nova-perícia)
12. [Detalhe da Perícia](#detalhe-da-perícia)
13. [Editar Perícia](#editar-perícia)
14. [Laudo V2](#laudo-v2)
15. [Laudos Pendentes](#laudos-pendentes)
16. [Base de Conhecimento](#base-de-conhecimento)
17. [Manobras](#manobras)
18. [Financeiro](#financeiro)
19. [Cobrança](#cobrança)
20. [Relatórios Financeiros](#relatórios-financeiros)
21. [Despesas](#despesas)
22. [Cidades](#cidades)
23. [Detalhe da Cidade](#detalhe-da-cidade)
24. [Hub de Comunicação](#hub-de-comunicação)
25. [Inbox de Email](#inbox-de-email)
26. [Advogados](#advogados)
27. [Configurações](#configurações)
28. [Documentação](#documentação)
29. [Mapa de Comarcas](#mapa-de-comarcas)
30. [Upload Mobile](#upload-mobile)

> Padrão comum para páginas autenticadas: **Sidebar + Header com Breadcrumb + conteúdo em grid 12 colunas + painel lateral contextual opcional**.

---

## Login
**URL:** `/login`  
**Acesso:** Público  
**Objetivo:** autenticar usuário e iniciar sessão.

**Layout:** split 6/6 desktop (branding + formulário).  
**Seção Superior:** logo, título “Perícias Manager Pro”.  
**Corpo Principal:** `Input` email/senha, `Button` entrar, link recuperar senha, alerta erro auth.  
**Modais:** recuperar senha.  
**Responsividade:** desktop split; tablet empilha; mobile formulário full.

---

## Dashboard
**URL:** `/`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** visão executiva diária operacional + financeira.

**Layout:** grid 12 colunas com linha 1 KPIs (`PericiaFinanceiro`, `PericiaKPIs`), linha 2 agenda e pendências, linha 3 tabela resumo.  
**Seção Superior:** título, período, filtros por cidade/status, ação “Nova Perícia”.  
**Corpo Principal:**
- `KPICard` (em aberto, recebidos mês, laudos pendentes, teleperícias)
- bloco “Hoje” (`AgendaEvent`)
- bloco “Esclarecimentos” (`Pericia.esclarecimentos`)
- mini `DataTable` de perícias críticas (`isUrgent`, `statusId`, `dataAgendamento`)
**Estados:** vazio com onboarding, loading skeleton, erro integração.  
**Responsividade:** desktop 4x cards; tablet 2x2; mobile carrossel KPI + blocos empilhados.

---

## Nomeações
**URL:** `/nomeacoes`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** triar novas nomeações e converter em perícias ativas.

**Layout:** header + `DataTable` principal + `Sheet` detalhe rápido.  
**Seção Superior:** título, filtros (cidade, vara, período), botão “Importar”.  
**Corpo Principal:** tabela com `processoCNJ`, `varaId`, `cidadeId`, `dataNomeacao`, `statusId`; seleção em lote para aceitar/arquivar.  
**Modais:** confirmar importação, vincular cidade/vara ausente.  
**Responsividade:** mobile troca tabela por cards com CTA primária.

---

## Agenda
**URL:** `/agenda`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** visualizar e ajustar agenda mensal/semanal.

**Layout:** calendário grande (8 colunas) + painel lateral eventos (4 colunas).  
**Header:** alternância mês/semana, filtros por cidade/modalidade.  
**Corpo:** `AgendaEvent` por tipo (`PERICIA`, `PRAZO`, etc.), drag-and-drop de horário, quick-add.  
**Estados:** sem eventos, conflito de agenda, loading.  
**Modais:** criar/editar evento.  
**Responsividade:** tablet semanal simplificada; mobile lista cronológica do dia.

---

## Perícias do Dia
**URL:** `/pericias-hoje`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** executar checklist operacional diário.

**Layout:** lista por horário + checklist lateral.  
**Header:** data atual, filtro cidade/local.  
**Corpo:** cards de `Pericia` com `horaAgendamento`, `autorNome`, `localPericia`, `checklist[]`; ações iniciar exame, abrir rota, marcar concluída.  
**Modais:** reagendar, registrar ausência.  
**Responsividade:** mobile cartão com ações sticky.

---

## Agendar em Lote
**URL:** `/agendar`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** agendar várias perícias com baixa fricção.

**Layout:** `StepWizard` 4 etapas (seleção → datas/horas → revisão → confirmação).  
**Header:** progresso + salvar rascunho.  
**Corpo:** usa `BatchApplyRequest`/`BatchApplyResponse` e preview de conflitos.  
**Estados:** parcial com erros por item.  
**Modais:** confirmar aplicação em lote.  
**Responsividade:** mobile 1 etapa por tela.

---

## Esclarecimentos
**URL:** `/esclarecimentos`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** gerenciar prazos pendentes de esclarecimentos.

**Layout:** tabela + painel SLA.  
**Header:** filtros por prazo (vencido, hoje, 7 dias).  
**Corpo:** `Pericia.esclarecimentos.dataIntimacao`, `prazoDias`, status resolvido; badge urgência.  
**Modais:** marcar como resolvido + registrar envio.  
**Responsividade:** cards com contagem regressiva.

---

## Agenda Geral / Próximas
**URL:** `/agenda-geral`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** visão timeline de próximos compromissos.

**Layout:** `Timeline` vertical por data.  
**Header:** filtro tipo de evento e cidade.  
**Corpo:** eventos futuros com link para perícia.  
**Responsividade:** mobile timeline compacta.

---

## Teleperícias
**URL:** `/telepericias`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** criar/gerir slots e vínculos de teleperícia.

**Layout:** grid de slots + formulário lateral.  
**Header:** data, duração padrão, botão “Novo slot”.  
**Corpo:** `TeleSlot` (`date`, `time`, `durationMinutes`, `status`) e vínculo com `periciaId`; contato `telepericiaContato`.  
**Modais:** bloquear horário, reenviar link.  
**Responsividade:** mobile lista por horário.

---

## Lista de Perícias
**URL:** `/pericias`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** hub principal de consulta e operação de casos.

**Layout:** `DataTable` full com filtros avançados e ações em lote.  
**Header:** busca CNJ/nome, filtros (`statusId`, cidade, vara, pagamento), botão “Nova Perícia”.  
**Corpo:** colunas chave: `processoCNJ`, `autorNome`, `reuNome`, `cidadeId`, `statusId`, `dataAgendamento`, `pagamentoStatus`, `isUrgent`.  
**Modais:** bulk update status, export CSV.  
**Responsividade:** mobile lista card + menu de ações.

---

## Nova Perícia
**URL:** `/pericias/nova`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** cadastrar nova perícia completa.

**Layout:** formulário em seções (Dados processuais, Partes, Agenda, Financeiro).  
**Header:** título + ações salvar/cancelar.  
**Corpo:** campos de `Pericia` obrigatórios (`processoCNJ`, `cidadeId`, `varaId`, `tipoPericiaId`, `modalidadeId`, `statusId`, `dataNomeacao`) e opcionais.  
**Modais:** confirmar saída sem salvar.  
**Responsividade:** desktop 2 colunas, mobile 1 coluna.

---

## Detalhe da Perícia
**URL:** `/pericias/:id`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** centralizar ciclo completo de uma perícia.

**Layout:** header contextual + tabs (Dados, Documentos, Financeiro, Laudo, Timeline, Esclarecimentos).  
**Header:** CNJ, status, urgência, ações rápidas (editar, laudo, cobrar).  
**Corpo:** visão 360 mapeada a `Pericia` + entidades relacionadas (`CaseDocument`, `Recebimento`, `LogStatus`, `AgendaEvent`).  
**Sidebar/painel:** atividade recente + próximos prazos.  
**Modais:** anexar documento, alterar status, registrar recebimento.  
**Responsividade:** mobile tabs horizontais roláveis.

---

## Editar Perícia
**URL:** `/pericias/:id/editar`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** editar dados do caso com auditoria.

**Layout:** igual Nova Perícia com diff visual em campos alterados.  
**Corpo:** lock otimista, histórico breve de alterações.  
**Modais:** conflito de edição simultânea.  
**Responsividade:** formulário único em coluna no mobile.

---

## Laudo V2
**URL:** `/pericias/:id/laudo-v2`  
**Acesso:** ADMIN  
**Objetivo:** produzir laudo com suporte IA e dados estruturados.

**Layout:** 3 colunas (outline seções, editor, painel IA/transcrição).  
**Header:** estado de salvamento, exportar PDF, validar coerência.  
**Corpo:** usa `PreLaudo`, `LaudoTemplate`, `LaudoSectionKey`, `TranscriptLogItem`, `ExamPerformed`.  
**Estados:** autosave, erro IA, conflito versão.  
**Modais:** confirmar geração final PDF/assinatura.  
**Responsividade:** mobile read-only com aviso “editar no desktop”.

---

## Laudos Pendentes
**URL:** `/laudos`  
**Acesso:** ADMIN (ASSISTANT visualização opcional)  
**Objetivo:** priorizar e despachar laudos em fila.

**Layout:** tabela por SLA + painel de prioridades.  
**Corpo:** `dataRealizacao`, `dataEnvioLaudo`, `statusId`, urgência, tempo em fila.  
**Ações:** abrir laudo, atribuir prioridade, marcar enviado.

---

## Base de Conhecimento
**URL:** `/conhecimento`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** consultar modelos, literatura e discussões.

**Layout:** busca + filtros por categoria + lista + preview.  
**Dados:** `KnowledgeItem.title`, `category`, `tags`, `summary`, `updatedAt`.  
**Modais:** novo artigo/editar tags.

---

## Manobras
**URL:** `/manobras`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** catálogo técnico de manobras de exame físico.

**Layout:** lista + detalhe lateral.  
**Dados:** `PhysicalManeuver.name`, `category`, `summary`, `evidence.grade`, `status`.  
**Interações:** filtrar por categoria, abrir protocolo, favoritar.

---

## Financeiro
**URL:** `/financeiro`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** visão consolidada de honorários e recebimentos.

**Layout:** KPIs topo + tabela recebimentos + saldo aberto.  
**Dados:** `PericiaFinanceiro`, `Recebimento`, `ImportBatch`.  
**Modais:** lançamento manual, conciliar transação.

---

## Cobrança
**URL:** `/financeiro/cobranca`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** priorizar cobranças e executar contatos.

**Layout:** funil por aging + tabela acionável.  
**Dados:** dias em aberto, valor, fonte pagadora, último contato.  
**Ações:** gerar email template (`EmailTemplate`), registrar retorno.

---

## Relatórios Financeiros
**URL:** `/relatorios`  
**Acesso:** ADMIN  
**Objetivo:** análise de performance financeira.

**Layout:** filtros + gráficos + tabela comparativa (vara/cidade).  
**Dados:** `FinancialScore`, `VaraPerformance`, `AgingBucket`.  
**Responsividade:** mobile reduz para cards + gráfico único.

---

## Despesas
**URL:** `/despesas`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** CRUD de despesas operacionais.

**Layout:** tabela + formulário lateral.  
**Dados:** `Despesa.data`, `categoria`, `valor`, `cidadeId`, `descricao`.  
**Modais:** editar/excluir despesa.

---

## Cidades
**URL:** `/cidades`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** gerenciar comarcas e visão de carga por cidade.

**Layout:** tabela cidades + indicadores de volume.  
**Dados:** `Cidade.nome`, `uf`, total perícias ativas.  
**Ações:** abrir detalhe da cidade.

---

## Detalhe da Cidade
**URL:** `/cidades/:id`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** analisar processos e agenda de uma comarca.

**Layout:** header cidade + abas (Perícias, Agenda, Financeiro local).  
**Dados:** perícias vinculadas por `cidadeId`, varas relacionadas.

---

## Hub de Comunicação
**URL:** `/comunicacao`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** central de templates e geração de mensagens.

**Layout:** tabs (Templates, Gerador, Histórico).  
**Dados:** `EmailTemplate` com placeholders (`{{CIDADE}}`, etc.).  
**Ações:** pré-visualizar, enviar, salvar template.

---

## Inbox de Email
**URL:** `/email-inbox`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** ler e processar emails operacionais.

**Layout:** 3 colunas (pastas, lista, leitura).  
**Dados:** `EmailHeader`, `EmailDetail`, flags e filtros.  
**Ações:** vincular email a perícia, responder com template.

---

## Advogados
**URL:** `/advogados`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** manter base de advogados e vínculos com casos.

**Layout:** tabela + drawer de cadastro.  
**Dados:** `Lawyer.name`, `oab`, `ufOab`, `email`, `phone`.  
**Ações:** associar a perícias (`lawyerIds`).

---

## Configurações
**URL:** `/configuracoes`  
**Acesso:** ADMIN  
**Objetivo:** parametrizar sistema, integrações e templates.

**Layout:** tabs (Conta, Aparência, Status, Tipos, Integrações, Templates, Regras).  
**Dados:** `UserProfile`, `IntegrationSettings`, `NotificationConfig`, `SmartRule`, `AutomationRule`.  
**Modais:** testar integração, resetar configuração.

---

## Documentação
**URL:** `/documentacao`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** acesso rápido a ajuda e guias operacionais.

**Layout:** sidebar de tópicos + conteúdo markdown + busca.  
**Ações:** abrir atalhos, copiar instruções.

---

## Mapa de Comarcas
**URL:** `/mapa-comarcas`  
**Acesso:** ADMIN, ASSISTANT  
**Objetivo:** visualizar distribuição geográfica de perícias (desktop only).

**Layout:** mapa principal + painel métricas por cidade.  
**Dados:** contagem perícias por `cidadeId`, urgências e valores abertos.  
**Responsividade:** tablet simplifica para lista; mobile redireciona para Cidades.

---

## Upload Mobile
**URL:** `/mobile-upload/:sessionId`  
**Acesso:** ADMIN, ASSISTANT (link autenticado por sessão)  
**Objetivo:** capturar e enviar fotos/documentos via celular.

**Layout:** fluxo full-screen com câmera/upload, preview e envio.  
**Corpo:** `FileUpload` com categoria + progresso + confirmação.  
**Estados:** sem permissão câmera, offline, upload concluído.  
**Responsividade:** focado em mobile/PWA, desktop mostra instrução por QR.

---

## Padrão de Estados para TODAS as páginas
- **Carregando:** `LoadingSkeleton` equivalente ao layout final.
- **Vazio:** `EmptyState` com CTA primária.
- **Erro:** `Alert` + ação de retry.
- **Sucesso:** `Toast` contextual.

## Dados verossímeis (exemplo de referência visual)
- CNJ: `0001234-56.2024.8.13.0001`
- Autor: `José Carlos Almeida`
- Réu: `Município de Belo Horizonte`
- Cidade: `Belo Horizonte/MG`, `Contagem/MG`, `Juiz de Fora/MG`
