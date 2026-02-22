# Plano de Testes Completo — Pericias Manager Pro

## Objetivo
Garantir qualidade funcional, segurança (LGPD/RBAC), confiabilidade e conformidade para um sistema crítico médico-financeiro com impacto jurídico.

## Estratégia
- **Pirâmide de testes:** unitários (Vitest, já cobertos pelo time dev), E2E (Playwright), segurança (Playwright API), carga (k6), acessibilidade (axe-core).
- **Políticas obrigatórias:**
  - Testes de segurança são **BLOCKER** para deploy.
  - Testes E2E **independentes** com criação de massa própria.
  - Dados de teste anonimizados e isolados por tenant/usuário QA.
  - CI total < 10 min com paralelismo e retry controlado.

## Escopo por módulo — Casos de teste

> Legenda: Severidade = Critical / High / Medium / Low. Automatizável = S/N.

| ID | Módulo | Descrição | Pré-condição | Steps | Resultado esperado | Severidade | Automatizável |
|---|---|---|---|---|---|---|---|
| AUTH-001 | Auth | Login com credenciais válidas | Usuário ativo | Informar email/senha e submeter | Redireciona ao dashboard e cria sessão | Critical | S |
| AUTH-002 | Auth | Login inválido com bloqueio após 3 tentativas | Usuário existente | Tentar 3 senhas inválidas | Mensagem de erro + bloqueio temporário | High | S |
| AUTH-003 | Auth | Registro de usuário | Email novo | Preencher cadastro e enviar | Conta criada e fluxo de confirmação iniciado | High | S |
| AUTH-004 | Auth | Refresh token | Sessão autenticada | Esperar expiração e acionar refresh | Novo access token emitido sem logout | Critical | S |
| AUTH-005 | Auth | MFA (quando habilitado) | MFA ativo | Login + OTP válido | Acesso liberado só após 2º fator | Critical | S |
| AUTH-006 | Auth | Logout | Usuário autenticado | Clicar em sair | Sessão invalidada e redirect login | High | S |
| AUTH-007 | Auth | Sessão expirada | Token expirado | Acessar rota privada | Redirect para /login com aviso | High | S |
| RBAC-001 | RBAC | ADMIN vê todos módulos | Usuário ADMIN | Navegar em módulos principais | Acesso integral permitido | Critical | S |
| RBAC-002 | RBAC | ASSISTANT não acessa laudos | Usuário ASSISTANT | Acessar /laudos-pendentes | 403/redirect sem conteúdo sensível | Critical | S |
| RBAC-003 | RBAC | Isolamento entre usuários A/B | Dois usuários diferentes | Acessar recurso B com token A | Retorno 404 (sem vazamento de existência) | Critical | S |
| PER-001 | Perícias | CRUD completo de perícia | Usuário autenticado | Criar, editar, consultar, excluir | Operações persistidas com auditoria | Critical | S |
| PER-002 | Perícias | Filtros combinados (cidade+status) | Massa com cenários variados | Aplicar filtros | Lista retorna apenas registros compatíveis | High | S |
| PER-003 | Perícias | Busca por CNJ | Registro existente | Buscar por CNJ | Resultado único e correto | High | S |
| PER-004 | Perícias | Import CSV válido | Arquivo válido | Importar lote | Registros criados e resumo exibido | High | S |
| PER-005 | Perícias | Import CSV inválido | Arquivo inválido | Importar lote | Erros de validação claros sem gravação parcial indevida | High | S |
| PER-006 | Perícias | Batch update de status | Múltiplas perícias selecionadas | Aplicar atualização em lote | Status atualizado com log por item | High | S |
| FIN-001 | Financeiro | Recebimento manual | Usuário com permissão | Criar lançamento manual | Saldo atualizado corretamente | Critical | S |
| FIN-002 | Financeiro | Import batch financeiro | CSV válido | Importar e confirmar | Lançamentos processados sem duplicidade | Critical | S |
| FIN-003 | Financeiro | Matching automático | Itens pendentes | Executar matching | Itens conciliados corretamente | Critical | S |
| FIN-004 | Financeiro | Cálculo de saldo | Entradas e saídas cadastradas | Abrir dashboard | Saldo/indicadores corretos | Critical | S |
| FIN-005 | Financeiro | Conciliação manual | Pagamento pendente | Conciliar item | Situação atualizada e auditada | High | S |
| AGD-001 | Agenda | Criar evento | Usuário autenticado | Criar evento com horário válido | Evento aparece na agenda | High | S |
| AGD-002 | Agenda | Agendamento em lote (wizard 3 etapas) | Lista de processos | Completar 3 passos | Agendamentos criados com resumo final | High | S |
| AGD-003 | Agenda | Conflito de horário | Evento já existente | Tentar sobrepor agenda | Bloqueia criação e alerta conflito | Critical | S |
| LAD-001 | Laudo | Criar laudo | Perícia elegível | Abrir editor e criar seções | Laudo salvo e versionado | Critical | S |
| LAD-002 | Laudo | Editar seções | Laudo existente | Alterar texto e salvar | Versão atualizada sem perda de dados | High | S |
| LAD-003 | Laudo | Auto-save | Editor aberto | Editar e aguardar autosave | Persistência automática validada após reload | Critical | S |
| LAD-004 | Laudo | Export PDF | Laudo completo | Exportar PDF | Arquivo gerado com conteúdo íntegro | High | S |
| LAD-005 | Laudo | Coherence check | Seções preenchidas | Rodar verificação | Inconsistências apontadas com rastreabilidade | High | S |
| COM-001 | Comunicação | Envio de email | Template pronto | Enviar email | Entrega registrada + status | High | S |
| COM-002 | Comunicação | Templates | Módulo habilitado | Criar/editar template | Placeholder e preview corretos | Medium | S |
| COM-003 | Comunicação | Inbox | Conta conectada | Receber e abrir mensagem | Mensagens listadas e conteúdo íntegro | Medium | S |
| IA-001 | IA | Análise de documento | Documento anexado | Executar análise | Retorno estruturado e auditável | High | S |
| IA-002 | IA | Assistente de laudo | Laudo em edição | Gerar sugestão de texto | Sugestão contextual sem sobrescrita indevida | High | S |
| IA-003 | IA | Batch action IA | Múltiplos documentos | Rodar ação em lote | Processamento por lote com status por item | High | S |
| CC-001 | Cross-cutting | Navegação principal | Usuário logado | Navegar por menu e breadcrumbs | Rotas funcionam sem dead-end | Medium | S |
| CC-002 | Cross-cutting | Busca global | Dados indexados | Pesquisar termo | Resultados relevantes e seguros | High | S |
| CC-003 | Cross-cutting | Notificações | Evento de sistema | Disparar evento | Notificação correta sem duplicidade | Medium | S |
| CC-004 | Cross-cutting | Responsividade | Viewports mobile/desktop | Abrir páginas principais | Layout usável sem quebra crítica | High | S |

## Critérios de saída
- 100% dos testes BLOCKER aprovados.
- 0 falhas críticas abertas.
- Acessibilidade sem violações serious/critical.
- p95 < 500ms e erro < 1% no teste de carga.

## Riscos e mitigação
- **Risco:** vazamento entre tenants. **Mitigação:** suíte LGPD e teste negativo por API em toda release.
- **Risco:** regressão em permissões. **Mitigação:** suíte RBAC obrigatória no pipeline de merge.
- **Risco:** lentidão em horários de pico. **Mitigação:** execução recorrente de k6 com baseline histórica.
