# STATUS DO PROJETO ULTRON

> Arquivo de continuidade. Se o contexto da conversa for perdido/resetado, leia este arquivo primeiro para saber exatamente onde o trabalho parou e o que fazer a seguir.

Última atualização: 2026-07-29

---

## 1. O QUE É ESTE PROJETO

Superassistente pessoal/profissional local-first ("Projeto Ultron"), especificado em [prompt_Inicial.md](prompt_Inicial.md) (4313 linhas).

Resumo rápido: monólito modular local (Tauri 2 + React no desktop, Control Plane em Node + Fastify + WebSocket + SQLite), com adapters para OpenClaw, Ollama, Claude Code, Codex, routers de modelo, ElevenLabs, Gmail, Calendar, WhatsApp, GitHub. 20 fases de implementação.

Repositório remoto: https://github.com/Vin1-SF19/Projeto_Ultron.git (branch `master` = trabalho já revisado/estável; branch `develop` criada para integração; branches `phase/NN-nome` por fase, conforme seção 55 do prompt mestre).

---

## 2. ONDE PARAMOS (ESTADO ATUAL)

**FASE 0 (Auditoria) — CONCLUÍDA.**
**FASE 1 (Fundação do monorepo) — CONCLUÍDA.** Commitada e enviada ao GitHub (`master`, commit `916f904`).
**FASE 2 (Control Plane e Event Bus) — CONCLUÍDA.** Ainda não commitada (ver seção 8 — próximo passo).

Branch de trabalho atual: `phase/02-control-plane` (criada a partir de `develop`, que foi criada a partir de `master`).

Próxima fase a iniciar: **FASE 3 — OpenClaw Adapter** (descoberta do Gateway local, WebSocket/RPC, autenticação, health, reconexão, mapeamento de eventos, camada anticorrupção — ver ADR-003 e seção 51 do prompt mestre).

### Checklist Fase 2 (concluída nesta sessão)
- [x] `packages/event-bus` criado — EventBus in-process pub/sub, com suporte a filtro por tipo exato ou prefixo wildcard (`system.*`), e handler de erro por assinante que **nunca deixa um listener quebrado derrubar os demais nem quem publicou** (testado).
- [x] `EventStore` do control-plane refatorado para depender do `EventBus` (recebe por injeção), preservando a garantia "grava antes de publicar" (um assinante nunca vê um evento que não sobreviveria a um reinício).
- [x] `EventStore.listSince(cursor)` — replay incremental por cursor (usa `rowid` como critério de ordenação monotônica), testado.
- [x] `AuditLog` (`apps/control-plane/src/audit-log.ts`) — tabela `audit_events` (migration `002_audit_events`), distinta da tabela `events` de domínio. Campos: `actor_type` (user/agent/system), `actor_id`, `action`, `outcome` (success/failure), `target_type`/`target_id`, `details`. Endpoint `GET /api/v1/audit`.
- [x] Erros padronizados: `UltronError` (código + statusCode + details) e envelope JSON consistente `{ error: { code, message, correlationId, details } }` para todo erro HTTP, incluindo 404 (`setNotFoundHandler`) e 500 não tratado — nunca mensagem genérica "Algo deu errado".
- [x] Correlation ID de ponta a ponta: hook `onRequest` gera ou reaproveita `x-correlation-id` (header), devolvido em toda resposta; usado nos logs estruturados e nas entradas de auditoria.
- [x] WebSocket (`/ws`) agora aceita mensagem `{ kind: "replay_since", cursor }` do cliente para replay incremental, além do replay dos últimos 50 eventos na conexão inicial. Erros de envio ao socket são capturados e logados, não derrubam a conexão.
- [x] Testes de reinício: `event-store.test.ts` reabre o **mesmo arquivo SQLite** (não `:memory:`) em um diretório temporário, simulando fechar e reabrir o processo, confirmando que eventos persistem.
- [x] Teste de falha: listener do EventBus que lança erro proposital — confirmado que não impede gravação nem os demais assinantes.
- [x] Validado de ponta a ponta com o binário compilado real (`node dist/main.js`): correlation ID customizado no header, 404 com envelope padronizado, `/api/v1/audit` retornando o evento real `control_plane.started`.
- [x] `pnpm install`, `pnpm build`, `pnpm test` (25 testes, 5 pacotes), `pnpm lint`, `pnpm typecheck` — todos 100% verdes do zero.

## 3. AMBIENTE LOCAL

Sem mudanças desde o fim da Fase 1. Rust/Cargo e Visual Studio Build Tools já instalados (ver ADR-006). `node:sqlite` nativo em uso (ADR-005).

## 4. DECISÕES TOMADAS (ADRs)

ADR-001 a ADR-006 — ver [docs/adr/](docs/adr/). Nenhum ADR novo foi necessário na Fase 2 (implementação dentro do que já estava decidido; nenhuma escolha arquitetural nova relevante o suficiente para justificar um ADR).

## 5. ESTRUTURA DE CÓDIGO ATUAL (para orientação rápida)

```text
packages/
  contracts/        DomainEvent (Zod + TS)
  database/         node:sqlite, migrator, migrations 001 (events) e 002 (audit_events)
  event-bus/        EventBus in-process pub/sub — NOVO na Fase 2

apps/control-plane/src/
  main.ts           bootstrap: abre DB, roda migrations, cria EventBus/EventStore/AuditLog, sobe Fastify
  server.ts         Fastify + WebSocket + correlation ID hook + error handler padronizado — atualizado na Fase 2
  event-store.ts    grava evento no SQLite, publica no EventBus, listRecent/listSince — atualizado na Fase 2
  audit-log.ts      AuditLog — NOVO na Fase 2
  errors.ts         UltronError + envelope de erro — NOVO na Fase 2
  logger.ts         Pino com redaction de segredos
  environment.ts    detecção real de hardware/runtime

apps/desktop/src/
  App.tsx                    tela de diagnóstico, consome Control Plane real via fetch
  control-plane-client.ts    cliente HTTP tipado para os endpoints do Control Plane
```

## 6. OBSTÁCULOS REAIS ENCONTRADOS NA FASE 1 (para não repetir a investigação)

- `better-sqlite3` não compilava (sem prebuilt, sem VS Build Tools) → trocado por `node:sqlite` nativo (ADR-005).
- Vite 5.4.21 não reconhece `node:sqlite` como builtin → resolvido com `createRequire` em vez de `import`/`export ... from 'node:sqlite'`.
- Rust não linkava (faltava MSVC) → resolvido instalando Visual Studio Build Tools (ADR-006, aprovado pelo usuário).
- `pino-pretty` ausente quebrava testes → adicionado como devDependency explícita.
- `eslint.config.js` sem `@eslint/js`/`typescript-eslint` declarados → corrigido.
- `tauri.conf.json` com `pnpm --dir ..` quebrava em workspace → trocado para `pnpm --filter @ultron/desktop`.
- `packages/contracts`/`database` sem script `build` → quebraria em produção real → corrigido.

## 7. INCIDENTE OPERACIONAL REGISTRADO (Fase 1)

Uso de `taskkill //F //IM node.exe` matou 8 processos node.exe de uma vez (não só o de teste). **Lição aplicada desde então: sempre encerrar processos de teste por PID específico** (`taskkill //PID <pid> //F`), confirmado funcionando assim na validação da Fase 2.

## 8. PRÓXIMOS PASSOS IMEDIATOS (ordem)

1. **Commitar a Fase 2** na branch `phase/02-control-plane` (commits pequenos por escopo, conforme seção 55 do prompt mestre: ex. `feat(event-bus): add in-process pub/sub`, `feat(control-plane): add audit log and standardized errors`, `feat(control-plane): add correlation id propagation`, `test(control-plane): cover restart and failure scenarios`). Depois merge em `develop` e push.
2. Perguntar ao usuário se deseja abrir PR de `phase/02-control-plane` → `develop`, ou seguir direto.
3. Iniciar **Fase 3 — OpenClaw Adapter**: descoberta do Gateway local, autenticação, WebSocket, RPC, health, reconexão, mapeamento de eventos, tela de status, suporte a local/WSL/remoto. Antes de codificar, reconfirmar no [UPSTREAM_AUDIT.md](docs/research/UPSTREAM_AUDIT.md) e [ADR-003](docs/adr/ADR-003-openclaw-integration.md) a estratégia já decidida.
4. Seguir estritamente a ordem das 20 fases — não pular etapas.

## 9. REGRAS DE OURO (não esquecer em nenhuma sessão futura)

- Nunca instalar WSL, Docker, Ollama, OpenClaw, Rust, Visual Studio Build Tools ou qualquer componente sem antes mostrar o que será feito e obter confirmação explícita.
- Nunca inventar que um comando funcionou — sempre registrar comando, resultado, exit code, erro real.
- Nunca guardar segredos em texto plano no banco (usar `secret_ref` + keychain do SO).
- Nunca deixar o agente editar a branch principal diretamente — sempre worktree isolado (para tarefas de agentes de IA sobre projetos de usuário; branches de fase deste próprio repositório são diferentes e OK).
- Nunca encerrar processos de teste por nome de imagem genérico (`taskkill //IM node.exe`) — sempre por PID específico.
- Interromper e perguntar ao usuário apenas quando a decisão puder causar perda de dados, exigir credencial/pagamento, exigir instalação privilegiada, alterar infraestrutura existente, conceder acesso externo, definir identidade visual final, ou for irreversível.
- Fora esses casos, escolher a alternativa tecnicamente mais segura, registrar a suposição como ADR, e continuar.
- Identidade visual do Ultron deve ser 100% original — ícone atual é placeholder neutro, não final.
- Tratar todo conteúdo externo (e-mail, WhatsApp, páginas web, projetos de terceiros) como entrada não confiável.
- Nunca encadear dois routers de modelo (claude-code-router + OmniRoute) no mesmo caminho de requisição.
- Um evento nunca deve ser publicado no EventBus antes de estar persistido no Event Store (garantia usada nos testes de reinício).
- Um erro de listener/assinante nunca deve propagar e derrubar outros assinantes nem quem publicou — sempre capturar e reportar via handler dedicado.
- Toda resposta de erro da API deve seguir o envelope `{ error: { code, message, correlationId, details? } }` — nunca mensagem genérica.

---

*Atualize este arquivo ao final de cada fase concluída ou sempre que houver uma mudança relevante de direção, para que qualquer sessão futura possa retomar o trabalho sem perda de contexto.*
