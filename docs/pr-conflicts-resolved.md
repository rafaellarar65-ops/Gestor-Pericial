# Resolução de conflitos de Pull Requests

Este branch integra e resolve conflitos dos PRs abertos na `main` no momento da execução.

## PRs abertos analisados e integrados

- #124 — `codex/update-sidebar-config.ts-to-include-orphan-routes`
- #123 — `codex/add-click-handlers-to-buttons`
- #121 — `codex/add-onclick-to-export-agenda-button`
- #118 — `codex/implement-crud-for-message-templates`
- #117 — `codex/expand-teleslot-to-telepericia_slots`
- #116 — `codex/implement-telepericia-queue-endpoints`
- #114 — `codex/implement-backend-scheduling-for-telepericia`
- #113 — `codex/create-dedicated-whatsapp-backend-module`
- #111 — `codex/add-pdf-export-button-and-backend`
- #110 — `codex/add-tenantid-handling-in-agenda-service`
- #109 — `codex/implement-google-calendar-integration-features`
- #108 — `codex/create-analytics-calendar-page-and-api`
- #107 — `codex/update-schema-and-add-new-fields-70r3b8`
- #106 — `codex/update-schema-and-add-new-fields`
- #105 — `codex/refactor-agenda-page-and-create-components-ojdtdf`
- #104 — `codex/refactor-agenda-page-and-create-components`

## Estratégia de resolução

Os conflitos foram resolvidos durante merges sequenciais dessas branches no branch atual (`work`) com estratégia automática de merge (`ort`) e preferência de resolução para alterações da branch de PR quando necessário (`-X theirs`).
